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
  /**
   * Color palette for soft-variant surfaces (top strip box, Rapid Fire box,
   * Nominate CTA box). When unset, the soft variant uses `primary` at a
   * low opacity for the bg and `primary` for icons/labels.
   *
   * Override when you want soft surfaces to inherit a SITE palette instead
   * of the column's own brand color — gives soft articles cohesion with the
   * rest of the site instead of a bright wash of their own brand. Mom uses
   * the site's peach (coral at 8%) + teal so the article reads like the
   * home page Community Spotlights cards.
   *
   * Brand identity is preserved via the rose badge + rose action button —
   * those keep using `primary`.
   */
  softBg?:     string   // box background (e.g. coral at 8% opacity)
  softBorder?: string   // box border (e.g. coral at 15% opacity)
  softAccent?: string   // icon-circle bg in soft top-strip cells (e.g. teal or gold)
  /**
   * Color for ALL-CAPS field labels in soft top-strip cells. Defaults to
   * `primary` when unset. Override when you want the label color to differ
   * from the column's primary — e.g. Teacher uses navy labels alongside
   * its apple-red identity (apple-red + navy + gold is the Play Ball-style
   * combo applied to Teacher).
   */
  softLabel?:  string
  /**
   * Color for primary action buttons (Nominate CTA, etc). Defaults to
   * `primary` when unset. Override when the button should match a secondary
   * brand color rather than the column primary — e.g. Teacher uses navy
   * buttons even though its identity color is apple-red.
   */
  actionColor?: string
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

  // Mom to Mom — rose/pink for the badge + button (identity), but the soft
  // surfaces (top strip, Rapid Fire, CTA box) use the SITE palette: peach
  // bg + teal icons/labels. Matches the home page Community Spotlights card
  // aesthetic + the newsletter signup peach, so the article reads cohesive
  // with the rest of the site instead of a wash of bright rose.
  //   softBg     = coral at 8%  (matches PublicFooter newsletter `bg-primary/8`)
  //   softBorder = coral at 15% (matches `border-primary/15`)
  //   softAccent = teal #3d8e8e (matches sidebar "Community Spotlights" icon)
  'mom-to-mom':          {
    label: 'Mom to Mom', primary: '#e11d48', accent: '#f3bf24',
    style: 'soft',
    softBg:      '#ef644214',  // coral @ ~8%
    softBorder:  '#ef644226',  // coral @ ~15%
    softAccent:  '#3d8e8e',    // site teal — icon circles
    actionColor: '#3d8e8e',    // site teal — Nominate buttons (rose stays for identity badges)
  },

  // Grands Are the Greatest — deep purple identity (eyebrow, labels,
  // action button) with gold accents on a soft peach wash. Continuity
  // with the print magazine's purple "Grands" wordmark, distinct from
  // every other column (Mom rose / Teacher apple-red / Play Ball navy),
  // and reads as "honor + wisdom + distinguished" — the right vibe for
  // grandparents.
  //   primary     = deep purple #6b21a8 (eyebrow, labels, Nominate button)
  //   accent      = gold #fbbf24 (kept for lightbox + icon circles)
  //   softBg      = coral @ 8%  (peach — site cohesion w/ Mom + Teacher)
  //   softBorder  = coral @ 15%
  //   softAccent  = gold #f3bf24 (icon circles — preserves the yellow
  //                  identity from the home-page Community Spotlights card)
  //   softLabel   = deep purple (labels match the brand identity)
  //   actionColor = unset       (Nominate button uses primary purple —
  //                  the purple is distinctive enough to not need a split)
  'grands-greatest':     {
    label: 'Grands Are the Greatest', primary: '#6b21a8', accent: '#fbbf24',
    style: 'soft',
    softBg:     '#ef644214',
    softBorder: '#ef644226',
    softAccent: '#f3bf24',
    softLabel:  '#6b21a8',
  },

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

  // Teacher of the Month — apple-red identity carries everything text
  // (eyebrow, top strip labels, badges) with navy reserved for action
  // buttons only. Gold-circle icons inside the soft peach wash. The
  // labels match the eyebrow color so the page reads as one Teacher of
  // the Month surface; navy buttons add a secondary punch for CTAs.
  //   softBg      = coral @ 8%  (peach — matches site's newsletter strip)
  //   softBorder  = coral @ 15%
  //   softAccent  = gold #f3bf24 (icon circles)
  //   softLabel   = apple-red    (top strip labels match the brand identity)
  //   actionColor = navy #1a2744 (Nominate button only)
  // NOTE: column slug is 'teacher-of-month' (no "the") to match the
  // taxonomy entry in src/lib/content-taxonomy.ts.
  'teacher-of-month':    {
    label: 'Teacher of the Month', primary: '#b91c1c', accent: '#f3bf24', icon: 'Apple',
    style: 'soft',
    softBg:      '#ef644214',
    softBorder:  '#ef644226',
    softAccent:  '#f3bf24',
    softLabel:   '#b91c1c',
    actionColor: '#1a2744',
  },
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
