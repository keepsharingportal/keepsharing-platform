/**
 * Brand color utilities for the Partner Engine.
 * Each partner has brand_color_primary and brand_color_accent stored in advertiser_accounts.
 * These get layered on top of the magazine design system without replacing it.
 */

function hexToRgb(hex: string): [number, number, number] | null {
  const clean = hex.replace('#', '')
  if (clean.length !== 6) return null
  const r = parseInt(clean.slice(0, 2), 16)
  const g = parseInt(clean.slice(2, 4), 16)
  const b = parseInt(clean.slice(4, 6), 16)
  if (isNaN(r) || isNaN(g) || isNaN(b)) return null
  return [r, g, b]
}

/**
 * Returns 'white' or 'dark' depending on which has better contrast against the given background.
 * Uses WCAG relative luminance formula.
 */
export function getContrastTextColor(hex: string): 'white' | 'dark' {
  const rgb = hexToRgb(hex)
  if (!rgb) return 'white'
  const [r, g, b] = rgb.map(c => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  })
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b
  return luminance > 0.179 ? 'dark' : 'white'
}

/**
 * Returns a lightened version of a hex color.
 * amount: 0.0 (no change) → 1.0 (white)
 */
export function lightenColor(hex: string, amount: number): string {
  const rgb = hexToRgb(hex)
  if (!rgb) return hex
  const [r, g, b] = rgb.map(c => Math.round(c + (255 - c) * amount))
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

/**
 * Returns a darkened version of a hex color.
 * amount: 0.0 (no change) → 1.0 (black)
 */
export function darkenColor(hex: string, amount: number): string {
  const rgb = hexToRgb(hex)
  if (!rgb) return hex
  const [r, g, b] = rgb.map(c => Math.round(c * (1 - amount)))
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

/**
 * Returns hex with opacity as rgba string.
 */
export function hexWithOpacity(hex: string, opacity: number): string {
  const rgb = hexToRgb(hex)
  if (!rgb) return hex
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${opacity})`
}

/**
 * Basic accessibility check — warns if contrast ratio is below 4.5:1 (WCAG AA).
 * Returns {passes, contrastRatio}.
 */
export function validateBrandColor(hex: string): { passes: boolean; contrastRatio: number } {
  const rgb = hexToRgb(hex)
  if (!rgb) return { passes: false, contrastRatio: 0 }
  const [r, g, b] = rgb.map(c => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  })
  const L = 0.2126 * r + 0.7152 * g + 0.0722 * b
  const Lwhite = 1
  const ratio = (Lwhite + 0.05) / (L + 0.05)
  return { passes: ratio >= 4.5, contrastRatio: Math.round(ratio * 100) / 100 }
}

/** Default brand colors used when no custom colors provided. */
export const DEFAULT_BRAND = {
  primary: '#1a2744',  // --fg-navy
  accent: '#c4622d',   // --fg-terra
}
