// Rewrite River-Region-worded copy for whichever brand is being served.
//
// ── Why this exists ─────────────────────────────────────────────────────────
// Roughly 500 reader-facing strings across the app were written when there was
// one brand, so they say "River Region Parents" and "River Region" literally —
// in static config modules (src/lib/submissions.ts), in `export const
// metadata` objects, in JSX copy. A static module cannot await the request's
// brand, so the usual fix (read it from context) does not reach them.
//
// This does at render time what we would otherwise do by hand 500 times.
//
// ── Why it is safe on River Region ──────────────────────────────────────────
// For RRP, displayName IS "River Region Parents" and regionLabel IS "River
// Region", so every substitution returns the input unchanged. The live site
// cannot move. That property is worth preserving if these strings are ever
// edited: keep writing them in River Region's words.
//
// ── Where NOT to use it ─────────────────────────────────────────────────────
// Chrome and config copy only. Never run it over article bodies, event
// descriptions, listing text or anything else a human wrote about an actual
// place — an article that genuinely discusses the River Region must keep
// saying so even when a sibling brand syndicates it.

import type { MarketDef } from './markets'

/** Longest-first so "River Region Parents" is consumed before "River Region"
 *  can match its prefix and leave a stray " Parents" behind. */
export function brandifyCopy(text: string, market: MarketDef): string {
  if (!text) return text
  // Fast path: River Region is the identity transform.
  if (market.slug === 'rrp') return text
  return text
    .replace(/River Region Parents/g, market.displayName)
    .replace(/River Region/g,         market.regionLabel)
}

/** Same, for named string fields on a config object.
 *
 *  Generic over the concrete config type rather than Record<string, unknown>,
 *  so the returned object keeps its exact shape — callers go on using
 *  config.label and config.photoHint with their real types instead of
 *  `unknown`. Non-string fields are passed through untouched. */
export function brandifyFields<T extends object>(
  obj:    T,
  market: MarketDef,
  fields: Array<keyof T>,
): T {
  if (market.slug === 'rrp') return obj
  const out = { ...obj }
  for (const f of fields) {
    const v = out[f]
    if (typeof v === 'string') {
      out[f] = brandifyCopy(v, market) as T[keyof T]
    }
  }
  return out
}
