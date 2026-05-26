// POST /api/games/submit-score
//
// Saves a player's score AND posts to your GHL workflow webhook so the
// player gets added/tagged in your CRM (lead capture + monthly drawing).
// Anti-cheat: server clamps the score to the maximum possible for that
// (game, difficulty) based on the rounds in this week's pool.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import crypto from 'crypto'
import {
  type GameId, type Difficulty, ROUNDS_PER_SESSION,
  maxScoreFor, gameById, DIFFICULTIES,
} from '@/lib/games/types'
import { weeklyContent } from '@/lib/games/weekly'

export const runtime     = 'nodejs'
export const maxDuration = 30

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  )
}

interface Body {
  game_type:        string
  difficulty:       string
  score:            number
  duration_seconds: number
  iso_year:         number
  iso_week:         number
  first_name:       string
  last_name:        string
  email:            string
  phone?:           string
}

function isDifficulty(s: string): s is Difficulty {
  return DIFFICULTIES.includes(s as Difficulty)
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as Body | null
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

  const game = gameById(body.game_type)
  if (!game) return NextResponse.json({ error: 'Unknown game' }, { status: 400 })
  if (!isDifficulty(body.difficulty)) return NextResponse.json({ error: 'Unknown difficulty' }, { status: 400 })

  // Validate inputs
  const first_name = (body.first_name ?? '').trim()
  const last_name  = (body.last_name  ?? '').trim()
  const email      = (body.email      ?? '').trim().toLowerCase()
  const phone      = (body.phone      ?? '').trim() || null
  if (!first_name || !last_name || !email || !email.includes('@')) {
    return NextResponse.json({ error: 'Name and a valid email are required.' }, { status: 400 })
  }

  // Anti-cheat: clamp to max possible score for this week's content
  let clampedScore = Math.max(0, Math.floor(Number(body.score) || 0))
  try {
    const { items } = await weeklyContent(game.id as GameId, body.difficulty)
    // For word-search and memory the cap depends on the board specifics;
    // for everything else it's rounds * 100.
    let contentCount = ROUNDS_PER_SESSION[game.id as GameId]
    if (game.id === 'word-search') {
      const payload = items[0]?.payload as { words?: string[] } | undefined
      contentCount  = payload?.words?.length ?? contentCount
    } else if (game.id === 'memory') {
      const payload = items[0]?.payload as { pairs?: number } | undefined
      contentCount  = payload?.pairs ?? contentCount
    } else if (game.id === 'family-connect') {
      const payload = items[0]?.payload as { groups?: unknown[] } | undefined
      contentCount  = payload?.groups?.length ?? 4    // always 4 groups
    }
    const cap = maxScoreFor(game.id as GameId, body.difficulty, contentCount)
    if (clampedScore > cap) clampedScore = cap
  } catch {
    // If the pool lookup fails for any reason, keep the submission going with
    // a generous fallback cap. Better to log a lead than drop it.
    clampedScore = Math.min(clampedScore, 5000)
  }

  // Hash the requester's IP for rough dedup, without storing the raw IP
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const ipHash = crypto.createHash('sha256').update(`game-score:${ip}`).digest('hex').slice(0, 32)

  const supabase = supabaseAdmin()

  // Insert pending row first so we have a record even if the webhook fails
  const row = {
    game_type:        body.game_type,
    difficulty:       body.difficulty,
    score:            clampedScore,
    max_score:        clampedScore,    // for now — could compute true max here
    duration_seconds: Math.max(0, Math.floor(Number(body.duration_seconds) || 0)),
    iso_week:         Number(body.iso_week) || 0,
    iso_year:         Number(body.iso_year) || 0,
    first_name, last_name, email, phone,
    market:           'rrp',
    user_agent:       req.headers.get('user-agent')?.slice(0, 300) ?? null,
    ip_hash:          ipHash,
    ghl_status:       'pending' as const,
  }
  const insertResult = await supabase.from('game_scores').insert(row).select('id').single()
  const scoreId      = (insertResult.data as { id?: string } | null)?.id

  if (insertResult.error) {
    console.error('[submit-score] insert error', insertResult.error)
    return NextResponse.json({ error: 'Could not save your score. Please try again.' }, { status: 500 })
  }

  // Fire the GHL webhook — same pattern as the newsletter send. Failures get
  // logged but the player still sees success since their score IS saved.
  const webhookUrl = process.env.GHL_GAMES_WEBHOOK_URL
  let ghlResult: { status: number; body: unknown } | null = null

  if (webhookUrl) {
    try {
      const ctrl = AbortSignal.timeout(15_000)
      const res = await fetch(webhookUrl, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          source:           'brain-games',
          game_type:        body.game_type,
          game_title:       game.title,
          difficulty:       body.difficulty,
          score:            clampedScore,
          iso_year:         row.iso_year,
          iso_week:         row.iso_week,
          first_name, last_name, email, phone,
          tag:              `played-${body.game_type}-w${row.iso_week}`,
          drawing_month:    new Date().toISOString().slice(0, 7),
        }),
        signal: ctrl,
      })
      const text = await res.text()
      let parsed: unknown = text
      try { parsed = JSON.parse(text) } catch { /* keep as text */ }
      ghlResult = { status: res.status, body: parsed }

      await supabase.from('game_scores').update({
        ghl_status:   res.ok ? 'sent' : 'failed',
        ghl_response: ghlResult,
      }).eq('id', scoreId!)
    } catch (e) {
      await supabase.from('game_scores').update({
        ghl_status:   'failed',
        ghl_response: { error: e instanceof Error ? e.message : String(e) },
      }).eq('id', scoreId!)
    }
  }

  revalidatePath('/games')

  return NextResponse.json({
    success:    true,
    score:      clampedScore,
    score_id:   scoreId,
    ghl_status: ghlResult?.status ?? null,
  })
}
