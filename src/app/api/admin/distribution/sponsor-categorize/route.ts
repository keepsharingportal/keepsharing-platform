// POST /api/admin/distribution/sponsor-categorize
//
// Asks Claude to suggest a sponsor_category_slug for each of the given
// advertiser_account ids. Returns { id, slug, confidence, reasoning }[].
//
// Why batch over single: one prompt per sponsor would burn 49 calls for
// the initial categorization sweep. Claude reliably handles a batch of
// 20-50 business names with classification accuracy roughly equivalent
// to single-shot — and it costs an order of magnitude less.
//
// PATCH /api/admin/distribution/sponsor-categorize  body { id, slug }
// Writes the editor-approved slug back to advertiser_accounts.

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { runAI } from '@/lib/ai/client'
import { SPONSOR_CATEGORIES, SPONSOR_CATEGORY_SLUGS } from '@/lib/sponsors/categories'

export const runtime     = 'nodejs'
export const dynamic     = 'force-dynamic'
export const maxDuration = 60

interface Suggestion {
  id:         string
  slug:       string | null
  confidence: number
  reasoning:  string
}

const BATCH_SIZE = 25

export async function POST(req: NextRequest) {
  const ctx = await requireAdmin()
  const body = await req.json().catch(() => null) as { ids?: string[] } | null
  if (!body?.ids || !Array.isArray(body.ids) || body.ids.length === 0) {
    return NextResponse.json({ error: 'ids[] required' }, { status: 400 })
  }
  const ids = body.ids.slice(0, 200) // cap

  const sb = createAdminClient()
  const { data, error } = await sb
    .from('advertiser_accounts')
    .select('id, business_name, business_url, ops_notes, package_tier, lifecycle_stage')
    .in('id', ids)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  type Sponsor = {
    id:            string
    business_name: string
    business_url:  string | null
    ops_notes:     string | null
    package_tier:  string | null
    lifecycle_stage: string | null
  }
  const sponsors = (data ?? []) as Sponsor[]

  // Build the category reference block — list every slug + description
  // so the AI doesn't hallucinate slugs not in our taxonomy.
  const categoryReference = SPONSOR_CATEGORIES
    .map(c => `- ${c.slug}: ${c.label} (${c.description})`)
    .join('\n')

  const allSuggestions: Suggestion[] = []

  // Batch through Claude. Each batch returns a JSON array; we accumulate.
  for (let i = 0; i < sponsors.length; i += BATCH_SIZE) {
    const batch = sponsors.slice(i, i + BATCH_SIZE)
    const businessesBlock = batch.map((s, idx) => {
      const lines = [`${idx + 1}. ${s.business_name}`]
      if (s.business_url) lines.push(`   url: ${s.business_url}`)
      if (s.ops_notes)    lines.push(`   notes: ${s.ops_notes.slice(0, 200)}`)
      return lines.join('\n')
    }).join('\n\n')

    const systemPrompt = `You categorize businesses that advertise in a family-focused regional publication network. You will receive a list of businesses and must classify each into the SINGLE BEST sponsor category from the provided taxonomy.

Rules:
- Use EXACTLY one slug from the taxonomy below. Never invent slugs.
- If the business clearly fits multiple categories, choose the one most aligned with FAMILY advertising (parents + kids audience).
- If the business is the publication itself or a sister publication, use \`publication-internal\`.
- If you cannot determine the category from the business name + context, return \`null\` for slug and explain in reasoning.

Taxonomy:
${categoryReference}

Return STRICT JSON only. No prose before or after. Schema:
{
  "items": [
    { "n": 1, "slug": "private-independent-schools", "confidence": 0.9, "reasoning": "St. James School is a known K-12 private school in Montgomery." }
  ]
}`

    const userPrompt = `Categorize these ${batch.length} businesses:\n\n${businessesBlock}`

    let parsed: { items?: Array<{ n: number; slug: string | null; confidence: number; reasoning: string }> } = {}
    try {
      const out = await runAI({
        taskKind:     'classification',
        caller:       'sponsor-categorize',
        systemPrompt,
        messages:     [{ role: 'user', content: userPrompt }],
        maxTokens:    2000,
        adminId:      ctx.userId,
      })
      // Strip code fences if Claude added them despite instructions.
      const raw = out.text.replace(/^```(?:json)?\s*|\s*```$/g, '').trim()
      parsed = JSON.parse(raw)
    } catch (e) {
      console.warn('[sponsor-categorize] batch failed:', e instanceof Error ? e.message : String(e))
      // Fall through with empty parsed; each sponsor in this batch gets a null
      // suggestion and the editor can categorize manually.
    }

    for (let j = 0; j < batch.length; j++) {
      const sponsor = batch[j]
      const item = parsed.items?.find(it => it.n === j + 1)
      const slug = item?.slug && SPONSOR_CATEGORY_SLUGS.includes(item.slug) ? item.slug : null
      allSuggestions.push({
        id:         sponsor.id,
        slug,
        confidence: typeof item?.confidence === 'number' ? Math.max(0, Math.min(1, item.confidence)) : 0,
        reasoning:  item?.reasoning ?? '',
      })
    }
  }

  return NextResponse.json({ suggestions: allSuggestions })
}

export async function PATCH(req: NextRequest) {
  await requireAdmin()
  const body = await req.json().catch(() => null) as { id?: string; slug?: string | null } | null
  if (!body?.id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  // Empty string from a form clears the value; an actual slug must exist
  // in the taxonomy. Both paths normalize through here.
  let slug: string | null = null
  if (typeof body.slug === 'string' && body.slug !== '') {
    if (!SPONSOR_CATEGORY_SLUGS.includes(body.slug)) {
      return NextResponse.json({ error: 'Unknown category slug' }, { status: 400 })
    }
    slug = body.slug
  }

  const sb = createAdminClient()
  const { error } = await sb
    .from('advertiser_accounts')
    .update({ sponsor_category_slug: slug })
    .eq('id', body.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, slug })
}
