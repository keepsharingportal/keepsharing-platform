// ── Brand SEO profile helpers ───────────────────────────────────────────────
//
// Loads, saves, and merges the editor-tuned per-brand SEO strategy
// brief. The merge produces a single bundle that every AI prompt
// pulls from:
//   - Code defaults (brand-seo.ts BRAND_OVERRIDES)
//   - DB overrides (brand_seo_profiles)
// Empty fields on the DB row fall through to the code defaults so a
// brand-new market still emits sensible AI behavior on day 1.

import type { SupabaseClient } from '@supabase/supabase-js'
import { getBrandSeoConfig } from '@/lib/seo/brand-seo'
import { MARKETS } from '@/lib/markets'

// ── Sub-shapes ──────────────────────────────────────────────────────────────

export interface Pillar {
  id:                  string
  title:               string
  description?:        string
  target_keyword:      string
  supporting_keywords: string[]
  status?:             'planning' | 'active' | 'mature'
}

export interface SubArea {
  id:               string
  name:             string
  county?:          string
  population?:      number
  target_keywords:  string[]
  notes?:           string
}

export interface Persona {
  id:           string
  name:         string
  description?: string
  age_range?:   string
  interests:    string[]
  pain_points:  string[]
}

export interface CalendarMonth {
  themes:  string[]
  notes?:  string
}

export interface LinkableAsset {
  id:                 string
  title:              string
  url:                string
  description?:       string
  last_updated_at?:   string
}

// ── Full profile shape ──────────────────────────────────────────────────────

export interface BrandSeoProfile {
  brandSlug:          string
  pillars:            Pillar[]
  subAreas:           SubArea[]
  personas:           Persona[]
  editorialCalendar:  Record<string, CalendarMonth>  // keys '1'..'12'
  linkableAssets:     LinkableAsset[]
  negativeSpace:      string[]
  uniqueAngles:       string[]
  voiceNotes:         string
  generatedByAiAt:    string | null
  lastEditedAt:       string
  lastEditedBy:       string | null
}

const EMPTY_PROFILE = (brandSlug: string): BrandSeoProfile => ({
  brandSlug,
  pillars:           [],
  subAreas:          [],
  personas:          [],
  editorialCalendar: {},
  linkableAssets:    [],
  negativeSpace:     [],
  uniqueAngles:      [],
  voiceNotes:        '',
  generatedByAiAt:   null,
  lastEditedAt:      new Date().toISOString(),
  lastEditedBy:      null,
})

// ── Load ────────────────────────────────────────────────────────────────────

export async function loadBrandProfile(
  sb:        SupabaseClient,
  brandSlug: string,
): Promise<BrandSeoProfile> {
  const { data } = await sb
    .from('brand_seo_profiles')
    .select('*')
    .eq('brand_slug', brandSlug)
    .maybeSingle()
  if (!data) return EMPTY_PROFILE(brandSlug)

  return {
    brandSlug,
    pillars:           (data.pillars as Pillar[] | null) ?? [],
    subAreas:          (data.sub_areas as SubArea[] | null) ?? [],
    personas:          (data.personas as Persona[] | null) ?? [],
    editorialCalendar: (data.editorial_calendar as Record<string, CalendarMonth> | null) ?? {},
    linkableAssets:    (data.linkable_assets as LinkableAsset[] | null) ?? [],
    negativeSpace:     (data.negative_space as string[] | null) ?? [],
    uniqueAngles:      (data.unique_angles as string[] | null) ?? [],
    voiceNotes:        (data.voice_notes as string | null) ?? '',
    generatedByAiAt:   data.generated_by_ai_at as string | null,
    lastEditedAt:      (data.last_edited_at as string | null) ?? new Date().toISOString(),
    lastEditedBy:      data.last_edited_by as string | null,
  }
}

// ── Save (partial — only the keys passed in get written) ────────────────────

export interface SaveBrandProfileInput {
  brandSlug:          string
  pillars?:           Pillar[]
  subAreas?:          SubArea[]
  personas?:          Persona[]
  editorialCalendar?: Record<string, CalendarMonth>
  linkableAssets?:    LinkableAsset[]
  negativeSpace?:     string[]
  uniqueAngles?:      string[]
  voiceNotes?:        string
  generatedByAi?:     boolean
  editedBy?:          string | null
}

export async function saveBrandProfile(
  sb:    SupabaseClient,
  input: SaveBrandProfileInput,
): Promise<void> {
  const now = new Date().toISOString()
  const update: Record<string, unknown> = {
    brand_slug:     input.brandSlug,
    last_edited_at: now,
    last_edited_by: input.editedBy ?? null,
  }
  if (input.pillars           !== undefined) update.pillars             = input.pillars
  if (input.subAreas          !== undefined) update.sub_areas           = input.subAreas
  if (input.personas          !== undefined) update.personas            = input.personas
  if (input.editorialCalendar !== undefined) update.editorial_calendar  = input.editorialCalendar
  if (input.linkableAssets    !== undefined) update.linkable_assets     = input.linkableAssets
  if (input.negativeSpace     !== undefined) update.negative_space      = input.negativeSpace
  if (input.uniqueAngles      !== undefined) update.unique_angles       = input.uniqueAngles
  if (input.voiceNotes        !== undefined) update.voice_notes         = input.voiceNotes
  if (input.generatedByAi)                   update.generated_by_ai_at  = now

  await sb.from('brand_seo_profiles').upsert(update, { onConflict: 'brand_slug' })
}

// ── Merge for prompt construction ───────────────────────────────────────────
//
// Bundle that gets injected into every AI prompt — Claude reads it to
// produce brand-aware, persona-aware, seasonally-aware output.

export interface BrandPromptContext {
  brandName:         string
  areaServedLabel:   string
  audience:          string
  knowsAbout:        string[]
  targetKeywords:    string[]
  competitorDomains: string[]
  pillars:           Pillar[]
  subAreas:          SubArea[]
  personas:          Persona[]
  editorialCalendar: Record<string, CalendarMonth>
  linkableAssets:    LinkableAsset[]
  negativeSpace:     string[]
  uniqueAngles:      string[]
  voiceNotes:        string
  currentMonth:      number
  currentMonthThemes: string[]
  nextMonth:         number
  nextMonthThemes:   string[]
}

export async function loadBrandPromptContext(
  sb:        SupabaseClient,
  brandSlug: string,
): Promise<BrandPromptContext> {
  const market = MARKETS.find(m => m.slug === brandSlug)
  if (!market) throw new Error(`Unknown brand: ${brandSlug}`)
  const seo     = getBrandSeoConfig(market, `https://${market.publicHost ?? 'example.com'}`)
  const profile = await loadBrandProfile(sb, brandSlug)

  const now      = new Date()
  const month    = now.getUTCMonth() + 1
  const next     = month === 12 ? 1 : month + 1
  const thisCal  = profile.editorialCalendar[String(month)] ?? { themes: [] }
  const nextCal  = profile.editorialCalendar[String(next)]  ?? { themes: [] }

  return {
    brandName:          seo.organizationName,
    areaServedLabel:    seo.areaServedLabel,
    audience:           seo.audience,
    knowsAbout:         seo.knowsAbout,
    targetKeywords:     seo.targetKeywords,
    competitorDomains:  seo.competitorDomains,
    pillars:            profile.pillars,
    subAreas:           profile.subAreas,
    personas:           profile.personas,
    editorialCalendar:  profile.editorialCalendar,
    linkableAssets:     profile.linkableAssets,
    negativeSpace:      profile.negativeSpace,
    uniqueAngles:       profile.uniqueAngles,
    voiceNotes:         profile.voiceNotes,
    currentMonth:       month,
    currentMonthThemes: thisCal.themes,
    nextMonth:          next,
    nextMonthThemes:    nextCal.themes,
  }
}

/** Compact markdown render of the prompt context — used in every AI
 *  system prompt so Claude has the strategic brief without us having
 *  to repeat the structure in each caller. */
export function renderBrandContextForPrompt(ctx: BrandPromptContext): string {
  const monthName = (m: number) => ['January','February','March','April','May','June','July','August','September','October','November','December'][m - 1]
  const lines: string[] = []
  lines.push(`# Brand: ${ctx.brandName}`)
  lines.push(`Area served: ${ctx.areaServedLabel}`)
  lines.push(`Audience: ${ctx.audience}`)
  lines.push(`Topics we cover: ${ctx.knowsAbout.join(', ')}`)
  lines.push(`Target local-search queries: ${ctx.targetKeywords.join(', ')}`)
  if (ctx.competitorDomains.length) lines.push(`Local competitors: ${ctx.competitorDomains.join(', ')}`)
  if (ctx.uniqueAngles.length)      lines.push(`What makes us different: ${ctx.uniqueAngles.join('; ')}`)
  if (ctx.negativeSpace.length)     lines.push(`Topics we DO NOT cover: ${ctx.negativeSpace.join(', ')}`)
  if (ctx.voiceNotes)                lines.push(`Voice notes: ${ctx.voiceNotes}`)

  if (ctx.pillars.length) {
    lines.push('\n## Topic pillars (what this brand wants to OWN)')
    for (const p of ctx.pillars) {
      lines.push(`- **${p.title}** — target: "${p.target_keyword}"${p.description ? '. ' + p.description : ''}${p.supporting_keywords?.length ? ' Related: ' + p.supporting_keywords.join(', ') : ''}`)
    }
  }

  if (ctx.subAreas.length) {
    lines.push('\n## Sub-areas (per-locality keyword targets)')
    for (const a of ctx.subAreas) {
      lines.push(`- **${a.name}**${a.county ? ` (${a.county})` : ''}: ${a.target_keywords.join(', ')}${a.notes ? ' — ' + a.notes : ''}`)
    }
  }

  if (ctx.personas.length) {
    lines.push('\n## Audience personas')
    for (const p of ctx.personas) {
      lines.push(`- **${p.name}**${p.age_range ? ` (${p.age_range})` : ''}: ${p.description ?? ''}`)
      if (p.pain_points?.length)  lines.push(`    Pain points: ${p.pain_points.join('; ')}`)
      if (p.interests?.length)    lines.push(`    Interests: ${p.interests.join(', ')}`)
    }
  }

  lines.push(`\n## Calendar context`)
  lines.push(`Current month (${monthName(ctx.currentMonth)}): ${ctx.currentMonthThemes.length ? ctx.currentMonthThemes.join(', ') : '(no themes set)'}`)
  lines.push(`Next month (${monthName(ctx.nextMonth)}): ${ctx.nextMonthThemes.length ? ctx.nextMonthThemes.join(', ') : '(no themes set)'}`)

  if (ctx.linkableAssets.length) {
    lines.push('\n## Linkable assets we already own (use to suggest internal links + cross-promotion)')
    for (const a of ctx.linkableAssets) {
      lines.push(`- ${a.title} (${a.url})${a.description ? ' — ' + a.description : ''}`)
    }
  }

  return lines.join('\n')
}
