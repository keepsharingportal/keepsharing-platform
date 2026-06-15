// ── Claude-seeded brand SEO profile generator ──────────────────────────────
//
// Composes the prompt from THREE layers:
//   1. Family template (parents / fifty-plus) — audience archetype,
//      voice DNA, default pillar structure, default negative space,
//      content philosophy
//   2. Market intel — sub-areas, institutions, cultural notes
//      pre-loaded per brand
//   3. Brand identity + 90-day article corpus
//
// Result: 90-95% complete first drafts instead of 60-70% generic ones.
// Editor only tunes local nuances.
//
// MERGE MODE: when an editor has tuned fields, regenerating preserves
// those tunings. We only fill in fields the editor left empty, or fields
// they explicitly mark for refresh.

import type { SupabaseClient } from '@supabase/supabase-js'
import { runAI } from '@/lib/ai/client'
import { getBrandSeoConfig } from '@/lib/seo/brand-seo'
import { MARKETS } from '@/lib/markets'
import { getFamilyTemplate } from '@/lib/seo/brand-family-templates'
import { getMarketIntel } from '@/lib/seo/market-intel'
import {
  loadBrandProfile,
  type BrandSeoProfile,
  type Pillar, type SubArea, type Persona, type CalendarMonth, type LinkableAsset,
  type EditorialPrefs, type CompetitorIntel,
} from '@/lib/seo/brand-profile'

const FAMILY_TEMPLATE_VERSION = 1
const MARKET_INTEL_VERSION    = 1

const SYSTEM_PROMPT = `You are a senior local-SEO strategist drafting the strategic brief for
a community publication. You are given DEEP context up front: family-level
audience archetype, voice DNA, default pillar structure, market intelligence,
brand identity, and a recent article sample.

Your job: produce a first-draft strategic profile that is SPECIFIC and
LOCAL — not generic. The depth of the input means the output should
read like it was written by someone who actually knows this market.

Use the family-level default pillar structure as your starting point, but
tune the target_keyword + supporting_keywords for THIS specific market
(weave in the named sub-areas + institutions from market intelligence).

Sections to produce:
  - pillars: 4-6 pillars (using family defaults as scaffolding, locally
    tuned). Each: { id (kebab-slug), title, description (one sentence),
    target_keyword (locality-specific), supporting_keywords (5-7 phrases
    that name local sub-areas + institutions), status: "planning" }.
  - subAreas: USE the market intelligence sub-areas verbatim where
    provided; expand target_keywords per sub-area. Each: { id, name,
    county?, target_keywords (5-8 phrases) }.
  - personas: 4-5 audience sub-segments derived from the family
    audienceArchetype. Each: { id, name, description, age_range,
    interests (5-7), pain_points (5-7) }.
  - editorialCalendar: keys "1".."12", each { themes: [4-7 themes per
    month, anchored in named local events + seasonal patterns specific
    to this market] }.
  - linkableAssets: 4-6 authority pieces this brand could own. Each:
    { id, title, description (one sentence) }.
  - negativeSpace: family defaults + any brand-specific additions.
  - uniqueAngles: 4-5 specific differentiators — what makes THIS brand
    stand apart in THIS market (use the family contentPhilosophy + the
    market cultural notes).
  - voiceNotes: one paragraph that respects the family voiceDna while
    layering market-specific tone notes.
  - editorialPrefs: { format_preference, voice_preference,
    publishing_cadence, evergreen_vs_timely } — start from family
    defaults but adjust if the article sample shows a different pattern.
  - competitorIntel: { competitors: [3-5 plausible local competitors
    with name + url if known + strengths + weaknesses], gaps_we_own:
    [3-5 phrases describing what this brand should own that competitors
    don't] }.

OUTPUT FORMAT — emit raw JSON only, no prose, no code fences. Keys must
match the schema exactly.`

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
  editorialPrefs:     EditorialPrefs
  competitorIntel:    CompetitorIntel
  rationale:          string
  tokensUsed:         number
  modelUsed:          string
}

export interface SeedOptions {
  /** When 'merge' (default), preserve editor tunings — only fill in
   *  fields the editor left empty. When 'replace', overwrite everything. */
  mode?: 'merge' | 'replace'
}

/** Pure generation — composes the prompt + asks Claude. */
export async function seedBrandProfile(
  sb:        SupabaseClient,
  brandSlug: string,
): Promise<SeededProfile> {
  const market = MARKETS.find(m => m.slug === brandSlug)
  if (!market) throw new Error(`Unknown brand: ${brandSlug}`)
  const seo    = getBrandSeoConfig(market, `https://${market.publicHost ?? 'example.com'}`)
  const family = getFamilyTemplate(market.family)
  const intel  = getMarketIntel(brandSlug)

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
    .join('\n') || '(no articles in last 90 days — propose from family + market intel alone)'

  // ── Compose the prompt from all three layers ────────────────────────
  const familyContextMd = `# FAMILY: ${family.family}

## Audience archetype (drives intent matching)
${family.audienceArchetype}

## Voice DNA (drives tone of every recommendation)
${family.voiceDna}

## Default pillar structure (scaffolding — tune target_keyword locally)
${family.defaultPillarStructure.map((p, i) => `${i + 1}. ${p.title} (hint: "${p.targetKeywordHint}")
   ${p.description}
   Rationale: ${p.rationale.replace(/\s+/g, ' ').trim()}`).join('\n\n')}

## Default negative space (carry forward, add to)
${family.defaultNegativeSpace.map(s => `- ${s}`).join('\n')}

## Default editorial preferences
- Format: ${family.defaultEditorialPrefs.formatPreference}
- Voice: ${family.defaultEditorialPrefs.voicePreference}
- Cadence: ${family.defaultEditorialPrefs.publishingCadence}
- Evergreen vs timely: ${family.defaultEditorialPrefs.evergreenVsTimely}

## Content philosophy
${family.contentPhilosophy}`

  const marketContextMd = intel ? `# MARKET: ${intel.hubLabel} (${market.city}, ${market.state})
Service area population: ~${(intel.serviceAreaPop ?? 0).toLocaleString()}

## Cultural notes (drives angle + tone)
${intel.culturalNotes}

## Sub-areas (USE THESE — they're the locality scaffold)
${intel.subAreas.map(s => `### ${s.name}${s.county ? ` (${s.county} Co.)` : ''}${s.population ? ` · pop ~${s.population.toLocaleString()}` : ''}
${s.notes.replace(/\s+/g, ' ').trim()}
Search modifiers: ${s.searchModifiers.join(', ')}`).join('\n\n')}

## Notable institutions (reference by name in pillars + sub-area keywords)
${intel.institutions.map(i => `- ${i.name} (${i.kind}): ${i.notes}`).join('\n')}

## Regional shorthand readers use
${intel.regionalShorthand.join(', ')}` : `# MARKET: ${market.city}, ${market.state}
(No detailed market intelligence registered for this brand yet — propose plausible sub-areas based on the city's natural geography.)`

  const brandContextMd = `# BRAND: ${seo.organizationName}
Area served: ${seo.areaServedLabel}
Region: ${market.regionLabel}
Audience baseline: ${seo.audience}
Baseline knowsAbout topics: ${seo.knowsAbout.join(', ')}
Baseline target keywords: ${seo.targetKeywords.join(', ')}
Known competitors: ${seo.competitorDomains.join(', ') || '(none on file)'}

## Article sample (last 90 days, ${(recent ?? []).length} articles)
${sample}`

  const userPrompt = `${familyContextMd}

${marketContextMd}

${brandContextMd}

Generate the first-draft strategic profile per the system prompt instructions.
Emit raw JSON only.`

  const res = await runAI({
    caller:       'seed-brand-profile',
    taskKind:     'drafting',
    systemPrompt: SYSTEM_PROMPT,
    messages:     [{ role: 'user', content: userPrompt }],
    maxTokens:    12000,
  })

  const raw = res.text.trim()
    .replace(/^```(?:json)?\n?/i, '')
    .replace(/\n?```$/i, '')
    .trim()

  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error(`Seed brand profile: model returned non-JSON. First 500 chars: ${raw.slice(0, 500)}`)
  }

  // Accept either camelCase (preferred) or snake_case keys — earlier
  // versions of the prompt + Claude's own habits drift between the two.
  function pick<T>(camel: string, snake: string): T | undefined {
    return (parsed[camel] ?? parsed[snake]) as T | undefined
  }

  const result = {
    pillars:           (pick<Pillar[]>           ('pillars',           'pillars')          ?? []) as Pillar[],
    subAreas:          (pick<SubArea[]>          ('subAreas',          'sub_areas')        ?? []) as SubArea[],
    personas:          (pick<Persona[]>          ('personas',          'personas')         ?? []) as Persona[],
    editorialCalendar: (pick<Record<string, CalendarMonth>>('editorialCalendar', 'editorial_calendar') ?? {}) as Record<string, CalendarMonth>,
    linkableAssets:    (pick<LinkableAsset[]>    ('linkableAssets',    'linkable_assets')  ?? []) as LinkableAsset[],
    negativeSpace:     (pick<string[]>           ('negativeSpace',     'negative_space')   ?? []) as string[],
    uniqueAngles:      (pick<string[]>           ('uniqueAngles',      'unique_angles')    ?? []) as string[],
    voiceNotes:        (pick<string>             ('voiceNotes',        'voice_notes')      ?? '') as string,
    editorialPrefs:    (pick<EditorialPrefs>     ('editorialPrefs',    'editorial_prefs')  ?? {}) as EditorialPrefs,
    competitorIntel:   (pick<CompetitorIntel>    ('competitorIntel',   'competitor_intel') ?? {}) as CompetitorIntel,
    rationale:         (pick<string>             ('rationale',         'rationale')        ?? '') as string,
    tokensUsed:        res.promptTokens + res.completionTokens,
    modelUsed:         res.model,
  }

  // Validation guard — empty pillars + empty subAreas means Claude
  // either returned the wrong shape OR truncated. Either way the
  // editor would see "nothing happened" silently. Throw with a
  // diagnostic preview so we know what to fix.
  if (result.pillars.length === 0 && result.subAreas.length === 0) {
    throw new Error(`Seed brand profile: Claude returned no pillars and no sub-areas — likely wrong shape or truncated output. Top-level JSON keys received: ${Object.keys(parsed).join(', ')}. First 500 chars: ${raw.slice(0, 500)}`)
  }

  return result
}

/** Higher-level: generate + merge with existing profile + write back.
 *
 *  In 'merge' mode (default) any field the editor has tuned (non-empty)
 *  is preserved. Empty fields get filled in by the seed. This means an
 *  editor can hit Regenerate as often as they want without losing work.
 *
 *  In 'replace' mode every field is overwritten. Explicit opt-in. */
export async function seedAndMergeBrandProfile(
  sb:        SupabaseClient,
  brandSlug: string,
  options:   SeedOptions = {},
): Promise<{
  applied:    Array<keyof SeededProfile>
  preserved:  Array<keyof SeededProfile>
  tokensUsed: number
}> {
  const mode = options.mode ?? 'merge'
  const existing = await loadBrandProfile(sb, brandSlug)
  const seed     = await seedBrandProfile(sb, brandSlug)

  const update: Parameters<typeof import('@/lib/seo/brand-profile')['saveBrandProfile']>[1] = {
    brandSlug,
    generatedByAi: true,
    lastGenerationMeta: {
      family_template_version: FAMILY_TEMPLATE_VERSION,
      market_intel_version:    MARKET_INTEL_VERSION,
      generated_at:            new Date().toISOString(),
      model:                   seed.modelUsed,
    },
  }
  const applied:   Array<keyof SeededProfile> = []
  const preserved: Array<keyof SeededProfile> = []

  function takeArray<K extends 'pillars'|'subAreas'|'personas'|'linkableAssets'>(
    key: K,
    seedVal: SeededProfile[K],
    existingVal: BrandSeoProfile[K],
  ): void {
    if (mode === 'replace' || existingVal.length === 0) {
      update[key as keyof typeof update] = seedVal as never
      applied.push(key)
    } else {
      preserved.push(key)
    }
  }
  function takeStringArray(key: 'negativeSpace'|'uniqueAngles', seedVal: string[], existingVal: string[]): void {
    if (mode === 'replace' || existingVal.length === 0) {
      update[key] = seedVal; applied.push(key)
    } else {
      preserved.push(key)
    }
  }
  function takeString(key: 'voiceNotes', seedVal: string, existingVal: string): void {
    if (mode === 'replace' || !existingVal.trim()) {
      update[key] = seedVal; applied.push(key)
    } else {
      preserved.push(key)
    }
  }
  function takeRecord(seedVal: Record<string, CalendarMonth>, existingVal: Record<string, CalendarMonth>): void {
    if (mode === 'replace' || Object.keys(existingVal).length === 0) {
      update.editorialCalendar = seedVal; applied.push('editorialCalendar')
    } else {
      preserved.push('editorialCalendar')
    }
  }
  function takeObject<K extends 'editorialPrefs'|'competitorIntel'>(
    key: K, seedVal: SeededProfile[K], existingVal: BrandSeoProfile[K],
  ): void {
    if (mode === 'replace' || Object.keys(existingVal).length === 0) {
      update[key as keyof typeof update] = seedVal as never; applied.push(key)
    } else {
      preserved.push(key)
    }
  }

  takeArray      ('pillars',           seed.pillars,           existing.pillars)
  takeArray      ('subAreas',          seed.subAreas,          existing.subAreas)
  takeArray      ('personas',          seed.personas,          existing.personas)
  takeArray      ('linkableAssets',    seed.linkableAssets,    existing.linkableAssets)
  takeRecord     (                     seed.editorialCalendar, existing.editorialCalendar)
  takeStringArray('negativeSpace',     seed.negativeSpace,     existing.negativeSpace)
  takeStringArray('uniqueAngles',      seed.uniqueAngles,      existing.uniqueAngles)
  takeString     ('voiceNotes',        seed.voiceNotes,        existing.voiceNotes)
  takeObject     ('editorialPrefs',    seed.editorialPrefs,    existing.editorialPrefs)
  takeObject     ('competitorIntel',   seed.competitorIntel,   existing.competitorIntel)

  const { saveBrandProfile } = await import('@/lib/seo/brand-profile')
  await saveBrandProfile(sb, update)

  return { applied, preserved, tokensUsed: seed.tokensUsed }
}
