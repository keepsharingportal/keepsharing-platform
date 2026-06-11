// Brand voice loader + AI prompt fragment builder.
//
// MARKETS in src/lib/markets.ts is the slug/display/city source of truth.
// brand_voice in the DB holds the AI-drafting context per brand. This
// module joins them so callers get one object with everything they need.

import { createClient } from '@supabase/supabase-js'
import { MARKETS, marketDisplayName, type MarketDef } from './markets'

export interface BrandVoiceRow {
  brand_slug:       string
  audience_summary: string
  voice_rules:      string
  avoid_list:       string
  format_default:   string
  site_url:         string | null
  ghl_tag:          string | null
  // Chrome fields (migration 162) — optional so legacy environments work.
  tagline:                   string | null
  logo_url:                  string | null
  primary_color_hex:         string | null
  accent_color_hex:          string | null
  contact_email:             string | null
  social_facebook:           string | null
  social_instagram:          string | null
  homepage_rotation_columns: string[] | null
  // Per-brand GHL routing (migration 164).
  ghl_newsletter_list_id:   string | null
  ghl_subscriber_tag:       string | null
  ghl_welcome_workflow_id:  string | null
  updated_at:       string
}

/** Per-brand chrome with sensible defaults. Use this in render code instead
 *  of reading brand.voice?.tagline yourself — the defaults are documented
 *  here so a missing brand_voice row degrades to legible RRP-style chrome
 *  rather than blank strings. */
export interface BrandChrome {
  tagline:          string
  logoUrl:          string | null
  primaryColorHex:  string
  accentColorHex:   string
  contactEmail:     string
  socialFacebook:   string | null
  socialInstagram:  string | null
  /** Column slugs to feature in the homepage rotation block. */
  homepageRotationColumns: string[]
}

const DEFAULT_PRIMARY = '#c4622d'   // RRP coral
const DEFAULT_ACCENT  = '#1a2744'   // RRP navy
const DEFAULT_ROTATION_COLUMNS = ['mom-to-mom', 'teacher-of-month', 'grands-greatest', 'play-ball']

export function chromeForBrand(brand: Brand): BrandChrome {
  const v = brand.voice
  return {
    tagline:                 v?.tagline                   ?? `${brand.displayName} — local stories, every month.`,
    logoUrl:                 v?.logo_url                  ?? null,
    primaryColorHex:         v?.primary_color_hex          ?? DEFAULT_PRIMARY,
    accentColorHex:          v?.accent_color_hex           ?? DEFAULT_ACCENT,
    contactEmail:            v?.contact_email              ?? 'hello@riverregionparents.com',
    socialFacebook:          v?.social_facebook            ?? null,
    socialInstagram:         v?.social_instagram           ?? null,
    homepageRotationColumns: v?.homepage_rotation_columns ?? DEFAULT_ROTATION_COLUMNS,
  }
}

export interface Brand {
  slug:             string
  displayName:      string
  market:           MarketDef | null
  voice:            BrandVoiceRow | null
}

function adminDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  )
}

/** Load all six brands with their voice rows (if migrated + populated). */
export async function loadBrands(): Promise<Brand[]> {
  const db = adminDb()
  let voices: BrandVoiceRow[] = []
  try {
    const { data, error } = await db.from('brand_voice').select('*')
    if (!error) voices = (data ?? []) as BrandVoiceRow[]
  } catch { /* pre-154; degrade */ }
  return MARKETS.map(m => ({
    slug:        m.slug,
    displayName: m.displayName,
    market:      m,
    voice:       voices.find(v => v.brand_slug === m.slug) ?? null,
  }))
}

export async function loadBrand(slug: string): Promise<Brand | null> {
  const all = await loadBrands()
  return all.find(b => b.slug === slug) ?? null
}

/** Build the brand context fragment for an AI prompt. Always returns a
 *  non-empty string — even with no voice row, we surface the brand name
 *  + audience so the AI doesn't write context-blind. */
export function buildBrandPromptFragment(brand: Brand): string {
  const lines: string[] = [
    `Brand: ${brand.displayName} (${brand.slug.toUpperCase()})`,
    brand.market ? `Region: ${brand.market.city}, ${brand.market.state}` : '',
  ]
  const v = brand.voice
  if (v) {
    if (v.audience_summary) lines.push('', 'Audience:', v.audience_summary)
    if (v.voice_rules)      lines.push('', 'Voice rules:', v.voice_rules)
    if (v.format_default)   lines.push('', 'Format defaults:', v.format_default)
    if (v.avoid_list)       lines.push('', 'AVOID:', v.avoid_list)
  } else {
    lines.push('', 'Voice rules: not yet configured for this brand — default to a warm, locally-grounded tone.')
  }
  return lines.filter(Boolean).join('\n')
}

export function displayNameForSlug(slug: string): string {
  return marketDisplayName(slug)
}
