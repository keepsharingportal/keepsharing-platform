// Single source of truth for the Family Brain Games drawing.
//
// The prize was previously written out by hand in ~10 places — the /games
// hero, the in-game win screen, and six spots in /admin/games — so changing
// "3 × $10 weekly" meant finding every string and hoping none were missed.
// The same drift already bit us with the site tagline (three copies) and the
// event time formatter (three copies, and the homepage missing one).
//
// Change the numbers HERE and every surface follows.
//
// Note the cadence is weekly by design, not by accident: game_scores carries
// iso_week/iso_year, winners are grouped by week, and "new drawing Monday" is
// the reason a player comes back. Moving to a monthly draw is a schema and
// logic change, not a copy change.

interface GamesPrizeConfig {
  /** How many winners are drawn each cycle. The save-winners API accepts 1-3. */
  winnersPerDraw: number
  /** Dollars each winner receives. */
  amountUsd: number
  /** Day the draw happens. Used in player-facing copy. */
  drawDay: string
}

// Not `as const` on purpose — these are meant to be edited. Literal types would
// make the pluralization checks below ("winnersPerDraw === 1") impossible
// comparisons and fail the build the moment the value isn't 3.
export const GAMES_PRIZE: GamesPrizeConfig = {
  // One larger winner beats three small ones: $10 split three ways reads as
  // barely worth a form fill, and consolidating raises the perceived value
  // without raising spend ($100/mo here vs the $120/mo the 3 x $10 draw cost).
  // Cadence stays weekly deliberately — "new drawing Monday" is the
  // return-visit trigger, and game_scores groups entries by iso_week.
  winnersPerDraw: 1,
  amountUsd: 25,
  drawDay: 'Monday',
}

const NUMBER_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five'] as const

function numberWord(n: number): string {
  return NUMBER_WORDS[n] ?? String(n)
}

/** "$10" */
export function prizeAmount(): string {
  return `$${GAMES_PRIZE.amountUsd}`
}

/** Hero headline: "Three $10 winners every Monday" / "One $25 winner every Monday" */
export function prizeHeadline(): string {
  const { winnersPerDraw, drawDay } = GAMES_PRIZE
  const word   = numberWord(winnersPerDraw)
  const noun   = winnersPerDraw === 1 ? 'winner' : 'winners'
  const capped = word.charAt(0).toUpperCase() + word.slice(1)
  return `${capped} ${prizeAmount()} ${noun} every ${drawDay}`
}

/** Compact line: "3 winners every Monday · $10 each" / "1 winner every Monday · $25" */
export function prizeShortLine(): string {
  const { winnersPerDraw, drawDay } = GAMES_PRIZE
  const noun = winnersPerDraw === 1 ? 'winner' : 'winners'
  const each = winnersPerDraw === 1 ? prizeAmount() : `${prizeAmount()} each`
  return `${winnersPerDraw} ${noun} every ${drawDay} · ${each}`
}

/** Winners-pill label: "Last week's $10 winners" / "Last week's $25 winner" */
export function prizeWinnersLabel(): string {
  const noun = GAMES_PRIZE.winnersPerDraw === 1 ? 'winner' : 'winners'
  return `Last week's ${prizeAmount()} ${noun}`
}

/** Admin-facing: "3 × $10" */
export function prizeAdminLabel(): string {
  return `${GAMES_PRIZE.winnersPerDraw} × ${prizeAmount()}`
}
