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
  // Extended chrome (migration 169) — used by the 50+ template family.
  // Parents brands leave these NULL and inherit defaults from globals.css.
  template_family:          string | null     // 'parents' | 'fifty-plus' | null = inherit from MARKETS
  tertiary_color_hex:       string | null
  background_color_hex:     string | null
  foreground_color_hex:     string | null
  wordmark_eyebrow:         string | null
  wordmark_accent:          string | null
  wordmark_primary:         string | null
  updated_at:       string
}

/** Per-brand chrome with sensible defaults. Use this in render code instead
 *  of reading brand.voice?.tagline yourself — the defaults are documented
 *  here so a missing brand_voice row degrades to legible RRP-style chrome
 *  rather than blank strings.
 *
 *  Extended in migration 169: the 50+ template needs tertiary color,
 *  background/foreground overrides, and wordmark text parts. Parents
 *  brands ignore these (defaults below fall back to RRP look). */
export interface BrandChrome {
  tagline:          string
  logoUrl:          string | null
  primaryColorHex:  string
  accentColorHex:   string
  tertiaryColorHex: string
  backgroundColorHex: string
  foregroundColorHex: string
  contactEmail:     string
  socialFacebook:   string | null
  socialInstagram:  string | null
  /** Column slugs to feature in the homepage rotation block. */
  homepageRotationColumns: string[]
  /** Three-part text wordmark: eyebrow over primary + accent over tagline.
   *  Used when logoUrl is null (text wordmark) on the 50+ template + future
   *  text-wordmark brands. Defaults derive from the display name. */
  wordmarkEyebrow:  string | null
  wordmarkPrimary:  string | null
  wordmarkAccent:   string | null
}

// Parents defaults — match globals.css public-page tokens.
const PARENTS_DEFAULTS = {
  primary:    '#ef6442',  // RRP coral (legacy default)
  accent:     '#1a2744',  // RRP navy
  tertiary:   '#f3bf24',  // gold
  background: '#fbfaf8',  // cream
  foreground: '#2b2420',  // warm dark
  rotation:   ['mom-to-mom', 'teacher-of-month', 'grands-greatest', 'play-ball'],
}
// Fifty-plus defaults — match the River Region 50+ design system.
const FIFTY_PLUS_DEFAULTS = {
  primary:    '#0B1F37',  // navy
  accent:     '#D08826',  // amber (secondary)
  tertiary:   '#FAB320',  // bright gold
  background: '#FAF7F1',  // warm cream
  foreground: '#0B1F37',  // navy text
  rotation:   ['escape-and-explore', 'wellness', 'local-tails', 'neighbor-of-the-week'],
}

export function chromeForBrand(brand: Brand): BrandChrome {
  const v = brand.voice
  const family = (v?.template_family ?? brand.market?.family ?? 'parents') as 'parents' | 'fifty-plus'
  const D = family === 'fifty-plus' ? FIFTY_PLUS_DEFAULTS : PARENTS_DEFAULTS
  return {
    tagline:                 v?.tagline                   ?? (family === 'fifty-plus' ? 'Live Where Life Matters' : `${brand.displayName} — local stories, every month.`),
    logoUrl:                 v?.logo_url                  ?? null,
    primaryColorHex:         v?.primary_color_hex         ?? D.primary,
    accentColorHex:          v?.accent_color_hex          ?? D.accent,
    tertiaryColorHex:        v?.tertiary_color_hex        ?? D.tertiary,
    backgroundColorHex:      v?.background_color_hex      ?? D.background,
    foregroundColorHex:      v?.foreground_color_hex      ?? D.foreground,
    contactEmail:            v?.contact_email             ?? (family === 'fifty-plus' ? 'hello@riverregion50plus.com' : 'hello@riverregionparents.com'),
    socialFacebook:          v?.social_facebook           ?? null,
    socialInstagram:         v?.social_instagram          ?? null,
    homepageRotationColumns: v?.homepage_rotation_columns ?? D.rotation,
    wordmarkEyebrow:         v?.wordmark_eyebrow          ?? null,
    wordmarkPrimary:         v?.wordmark_primary          ?? null,
    wordmarkAccent:          v?.wordmark_accent           ?? null,
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
