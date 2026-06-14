// POST /api/admin/distribution/ai/suggest-lineup
//
// For a given surface (homepage section, newsletter section), rank the
// candidate queue and return top-N picks with reasoning. Editor sees
// "Suggested" ghost cards in the empty section; clicking one assigns it.
//
// Body: {
//   publication,         // brand slug
//   surface,             // 'homepage' | 'newsletter'
//   section,             // homepage_section value or newsletter_section value
//   sectionLabel,        // human label, fed to the AI as context
//   targetCount,         // how many items to suggest (default 3)
//   candidates: [{ id, title, type, blurb?, freshness_days? }]
// }
// Returns: { suggestions: [{ id, score, reasoning }] }

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'
import { runAI } from '@/lib/ai/client'
import { loadBrand, buildBrandPromptFragment } from '@/lib/brands'

export const runtime     = 'nodejs'
export const dynamic     = 'force-dynamic'
export const maxDuration = 30

interface Candidate {
  id:               string
  title:            string
  type:             string
  blurb?:           string
  freshness_days?:  number
}

export async function POST(req: NextRequest) {
  const ctx = await requireAdmin()
  const body = await req.json().catch(() => null) as {
    publication?:   string
    surface?:       'homepage' | 'newsletter'
    section?:       string
    sectionLabel?:  string
    targetCount?:   number
    candidates?:    Candidate[]
  } | null
  if (!body?.publication)          return NextResponse.json({ error: 'publication required' }, { status: 400 })
  if (!body?.surface)              return NextResponse.json({ error: 'surface required' }, { status: 400 })
  if (!body?.section)              return NextResponse.json({ error: 'section required' }, { status: 400 })
  const candidates = Array.isArray(body.candidates) ? body.candidates.slice(0, 80) : []
  if (candidates.length === 0)     return NextResponse.json({ error: 'candidates[] required' }, { status: 400 })

  const targetCount = Math.max(1, Math.min(10, body.targetCount ?? 3))
  const brand = await loadBrand(body.publication)
  if (!brand) return NextResponse.json({ error: 'unknown publication' }, { status: 400 })

  const brandFragment = buildBrandPromptFragment(brand)
  const candidatesBlock = candidates.map((c, idx) => {
    const lines = [`${idx + 1}. [${c.type}] ${c.title}`]
    if (c.blurb)               lines.push(`   ${c.blurb.slice(0, 200)}`)
    if (c.freshness_days != null) lines.push(`   ${c.freshness_days}d old`)
    return lines.join('\n')
  }).join('\n')

  const surfaceLabel = body.surface === 'homepage' ? 'Homepage section' : 'Newsletter section'
  const sectionLabel = body.sectionLabel ?? body.section

  const systemPrompt = `You are an editorial lineup assistant for a family-focused regional publication.

${brandFragment}

You will be given a list of approved-but-unassigned editorial pieces. Rank the top ${targetCount} candidates best suited for the SPECIFIC ${surfaceLabel.toLowerCase()} named "${sectionLabel}".

Considerations (in order):
1. Editorial fit for the section name + the brand's audience
2. Freshness — prefer recent content (fewer days old) unless an older piece is the obvious best fit
3. Variety — avoid suggesting two of the same submission_type back-to-back
4. Quality signal — a piece with a blurb is usually more developed than one without

Return STRICT JSON only. Schema:
{
  "suggestions": [
    { "n": 1, "score": 0.88, "reasoning": "Fresh student spotlight, aligns with School section, has a developed blurb." }
  ]
}

Where "n" matches the number in the candidate list (NOT an id).`

  const userPrompt = `Section to fill: "${sectionLabel}"
Surface: ${surfaceLabel}
Suggest top ${targetCount} from these ${candidates.length} candidates:

${candidatesBlock}`

  try {
    const out = await runAI({
      taskKind:  'classification',
      caller:    'suggest-lineup',
      systemPrompt,
      messages:  [{ role: 'user', content: userPrompt }],
      maxTokens: 800,
      adminId:   ctx.userId,
    })
    const raw = out.text.replace(/^```(?:json)?\s*|\s*```$/g, '').trim()
    const parsed = JSON.parse(raw) as { suggestions?: Array<{ n: number; score: number; reasoning: string }> }
    const items = Array.isArray(parsed.suggestions) ? parsed.suggestions : []
    const out2 = items
      .filter(it => typeof it.n === 'number' && it.n >= 1 && it.n <= candidates.length)
      .slice(0, targetCount)
      .map(it => ({
        id:        candidates[it.n - 1].id,
        score:     typeof it.score === 'number' ? Math.max(0, Math.min(1, it.score)) : 0.5,
        reasoning: it.reasoning ?? '',
      }))
    return NextResponse.json({ suggestions: out2 })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'AI call failed' },
      { status: 502 },
    )
  }
}
