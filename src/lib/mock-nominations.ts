export type NominationType = 'cover-profile' | 'mom-to-mom' | 'teacher-of-month' | 'grands-are-great'
export type NominationStatus =
  | 'pending'
  | 'selected'
  | 'questions_generated'
  | 'interview_scheduled'
  | 'interviewed'
  | 'article_drafted'
  | 'photos_received'
  | 'approved'
  | 'published'

export interface NominationRecord {
  id: string
  type: NominationType
  publication: string
  subjectName: string
  subjectEmail: string | null
  subjectPhone: string | null
  nominatorName: string
  nominatorEmail: string
  reason: string
  status: NominationStatus
  submittedAt: string
  selectedAt: string | null
  issueMonth: string | null
  questionsGeneratedAt: string | null
  interviewScheduledFor: string | null
  interviewedAt: string | null
  articleDraftedAt: string | null
  photoReceivedAt: string | null
  approvedAt: string | null
  publishedAt: string | null
  notes: string
}

export const NOMINATION_TYPE_CONFIG: Record<NominationType, {
  label: string
  description: string
  color: string
  badgeCls: string
  questions: number
  photos: number
  interviewStyle: string
  voiceAI: boolean
}> = {
  'cover-profile': {
    label: 'Cover Profile',
    description: 'Flagship cover feature — Jason reviews all selections personally',
    color: 'blue',
    badgeCls: 'bg-blue-50 text-blue-700 ring-blue-200',
    questions: 15,
    photos: 10,
    interviewStyle: '25-minute voice AI + Jason review',
    voiceAI: true,
  },
  'mom-to-mom': {
    label: 'Mom to Mom',
    description: 'Q&A format, 3 photos, fully automated',
    color: 'rose',
    badgeCls: 'bg-rose-50 text-rose-700 ring-rose-200',
    questions: 10,
    photos: 3,
    interviewStyle: '20-minute voice AI interview',
    voiceAI: true,
  },
  'teacher-of-month': {
    label: 'Teacher of the Month',
    description: 'School community feature, nomination by parents/principals',
    color: 'green',
    badgeCls: 'bg-green-50 text-green-700 ring-green-200',
    questions: 8,
    photos: 2,
    interviewStyle: '15-minute voice AI interview',
    voiceAI: true,
  },
  'grands-are-great': {
    label: 'Grands Are Great',
    description: 'Grandparent feature — warm, slower-paced voice AI for 60–80+ subjects',
    color: 'amber',
    badgeCls: 'bg-amber-50 text-amber-700 ring-amber-200',
    questions: 8,
    photos: 2,
    interviewStyle: '20-minute warm-tone voice AI',
    voiceAI: true,
  },
}

export const STATUS_STEPS: { status: NominationStatus; label: string }[] = [
  { status: 'pending',              label: 'Nomination received' },
  { status: 'selected',             label: 'Subject selected' },
  { status: 'questions_generated',  label: 'Questions generated' },
  { status: 'interview_scheduled',  label: 'Interview scheduled' },
  { status: 'interviewed',          label: 'Interview completed' },
  { status: 'article_drafted',      label: 'Article drafted' },
  { status: 'photos_received',      label: 'Photos received' },
  { status: 'approved',             label: 'Approved' },
  { status: 'published',            label: 'Published' },
]

export const MOCK_NOMINATIONS: NominationRecord[] = [
  {
    id: 'nom001', type: 'cover-profile', publication: 'RRP',
    subjectName: 'Dr. Angela Williams', subjectEmail: 'angelawilliams@gmail.com', subjectPhone: '(334) 555-0201',
    nominatorName: 'Marcus Williams', nominatorEmail: 'marcus@example.com',
    reason: 'My wife started a free after-school tutoring program in our neighborhood three years ago. She works full-time as a physician and still finds time to help 40+ kids every week. She\'s changed lives.',
    status: 'article_drafted',
    submittedAt: '2026-04-10', selectedAt: '2026-04-12', issueMonth: 'MAY26',
    questionsGeneratedAt: '2026-04-13', interviewScheduledFor: '2026-04-18', interviewedAt: '2026-04-18',
    articleDraftedAt: '2026-04-19', photoReceivedAt: null, approvedAt: null, publishedAt: null,
    notes: 'Jason reviewed questions 4/13. Interview went well — 26 min. Article draft looks great, needs Jason review.',
  },
  {
    id: 'nom002', type: 'cover-profile', publication: 'RRP',
    subjectName: 'Tanya Brooks', subjectEmail: null, subjectPhone: null,
    nominatorName: 'Prattville Elementary PTO', nominatorEmail: 'pto@prattvilleelementary.org',
    reason: 'Tanya has organized the school\'s annual reading festival for 8 years. Last year 1,200 kids participated. She volunteers 20+ hours per week.',
    status: 'pending',
    submittedAt: '2026-04-25', selectedAt: null, issueMonth: null,
    questionsGeneratedAt: null, interviewScheduledFor: null, interviewedAt: null,
    articleDraftedAt: null, photoReceivedAt: null, approvedAt: null, publishedAt: null,
    notes: '',
  },
  {
    id: 'nom003', type: 'mom-to-mom', publication: 'RRP',
    subjectName: 'Keisha Thompson', subjectEmail: 'keisha.t@gmail.com', subjectPhone: '(334) 555-0312',
    nominatorName: 'Sarah Mitchell', nominatorEmail: 'sarah.m@gmail.com',
    reason: 'Keisha raised three kids alone after losing her husband, went back to school, got her degree, and now runs a nonprofit helping single moms in Montgomery.',
    status: 'interview_scheduled',
    submittedAt: '2026-04-15', selectedAt: '2026-04-16', issueMonth: 'MAY26',
    questionsGeneratedAt: '2026-04-17', interviewScheduledFor: '2026-04-30', interviewedAt: null,
    articleDraftedAt: null, photoReceivedAt: null, approvedAt: null, publishedAt: null,
    notes: 'Interview scheduled for April 30 at 2pm via Bland.ai. Keisha confirmed.',
  },
  {
    id: 'nom004', type: 'mom-to-mom', publication: 'RRP',
    subjectName: 'Lisa Park', subjectEmail: 'lisapark.mgm@gmail.com', subjectPhone: null,
    nominatorName: 'Jennifer Davis', nominatorEmail: 'jdavis@gmail.com',
    reason: 'Lisa homeschools 4 kids and created a local homeschool co-op with 60 families. She builds community.',
    status: 'pending',
    submittedAt: '2026-04-26', selectedAt: null, issueMonth: null,
    questionsGeneratedAt: null, interviewScheduledFor: null, interviewedAt: null,
    articleDraftedAt: null, photoReceivedAt: null, approvedAt: null, publishedAt: null,
    notes: '',
  },
  {
    id: 'nom005', type: 'teacher-of-month', publication: 'RRP',
    subjectName: 'Mr. David Chen', subjectEmail: 'd.chen@carverhs.edu', subjectPhone: '(334) 555-0445',
    nominatorName: 'Parent Group — Carver High School', nominatorEmail: 'parentgroup@carverhs.edu',
    reason: 'Mr. Chen has taught AP Chemistry for 22 years and has sent over 40 students to pre-med programs. He mentors every student personally.',
    status: 'questions_generated',
    submittedAt: '2026-04-18', selectedAt: '2026-04-20', issueMonth: 'MAY26',
    questionsGeneratedAt: '2026-04-21', interviewScheduledFor: null, interviewedAt: null,
    articleDraftedAt: null, photoReceivedAt: null, approvedAt: null, publishedAt: null,
    notes: 'Questions sent to Mr. Chen for review 4/21. Waiting for interview time confirmation.',
  },
  {
    id: 'nom006', type: 'grands-are-great', publication: 'RRP',
    subjectName: 'Myrtle Johnson', subjectEmail: null, subjectPhone: '(334) 555-0567',
    nominatorName: 'The Johnson Family', nominatorEmail: 'johnsonkids@gmail.com',
    reason: 'Grandma Myrtle has been the family anchor for 50 years. She babysits her 11 grandchildren every week, teaches them to cook Southern food, and recently taught her 8-year-old granddaughter to read.',
    status: 'selected',
    submittedAt: '2026-04-20', selectedAt: '2026-04-22', issueMonth: 'JUN26',
    questionsGeneratedAt: null, interviewScheduledFor: null, interviewedAt: null,
    articleDraftedAt: null, photoReceivedAt: null, approvedAt: null, publishedAt: null,
    notes: 'Warm tone — Myrtle is 78. Use Bland.ai slower-pace setting. Family will coordinate timing.',
  },
]

export function getNominationsByType(type: NominationType): NominationRecord[] {
  return MOCK_NOMINATIONS.filter((n) => n.type === type)
}

export function getStatusStep(status: NominationStatus): number {
  return STATUS_STEPS.findIndex((s) => s.status === status)
}
