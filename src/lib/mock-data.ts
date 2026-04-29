import type { AdvertiserRecord, Publication } from '@/types'

export const PUBLICATIONS: Publication[] = [
  { abbrev: 'RRP', name: 'River Region Parents', market: 'Montgomery', state: 'AL', skin: 'parenting', active: true },
  { abbrev: 'MBP', name: 'Mobile Bay Parents', market: 'Mobile', state: 'AL', skin: 'parenting', active: true },
  { abbrev: 'AOP', name: 'Auburn Opelika Parents', market: 'Auburn/Opelika', state: 'AL', skin: 'parenting', active: true },
  { abbrev: 'ESP', name: 'Eastern Shore Parents', market: 'Eastern Shore', state: 'AL', skin: 'parenting', active: true },
  { abbrev: 'GPP', name: 'Greater Pensacola Parents', market: 'Pensacola', state: 'FL', skin: 'parenting', active: true },
  { abbrev: 'RRB', name: 'River Region Boom', market: 'Montgomery', state: 'AL', skin: 'prime', active: true },
]

export const MOCK_ADVERTISERS: AdvertiserRecord[] = [
  // ── Full Pages ──────────────────────────────────────────────────────────────
  {
    id: 'rrp-001', businessName: 'Baptist Health System', contactName: 'Sarah Mitchell',
    publication: 'RRP', issue: 'RRP MAR26', stage: 'Closed Won', amount: 995,
    directory: false, layoutNotes: 'IFC — horizontal layout confirmed', social: 'Featured',
    invoiceType: 'Invoice', designer: 'Tim Welch', designStatus: 'Pick-up',
    size: 1, orientation: 'Horizontal', specialPosition: 'Inside Front Cover',
    specificMonths: [], expires: 'Dec26', description: 'Annual contract',
  },
  {
    id: 'rrp-002', businessName: "Children's Hospital of Alabama", contactName: 'Mark Davis',
    publication: 'RRP', issue: 'RRP MAR26', stage: 'Closed Won', amount: 895,
    directory: false, layoutNotes: '', social: null,
    invoiceType: 'Invoice', designer: 'Tim Welch', designStatus: 'Pick-up',
    size: 1, orientation: null, specialPosition: null,
    specificMonths: [], expires: 'Dec26', description: '',
  },
  {
    id: 'rrp-003', businessName: 'East Alabama Medical Center', contactName: 'Linda Chen',
    publication: 'RRP', issue: 'RRP MAR26', stage: 'Closed Won', amount: 995,
    directory: false, layoutNotes: 'Back cover — send final art by the 15th', social: null,
    invoiceType: 'Invoice', designer: 'Tim Welch', designStatus: 'Pick-up',
    size: 1, orientation: null, specialPosition: 'Back Cover',
    specificMonths: [], expires: 'Jun26', description: '',
  },

  // ── Half Pages ───────────────────────────────────────────────────────────────
  {
    id: 'rrp-004', businessName: 'Alabama Martial Arts Academy', contactName: 'Coach Ray Simmons',
    publication: 'RRP', issue: 'RRP MAR26', stage: 'Closed Won', amount: 525,
    directory: false, layoutNotes: 'New ad — Tim has brief, targeting summer camps theme',
    social: null, invoiceType: 'Invoice', designer: 'Tim Welch', designStatus: 'New',
    size: 0.5, orientation: 'Horizontal', specialPosition: null,
    specificMonths: [], expires: 'Aug26', description: 'New advertiser — welcome call complete',
  },
  {
    id: 'rrp-005', businessName: 'Deep Blue Autism Therapy', contactName: 'Dr. Angela West',
    publication: 'RRP', issue: 'RRP MAR26', stage: 'Closed Won', amount: 525,
    directory: true, layoutNotes: '', social: null,
    invoiceType: 'Invoice', designer: 'Tim Welch', designStatus: 'Pick-up',
    size: 0.5, orientation: 'Horizontal', specialPosition: null,
    specificMonths: [], expires: 'May26', description: '',
  },
  {
    id: 'rrp-006', businessName: 'Elite Gymnastics Montgomery', contactName: 'Carrie Holbrook',
    publication: 'RRP', issue: 'RRP MAR26', stage: 'Closed Won', amount: 525,
    directory: false, layoutNotes: '', social: 'Tier 2',
    invoiceType: 'Invoice', designer: 'Tim Welch', designStatus: 'Pick-up',
    size: 0.5, orientation: 'Vertical', specialPosition: null,
    specificMonths: [], expires: 'Dec26', description: '',
  },
  {
    id: 'rrp-007', businessName: 'KinderCare Learning Centers', contactName: 'District Rep',
    publication: 'RRP', issue: 'RRP MAR26', stage: 'Closed Won', amount: 525,
    directory: true, layoutNotes: 'FRHR — confirmed', social: null,
    invoiceType: 'Invoice', designer: 'Tim Welch', designStatus: 'Pick-up',
    size: 0.5, orientation: 'Horizontal', specialPosition: 'First Right Hand Read',
    specificMonths: [], expires: 'Dec26', description: 'National account',
  },
  {
    id: 'rrp-008', businessName: 'Prattville Christian Academy', contactName: 'Principal Diane Ford',
    publication: 'RRP', issue: 'RRP MAR26', stage: 'Closed Won', amount: 525,
    directory: false, layoutNotes: 'Check Dropbox — new art uploaded 2/28',
    social: null, invoiceType: 'A Check', designer: 'Self', designStatus: 'DropBox',
    size: 0.5, orientation: 'Horizontal', specialPosition: null,
    specificMonths: [], expires: 'Mar26', description: 'March only',
  },

  // ── Third Pages ──────────────────────────────────────────────────────────────
  {
    id: 'rrp-009', businessName: 'Central AL Comprehensive Medicine', contactName: 'Office Manager',
    publication: 'RRP', issue: 'RRP MAR26', stage: 'Closed Won', amount: 350,
    directory: true, layoutNotes: '', social: null,
    invoiceType: 'Invoice', designer: 'Tim Welch', designStatus: 'Pick-up',
    size: 0.33, orientation: null, specialPosition: null,
    specificMonths: [], expires: 'Dec26', description: '',
  },
  {
    id: 'rrp-010', businessName: 'Craig Eye Center', contactName: 'Jennifer Craig',
    publication: 'RRP', issue: 'RRP MAR26', stage: 'Closed Won', amount: 350,
    directory: true, layoutNotes: 'New redesign — Tim has creative brief',
    social: null, invoiceType: 'Invoice', designer: 'Tim Welch', designStatus: 'New',
    size: 0.33, orientation: null, specialPosition: null,
    specificMonths: [], expires: 'Dec26', description: '',
  },
  {
    id: 'rrp-011', businessName: 'First Choice Pediatrics', contactName: 'Dr. Kevin Moore',
    publication: 'RRP', issue: 'RRP MAR26', stage: 'Closed Won', amount: 350,
    directory: true, layoutNotes: '', social: null,
    invoiceType: 'Invoice', designer: 'Tim Welch', designStatus: 'Pick-up',
    size: 0.33, orientation: null, specialPosition: null,
    specificMonths: [], expires: 'Dec26', description: '',
  },
  {
    id: 'rrp-012', businessName: 'Montgomery Academy', contactName: 'Admissions Office',
    publication: 'RRP', issue: 'RRP MAR26', stage: 'Closed Won', amount: 350,
    directory: false, layoutNotes: 'March only — alternating months',
    social: null, invoiceType: 'Invoice', designer: 'In-house', designStatus: 'Pick-up',
    size: 0.33, orientation: null, specialPosition: null,
    specificMonths: ['MAR26', 'MAY26', 'JUL26', 'SEP26', 'NOV26'], expires: 'Dec26', description: '',
  },
  {
    id: 'rrp-013', businessName: 'Valley Pediatric Dentistry', contactName: 'Dr. Susan Yates',
    publication: 'RRP', issue: 'RRP MAR26', stage: 'Closed Won', amount: 350,
    directory: true, layoutNotes: '', social: null,
    invoiceType: 'Invoice', designer: 'Tim Welch', designStatus: 'Pick-up',
    size: 0.33, orientation: null, specialPosition: null,
    specificMonths: [], expires: 'Jun26', description: '',
  },

  // ── Quarter Pages ─────────────────────────────────────────────────────────────
  {
    id: 'rrp-014', businessName: "Anthony's Pediatrics", contactName: 'Dr. Anthony Richards',
    publication: 'RRP', issue: 'RRP MAR26', stage: 'Closed Won', amount: 275,
    directory: true, layoutNotes: '', social: null,
    invoiceType: 'Invoice', designer: 'Tim Welch', designStatus: 'Pick-up',
    size: 0.25, orientation: null, specialPosition: null,
    specificMonths: [], expires: 'Dec26', description: '',
  },
  {
    id: 'rrp-015', businessName: 'Bright Futures Tutoring', contactName: 'Melissa Tran',
    publication: 'RRP', issue: 'RRP MAR26', stage: 'Closed Won', amount: 275,
    directory: false, layoutNotes: 'New advertiser — welcome call done 2/18',
    social: 'Tier 3', invoiceType: 'Invoice', designer: 'Tim Welch', designStatus: 'New',
    size: 0.25, orientation: null, specialPosition: null,
    specificMonths: [], expires: 'Jun26', description: '',
  },
  {
    id: 'rrp-016', businessName: 'Business Bank of Alabama', contactName: 'Marketing Dept',
    publication: 'RRP', issue: 'RRP MAR26', stage: 'Closed Won', amount: 275,
    directory: false, layoutNotes: '', social: null,
    invoiceType: 'Invoice', designer: 'Self', designStatus: 'Pick-up',
    size: 0.25, orientation: null, specialPosition: null,
    specificMonths: [], expires: 'Dec26', description: '',
  },
  {
    id: 'rrp-017', businessName: 'Camp Cheaha', contactName: 'Director Tom Weaver',
    publication: 'RRP', issue: 'RRP MAR26', stage: 'Closed Won', amount: 275,
    directory: false, layoutNotes: 'Seasonal — May/Jun only. Verify art timing.',
    social: null, invoiceType: 'A Check', designer: 'Tim Welch', designStatus: 'New',
    size: 0.25, orientation: null, specialPosition: null,
    specificMonths: ['MAR26', 'MAY26', 'JUN26'], expires: 'Jun26', description: 'Summer camp seasonal buy',
  },
  {
    id: 'rrp-018', businessName: 'Classroom to Career Academy', contactName: 'Admissions',
    publication: 'RRP', issue: 'RRP MAR26', stage: 'Closed Won', amount: 275,
    directory: false, layoutNotes: '', social: null,
    invoiceType: 'Invoice', designer: 'In-house', designStatus: 'Pick-up',
    size: 0.25, orientation: null, specialPosition: null,
    specificMonths: [], expires: 'Dec26', description: '',
  },
  {
    id: 'rrp-019', businessName: 'Complete Physical Therapy', contactName: 'Brenda Holt',
    publication: 'RRP', issue: 'RRP MAR26', stage: 'Closed Won', amount: 275,
    directory: true, layoutNotes: '', social: null,
    invoiceType: 'Invoice', designer: 'Tim Welch', designStatus: 'Pick-up',
    size: 0.25, orientation: null, specialPosition: null,
    specificMonths: [], expires: 'Sep26', description: '',
  },
  {
    id: 'rrp-020', businessName: 'Courtyard by Marriott Montgomery', contactName: 'GM Office',
    publication: 'RRP', issue: 'RRP MAR26', stage: 'Closed Won', amount: 275,
    directory: false, layoutNotes: 'National account — they supply art direct',
    social: null, invoiceType: 'Invoice', designer: 'Self', designStatus: 'Pick-up',
    size: 0.25, orientation: null, specialPosition: null,
    specificMonths: [], expires: 'Mar26', description: 'Single month test buy',
  },
  {
    id: 'rrp-021', businessName: 'EarlyBird Learning Center', contactName: 'Patricia Owens',
    publication: 'RRP', issue: 'RRP MAR26', stage: 'Closed Won', amount: 275,
    directory: true, layoutNotes: '', social: null,
    invoiceType: 'Invoice', designer: 'Tim Welch', designStatus: 'Pick-up',
    size: 0.25, orientation: null, specialPosition: null,
    specificMonths: [], expires: 'Dec26', description: '',
  },
  {
    id: 'rrp-022', businessName: 'Imagination Station', contactName: 'Greg Norris',
    publication: 'RRP', issue: 'RRP MAR26', stage: 'Closed Won', amount: 275,
    directory: false, layoutNotes: 'Art in Dropbox — verify before sending to Tim',
    social: null, invoiceType: 'Invoice', designer: 'Tim Welch', designStatus: 'DropBox',
    size: 0.25, orientation: null, specialPosition: null,
    specificMonths: [], expires: 'May26', description: '',
  },
  {
    id: 'rrp-023', businessName: 'Liberty Park Sports Complex', contactName: 'Events Dept',
    publication: 'RRP', issue: 'RRP MAR26', stage: 'Closed Won', amount: 275,
    directory: false, layoutNotes: '', social: null,
    invoiceType: 'Invoice', designer: 'Self', designStatus: 'Pick-up',
    size: 0.25, orientation: null, specialPosition: null,
    specificMonths: [], expires: 'Dec26', description: '',
  },
  {
    id: 'rrp-024', businessName: 'Southern Speech Pathology', contactName: 'Dr. Amy Pierce',
    publication: 'RRP', issue: 'RRP MAR26', stage: 'Closed Won', amount: 275,
    directory: true, layoutNotes: 'New — referred by Valley Pediatric Dentistry',
    social: null, invoiceType: 'Invoice', designer: 'Tim Welch', designStatus: 'New',
    size: 0.25, orientation: null, specialPosition: null,
    specificMonths: [], expires: 'Jun26', description: '',
  },
  {
    id: 'rrp-025', businessName: 'Sunshine Montessori School', contactName: 'Head of School',
    publication: 'RRP', issue: 'RRP MAR26', stage: 'Closed Won', amount: 275,
    directory: true, layoutNotes: '', social: null,
    invoiceType: 'Invoice', designer: 'Tim Welch', designStatus: 'Pick-up',
    size: 0.25, orientation: null, specialPosition: null,
    specificMonths: [], expires: 'Dec26', description: '',
  },

  // ── Eighth Pages ─────────────────────────────────────────────────────────────
  {
    id: 'rrp-026', businessName: 'Curves Fitness for Women', contactName: 'Manager',
    publication: 'RRP', issue: 'RRP MAR26', stage: 'Closed Won', amount: 150,
    directory: false, layoutNotes: '', social: null,
    invoiceType: 'Invoice', designer: 'Self', designStatus: 'Pick-up',
    size: 0.12, orientation: null, specialPosition: null,
    specificMonths: [], expires: 'Jun26', description: '',
  },
  {
    id: 'rrp-027', businessName: 'Primrose School of East Montgomery', contactName: 'Director',
    publication: 'RRP', issue: 'RRP MAR26', stage: 'Closed Won', amount: 150,
    directory: true, layoutNotes: '', social: null,
    invoiceType: 'Invoice', designer: 'Tim Welch', designStatus: 'Pick-up',
    size: 0.12, orientation: null, specialPosition: null,
    specificMonths: [], expires: 'Dec26', description: '',
  },
]

// ── Helper to get advertisers for a given issue ───────────────────────────────
export function getAdvertisersForIssue(issue: string): AdvertiserRecord[] {
  return MOCK_ADVERTISERS.filter((a) => a.issue === issue)
}

// ── Market summary stats ──────────────────────────────────────────────────────
export function getMarketStats(pubAbbrev: string, issue: string) {
  const ads = MOCK_ADVERTISERS.filter(
    (a) => a.publication === pubAbbrev && a.issue === issue
  )
  return {
    count: ads.length,
    pages: ads.reduce((s, a) => s + a.size, 0),
    revenue: ads.reduce((s, a) => s + a.amount, 0),
  }
}
