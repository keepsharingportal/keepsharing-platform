// src/lib/operations/routing.ts
// Single source of truth for who owns what in the operational workflow.
// Defines: operator roles, submission status ownership, escalation thresholds,
// advertiser renewal windows, and which content types route to Jason.

export type OperatorRole = 'va' | 'editor' | 'designer' | 'publisher' | 'jason'

export const ROLE_LABELS: Record<OperatorRole, string> = {
  va:        'VA',
  editor:    'Editor',
  designer:  'Designer',
  publisher: 'Publisher',
  jason:     'Jason',
}

export const ROLE_STYLES: Record<OperatorRole, string> = {
  va:        'bg-blue-50 text-blue-700 ring-1 ring-blue-100',
  editor:    'bg-purple-50 text-purple-700 ring-1 ring-purple-100',
  designer:  'bg-orange-50 text-orange-700 ring-1 ring-orange-100',
  publisher: 'bg-green-50 text-green-700 ring-1 ring-green-100',
  jason:     'bg-red-50 text-red-700 ring-1 ring-red-100',
}

// Which operator role owns each submission status.
// Used by queue views to show ownership and by escalation logic.
export const STATUS_OWNER: Record<string, OperatorRole> = {
  'new':            'va',
  'needs-review':   'va',
  'awaiting-info':  'va',
  'in-progress':    'va',
  'ready-for-ai':   'va',
  'ai-draft-ready': 'editor',
  'in-editing':     'editor',
  'approved':       'publisher',
  'scheduled':      'publisher',
}

// Hours without movement before a submission is considered stalled.
// Surfaced as "overdue" indicators in the ops command grid and queue views.
export const STALL_THRESHOLD_HOURS: Record<string, number> = {
  'new':            24,
  'needs-review':   48,
  'awaiting-info':  72,
  'in-progress':    48,
  'ready-for-ai':   24,
  'ai-draft-ready': 72,
  'in-editing':     96,
  'approved':       120,
  'scheduled':      240,
}

// Contract renewal warning windows (days before contract_end_date).
export const RENEWAL_URGENT_DAYS = 30
export const RENEWAL_WARNING_DAYS = 60

// Days after lifecycle_stage = 'onboarding' with no update before flagging as stuck.
export const ONBOARDING_STUCK_DAYS = 14

// Submission types that require Jason's strategic review in addition to editorial.
// These appear in Jason's queue on /admin/today rather than the editor/VA queue.
export const JASON_REVIEW_TYPES = ['boom-profile'] as const

// Hours after an AI task reaches 'completed' or 'needs_review' before it is
// surfaced as an overdue item in the ops grid. Prevents instant noise.
export const AI_TASK_REVIEW_THRESHOLD_HOURS = 48

// Default newsletter section by submission type.
// Applied automatically on approval if newsletter_include = true and no section assigned.
export const DEFAULT_NEWSLETTER_SECTION: Record<string, string> = {
  'teacher-of-the-month':     'Community Highlights',
  'student-spotlight':        'School Corner',
  'play-ball':                'Community Highlights',
  'school-news':              'School Corner',
  'mom-to-mom':               'Lead Story',
  'grands-are-the-greatest':  'Family Spotlight',
  'birthday-celebration':     'Family Spotlight',
  'parent-picks':             'Local Picks',
  'event-submission':         'Upcoming Events',
  'boom-profile':             'Lead Story',
}

// Default homepage section by submission type.
export const DEFAULT_HOMEPAGE_SECTION: Record<string, string> = {
  'teacher-of-the-month':     'Community Highlights',
  'student-spotlight':        'Community Highlights',
  'play-ball':                'Community Highlights',
  'school-news':              'School & Education',
  'mom-to-mom':               'Featured Stories',
  'grands-are-the-greatest':  'Community Highlights',
  'birthday-celebration':     'Community Highlights',
  'parent-picks':             'Community Highlights',
  'event-submission':         'Events & Activities',
  'boom-profile':             'Featured Stories',
}
