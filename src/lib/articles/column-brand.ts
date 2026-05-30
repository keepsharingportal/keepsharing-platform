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

  // Mom to Mom — warm coral. Matches the contributor column's existing palette.
  'mom-to-mom':          { label: 'Mom to Mom',          primary: '#c4622d', accent: '#f3bf24' },

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
