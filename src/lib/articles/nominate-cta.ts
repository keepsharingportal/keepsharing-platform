// Per-column nominate CTAs. Drives the NominateCTA component that renders
// on every community spotlight article + archive landing page.
//
// All destinations point at /submit/[type] which is the canonical form
// router (legacy /nominate/[type] redirects there). Submissions land in
// the community_submissions table → /admin/community queue.
//
// Hidden columns: any column slug not in this map renders nothing — no
// orphan "Nominate Someone" button on columns that aren't community
// spotlights (Dave Says, Teens Tweens & Screens, etc.).

export interface NominateCTA {
  /** Button + section label — "Nominate a Teacher", "Share Your Story" */
  label:       string
  /** Where the CTA links — typically /submit/[type] */
  href:        string
  /** One-line context shown above the button on the article CTA block */
  pitch:       string
  /** Short headline used on the archive page CTA block */
  headline:    string
}

const COLUMN_CTAS: Record<string, NominateCTA> = {
  // Play Ball — athletes, coaches, and team volunteers
  'play-ball': {
    label:    'Nominate an Athlete, Coach, or Volunteer',
    href:     '/submit/play-ball',
    pitch:    'Know a player, coach, or team volunteer who shows heart in River Region youth sports? Take 3 minutes to tell us their story.',
    headline: 'Know someone who deserves the spotlight?',
  },

  // Teacher of the Month — column slug is 'teacher-of-month' (matches
  // content-taxonomy). The submission form route is the longer
  // 'teacher-of-the-month' (different namespace, separate routing config).
  'teacher-of-month': {
    label:    'Nominate a Teacher',
    href:     '/submit/teacher-of-the-month',
    pitch:    'Recognize an outstanding River Region educator who has made a real difference in your child\'s life.',
    headline: 'Know a teacher who goes above and beyond?',
  },

  // Grands Are the Greatest
  'grands-greatest': {
    label:    'Nominate Grandparents',
    href:     '/submit/grands-are-the-greatest',
    pitch:    'Honor a grandparent whose love and presence have shaped your family in unforgettable ways.',
    headline: 'Celebrate a grandparent who deserves recognition.',
  },

  // Mom to Mom — keeps the "Nominate" verb for consistency across all four
  // community spotlights. Submission flow accepts both self-nominations and
  // third-party noms so the verb works either way.
  'mom-to-mom': {
    label:    'Nominate a Mom',
    href:     '/submit/mom-to-mom',
    pitch:    'Mom to Mom celebrates real River Region moms — their stories, wisdom, and love for this community. Know a mom whose story should be told?',
    headline: 'Know a mom who\'s showing up, making it work, inspiring her community?',
  },
}

export function getNominateCTA(columnSlug: string | null | undefined): NominateCTA | null {
  if (!columnSlug) return null
  return COLUMN_CTAS[columnSlug] ?? null
}

// Used by the admin to know which columns are "community spotlight" columns
// — i.e. eligible for section sponsorship + nominate CTAs.
export const COMMUNITY_SPOTLIGHT_COLUMNS = Object.keys(COLUMN_CTAS)
