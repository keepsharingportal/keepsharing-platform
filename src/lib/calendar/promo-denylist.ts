// Editorial exclusion for the Family Calendar.
//
// ── The rule this encodes (Jason, 2026-09-29) ───────────────────────────────
// The River Region Parents Family Calendar is a free public hub for families,
// not a restaurant specials board. Recurring restaurant/bar promos and thin
// adult weeklies should not be published. Concerts, fairs, museums, libraries,
// parks, schools, camps, holiday and family one-offs, and community sales stay.
// Library kids programs stay even when the title says "trivia".
//
// ── Why a guard and not a sweep ─────────────────────────────────────────────
// Connie has already drafted the known offenders by hand. This does not
// unpublish anything; it stops the same rows walking back in through the next
// iCal pull or CSV import, which is the only reason they were there in the
// first place.
//
// ── Why two conditions, not one ─────────────────────────────────────────────
// A keyword alone is not enough evidence to refuse an editor's publish. "Wine
// tasting" is a bar weekly at a taproom and a church fundraiser at a church;
// "trivia night" is an adult weekly at a pub and a fundraiser at an elementary
// school. So a hit only blocks when the row is ALSO either recurring or clearly
// a drinking-venue special. A one-off at a non-venue passes — that is a human
// editorial call, not something a keyword table gets to make.

/** A denylist term plus the human-readable reason it exists. */
interface DenyTerm {
  pattern: RegExp
  reason:  string
}

// Matched case-insensitively against `${title} ${location_name}`.
//
// Deliberately phrase-level, not word-level. "taco tuesday" rather than
// "tuesday", "trivia night" rather than "trivia", "wing night" rather than
// "night" — the calendar is full of Thrifty Tuesdays at the zoo and Family
// Game Nights, and a loose token would take them all out.
const DENY_TERMS: DenyTerm[] = [
  { pattern: /\btaco\s+tuesday\b/i,                 reason: 'recurring restaurant promo (taco tuesday)' },
  { pattern: /\btacos?\s*(&|and)\s*tallboys?\b/i,   reason: 'recurring restaurant promo (tacos & tallboys)' },
  { pattern: /\btrivia\s+night\b/i,                 reason: 'adult weekly (trivia night)' },
  { pattern: /\bweekly\s+wedge\b/i,                 reason: 'recurring venue special (weekly wedge)' },
  { pattern: /\bgolfaholic\b/i,                     reason: 'adult recreational league (golfaholic)' },
  { pattern: /\bhappy\s+hour\b/i,                   reason: 'drink promo (happy hour)' },
  { pattern: /\bkaraoke\b/i,                        reason: 'adult weekly (karaoke)' },
  { pattern: /\bnewcomers?\b/i,                     reason: 'adult social club (newcomers)' },
  { pattern: /\bget\s+acquainted\b/i,               reason: 'adult social club (get acquainted)' },
  { pattern: /\bwine\s+tasting\b/i,                 reason: 'adult drink event (wine tasting)' },
  { pattern: /\bladies'?\s+night\b/i,               reason: 'adult weekly (ladies night)' },
  { pattern: /\bwing\s+night\b/i,                   reason: 'recurring restaurant promo (wing night)' },
  { pattern: /\bdrink\s+special/i,                  reason: 'drink promo (drink special)' },
]

// Venues that do not run adult drink weeklies. A hit here exempts the row
// outright — this is what keeps "Dino Movie & Trivia at Autauga-Prattville
// Public Library" published, and would keep a library's "Trivia Night" too.
//
// Note what is NOT in here: a bare "park". Lagoon Park Golfaholic League is an
// explicit offender, and exempting on "park" would hand it a free pass.
const FAMILY_VENUE = /\b(library|librar|museum|nature\s+center|nature\s+school|zoo|botanical|ymca|community\s+center|recreation\s+center|rec\s+center|elementary|middle\s+school|high\s+school|preschool|academy|children'?s\s+(museum|center))\b/i

// Drinking-venue signals. Present in the title or location, a denylist hit is
// a venue special even when nobody set a recurrence rule — plenty of weeklies
// arrive from a feed as a string of one-off rows.
const DRINKING_VENUE = /\b(bar|bars|pub|public\s+house|brewery|brewing|brew\s*pub|taproom|tap\s+room|tavern|saloon|cantina|lounge|winery|distillery|beer\s+garden|ale\s*house|grill\s*(&|and)\s*bar|sports\s+bar)\b/i

// Standalone drink-promo language — a venue special on its own evidence,
// wherever it is happening.
//
// No leading \b on purpose: "$" is not a word character, so \b before it can
// never match and "Happy Hour — $5 drafts" would sail straight through.
const DRINK_PROMO = /(?:^|[\s(\-—])(?:\$\d+\s*(?:drafts?|pints?|wells?|shots?|margaritas?|beers?)|half[\s-]?price\s+(?:drinks?|drafts?|pitchers?|apps?)|two\s+for\s+one\s+drinks?|bottomless\s+mimosas?)/i

/** Curly quotes → straight, so one spelling of a pattern covers both. Feeds
 *  and copy-paste bring "Eddy’s" and "Ladies’ Night" in with U+2019, and a
 *  pattern written with a plain apostrophe would silently miss them. */
function normalizeQuotes(s: string): string {
  return s.replace(/[‘’ʼ]/g, "'").replace(/[“”]/g, '"')
}

export interface PromoCheckInput {
  title?:            string | null
  location_name?:    string | null
  recurrence_rule?:  string | null
}

export interface PromoCheckResult {
  /** True when this row must not be published without an explicit override. */
  blocked: boolean
  /** Human-readable why — goes in the log line and the API error. */
  reason:  string | null
  /** The matched phrase, for the log. Null when nothing matched. */
  term:    string | null
}

/**
 * Does this row look like a recurring food/drink promo or a thin adult weekly?
 *
 * Returns `blocked: false` for everything else, including a denylist hit that
 * is a genuine one-off somewhere that isn't a bar. See the module header for
 * why the bar is deliberately set that high.
 */
export function checkPromoDenylist(ev: PromoCheckInput): PromoCheckResult {
  const haystack = normalizeQuotes(`${ev.title ?? ''} ${ev.location_name ?? ''}`)

  // Family venues are exempt before anything else is considered. A library's
  // trivia is a kids program; the product rule says so explicitly.
  if (FAMILY_VENUE.test(haystack)) {
    return { blocked: false, reason: null, term: null }
  }

  const hit = DENY_TERMS.find(t => t.pattern.test(haystack))
  if (!hit) return { blocked: false, reason: null, term: null }

  const matched = haystack.match(hit.pattern)?.[0]?.trim() ?? null

  const isRecurring    = Boolean(ev.recurrence_rule && String(ev.recurrence_rule).trim())
  const isVenueSpecial = DRINKING_VENUE.test(haystack) || DRINK_PROMO.test(haystack)

  if (!isRecurring && !isVenueSpecial) {
    // One-off, not at a drinking venue. Could be a school fundraiser trivia
    // night or a church wine tasting — an editor's call, not a keyword's.
    return { blocked: false, reason: null, term: matched }
  }

  const qualifier = isRecurring ? 'recurring' : 'at a drinking venue'
  return {
    blocked: true,
    reason:  `Family Calendar policy: ${hit.reason}, ${qualifier}. This is a free hub for families, not a specials board. Save it as a draft, or pass allow_promo:true to publish anyway.`,
    term:    matched,
  }
}

/**
 * Wrapper for the publish paths. Logs the refusal with enough detail to audit
 * later, and returns the result so the caller can turn it into a 422 or skip
 * the row. `override` is the editor's deliberate "publish it anyway" — logged
 * too, so an override is as visible as a block.
 */
export function guardPublish(
  ev:       PromoCheckInput,
  source:   string,
  override = false,
): PromoCheckResult {
  const result = checkPromoDenylist(ev)
  if (!result.blocked) return result

  if (override) {
    console.warn(
      `[calendar/promo-denylist] OVERRIDE (${source}) — publishing "${ev.title}" despite match "${result.term}"`,
    )
    return { blocked: false, reason: null, term: result.term }
  }

  console.warn(
    `[calendar/promo-denylist] REFUSED (${source}) — "${ev.title}" @ "${ev.location_name ?? 'no venue'}" ` +
    `matched "${result.term}" (recurring=${Boolean(ev.recurrence_rule)})`,
  )
  return result
}
