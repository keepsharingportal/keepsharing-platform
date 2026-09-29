// Family Calendar feed ranking — list ORDER only.
//
// ── The rule this serves (Jason, 2026-09-29) ────────────────────────────────
// The River Region Parents Family Calendar is a free public hub for families.
// Layer 1 (src/lib/calendar/promo-denylist.ts) keeps restaurant/bar weeklies
// out. This is layer 2: of what legitimately remains, a parent scanning the
// first screen should hit the storytimes, festivals and family one-offs before
// the adult leagues and the venue's "see our calendar!" placeholder.
//
// ── What this is NOT ────────────────────────────────────────────────────────
// Not a filter. Nothing is removed, only reordered — every occurrence still
// exists further down the list and in More. Not a paid placement either: paid
// ads live in the labelled ad_placements system and never touch this file. If
// ranking ever starts looking like something a business can buy, it has gone
// wrong.
//
// ── Ordering ────────────────────────────────────────────────────────────────
// Chronology is never sacrificed: the list is still day by day, in date order.
// Ranking only decides who leads WITHIN a day.
//
//   date ASC  →  familyScore DESC  →  start_time ASC  →  title ASC
//
// The final title tiebreak exists so the order is stable across requests;
// without it two equal-scoring events swap places on every fetch and the
// client's pagination can drop or double a card.

import { effectiveCategory } from './classify'
import { normalizeTitle } from './title-match'

export interface RankableEvent {
  id:               string
  title:            string
  start_date:       string
  start_time?:      string | null
  end_date?:        string | null
  location_name?:   string | null
  category?:        string | null
  recurrence_rule?: string | null
  is_featured?:     boolean | null
}

// ── Category base ───────────────────────────────────────────────────────────
// Resolved through effectiveCategory so an uncategorised iCal row still scores
// off its title rather than silently landing at 0.
const CATEGORY_BASE: Record<string, number> = {
  'drop-in':   3,
  'library':   3,
  'camps':     3,
  'holiday':   3,
  'festivals': 2,
  'outdoor':   2,
  'arts':      2,
  'music':     1,
  'sports':    1,
  'faith':     1,
}

// ── Keyword boosts ──────────────────────────────────────────────────────────
// What a parent is actually scanning for. Contributions are summed and then
// capped at +4, so a title stuffed with "family kids children fall festival"
// can't run away with the day.
const BOOST_TERMS: RegExp[] = [
  /\bstory\s*times?\b/i,
  /\btoddlers?\b/i,
  /\blittle\s+learners\b/i,
  /\bkids?\b/i,
  /\bchildren'?s?\b/i,
  /\bfamily\b/i,
  /\bpre-?schools?\b/i,
  /\bmovie\s+night\b/i,
  /\bfall\s+festival\b/i,
  /\bpumpkins?\b/i,
  /\bhalloween\b/i,
  /\bfairs?\b/i,
  /\bfestivals?\b/i,
  /\bcampouts?\b/i,
  /\bcrafts?\b/i,
]
const BOOST_EACH = 1
const BOOST_CAP  = 4

// ── Keyword demotes ─────────────────────────────────────────────────────────
// Tie-breaks for leftovers, never a delete. These rows are legitimately
// published — they just shouldn't be the first thing a parent sees on a
// Saturday when a fall festival is on the same day.
//
// Nothing here fires on a concert. A concert is family-viable and the product
// rule is explicit that music gets a mild boost and never a demote just for
// being music.
// `scope` matters. Most signals read the title AND the venue, but a pattern
// anchored to the end of a string cannot: the haystack is `title location`, so
// /calendar!$/ tested against "BB King's Blues Club Calendar! BB Kings Blues
// Club" never matches and the placeholder row scored +1 instead of -1.
const DEMOTE_TERMS: Array<{ pattern: RegExp; scope: 'title' | 'both' }> = [
  { pattern: /\bscavenger\s+hunt\b/i, scope: 'both'  },
  { pattern: /\bleagues?\b/i,         scope: 'both'  },
  { pattern: /\bnetworking\b/i,       scope: 'both'  },
  // The venue placeholder row: "BB King's Blues Club Calendar!". A title whose
  // whole job is to say "go look at our calendar" is not an event.
  { pattern: /\bcalendar\s*!?\s*$/i,  scope: 'title' },
]
const DEMOTE_EACH  = -2
const DEMOTE_FLOOR = -6

const SCORE_MIN = -6
const SCORE_MAX = 10

/**
 * Family-relevance score for one occurrence. In memory only — nothing is
 * persisted, so the weights can be tuned without a migration.
 */
export function familyScore(ev: RankableEvent): number {
  const category = effectiveCategory(ev.category, ev.title)
  let score = category ? (CATEGORY_BASE[category] ?? 0) : 0

  // Boosts read the title AND the venue: "Storytime" carries its own signal,
  // but so does "Billingsley Children's Programming" at a library.
  const title    = ev.title ?? ''
  const haystack = `${title} ${ev.location_name ?? ''}`

  let boost = 0
  for (const t of BOOST_TERMS) if (t.test(haystack)) boost += BOOST_EACH
  score += Math.min(boost, BOOST_CAP)

  let demote = 0
  for (const { pattern, scope } of DEMOTE_TERMS) {
    if (pattern.test(scope === 'title' ? title : haystack)) demote += DEMOTE_EACH
  }
  score += Math.max(demote, DEMOTE_FLOOR)

  // A one-off beats a weekly on the same day. The weekly will come round
  // again; the one-off is the thing a parent can miss.
  if (!hasRecurrence(ev)) score += 2

  // Editor's thumb on the scale. Same weight as being a one-off — enough to
  // lead a day, not enough to outrank a genuinely better-matched event.
  if (ev.is_featured) score += 2

  return clamp(score, SCORE_MIN, SCORE_MAX)
}

/** Sort one expanded feed: date, then family score, then time, then title. */
export function sortByFamilyRelevance<T extends RankableEvent>(events: T[]): T[] {
  return [...events]
    .map(ev => ({ ev, score: familyScore(ev) }))
    .sort((a, b) =>
      a.ev.start_date.localeCompare(b.ev.start_date) ||
      b.score - a.score ||
      timeKey(a.ev.start_time).localeCompare(timeKey(b.ev.start_time)) ||
      a.ev.title.localeCompare(b.ev.title),
    )
    .map(x => x.ev)
}

// ── First-screen repeat cap ─────────────────────────────────────────────────
// Twelve cards is roughly what a parent sees before deciding the calendar is
// worth scrolling. A single weekly that occurs on nine of the next twelve days
// can fill that screen on its own, which makes a busy calendar look empty.
//
// Allowances inside the first 12 cards, by kind:
//   multi-day / daily continuous   1   (a sidewalk sale that "runs all week"
//                                       is one thing to know about, once)
//   family kids weekly             2   (library storytime, nature school —
//                                       two chances to catch a good one)
//   any other weekly               1
//   one-off                        unlimited (each is its own event anyway)
//
// Excess occurrences are DEFERRED, not dropped: they re-join the list right
// after the first twelve, keeping their date order among themselves.

export const FIRST_SCREEN = 12

const FAMILY_WEEKLY_VENUE = /\b(librar|nature\s+school|nature\s+center|museum|ymca|community\s+center|zoo)\b/i

function allowanceInFirstScreen(ev: RankableEvent): number {
  if (!hasRecurrence(ev) && !isMultiDay(ev)) return Number.POSITIVE_INFINITY
  if (isMultiDay(ev) || isDailyRule(ev.recurrence_rule)) return 1
  const haystack = `${ev.title ?? ''} ${ev.location_name ?? ''}`
  if (FAMILY_WEEKLY_VENUE.test(haystack) || familyScore(ev) >= 5) return 2
  return 1
}

/**
 * Apply the repeat cap to an already-sorted feed.
 *
 * Nothing is lost — deferred occurrences rejoin the list immediately after the
 * first screen. Page 1 just stops being one event printed twelve times.
 *
 * ── The one place chronology is relaxed, and why ────────────────────────────
 * A strict global date order and a first-screen repeat cap cannot both hold:
 * deferring Wednesday's occurrence past a first screen that already reaches
 * Friday necessarily puts a Wednesday card after a Friday one. The product
 * rule anticipates this — "later occurrences still exist after the cap / in
 * More" — so the result is exactly TWO date-ascending runs: the first screen,
 * then everything after it. Within each run, chronology and the within-day
 * ordering both hold. The remainder is re-sorted through the same comparator
 * rather than merely concatenated, so the "More" block reads as a calendar
 * rather than as leftovers.
 *
 * What this deliberately does NOT do: when a weekly is the only thing in the
 * window, its deferred occurrences move straight back up into the first
 * twelve. The cap exists to stop one event crowding out others, not to leave
 * a quiet week showing two cards and white space.
 */
export function capFirstScreenRepeats<T extends RankableEvent>(
  events: T[],
  firstScreen = FIRST_SCREEN,
): T[] {
  const head: T[]      = []
  const remainder: T[] = []
  const used = new Map<string, number>()

  for (const ev of events) {
    if (head.length >= firstScreen) { remainder.push(ev); continue }

    const seen    = used.get(ev.id) ?? 0
    const allowed = allowanceInFirstScreen(ev)
    if (seen >= allowed) { remainder.push(ev); continue }

    used.set(ev.id, seen + 1)
    head.push(ev)
  }

  return [...head, ...sortByFamilyRelevance(remainder)]
}

// ── Display dedupe ──────────────────────────────────────────────────────────

/**
 * Collapse rows that are the same event arriving from two sources.
 *
 * Keyed on normalized title (reusing title-match.ts so the notion of "same
 * title" stays in one place) + date + location + time. Time stays in the key
 * on purpose: a 10am and a 2pm storytime at the same library on the same day
 * are two sessions a parent can choose between, not a duplicate.
 *
 * First occurrence wins, so dedupe BEFORE sorting would keep an arbitrary one.
 * Callers should sort first.
 */
export function dedupeFeed<T extends RankableEvent>(events: T[]): T[] {
  const seen = new Set<string>()
  const out: T[] = []
  for (const ev of events) {
    const key = [
      normalizeTitle(ev.title ?? ''),
      ev.start_date ?? '',
      (ev.location_name ?? '').toLowerCase().trim(),
      ev.start_time ?? '',
    ].join('|')
    if (seen.has(key)) continue
    seen.add(key)
    out.push(ev)
  }
  return out
}

/**
 * The whole layer-2 pipeline, in the order the feed needs it: sort so the
 * dedupe keeps the best-ranked copy, collapse duplicates, then cap repeats on
 * the first screen.
 */
export function rankFeed<T extends RankableEvent>(events: T[], firstScreen = FIRST_SCREEN): T[] {
  return capFirstScreenRepeats(dedupeFeed(sortByFamilyRelevance(events)), firstScreen)
}

// ── helpers ─────────────────────────────────────────────────────────────────

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n))
}

function hasRecurrence(ev: RankableEvent): boolean {
  return Boolean(ev.recurrence_rule && String(ev.recurrence_rule).trim())
}

function isDailyRule(rule: string | null | undefined): boolean {
  return Boolean(rule && /FREQ=DAILY/i.test(rule))
}

function isMultiDay(ev: RankableEvent): boolean {
  return Boolean(ev.end_date && ev.end_date > ev.start_date)
}

/** Null times sort last within a day — an event with a time is more useful to
 *  a parent planning an afternoon than one that just says "Saturday". */
function timeKey(t: string | null | undefined): string {
  return t && t.trim() ? t : '99:99:99'
}
