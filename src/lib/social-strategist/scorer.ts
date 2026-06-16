// ── Strategist: deterministic pre-scoring ─────────────────────────
//
// Scores each candidate 0-100 by editorial heuristics — recency,
// timeliness, performance signal, content type freshness. This filter
// runs FIRST so we only send Claude a sharp 60-item shortlist to
// compose the week from, not the full 200+ pool.
//
// Scoring dimensions, max contribution:
//   base                            +50
//   timeliness (event in window)    +35
//   recency (fresher = better)      +25
//   performance (engagement lift)   +20
//   pool-cooldown penalty          -25
//   missing-image penalty          -10
//
// The composer (Claude) gets the scored shortlist + raw scores + the
// performance summary and makes the final editorial call.

import type { Candidate } from './candidates'

export interface PerformanceSummary {
  /** engagement-rate index 0-1, by (source_kind, tone). 1 = best in brand. */
  byKindTone: Record<string, number>
}

const COOLDOWN_DAYS = {
  article:    21,  // rotates fine; can hit again after 3 weeks
  school_bit: 14,
  event:       0,  // events are one-shot; lastUsedAt only blocks repost of same event
  quote:      45,  // quotes feel stale fast
  spotlight:  30,
  video:      45,
} as const

export function scoreCandidate(c: Candidate, perf: PerformanceSummary): number {
  let score = 50

  // ── Timeliness ────────────────────────────────────────────────
  if (c.sourceKind === 'event' && c.anchorDate) {
    const daysToEvent = (new Date(c.anchorDate).getTime() - Date.now()) / 86400_000
    if (daysToEvent < 0)  score -= 100              // past event, suppress
    else if (daysToEvent < 1)  score += 35          // today/tomorrow → peak boost
    else if (daysToEvent < 4)  score += 30          // 1-3 days out
    else if (daysToEvent < 8)  score += 20          // this week
    else                      score += 5            // further out, low boost
  }

  // ── Recency (articles + school bits) ──────────────────────────
  if (c.publishedAt) {
    const daysOld = (Date.now() - new Date(c.publishedAt).getTime()) / 86400_000
    if (daysOld <= 7)        score += 25
    else if (daysOld <= 30)  score += 15
    else if (daysOld <= 60)  score += 5
    else                     score -= 5
  }

  // ── Pool cooldown ─────────────────────────────────────────────
  if (c.lastUsedAt) {
    const sinceLastUse = (Date.now() - new Date(c.lastUsedAt).getTime()) / 86400_000
    const cd = COOLDOWN_DAYS[c.sourceKind]
    if (sinceLastUse < cd) score -= 25
    else if (sinceLastUse < cd * 2) score -= 10
  }

  // ── Performance lift (auto-bias loop, Phase 4 feeds this) ────
  const kindTone = `${c.sourceKind}:${c.toneHint ?? 'any'}`
  const lift     = perf.byKindTone[kindTone] ?? 0.5
  score += Math.round((lift - 0.5) * 40) // -20..+20

  // ── Missing image penalty (FB/IG without an image is weak) ──
  if (!c.imageUrl) score -= 10

  return Math.max(0, Math.min(100, score))
}

export function shortlist(
  candidates: Candidate[],
  perf:       PerformanceSummary,
  k:          number = 60,
): Array<Candidate & { score: number }> {
  return candidates
    .map(c => ({ ...c, score: scoreCandidate(c, perf) }))
    .filter(c => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
}
