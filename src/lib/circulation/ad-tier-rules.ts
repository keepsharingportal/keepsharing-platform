// Single source of truth for "how big is this ad placement on a comparable
// scale across print + digital." Used by the monthly tier-assignment job
// to compute each advertiser's largest active ad spend, which then drives
// the visual tier of every circulation_stop linked to that advertiser.
//
// Scale: fractional page (0.0–1.0) so print sizes are their natural value
// and digital placements are mapped onto the same scale by editorial
// judgment of "feels equivalent to a print X."

export const PRINT_SIZE_FALLBACK = 0  // unknown print size → no contribution

/** Map a digital ad_placements.placement_type to a comparable size value
 *  on the 0–1 scale. Tweak per pricing decisions. */
export function digitalPlacementSize(placement_type: string | null | undefined): number {
  if (!placement_type) return 0
  const p = placement_type.toLowerCase()
  // Top-tier surfaces — full-bleed homepage features
  if (p.includes('business_spotlight'))           return 0.67  // top
  if (p.includes('homepage_hero'))                return 1.00  // top
  if (p.includes('takeover'))                     return 1.00  // top
  // Middle-tier surfaces — mid-page inline + section sponsor
  if (p.includes('homepage_inline'))              return 0.50  // middle
  if (p.includes('section_sponsor'))              return 0.50  // middle
  if (p.includes('homepage_sidebar'))             return 0.33  // middle
  if (p.includes('inline_ad'))                    return 0.33  // middle
  // Bottom-tier surfaces — footer / column / smaller placements
  if (p.includes('homepage_bottom'))              return 0.25  // bottom
  if (p.includes('column_sponsor'))               return 0.25  // bottom
  if (p.includes('footer'))                       return 0.16  // bottom
  // Unknown — treat as bottom-tier visibility
  return 0.25
}

/** Threshold tiers for the map display. Mirrors the print rate card. */
export function tierForSize(size: number): 'top' | 'middle' | 'bottom' | null {
  if (size <= 0)     return null
  if (size >= 0.66) return 'top'
  if (size >= 0.33) return 'middle'
  return 'bottom'
}
