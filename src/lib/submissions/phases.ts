// Single source of truth for the nomination workflow phase machine.
// Each phase declares its label, color treatment, and the "next action"
// the editor can take from that state. The detail page reads this
// config to render the phase tracker + next-action button without
// hardcoding any branching in the JSX.

export type Phase =
  | 'nominated'
  | 'nomination-accepted'
  | 'outreach-sent'
  | 'nominee-accepted'
  | 'nominee-declined'
  | 'interview-sent'
  | 'interview-received'
  | 'draft-in-progress'
  | 'draft-ready'
  | 'approved'
  | 'in-pool'
  | 'scheduled'
  | 'published'
  | 'rejected'
  | 'archived'

export interface PhaseConfig {
  key:           Phase
  label:         string
  shortLabel:    string
  /** Tracker color — green = active editor work, amber = waiting on
   *  nominee, blue = ready to ship, grey = terminal/archived. */
  tone:          'amber' | 'blue' | 'green' | 'navy' | 'gray' | 'red'
  description:   string
  /** What the editor's most-likely next action is. Drives the big CTA
   *  in the right column. null = no editor action available (waiting
   *  on something external like the nominee). */
  nextAction:    { label: string; nextPhase: Phase } | null
  /** Phases that can come AFTER this one. Used to render the tracker
   *  and (eventually) to validate forward-only transitions. */
  allowedNext:   Phase[]
}

export const PHASES: Record<Phase, PhaseConfig> = {
  'nominated': {
    key: 'nominated',
    label:      'Nominated',
    shortLabel: 'New',
    tone:       'amber',
    description: 'Nominator just submitted. Editor needs to decide if we feature this person.',
    nextAction: { label: 'Accept nomination', nextPhase: 'nomination-accepted' },
    allowedNext: ['nomination-accepted', 'rejected', 'archived'],
  },
  'nomination-accepted': {
    key: 'nomination-accepted',
    label:      'Nomination accepted',
    shortLabel: 'Accepted',
    tone:       'blue',
    description: 'Editor wants to feature this person. Time to reach out to the nominee.',
    nextAction: { label: 'Send outreach email', nextPhase: 'outreach-sent' },
    allowedNext: ['outreach-sent', 'rejected', 'archived'],
  },
  'outreach-sent': {
    key: 'outreach-sent',
    label:      'Outreach sent',
    shortLabel: 'Outreach',
    tone:       'amber',
    description: 'We emailed the nominee. Waiting for them to confirm they want to be featured.',
    nextAction: { label: 'Mark accepted (manual)', nextPhase: 'nominee-accepted' },
    allowedNext: ['nominee-accepted', 'nominee-declined', 'rejected', 'archived'],
  },
  'nominee-accepted': {
    key: 'nominee-accepted',
    label:      'Nominee accepted',
    shortLabel: 'Accepted',
    tone:       'green',
    description: 'Nominee said yes! Send them the interview form to collect their answers + photos.',
    nextAction: { label: 'Send interview form', nextPhase: 'interview-sent' },
    allowedNext: ['interview-sent', 'archived'],
  },
  'nominee-declined': {
    key: 'nominee-declined',
    label:      'Nominee declined',
    shortLabel: 'Declined',
    tone:       'gray',
    description: 'Nominee passed. Archive and move on.',
    nextAction: { label: 'Archive', nextPhase: 'archived' },
    allowedNext: ['archived'],
  },
  'interview-sent': {
    key: 'interview-sent',
    label:      'Interview sent',
    shortLabel: 'Interview',
    tone:       'amber',
    description: 'Nominee has the interview form. Waiting on their answers + photos.',
    nextAction: { label: 'Mark received (manual)', nextPhase: 'interview-received' },
    allowedNext: ['interview-received', 'archived'],
  },
  'interview-received': {
    key: 'interview-received',
    label:      'Interview received',
    shortLabel: 'Ready to draft',
    tone:       'green',
    description: 'Nominee submitted their interview. Draft the article using their responses + your nomination.',
    nextAction: { label: 'Start draft', nextPhase: 'draft-in-progress' },
    allowedNext: ['draft-in-progress', 'archived'],
  },
  'draft-in-progress': {
    key: 'draft-in-progress',
    label:      'Draft in progress',
    shortLabel: 'Drafting',
    tone:       'blue',
    description: 'Editor is writing or refining the article body.',
    nextAction: { label: 'Mark draft ready for review', nextPhase: 'draft-ready' },
    allowedNext: ['draft-ready', 'archived'],
  },
  'draft-ready': {
    key: 'draft-ready',
    label:      'Draft ready',
    shortLabel: 'Ready',
    tone:       'blue',
    description: 'Draft is ready for the final editorial pass + channel approvals.',
    nextAction: { label: 'Approve & send to pool', nextPhase: 'approved' },
    allowedNext: ['approved', 'draft-in-progress', 'archived'],
  },
  'approved': {
    key: 'approved',
    label:      'Approved',
    shortLabel: 'Approved',
    tone:       'green',
    description: 'Approved across channels. Send to the monthly pool so it can be scheduled.',
    nextAction: { label: 'Send to monthly pool', nextPhase: 'in-pool' },
    allowedNext: ['in-pool', 'scheduled', 'archived'],
  },
  'in-pool': {
    key: 'in-pool',
    label:      'In monthly pool',
    shortLabel: 'In pool',
    tone:       'navy',
    description: 'Sitting in the per-category pool waiting to be picked for a specific month.',
    nextAction: null,
    allowedNext: ['scheduled', 'archived'],
  },
  'scheduled': {
    key: 'scheduled',
    label:      'Scheduled',
    shortLabel: 'Scheduled',
    tone:       'navy',
    description: 'Locked in for a specific month. Publishes automatically OR via Publish-now.',
    nextAction: { label: 'Publish to homepage now', nextPhase: 'published' },
    allowedNext: ['published', 'in-pool', 'archived'],
  },
  'published': {
    key: 'published',
    label:      'Published',
    shortLabel: 'Live',
    tone:       'green',
    description: 'Article is live on the homepage.',
    nextAction: null,
    allowedNext: ['archived'],
  },
  'rejected': {
    key: 'rejected',
    label:      'Rejected',
    shortLabel: 'Rejected',
    tone:       'red',
    description: 'Editor decided not to feature this nomination. The reason is recorded — bring it back with Reconsider if you change your mind.',
    nextAction: { label: 'Reconsider — back to Nominated', nextPhase: 'nominated' },
    allowedNext: ['nominated', 'archived'],
  },
  'archived': {
    key: 'archived',
    label:      'Archived',
    shortLabel: 'Archived',
    tone:       'gray',
    description: 'Closed out — declined, replaced, or no longer needed.',
    nextAction: null,
    allowedNext: [],
  },
}

/** Phases shown in the visual progress tracker, in their canonical
 *  order. Branch phases (decline, archive) are excluded — they're
 *  rendered as side states next to the tracker. */
export const TRACKER_PHASES: Phase[] = [
  'nominated',
  'nomination-accepted',
  'outreach-sent',
  'nominee-accepted',
  'interview-sent',
  'interview-received',
  'draft-in-progress',
  'draft-ready',
  'approved',
  'in-pool',
  'scheduled',
  'published',
]

/** Tracker index for a phase. -1 if the phase isn't on the main track. */
export function trackerIndex(phase: Phase): number {
  return TRACKER_PHASES.indexOf(phase)
}

/** Tone → portal-app badge class. */
export function badgeClassForTone(tone: PhaseConfig['tone']): string {
  switch (tone) {
    case 'amber': return 'badge-amber'
    case 'blue':  return 'badge-rrp'
    case 'green': return 'badge-green'
    case 'navy':  return 'badge-rrp'
    case 'red':   return 'badge-red'
    case 'gray':  return 'badge-gray'
  }
}

/** Tone → CSS color variable for the tracker pill background. */
export function toneColor(tone: PhaseConfig['tone']): string {
  switch (tone) {
    case 'amber': return 'var(--color-portal-amber)'
    case 'blue':  return 'var(--color-portal-blue)'
    case 'green': return 'var(--color-portal-green)'
    case 'navy':  return 'var(--color-portal-navy)'
    case 'red':   return 'var(--color-portal-red)'
    case 'gray':  return 'var(--color-portal-muted)'
  }
}

/** Submissions that DON'T need outreach skip directly from nominated
 *  → draft-in-progress (or even draft-ready if AI auto-drafts). For
 *  those types we filter the tracker. */
export const NON_OUTREACH_TRACKER: Phase[] = [
  'nominated',
  'draft-in-progress',
  'draft-ready',
  'approved',
  'in-pool',
  'scheduled',
  'published',
]
