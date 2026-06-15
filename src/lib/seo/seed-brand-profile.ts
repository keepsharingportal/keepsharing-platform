// ── Claude-seeded brand SEO profile generator ───────────────────────────────
//
// Reads the brand's existing 90 days of articles + brand identity from
// brand-seo.ts and asks Claude to propose a complete first-draft
// strategic brief: pillars, sub-areas, personas, editorial calendar,
// linkable assets, negative space, unique angles, voice notes.
//
// Editor reviews + refines from /admin/seo/brand-profile. Never
// auto-saves over editor edits; the seeder is "Generate first draft",
// not "overwrite my work."

import type { SupabaseClient } from '@supabase/supabase-js'
import { runAI } from '@/lib/ai/client'
import { getBrandSeoConfig } from '@/lib/seo/brand-seo'
import { MARKETS } from '@/lib/markets'
import type {
  Pillar, SubArea, Persona, CalendarMonth, LinkableAsset,
} from '@/lib/seo/brand-profile'

const SYSTEM_PROMPT = `You are a senior local-SEO strategist drafting the strategic brief for
a community family publication. Your job is to propose a complete first-draft
SEO profile that the editor will review + refine.

You are given:
  - Brand identity (name, region, audience, baseline knowsAbout list)
  - A sample of the brand's recent published articles
  - Known local competitor domains

Produce a profile with these sections:
  - pillars: 4-6 topic pillars this brand should OWN (3-7 OK). Each pillar
    is a content cluster the brand can dominate over 6-12 months. Each:
    { id (kebab-slug), title, description (one sentence), target_keyword
    (the SERP we want to rank for), supporting_keywords (3-6 related
    phrases), status: "planning" }.
  - subAreas: every distinct locality this brand covers (towns,
    neighborhoods, districts). Each: { id, name, county?, target_keywords
    (5-8 phrases) }.
  - personas: 4-5 audience sub-segments. Each: { id, name, description
    (one sentence), age_range, interests (4-6), pain_points (4-6) }.
  - editorialCalendar: keys "1".."12" with { themes: [4-6 phrases each] }.
    Be specific to the brand's region (back-to-school month varies by
    state; Mardi Gras is huge on the Gulf Coast; etc).
  - linkableAssets: 3-5 authority pieces the brand could own that would
    attract inbound links. Each: { id, title, description } — use placeholder
    URLs like "/family-resource-guide" that link to plausible site sections.
  - negativeSpace: 3-5 topics this kind of family publication should
    explicitly NOT cover.
  - uniqueAngles: 3-5 things that distinguish this publication from the
    competitors (the editor will refine; propose what's plausible from
    the article sample).
  - voiceNotes: one paragraph on tone, style, do's and don'ts based on
    the brand audience.

OUTPUT FORMAT — emit raw JSON only, no prose, no code fences. The keys
must match the schema below exactly.`

interface CorpusSummary {
  id:           string
  title:        string
  column_slug:  string | null
  published_at: string | null
}

export interface SeededProfile {
  pillars:            Pillar[]
  subAreas:           SubArea[]
  personas:           Persona[]
  editorialCalendar:  Record<string, CalendarMonth>
  linkableAssets:     LinkableAsset[]
  negativeSpace:      string[]
  uniqueAngles:       string[]
  voiceNotes:         string
  rationale:          string
  tokensUsed:         number
  modelUsed:          string
}

export async function seedBrandProfile(
  sb:        SupabaseClient,
  brandSlug: string,
): Promise<SeededProfile> {
  const market = MARKETS.find(m => m.slug === brandSlug)
  if (!market) throw new Error(`Unknown brand: ${brandSlug}`)
  const seo = getBrandSeoConfig(market, `https://${market.publicHost ?? 'example.com'}`)

  // Pull last 90 days of articles for tone/topic inference.
  const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
  const { data: recent } = await sb
    .from('guide_articles')
    .select('id, title, column_slug, published_at')
    .eq('published', true)
    .gte('published_at', cutoff)
    .order('published_at', { ascending: false })
    .limit(80)
  const sample = ((recent ?? []) as CorpusSummary[])
    .map(a => `- [${a.column_slug ?? '?'}] ${a.title}`)
    .join('\n') || '(no articles in last 90 days — propose from brand identity alone)'

  const userPrompt = `Brand identity:
  Name: ${seo.organizationName}
  Area served: ${seo.areaServedLabel}
  City: ${market.city}, ${market.state}
  Region: ${market.regionLabel}
  Audience: ${seo.audience}
  Baseline knowsAbout topics: ${seo.knowsAbout.join(', ')}
  Baseline target keywords: ${seo.targetKeywords.join(', ')}
  Local competitors: ${seo.competitorDomains.join(', ') || '(none on file)'}

Article sample (last 90 days, ${(recent ?? []).length} articles):
${sample}

Generate the first-draft strategic profile per the system prompt instructions.
Emit raw JSON only.`

  const res = await runAI({
    caller:       'seed-brand-profile',
    taskKind:     'drafting',
    systemPrompt: SYSTEM_PROMPT,
    messages:     [{ role: 'user', content: userPrompt }],
    maxTokens:    8000,
  })

  const raw = res.text.trim()
    .replace(/^```(?:json)?\n?/i, '')
    .replace(/\n?```$/i, '')
    .trim()

  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error(`Seed brand profile: model returned non-JSON: ${raw.slice(0, 300)}`)
  }

  return {
    pillars:           (parsed.pillars            as Pillar[])       ?? [],
    subAreas:          (parsed.subAreas           as SubArea[])      ?? [],
    personas:          (parsed.personas           as Persona[])      ?? [],
    editorialCalendar: (parsed.editorialCalendar  as Record<string, CalendarMonth>) ?? {},
    linkableAssets:    (parsed.linkableAssets     as LinkableAsset[]) ?? [],
    negativeSpace:     (parsed.negativeSpace      as string[])       ?? [],
    uniqueAngles:      (parsed.uniqueAngles       as string[])       ?? [],
    voiceNotes:        (parsed.voiceNotes         as string)         ?? '',
    rationale:         (parsed.rationale          as string)         ?? '',
    tokensUsed:        res.promptTokens + res.completionTokens,
    modelUsed:         res.model,
  }
}
