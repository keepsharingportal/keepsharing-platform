// POST /api/admin/distribution/ai/newsletter-subjects
//
// Generates brand-voice-aware subject line suggestions for a newsletter
// lineup. Replaces the templated suggestSubjects() helper with actual
// Claude output that picks up on what's IN the issue (not just the
// publication's name).
//
// Body: { publication: 'rrp' | 'rr50plus' | …, items: [{ title, type, blurb? }] }
// Returns: { subjects: string[] }   // exactly 5

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'
import { runAI } from '@/lib/ai/client'
import { loadBrand, buildBrandPromptFragment } from '@/lib/brands'

export const runtime     = 'nodejs'
export const dynamic     = 'force-dynamic'
export const maxDuration = 30

interface LineupItem { title: string; type: string; blurb?: string }

export async function POST(req: NextRequest) {
  const ctx = await requireAdmin()
  const body = await req.json().catch(() => null) as {
    publication?: string
    items?: LineupItem[]
  } | null
  if (!body?.publication) return NextResponse.json({ error: 'publication required' }, { status: 400 })
  const items = Array.isArray(body.items) ? body.items.slice(0, 30) : []
  if (items.length === 0)  return NextResponse.json({ error: 'items[] required' }, { status: 400 })

  const brand = await loadBrand(body.publication)
  if (!brand) return NextResponse.json({ error: 'unknown publication' }, { status: 400 })

  const brandFragment = buildBrandPromptFragment(brand)
  const itemsBlock = items.map((it, idx) => {
    const lines = [`${idx + 1}. [${it.type}] ${it.title}`]
    if (it.blurb) lines.push(`   ${it.blurb.slice(0, 200)}`)
    return lines.join('\n')
  }).join('\n')

  const systemPrompt = `You write newsletter subject lines for a family-focused regional publication.

${brandFragment}

You will be given the editorial lineup for an upcoming issue. Write 5 candidate subject lines.

Rules:
- 35-60 characters preferred (ideal email preview width)
- Concrete and specific — reference WHAT is in the issue, not generic ("this week's news")
- Warm and human, never click-bait
- Match the brand voice rules above
- No emoji unless the brand voice explicitly allows them
- Vary the angle across the 5 (e.g. lead-story-first, themed roundup, community spotlight)

Return STRICT JSON only. Schema:
{
  "subjects": ["...", "...", "...", "...", "..."]
}`

  const userPrompt = `Here is the lineup (${items.length} items):\n\n${itemsBlock}\n\nWrite 5 subject lines.`

  try {
    const out = await runAI({
      taskKind:  'caption',
      caller:    'newsletter-subjects',
      systemPrompt,
      messages:  [{ role: 'user', content: userPrompt }],
      maxTokens: 600,
      adminId:   ctx.userId,
    })
    const raw = out.text.replace(/^```(?:json)?\s*|\s*```$/g, '').trim()
    const parsed = JSON.parse(raw) as { subjects?: string[] }
    const subjects = Array.isArray(parsed.subjects)
      ? parsed.subjects.filter(s => typeof s === 'string' && s.length > 0).slice(0, 5)
      : []
    if (subjects.length === 0) {
      return NextResponse.json({ error: 'AI returned no subjects' }, { status: 502 })
    }
    return NextResponse.json({ subjects })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'AI call failed' },
      { status: 502 },
    )
  }
}
