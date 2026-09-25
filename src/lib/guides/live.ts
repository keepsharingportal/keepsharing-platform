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
  config: { is_active?: boolean | null } | null | undefined,
): boolean {
  if (config && config.is_active === false) return false
  const today = new Date().toISOString().slice(0, 10)
  if (guide.live_from  && today < guide.live_from)  return false
  if (guide.live_until && today > guide.live_until) return false
  return true
}
