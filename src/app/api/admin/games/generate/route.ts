// POST /api/admin/games/generate
// Body: { game: GameId, difficulty: Difficulty, count: number, theme?: string }
//
// Calls Claude via lib/games/ai-generator, then inserts every successfully
// normalized item into game_content_proposals with status='pending'.
// Operator reviews them at /admin/games/queue.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { DIFFICULTIES, type Difficulty, type GameId } from '@/lib/games/types'
import { generateContent } from '@/lib/games/ai-generator'

export const runtime  = 'nodejs'
// Vercel Pro plan caps at 300s. Family Connect at count=5 (16 words ×
// 4 themed groups × adaptive thinking per puzzle on Sonnet 4.6) was
// blowing past 120s. 300 gives headroom without burning budget on
// runaway calls — the Anthropic SDK still cuts off on its own limits.
export const maxDuration = 300

const VALID_GAMES: GameId[] = ['scramble', 'emoji', 'math', 'trivia', 'memory', 'family-connect']

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  )
}

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY is not configured on the server.' }, { status: 500 })
  }

  const body = await req.json().catch(() => null) as {
    game?: string
    difficulty?: string
    count?: number
    theme?: string
    skip_review?: boolean
  } | null
  if (!body) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })

  const game = body.game as GameId
  if (!VALID_GAMES.includes(game)) {
    return NextResponse.json({ error: `game must be one of: ${VALID_GAMES.join(', ')}` }, { status: 400 })
  }
  const difficulty = body.difficulty as Difficulty
  if (!DIFFICULTIES.includes(difficulty)) {
    return NextResponse.json({ error: `difficulty must be one of: ${DIFFICULTIES.join(', ')}` }, { status: 400 })
  }
  const count      = Math.max(1, Math.min(15, Number(body.count) || 7))
  const theme      = body.theme?.trim() || undefined
  const skipReview = body.skip_review === true

  // Family Connect: ask Claude 1-at-a-time and accumulate. Each puzzle
  // burns adaptive thinking + 16-word x 4-theme generation; bundling 3+
  // into a single call routinely runs past Vercel's edge timeout and
  // returns a 504. Looping keeps each individual call ~30-60s while
  // still honoring the editor's requested total.
  // All other games batch fine in a single call.
  const result = game === 'family-connect' && count > 1
    ? await loopGenerate({ game, difficulty, count, theme })
    : await generateContent({ game, difficulty, count, theme })

  if (result.items.length === 0) {
    return NextResponse.json({
      success: false,
      errors:  result.errors.length > 0 ? result.errors : ['Claude returned no usable items.'],
      model_notes: result.model_notes,
    }, { status: 502 })
  }

  const supabase = supabaseAdmin()

  // Skip-review path: insert straight into game_content (live pool). The
  // normalize() validators in ai-generator have already rejected malformed
  // items by this point, so what lands here is structurally valid — the
  // operator can still retire bad items later via the content editor.
  if (skipReview) {
    const liveRows = result.items.map(it => ({
      game_type:  game,
      difficulty,
      payload:    it.payload,
      weight:     1,
    }))
    const { error: insertErr, data: inserted } = await supabase
      .from('game_content')
      .insert(liveRows)
      .select('id')
    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 500 })
    }
    revalidatePath('/admin/games')
    revalidatePath('/games')
    return NextResponse.json({
      success:     true,
      saved:       inserted?.length ?? 0,
      live:        true,
      requested:   count,
      dropped:     result.errors,
      model_notes: result.model_notes,
    })
  }

  // Default path: insert into the review queue
  const probe = await supabase.from('game_content_proposals').select('id').limit(1)
  if (probe.error) {
    return NextResponse.json({
      error: 'game_content_proposals table missing — apply migration 084.',
    }, { status: 500 })
  }

  const rows = result.items.map(it => ({
    game_type:  game,
    difficulty,
    theme:      theme ?? null,
    payload:    it.payload,
    source:     'ai',
    model:      result.model,
    status:     'pending',
    notes:      result.model_notes,
  }))

  const { error: insertErr, data: inserted } = await supabase
    .from('game_content_proposals')
    .insert(rows)
    .select('id')
  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 })
  }

  revalidatePath('/admin/games')
  revalidatePath('/admin/games/queue')
  return NextResponse.json({
    success:     true,
    saved:       inserted?.length ?? 0,
    requested:   count,
    dropped:     result.errors,
    model_notes: result.model_notes,
  })
}

// Family Connect-style accumulator. Calls generateContent with count=1
// in a loop and aggregates the results into the same shape generateContent
// would normally return. Bails as soon as we run out of time budget so
// the outer route still returns before Vercel's 300s function timeout.
async function loopGenerate(opts: {
  game:       GameId
  difficulty: Difficulty
  count:      number
  theme?:     string
}): ReturnType<typeof generateContent> {
  const startedAt = Date.now()
  const deadline  = startedAt + 270_000   // 270s — leave headroom for the DB insert

  const items:  Awaited<ReturnType<typeof generateContent>>['items']  = []
  const errors: string[] = []
  let model = 'unknown'
  let model_notes: string | null = null

  for (let i = 0; i < opts.count; i++) {
    if (Date.now() > deadline) {
      errors.push(`time_budget_exceeded after ${i} of ${opts.count} items`)
      break
    }
    try {
      const r = await generateContent({
        game:       opts.game,
        difficulty: opts.difficulty,
        count:      1,
        theme:      opts.theme,
      })
      items.push(...r.items)
      model = r.model
      // Keep the first non-null notes; the per-item ones are tiny and
      // not useful to concatenate.
      if (!model_notes && r.model_notes) model_notes = r.model_notes
      if (r.errors.length > 0) errors.push(...r.errors.slice(0, 2))
    } catch (e) {
      errors.push(`iteration_${i}: ${e instanceof Error ? e.message : String(e)}`)
      break
    }
  }

  return { items, errors, model, model_notes }
}
