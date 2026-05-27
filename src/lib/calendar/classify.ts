// Title → category keyword classifier.
//
// Used in two places:
//
//   1. When an event hits the public calendar without a category set —
//      iCal feeds frequently don't include a useful category, and we still
//      want to pick the right CategoryGraphic and surface it under the
//      right filter chip on /calendar.
//
//   2. When the admin is reviewing pending events — auto-suggest a
//      category so the operator doesn't have to type one for every row.
//
// The match is intentionally simple (case-insensitive substring) rather
// than ML/embedding-based: hyperlocal calendar titles use a small,
// predictable vocabulary ("Storytime at the library", "Friday Night Jazz",
// "Summer Reading Kickoff"). A 30-entry keyword table catches ~90% of
// real-world events and is auditable from one file.
//
// Returns a single category slug or null. Order matters — earlier matches
// win, so put more specific tokens (e.g. "movie night") before broader
// ones (e.g. "movie") if both could match the same title.

import { EVENT_CATEGORIES } from '@/lib/calendar-taxonomy'

// Mapping from substring token → category slug. Slugs must exist in
// EVENT_CATEGORIES so the UI can render the right chip + graphic.
const TOKEN_MAP: Array<[RegExp, string]> = [
  // ── Library & Learning ──────────────────────────────────────────────────
  [/\b(storytime|story time|story-time|toddler time|baby time|reading time)\b/i, 'library'],
  [/\b(library|book(s)?|literacy|reading)\b/i,                                   'library'],
  [/\b(class|workshop|seminar|lecture|lesson)\b/i,                              'library'],

  // ── Music & Performance ─────────────────────────────────────────────────
  [/\b(concert|live music|band|jazz|symphony|orchestra|musical)\b/i,           'music'],
  [/\b(open mic|karaoke|dj)\b/i,                                                'music'],

  // ── Arts & Theater ──────────────────────────────────────────────────────
  [/\b(theater|theatre|play|musical theatre)\b/i,                              'arts'],
  [/\b(art (show|exhibit|gallery|class|walk)|painting|sculpture|museum)\b/i,  'arts'],
  [/\b(movie night|family movie|outdoor movie|film screening|cinema)\b/i,     'arts'],
  [/\b(craft|make-and-take|paint and sip)\b/i,                                 'arts'],

  // ── Outdoor & Nature ────────────────────────────────────────────────────
  [/\b(hike|hiking|trail|nature walk|bird watching|garden|park day)\b/i,       'outdoor'],
  [/\b(splash pad|outdoor)\b/i,                                                 'outdoor'],

  // ── Sports & Active ─────────────────────────────────────────────────────
  [/\b(yoga|zumba|fitness|workout|run|race|5k|10k|marathon|tournament|baseball|soccer|basketball|football)\b/i, 'sports'],
  [/\b(swim|swimming lesson|martial arts|karate|gymnastics)\b/i,                'sports'],

  // ── Festivals & Fairs ───────────────────────────────────────────────────
  [/\b(festival|fest|fair|carnival|parade|fireworks)\b/i,                      'festivals'],
  [/\b(food truck|food festival|wine|brewery)\b/i,                              'festivals'],

  // ── Faith & Community ───────────────────────────────────────────────────
  [/\b(worship|service|church|prayer|bible|vbs|vacation bible)\b/i,            'faith'],
  [/\b(volunteer|community service|fundraiser|charity|benefit)\b/i,            'faith'],

  // ── Camps & Workshops ───────────────────────────────────────────────────
  [/\b(summer camp|day camp|sports camp|cooking class|stem camp)\b/i,          'camps'],

  // ── Holiday & Seasonal ──────────────────────────────────────────────────
  [/\b(christmas|holiday|halloween|easter|valentine|thanksgiving|new year|mother'?s day|father'?s day)\b/i, 'holiday'],
  [/\b(trick.or.treat|jack.o.lantern|santa|menorah|hanukkah)\b/i,              'holiday'],

  // ── Family Drop-In ──────────────────────────────────────────────────────
  [/\b(drop.in|open play|playdate|playgroup|family fun|kids day|toddler|preschool)\b/i, 'drop-in'],
]

const KNOWN_SLUGS = new Set(EVENT_CATEGORIES.map(c => c.slug))

/**
 * Suggest a category for an event based on its title. Returns null when
 * nothing matches — callers should fall through to a generic graphic in
 * that case.
 */
export function classifyTitle(title: string | null | undefined): string | null {
  if (!title) return null
  for (const [pattern, slug] of TOKEN_MAP) {
    if (pattern.test(title)) return KNOWN_SLUGS.has(slug) ? slug : null
  }
  return null
}

/**
 * Resolve the effective category for an event — uses the stored value if
 * present, otherwise classifies from the title. Convenience wrapper that
 * keeps callers from repeating the null-check pattern.
 */
export function effectiveCategory(
  category: string | null | undefined,
  title:    string | null | undefined,
): string | null {
  if (category && KNOWN_SLUGS.has(category)) return category
  return classifyTitle(title)
}
