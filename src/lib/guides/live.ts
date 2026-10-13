/**
 * Is a guide publicly visible right now?
 *
 * Evergreen guides (Childcare, Special Needs) have no window and are always on.
 * Seasonal ones like Fall Festivities are wrong out of season — a hub still
 * advertising pumpkin patches in February is worse than no hub — so they carry
 * live_from / live_until on guide_types and an is_active master switch on
 * guide_configs.
 *
 * Two independent gates on purpose: is_active is the editor's deliberate "go"
 * and works today, while the date window automates the part a human forgets,
 * which is taking it DOWN again in November.
 *
 * live_from / live_until arrive with migration 230. Until it is applied they
 * read back as undefined, which this treats as "no window" — so the is_active
 * switch alone still holds an unlaunched guide closed. No probe needed, and no
 * behaviour change for the nine existing guides.
 */
export interface GuideWindow {
  live_from?:  string | null
  live_until?: string | null
}

export function guideIsLive(
  guide:  GuideWindow,
  config: ({ is_active?: boolean | null } & GuideWindow) | null | undefined,
  opts?: {
    /** Overridable for tests; defaults to today. */
    todayIso?: string
    /**
     * Does a MISSING config row mean "not on this brand"?
     *
     * Pass `true` once guide_configs is per-brand — which it is from
     * migration 232 — because then every brand that offers a guide has a
     * row, and absence is an answer. Without this, a brand with no row fell
     * through to the date window and the guide was live: adding
     * grown-up-time for Greater Pensacola silently opened an empty copy of
     * it on River Region, Eastern Shore and Mobile Bay, navigation and
     * sitemap included.
     *
     * Left false for a pre-232 database, where a single global row exists
     * and absence really does mean "nobody has an opinion, show it".
     */
    requireConfig?: boolean
  },
): boolean {
  if (opts?.requireConfig && !config) return false
  if (config && config.is_active === false) return false

  // The brand's own window wins over the catalog's. live_from/live_until on
  // guide_types are global, so Fall Festivities had one season for all six
  // brands — and Greater Pensacola's runs three weeks later than River
  // Region's. Migration 234 put the same two columns on guide_configs, which
  // is the per-brand table. Either may be set alone: a brand can push its
  // end date out without restating its start.
  const from  = config?.live_from  ?? guide.live_from
  const until = config?.live_until ?? guide.live_until

  const today = opts?.todayIso ?? new Date().toISOString().slice(0, 10)
  if (from  && today < from)  return false
  if (until && today > until) return false
  return true
}
