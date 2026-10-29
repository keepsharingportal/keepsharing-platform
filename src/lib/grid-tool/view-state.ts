// What the tool remembers between visits, and what it deliberately forgets.
//
// There are two kinds of setting mixed into one object. Canvas size, line
// colour, line weight, units, labels — those are how you have the tool set
// up, and you would be annoyed to re-enter them. But which guides are
// currently drawn over the picture is not a preference, it is a decision you
// made about one particular photo.
//
// Restoring the second kind is actively harmful here: you open the tool,
// upload a new photo, and it already has thirds and a grid laid over it from
// a week ago. You are then judging a composition against someone else's
// answer before you have formed your own — which is the exact opposite of
// what these guides are for.
//
// So: the setup persists, the view starts blank every time.

/**
 * The fields that describe WHAT IS CURRENTLY DRAWN over the picture.
 *
 * Anything listed here is dropped on save and on restore, falling back to its
 * default. Add to this list, not to the component, when a new overlay arrives.
 */
export const VIEW_STATE_KEYS = [
  'overlays',      // rule of thirds, phi, spiral, armature, diagonals, centre
  'motif',         // the L, S-curve, cross, radiating lines and friends
  'motifFlipX',
  'motifFlipY',
  'spiralFlipX',
  'spiralFlipY',
  'showGrid',      // the transfer grid itself
] as const

export type ViewStateKey = (typeof VIEW_STATE_KEYS)[number]

/**
 * A copy of `saved` with every "currently drawn" field removed, so spreading
 * it over the defaults leaves a clean picture.
 *
 * Deliberately subtractive rather than listing what to keep: a setting added
 * later is a preference by default and persists, which is the safer failure.
 * Forgetting to persist a new colour picker is a small annoyance; silently
 * restoring a new overlay is the bug this exists to prevent.
 */
export function blankView<T extends object>(saved: T): Partial<T> {
  const out: Partial<T> = { ...saved }
  for (const k of VIEW_STATE_KEYS) {
    delete out[k as unknown as keyof T]
  }
  return out
}
