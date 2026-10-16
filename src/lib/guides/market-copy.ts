import 'server-only'
import { cache } from 'react'
import { createClient } from '@supabase/supabase-js'
import { currentBrandSlug } from '@/lib/current-brand'

// Editorial copy for a guide type, resolved for the brand being served.
//
// ── Why the legacy columns are not a fallback ───────────────────────────────
// guide_types is the global catalog and has no market column, but its
// editorial fields were written for River Region: they name Montgomery, the
// River Region and its towns 58 times across the ten rows. Falling back to
// them would put River Region's reporting on Greater Pensacola's guide pages
// under Greater Pensacola's masthead.
//
// So resolution is: the brand's own row, then the neutral '*' row, then
// nothing. Never another brand's text. Migration 233 seeded River Region's
// existing copy as its own market row, so its pages are unchanged.
//
// A null field means OMIT the element — not "render an empty heading". See
// the callers, which all guard on the value being present.

export interface GuideMarketCopy {
  displayName?:       string | null
  shortDescription?:  string | null
  hubIntroParagraph?: string | null
  pitch?:             string | null
  editorialIntro?:    string | null
  insiderTips?:       Array<{ tip?: string }> | null
  heroImageUrl?:      string | null
  /**
   * The hub subtitle, resolved market-first.
   *
   * The page wants "pitch, else hub intro, else short description", and
   * resolving each of those field-by-field across markets gets the
   * precedence backwards: a brand that writes a hub intro but no pitch was
   * shown the NEUTRAL pitch, because pitch is consulted first and the
   * neutral row has one. Its own words lost to a generic sentence.
   *
   * So the whole chain is tried against the brand's own row before any of
   * it falls back.
   */
  subtitle?:          string | null
}

const NEUTRAL_MARKET = '*'

/** First non-empty of the subtitle chain within a SINGLE row. */
function subtitleOf(row: Partial<Row> | null | undefined): string | null {
  for (const k of ['pitch', 'hub_intro_paragraph', 'short_description'] as const) {
    const v = row?.[k]
    if (typeof v === 'string' && v.trim()) return v
  }
  return null
}

/**
 * The brand whose words the legacy guide_types columns actually are.
 *
 * Those columns name Montgomery and the River Region throughout, so they are
 * River Region's copy wearing a global table's clothes. Until migration 233
 * seeds guide_type_copy they are the only copy that exists, and dropping
 * them outright would blank River Region's ten live guide pages the moment
 * this deploys — before anyone opens the SQL editor.
 *
 * So they remain a fallback for THIS market only. Vercel deploys on push and
 * a migration is a human running a script; the two orders must both be safe.
 * Once 233 is applied this branch stops being reached, because the seeded
 * 'rrp' rows are an exact copy of it.
 */
const LEGACY_COPY_MARKET = 'rrp'

type Row = {
  market:               string
  guide_type_slug:      string
  display_name:         string | null
  short_description:    string | null
  hub_intro_paragraph:  string | null
  pitch:                string | null
  editorial_intro:      string | null
  insider_tips:         unknown
  hero_image_url:       string | null
}

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

/**
 * Both candidate rows for a guide type in one round trip, cached per request.
 *
 * Returns an empty object if the table does not exist yet — migration 233
 * may not have run, and PostgREST fails the whole query on an unknown
 * relation. In that window every field resolves to null and callers omit the
 * elements, which is the safe direction: no copy beats another brand's copy.
 */
const loadRows = cache(async (guideTypeSlug: string, market: string): Promise<{ own?: Row; neutral?: Row }> => {
  const { data, error } = await sb()
    .from('guide_type_copy')
    .select('*')
    .eq('guide_type_slug', guideTypeSlug)
    .in('market', [market, NEUTRAL_MARKET])

  if (error || !data) return {}
  const rows = data as unknown as Row[]
  return {
    own:     rows.find(r => r.market === market),
    neutral: rows.find(r => r.market === NEUTRAL_MARKET),
  }
})

/**
 * Resolve one guide type's copy for the current brand.
 *
 * `legacy` is the guide_types row, when the caller already has it. It is
 * consulted only for LEGACY_COPY_MARKET — see that constant.
 */
export async function guideMarketCopy(
  guideTypeSlug: string,
  legacy?: Partial<Row> | null,
  /**
   * Brand to resolve copy for. Omit on a normal request — the stamped
   * brand is read then. Pass it from a cached function: `unstable_cache`
   * cannot call headers(), which is how the request brand is normally read.
   */
  marketOverride?: string,
): Promise<GuideMarketCopy> {
  const market = marketOverride ?? (await currentBrandSlug()) ?? 'rrp'
  const { own, neutral } = await loadRows(guideTypeSlug, market)
  const legacyForThisBrand = market === LEGACY_COPY_MARKET ? legacy : null

  // Field-by-field rather than row-by-row: a brand may override the intro
  // and leave the rest to the neutral default.
  const pick = <K extends keyof Row>(k: K): Row[K] | null => {
    const o = own?.[k]
    if (o !== null && o !== undefined && o !== '') return o
    const n = neutral?.[k]
    if (n !== null && n !== undefined && n !== '') return n
    const l = legacyForThisBrand?.[k]
    if (l !== null && l !== undefined && l !== '') return l as Row[K]
    return null
  }

  const tips = pick('insider_tips')
  return {
    // Market-first across the whole chain — see GuideMarketCopy.subtitle.
    subtitle:          subtitleOf(own) ?? subtitleOf(neutral) ?? subtitleOf(legacyForThisBrand),
    displayName:       pick('display_name') as string | null,
    shortDescription:  pick('short_description') as string | null,
    hubIntroParagraph: pick('hub_intro_paragraph') as string | null,
    pitch:             pick('pitch') as string | null,
    editorialIntro:    pick('editorial_intro') as string | null,
    insiderTips:       Array.isArray(tips) ? (tips as Array<{ tip?: string }>) : null,
    heroImageUrl:      pick('hero_image_url') as string | null,
  }
}

/**
 * Copy for several guide types at once — for the hub grid and the homepage
 * cards, which would otherwise issue one query per guide.
 */
export const guideMarketCopyMany = cache(async (
  slugs: string[],
  /** guide_types rows the caller already loaded, keyed by slug. Consulted
   *  only for LEGACY_COPY_MARKET. */
  legacyBySlug?: Record<string, Partial<Row> | null | undefined>,
): Promise<Record<string, GuideMarketCopy>> => {
  if (!slugs.length) return {}
  const market = (await currentBrandSlug()) ?? 'rrp'
  const { data, error } = await sb()
    .from('guide_type_copy')
    .select('*')
    .in('guide_type_slug', slugs)
    .in('market', [market, NEUTRAL_MARKET])

  const out: Record<string, GuideMarketCopy> = {}
  const rows = (error || !data ? [] : data) as unknown as Row[]
  for (const slug of slugs) {
    const own     = rows.find(r => r.guide_type_slug === slug && r.market === market)
    const neutral = rows.find(r => r.guide_type_slug === slug && r.market === NEUTRAL_MARKET)
    const legacy = market === LEGACY_COPY_MARKET ? legacyBySlug?.[slug] : null
    const pick = <K extends keyof Row>(k: K): Row[K] | null => {
      const o = own?.[k]
      if (o !== null && o !== undefined && o !== '') return o
      const n = neutral?.[k]
      if (n !== null && n !== undefined && n !== '') return n
      const l = legacy?.[k]
      if (l !== null && l !== undefined && l !== '') return l as Row[K]
      return null
    }
    const tips = pick('insider_tips')
    out[slug] = {
      subtitle:          subtitleOf(own) ?? subtitleOf(neutral) ?? subtitleOf(legacy),
      displayName:       pick('display_name') as string | null,
      shortDescription:  pick('short_description') as string | null,
      hubIntroParagraph: pick('hub_intro_paragraph') as string | null,
      pitch:             pick('pitch') as string | null,
      editorialIntro:    pick('editorial_intro') as string | null,
      insiderTips:       Array.isArray(tips) ? (tips as Array<{ tip?: string }>) : null,
      heroImageUrl:      pick('hero_image_url') as string | null,
    }
  }
  return out
})
