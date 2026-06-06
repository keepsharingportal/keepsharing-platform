// Article body ad positioning + allocation.
//
// Mental model: every article body has up to 3 ad insertion points
// (roughly 30%, 55%, 80% through the chunks). The renderer decides
// HOW MANY positions to use based on body length (very short articles
// only get 1 ad), and WHICH advertiser fills each position based on
// weighted random selection with refill.
//
// Allocation rules:
//   - Empty pool → return all nulls (positions stay blank)
//   - One advertiser → fills every position (full-page exclusive ownership)
//   - Two+ advertisers, equal weights → distributed evenly across positions
//   - Two+ advertisers, mixed weights → higher rotation_weight wins more
//     positions (matches the "Full page advertiser appears more than
//     Quarter Page" pattern from the editor's WordPress plugin)
//
// The "pick without replacement then refill" pattern means:
//   - If you have 1 ad, it gets 3 positions (good for exclusivity)
//   - If you have 3 ads all weight 1, each gets exactly 1 position
//   - If you have 2 ads weighted 3/1, the heavier wins 2 positions, the
//     lighter wins 1 — matching the 3:1 weight ratio
//   - If you have 5 ads, only the top 3 (weighted-random pick) appear

import type { ActiveAd } from '@/lib/get-active-ads'

/**
 * Decide how many ad slots a given body should carry. Short articles
 * shouldn't be drowned in ads; long articles can carry the full 3.
 */
export function bodyPositionCount(chunkCount: number): number {
  if (chunkCount < 6)  return 0
  if (chunkCount < 10) return 1
  if (chunkCount < 18) return 2
  return 3
}

/** Default position percentages (0..1) the ArticleBody renderer uses. */
export const DEFAULT_AD_POSITIONS = [0.30, 0.55, 0.80] as const

/**
 * Allocate ads to positions. Weighted random pick without replacement,
 * with refill from the original pool once everyone's been chosen. That
 * way:
 *   - One advertiser fills all positions (exclusive ownership)
 *   - Two+ advertisers share, weighted by rotation_weight
 */
export function allocateArticlePositions(
  ads:       ActiveAd[],
  positions: number,
): (ActiveAd | null)[] {
  if (positions <= 0)   return []
  if (ads.length === 0) return Array(positions).fill(null)

  const result: (ActiveAd | null)[] = []
  let pool = [...ads]
  for (let i = 0; i < positions; i++) {
    if (pool.length === 0) pool = [...ads]   // refill so a single advertiser can fill all positions
    const total = pool.reduce((s, a) => s + (a.rotation_weight ?? 1), 0)
    if (total <= 0) { result.push(pool[0]); pool.splice(0, 1); continue }
    let r = Math.random() * total
    let picked = pool.length - 1
    for (let j = 0; j < pool.length; j++) {
      r -= pool[j].rotation_weight ?? 1
      if (r <= 0) { picked = j; break }
    }
    result.push(pool[picked])
    pool.splice(picked, 1)
  }
  return result
}
