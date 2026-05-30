// Column brand config — single source of truth for the colors, label, and
// section eyebrow associated with each editorial column. Used by:
//
//   - The article gallery lightbox header ("PLAY BALL | PLAYER SPOTLIGHT")
//   - Future per-section UI flourishes that need consistent color treatment
//
// Adding a new column = add an entry here. Default falls back to the site's
// coral primary so unknown columns still render gracefully.
//
// `primary` is the deep header background; `accent` is the divider/pipe color
// between brand line and section name in the lightbox.

export interface ColumnBrand {
  /** Display label shown in the lightbox eyebrow, ALL CAPS at render time. */
  label:   string
  /** Background color of the lightbox header strip + eyebrow pill. */
  primary: string
  /** Divider / accent color (the | pipe between brand and section). */
  accent:  string
  /** Optional Lucide icon name shown inline in the article eyebrow (e.g. 'Apple' for Teacher of the Month). */
  icon?:   string
  /**
   * Optional override for the spotlight top-strip accent — the color used
   * for the icon circles + ALL-CAPS field labels on the magazine vitals bar.
   * Defaults to `accent` when unset. Override per-column when the column's
   * gold accent fights with its primary bg (e.g. Mom's rose + gold reads
   * gaudy; white reads clean).
   *
   * Note: only used when `style === 'bold'`. Soft variants always use the
   * primary brand color on a pale tinted bg, so there's no accent slot to override.
   */
  topStripAccent?: string
  /**
   * Visual treatment for the spotlight UI elements (top strip, Rapid Fire
   * callout, Nominate CTA footer).
   *
   *   'bold' (default): dark/saturated full-bleed bars with light accents
   *                     and white text — magazine-poster vibe. Works when
   *                     the primary color is dark (navy) or saturated-but-
   *                     not-bright (apple red). Play Ball uses this.
   *   'soft':           pale tinted backgrounds with small brand-colored
   *                     pill badges in the corner and dark text. Works when
   *                     the primary color is bright (rose) and a full-bleed
   *                     treatment would overwhelm the page. Mom to Mom uses
   *                     this — matches the home page Community Spotlights
   *                     card aesthetic (pale tint card + bright pill badge).
   */
  style?: 'bold' | 'soft'
}

// Site default — coral. Used when a column slug doesn't have its own entry.
const DEFAULT_BRAND: ColumnBrand = {
  label:   'Feature',
  primary: '#c4622d',   // site coral
  accent:  '#f3bf24',   // site gold
}

const COLUMN_BRANDS: Record<string, ColumnBrand> = {
  // Play Ball — navy + gold, magazine-matching
  'play-ball':           { label: 'Play Ball',           primary: '#1a2744', accent: '#f3bf24' },

  // Mom to Mom — rose/pink. Uses the SOFT visual treatment (pale tint bg +
  // small brand-color pill badge in the corner) so the article surface
  // matches the home page Community Spotlights aesthetic. Full-bleed rose
  // bars were overwhelming the page; rose-as-accent on a pale wash reads
  // elegant and feminine — the magazine-feature vibe vs. the sports-poster
  // vibe Play Ball gets.
  'mom-to-mom':          { label: 'Mom to Mom',          primary: '#e11d48', accent: '#f3bf24', style: 'soft' },

  // Grands Are the Greatest — amber/gold, evokes nostalgia/warmth
  'grands-greatest':     { label: 'Grands Are the Greatest', primary: '#a16207', accent: '#fbbf24' },

  // Grumpy But Grateful — deep teal
  'grumpy-but-grateful': { label: 'Grumpy But Grateful', primary: '#0f766e', accent: '#fbbf24' },

  // Dave Says — slate, financial-advice feel
  'dave-says':           { label: 'Dave Says',           primary: '#334155', accent: '#f3bf24' },

  // Meeting Kids Where They Are — sage green
  'meeting-kids':        { label: 'Meeting Kids',        primary: '#15803d', accent: '#f3bf24' },

  // Teens Tweens & Screens — purple
  'teens-tweens-screens':{ label: 'Teens Tweens & Screens', primary: '#6d28d9', accent: '#f3bf24' },

  // School Bits — deep blue, matches the existing school bits treatment
  'school-bits':         { label: 'School Bits',         primary: '#1e40af', accent: '#fbbf24' },

  // Teacher of the Month — apple-red + gold, evokes the magazine apple badge
  // without requiring an uploaded graphic. Lucide Apple icon renders inline.
  'teacher-of-the-month':{ label: 'Teacher of the Month', primary: '#b91c1c', accent: '#f3bf24', icon: 'Apple' },
}

export function getColumnBrand(columnSlug: string | null | undefined): ColumnBrand {
  if (!columnSlug) return DEFAULT_BRAND
  return COLUMN_BRANDS[columnSlug] ?? DEFAULT_BRAND
}

// Builds the lightbox eyebrow text. For Play Ball spotlights we want the
// magazine format "PLAY BALL | PLAYER SPOTLIGHT" — caller passes the
// spotlight eyebrow (from the template) as the second segment. For other
// columns it's just the column label.
export function buildLightboxEyebrow(
  columnSlug: string | null | undefined,
  spotlightEyebrow?: string | null,
): { primary: string; accent: string; left: string; right: string | null } {
  const brand = getColumnBrand(columnSlug)
  return {
    primary: brand.primary,
    accent:  brand.accent,
    left:    brand.label.toUpperCase(),
    right:   spotlightEyebrow ? spotlightEyebrow.toUpperCase() : null,
  }
}
