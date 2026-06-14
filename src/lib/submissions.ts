// ── Community Participation Engine — Submission Type Configs ─────────────────
// Single source of truth for all submission types, their question sets,
// public-facing copy, and workflow metadata.
// Used by: /submit (public gateway), /submit/[type] (form), /admin/community

// ── Field types ───────────────────────────────────────────────────────────────

export type FieldType =
  | 'text' | 'email' | 'tel' | 'textarea' | 'select'
  | 'checkbox' | 'date' | 'url' | 'number'

export interface SubmissionField {
  id:          string
  label:       string
  type:        FieldType
  required:    boolean
  placeholder?: string
  hint?:        string
  options?:     string[]  // for select type
  rows?:        number    // for textarea
  maxLength?:   number
  // If set, this field's value is also written to the named core column
  coreField?:  'related_person_name' | 'related_business_name' | 'related_school_name' | 'related_sport'
}

// ── Submission type config ────────────────────────────────────────────────────

export interface SubmissionTypeConfig {
  type:           string
  label:          string         // "Teacher of the Month"
  shortLabel:     string         // "Teacher Nom."
  emoji:          string
  group:          string         // display group on gateway page
  groupSlug:      string
  headline:       string         // "Nominate an Extraordinary Teacher"
  description:    string         // 2-3 sentences on the gateway card
  whoShouldUse:   string         // "Parents, students, and school colleagues"
  whatHappensNext:string         // "Our editorial team reviews all nominations..."
  estimatedTime:  string         // "3 minutes"
  /**
   * Does this submission have a DISTINCT nominee, or is the submitter
   * also the subject?
   *
   *   'required' → someone nominating someone else. The form renders
   *                a dedicated nominee-contact section (first/last
   *                name + email + phone, ALL required) so editorial
   *                can reach the nominee without chasing the
   *                nominator. Privacy promise lives below the section.
   *
   *   'self'     → the submitter IS the subject (boom apply-yourself,
   *                school news from the school, event from the org,
   *                parent submitting their own child's birthday).
   *                Only the "About You" section renders.
   *
   *  Omitted = treated as 'self' for backwards compatibility.
   */
  nomineeContact?: 'required' | 'self'
  /**
   * When nomineeContact === 'required', what's the relationship
   * between the nominee (subject of the article) and the contact
   * person we email?
   *
   *   'self'     (default) — nominee IS the contact. Form asks for
   *                their first/last name + email + phone.
   *
   *   'guardian' — nominee is a minor (Play Ball player, Student
   *                Spotlight kid). Form asks for the athlete/student's
   *                name as the subject AND a separate parent/guardian
   *                contact name + email + phone. Outreach emails greet
   *                the parent.
   *
   *   'business' — nominee is a business (Parent Picks). Form asks
   *                for the business name (from per-type fields) and
   *                a separate "best contact at the business" name +
   *                email + phone.
   */
  nomineeContactRole?: 'self' | 'guardian' | 'business'
  photoLabel?:    string         // label for the photo section
  photoRequired:  boolean
  photoHint?:     string
  /**
   * If true, the submission form shows a real file-upload input that
   * uploads directly to storage. The original is saved untouched for
   * print; a webp-optimized copy is saved for the website. Falls back
   * to the "email us the photo" instructional flow when false.
   */
  photoUpload?:   boolean
  /**
   * How many photos the submitter can attach. Default 1. When > 1 the
   * file input renders with `multiple` and the server side processes
   * each one in turn, storing the URLs into community_submissions.photo_urls.
   * The first photo also lands on web_image_url / print_image_url so
   * existing downstream code (article hero, magazine pull) still works
   * without changes.
   */
  photoMaxCount?: number
  fields:         SubmissionField[]
  publications:   string[]       // which pubs accept this type
  seasonal?:      boolean
  activeMonths?:  number[]       // 1-based months when this type is actively promoted
  externalUrl?:   string         // redirect to external form instead of building one
}

// ── Status definitions ────────────────────────────────────────────────────────

export type SubmissionStatus =
  | 'new' | 'needs-review' | 'awaiting-info' | 'in-progress'
  | 'ready-for-ai' | 'ai-draft-ready' | 'in-editing'
  | 'approved' | 'scheduled' | 'published' | 'rejected' | 'archived'

export const STATUS_CONFIG: Record<SubmissionStatus, {
  label: string; color: string; bg: string; description: string; nextActions: string[]
}> = {
  'new':           { label: 'New',           color: '#22c55e', bg: '#f0fdf4', description: 'Just submitted, not yet reviewed.',                      nextActions: ['Mark needs-review', 'Request more info', 'Reject'] },
  'needs-review':  { label: 'Needs Review',  color: '#3b82f6', bg: '#eff6ff', description: 'In the editorial review queue.',                         nextActions: ['Begin editing', 'Request more info', 'Approve', 'Reject'] },
  'awaiting-info': { label: 'Awaiting Info', color: '#f59e0b', bg: '#fefce8', description: 'Waiting on more info from submitter.',                   nextActions: ['Mark in-progress when info arrives', 'Archive if no reply'] },
  'in-progress':   { label: 'In Progress',   color: '#8b5cf6', bg: '#f5f3ff', description: 'Operator is actively working on this.',                  nextActions: ['Queue for AI draft', 'Move to in-editing', 'Approve'] },
  'ready-for-ai':  { label: 'Ready for AI',  color: '#0284c7', bg: '#e0f2fe', description: 'All info present. Queued for AI draft generation.',      nextActions: ['Generate AI draft (future)'] },
  'ai-draft-ready':{ label: 'AI Draft Ready',color: '#0284c7', bg: '#e0f2fe', description: 'AI has generated a first-pass draft for review.',        nextActions: ['Review and refine draft', 'Move to in-editing'] },
  'in-editing':    { label: 'In Editing',    color: '#ef6442', bg: '#fff7ed', description: 'Editor is refining the content.',                        nextActions: ['Approve', 'Send back for info'] },
  'approved':      { label: 'Approved',      color: '#166534', bg: '#f0fdf4', description: 'Approved and ready to publish.',                         nextActions: ['Schedule', 'Publish now'] },
  'scheduled':     { label: 'Scheduled',     color: '#b8860b', bg: '#fefce8', description: 'Assigned to a specific issue.',                          nextActions: ['Publish', 'Reschedule'] },
  'published':     { label: 'Published',     color: '#374151', bg: '#f9fafb', description: 'Live in digital or print.',                              nextActions: ['Archive'] },
  'rejected':      { label: 'Rejected',      color: '#dc2626', bg: '#fef2f2', description: 'Not moving forward.',                                   nextActions: ['Archive'] },
  'archived':      { label: 'Archived',      color: '#9ca3af', bg: '#f9fafb', description: 'Completed or closed.',                                  nextActions: [] },
}

// ── Gateway groups ────────────────────────────────────────────────────────────

export const GATEWAY_GROUPS = [
  { slug: 'nominate',  label: 'Nominate Someone',                emoji: '⭐', description: 'Recognize an extraordinary educator, grandparent, or community member.' },
  { slug: 'celebrate', label: 'Celebrate a Child',               emoji: '🎉', description: 'Share a birthday, student spotlight, or academic achievement.' },
  { slug: 'school',    label: 'Share School News',               emoji: '🏫', description: 'Submit updates, achievements, or news from your school community.' },
  { slug: 'events',    label: 'Submit an Event',                 emoji: '📅', description: 'Add a family-friendly event to the River Region Parents calendar.' },
  { slug: 'business',  label: 'Spotlight a Local Business',      emoji: '🏪', description: 'Tell us about a River Region business your family loves.' },
  { slug: 'feature',   label: 'Be Featured or Interviewed',      emoji: '🎤', description: 'Apply to be part of a River Region Parents editorial feature.' },
] as const

// ── Submission type configs ───────────────────────────────────────────────────

export const SUBMISSION_TYPES: SubmissionTypeConfig[] = [

  // ── 1. TEACHER OF THE MONTH ─────────────────────────────────────────────
  {
    type: 'teacher-of-the-month',
    label: 'Teacher of the Month', shortLabel: 'Teacher Nom.', emoji: '🍎',
    group: 'Nominate Someone', groupSlug: 'nominate',
    headline: 'Nominate an Extraordinary River Region Teacher',
    description: 'Every month, we recognize one teacher who goes above and beyond for River Region children. If you know a teacher who deserves recognition, nominate them here.',
    whoShouldUse: 'Parents, students, school colleagues, or anyone who knows an outstanding teacher.',
    whatHappensNext: 'Our editorial team reviews all nominations and selects one teacher per month. The selected teacher is featured in the print magazine and online.',
    estimatedTime: '3 minutes',
    nomineeContact: 'required',
    photoLabel: "Teacher Photos",
    photoRequired: false,
    photoUpload:   true,
    photoMaxCount: 4,
    photoHint: 'Add up to 4 photos — school portrait, classroom moments, or with their students. We\'ll save high-res copies for print and web-optimized copies for the website.',
    publications: ['rrp', 'mbp', 'aop', 'esp', 'gpp'],
    fields: [
      { id: 'teacher_name',    label: "Teacher's Full Name",     type: 'text',     required: true,  coreField: 'related_person_name',  placeholder: 'Jane Smith' },
      { id: 'school_name',     label: 'School Name',             type: 'text',     required: true,  coreField: 'related_school_name',  placeholder: 'Eastwood Elementary' },
      { id: 'grade_subject',   label: 'Grade Level / Subject',   type: 'text',     required: true,  placeholder: '3rd Grade / Math & Science' },
      { id: 'nomination_reason',label: 'Why are you nominating this teacher?', type: 'textarea', required: true, rows: 5, placeholder: 'Tell us what makes this teacher special. Share a specific story or moment that shows why they deserve recognition.', hint: 'The more specific and personal, the better.' },
      { id: 'submitter_relationship', label: 'Your relationship to the teacher', type: 'select', required: true, options: ['Parent of a student', 'Current student', 'Former student', 'School colleague', 'Community member', 'Other'] },
    ],
  },

  // ── 2. MOM-TO-MOM ────────────────────────────────────────────────────────
  // Nomination flow (not self-application). You nominate a mom; we
  // reach out to her with the interview form (Phase 5) where SHE
  // answers her own personal questions. The fields below are what we
  // need from YOU (the nominator) — who she is, why she's worth
  // featuring, and a heads-up about anything we should know before
  // contacting her.
  {
    type: 'mom-to-mom',
    label: 'Mom to Mom', shortLabel: 'Mom Nomination', emoji: '💛',
    group: 'Nominate Someone', groupSlug: 'nominate',
    headline: 'Nominate a River Region Mom for Mom to Mom',
    description: 'Mom to Mom is a monthly profile celebrating real River Region moms — their stories, wisdom, and love for this community. Know a mom whose story deserves to be heard? Nominate her here.',
    whoShouldUse: 'Friends, family, neighbors, co-workers — anyone who knows a River Region mom worth featuring.',
    whatHappensNext: 'Our editorial team reviews nominations and reaches out to the nominee with a short interview form. If she accepts, we feature her in print and online.',
    estimatedTime: '3 minutes',
    nomineeContact: 'required',
    photoLabel: 'Photos of Her (optional)',
    photoRequired: false,
    photoUpload:   true,
    photoMaxCount: 4,
    photoHint: 'Add up to 4 photos if you have them — with her kids, with her family, doing what she loves. We will also ask her for her own photos when we reach out.',
    publications: ['rrp', 'mbp', 'aop', 'esp', 'gpp'],
    fields: [
      { id: 'your_relationship', label: 'Your relationship to her',  type: 'select',   required: true,  options: ['Close friend','Family member','Neighbor','Co-worker','Met through our kids','Other'] },
      { id: 'neighborhood',      label: 'Her neighborhood or city',  type: 'text',     required: true,  placeholder: 'Montgomery, AL' },
      { id: 'kids_ages',         label: 'Her kids — number and ages (if you know)', type: 'text', required: false, placeholder: 'Two kids — ages 4 and 8' },
      { id: 'why_nominate',      label: 'Why are you nominating her?', type: 'textarea', required: true, rows: 5, placeholder: 'Why should River Region Parents readers hear her story? What makes her stand out? Be specific — moments, examples, the way she shows up for her family or community.' },
      { id: 'good_to_know',      label: 'Anything we should know before reaching out?', type: 'textarea', required: false, rows: 3, placeholder: 'Timing constraints, sensitive topics to handle with care, the best way to approach her — whatever helps us reach out thoughtfully.' },
    ],
  },

  // ── 3. GRANDS ARE THE GREATEST ───────────────────────────────────────────
  {
    type: 'grands-are-the-greatest',
    label: 'Grands Are the Greatest', shortLabel: 'Grands Nom.', emoji: '👴',
    group: 'Nominate Someone', groupSlug: 'nominate',
    headline: "Nominate a Grandparent Who Deserves Recognition",
    description: "Grands Are the Greatest celebrates the grandparents and great-grandparents who play an extraordinary role in River Region children's lives. Nominate yours.",
    whoShouldUse: 'Grandchildren, parents, or family members who want to celebrate a remarkable grandparent.',
    whatHappensNext: 'Selected grandparents are featured in the magazine with a profile and photo — a keepsake for the whole family.',
    estimatedTime: '4 minutes',
    nomineeContact: 'required',
    photoLabel: "Grandparent Photos",
    photoRequired: false,
    photoUpload:   true,
    photoMaxCount: 4,
    photoHint: 'Add up to 4 photos — alone, with grandchildren, or from a special family moment. We\'ll save high-res copies for print and web-optimized copies for the website.',
    publications: ['rrp', 'mbp', 'aop', 'esp', 'gpp'],
    fields: [
      { id: 'grand_name',      label: "Grandparent's Name",      type: 'text',     required: true,  coreField: 'related_person_name',  placeholder: 'Dorothy Mae Watson' },
      { id: 'city',            label: 'City / Neighborhood',     type: 'text',     required: true,  placeholder: 'Montgomery, AL' },
      { id: 'why_special',     label: 'Why are these grands great?', type: 'textarea', required: true, rows: 4, placeholder: 'Tell us what makes this grandparent extraordinary. How do they show up for your family?' },
      { id: 'special_memory',  label: 'A special memory or story', type: 'textarea', required: false, rows: 4, placeholder: 'A specific moment, tradition, or memory that captures who they are.' },
      { id: 'relationship',    label: 'Your relationship',       type: 'select',   required: true,  options: ['Grandchild', 'Parent of grandchild', 'Other family member', 'Family friend'] },
    ],
  },

  // ── 4. PLAY BALL ─────────────────────────────────────────────────────────
  {
    type: 'play-ball',
    label: 'Play Ball', shortLabel: 'Play Ball Spotlight', emoji: '⚽',
    group: 'Be Featured or Interviewed', groupSlug: 'feature',
    headline: 'Nominate Someone for Play Ball',
    description: 'Play Ball celebrates the players, coaches, and volunteers who show heart, hustle, and sportsmanship — on any field, court, or course.',
    whoShouldUse: 'Coaches, parents, teammates, volunteers — anyone who knows a player, coach, or team supporter worth celebrating.',
    whatHappensNext: 'Selected nominees are featured with a profile and photo in the magazine and online.',
    estimatedTime: '3 minutes',
    nomineeContact:     'required',
    nomineeContactRole: 'guardian',  // athlete may be a minor — we email the parent
    photoLabel: 'Action or Portrait Photos',
    photoRequired: false,
    photoUpload:   true,
    photoMaxCount: 4,
    photoHint: 'Add up to 4 photos — action shots, team photos, or sport portraits. We\'ll save high-res copies for print and web-optimized copies for the website.',
    publications: ['rrp', 'mbp', 'aop', 'esp', 'gpp'],
    fields: [
      { id: 'nominee_type',    label: 'Who are you nominating?', type: 'select', required: true,
        options: ['Player / Athlete', 'Coach', 'Assistant Coach', 'Volunteer (team mom, booster club, concessions)', 'Other team supporter'] },
      { id: 'nominee_name',    label: "Their Name",              type: 'text',     required: true,  coreField: 'related_person_name',  placeholder: 'Marcus Williams' },
      { id: 'sport',           label: 'Sport / Activity',        type: 'text',     required: true,  coreField: 'related_sport',       placeholder: 'Soccer, 8U League' },
      { id: 'school_team',     label: 'School or Team Name',     type: 'text',     required: true,  coreField: 'related_school_name', placeholder: 'Eastwood Elementary / Montgomery Youth Soccer' },
      { id: 'age_grade',       label: 'Age / Grade',             type: 'text',     required: false, placeholder: '9 years old / 3rd Grade', hint: 'For player nominations. Leave blank for coaches and team moms.' },
      { id: 'years_with_team', label: 'Years coaching or with the team', type: 'text', required: false, placeholder: '4th season with the program', hint: 'For coach and team mom nominations. Leave blank for players.' },
      { id: 'why_outstanding', label: 'What makes them stand out?', type: 'textarea', required: true, rows: 4, placeholder: 'Heart, hustle, character, leadership, the way they show up for kids — tell us what makes them special.' },
      { id: 'achievement',     label: 'A recent moment worth sharing', type: 'textarea', required: false, rows: 3, placeholder: 'A game-winning moment, a memorable season, a moment of character — anything that captures who they are.' },
      { id: 'submitter_relationship', label: 'Your relationship to the nominee', type: 'select', required: true,
        options: ['Coach', 'Assistant Coach', 'Volunteer (team mom, booster club, concessions)', 'Teammate', 'Parent / Guardian', 'Family member', 'Other'] },
    ],
  },

  // ── 5. STUDENT SPOTLIGHT ─────────────────────────────────────────────────
  {
    type: 'student-spotlight',
    label: 'Student Spotlight', shortLabel: 'Student Feature', emoji: '🎓',
    group: 'Celebrate a Child', groupSlug: 'celebrate',
    headline: 'Celebrate an Outstanding River Region Student',
    description: 'Student Spotlight recognizes River Region students who stand out — for academic achievement, community service, personal growth, or pure character.',
    whoShouldUse: 'Parents, teachers, or family members who want to celebrate a student who deserves recognition.',
    whatHappensNext: "Selected students are featured online and may be included in the print magazine depending on the issue theme.",
    estimatedTime: '3 minutes',
    nomineeContact:     'required',
    nomineeContactRole: 'guardian',  // student is a minor — we email the parent
    photoLabel: "Student Photos",
    photoRequired: true,
    photoUpload:   true,
    photoMaxCount: 4,
    photoHint: "Add up to 4 photos — school portrait, team shot, activity photos, or with their family. We'll save high-res copies for print and web-optimized copies for the website.",
    publications: ['rrp', 'mbp', 'aop', 'esp', 'gpp'],
    fields: [
      { id: 'student_name',    label: "Student's Name",          type: 'text',     required: true,  coreField: 'related_person_name', placeholder: 'Amara Johnson' },
      { id: 'school_name',     label: 'School Name',             type: 'text',     required: true,  coreField: 'related_school_name', placeholder: 'Eastwood Elementary' },
      { id: 'school_region',   label: 'School Region',           type: 'select',   required: true,  options: ['Montgomery County', 'Autauga / Prattville', 'Elmore County', 'Pike Road', 'Private School', 'Other'], hint: 'So the spotlight shows up on the right regional page.' },
      { id: 'grade',           label: 'Grade',                   type: 'text',     required: true,  placeholder: '5th Grade' },
      { id: 'why_special',     label: 'What makes this student special?', type: 'textarea', required: true, rows: 4, placeholder: 'Tell us what stands out — their character, an achievement, a challenge they overcame, or how they\'ve grown.' },
      { id: 'achievement',     label: 'A recent achievement or notable moment', type: 'textarea', required: false, rows: 3, placeholder: 'An award, project, act of kindness, or academic milestone.' },
      { id: 'submitter_relationship', label: 'Your relationship to the student', type: 'select', required: true, options: ['Parent / Guardian', 'Teacher', 'Coach', 'Family member', 'Other'] },
    ],
  },

  // ── 6. SCHOOL NEWS ────────────────────────────────────────────────────────
  {
    type: 'school-news',
    label: 'School News', shortLabel: 'School News', emoji: '🏫',
    group: 'Share School News', groupSlug: 'school',
    headline: 'Submit School News or Announcements',
    description: 'Share news from your school community — events, achievements, programs, and announcements that River Region families should know about.',
    whoShouldUse: 'School administrators, teachers, PTA members, or parents with news from a River Region school.',
    whatHappensNext: 'Our editorial team reviews submissions and includes appropriate items in the School Bits section of the magazine and website.',
    estimatedTime: '2 minutes',
    nomineeContact: 'self',  // school staff submitting their school's news
    photoRequired: false,
    photoHint: 'Include a school event photo if available. Email to photos@riverregionparents.com with the school name.',
    publications: ['rrp', 'mbp', 'aop', 'esp', 'gpp'],
    fields: [
      { id: 'school_name',     label: 'School Name',             type: 'text',     required: true,  coreField: 'related_school_name', placeholder: 'Eastwood Elementary School' },
      { id: 'news_headline',   label: 'News Headline / Topic',   type: 'text',     required: true,  placeholder: 'Eastwood Earns National Blue Ribbon Award' },
      { id: 'news_content',    label: 'News Details',            type: 'textarea', required: true,  rows: 5, placeholder: 'Share the details. What happened? Why does it matter? Who should readers contact for more information?' },
      { id: 'school_contact_name',  label: 'Contact Person at School', type: 'text', required: true,  placeholder: 'Principal Karen Hayes' },
      { id: 'school_contact_email', label: 'Contact Email',      type: 'email',    required: true,  placeholder: 'khayes@eastwood.edu' },
      { id: 'target_month',    label: 'Target Issue Month (if applicable)', type: 'select', required: false, options: ['January','February','March','April','May','June','July','August','September','October','November','December','No preference'] },
    ],
  },

  // ── 7. BIRTHDAY CELEBRATION ───────────────────────────────────────────────
  {
    type: 'birthday-celebration',
    label: 'Birthday Celebration', shortLabel: 'Birthday', emoji: '🎂',
    group: 'Celebrate a Child', groupSlug: 'celebrate',
    headline: "Celebrate Your Child's Birthday in the Magazine",
    description: "River Region Parents features birthday shoutouts for local children. Submit your child's birthday and photo for a chance to be featured.",
    whoShouldUse: 'Parents or guardians celebrating a child\'s birthday.',
    whatHappensNext: "We include birthday shoutouts in the print magazine and online. Submissions are accepted on a rolling basis based on available space.",
    estimatedTime: '2 minutes',
    nomineeContact: 'self',  // parent IS the legal contact for the minor child
    photoLabel: "Child's Birthday Photo",
    photoRequired: true,
    photoHint: 'A cute photo of the birthday child — party, portrait, or candid. Email to photos@riverregionparents.com with the child\'s name and birthday date.',
    publications: ['rrp', 'mbp', 'aop', 'esp', 'gpp'],
    fields: [
      { id: 'child_name',      label: "Child's First Name",      type: 'text',     required: true,  coreField: 'related_person_name', placeholder: 'Ellie' },
      { id: 'age_turning',     label: 'Age Turning',             type: 'number',   required: true,  placeholder: '5' },
      { id: 'birthday_date',   label: 'Birthday Date',           type: 'date',     required: true },
      { id: 'city',            label: 'City / Neighborhood',     type: 'text',     required: true,  placeholder: 'Montgomery, AL' },
      { id: 'birthday_message',label: 'Birthday Message (optional)', type: 'textarea', required: false, rows: 3, placeholder: 'Happy 5th birthday, Ellie! You light up every room you walk into. We love you to the moon and back. — Mom, Dad & big brother Luke', maxLength: 150 },
    ],
  },

  // ── 8. EVENT SUBMISSION ───────────────────────────────────────────────────
  {
    type: 'event-submission',
    label: 'Event Submission', shortLabel: 'Event', emoji: '📅',
    group: 'Submit an Event', groupSlug: 'events',
    headline: 'Add a Family Event to the River Region Calendar',
    description: 'Submit a family-friendly event and we\'ll consider it for the River Region Parents Things To Do calendar and print event listings.',
    whoShouldUse: 'Event organizers, nonprofits, schools, businesses, or anyone hosting a family-friendly event in the River Region.',
    whatHappensNext: 'Our team reviews submissions and adds qualifying events to the online calendar and considers them for print listings.',
    estimatedTime: '3 minutes',
    nomineeContact: 'self',  // organizer submitting their own event
    photoRequired: false,
    photoHint: 'An event flyer or photo. Email to photos@riverregionparents.com with the event name.',
    publications: ['rrp', 'mbp', 'aop', 'esp', 'gpp'],
    fields: [
      { id: 'event_name',      label: 'Event Name',              type: 'text',     required: true,  placeholder: 'Eastwood Fall Festival 2026' },
      { id: 'event_date',      label: 'Event Date',              type: 'date',     required: true },
      { id: 'event_time',      label: 'Event Time',              type: 'text',     required: true,  placeholder: '10:00 AM – 4:00 PM' },
      { id: 'event_location',  label: 'Location / Address',      type: 'text',     required: true,  placeholder: 'Eastwood Park, 123 Main St, Montgomery, AL' },
      { id: 'event_description',label: 'Event Description',     type: 'textarea', required: true,  rows: 4, placeholder: 'What is this event? What will families experience? What age groups is it best for?' },
      { id: 'registration_url',label: 'Website or Registration Link', type: 'url', required: false, placeholder: 'https://...' },
      { id: 'is_free',         label: 'Is this event free?',     type: 'select',   required: true,  options: ['Free', 'Paid admission', 'Free with paid options', 'Varies'] },
      { id: 'target_audience', label: 'Best for',                type: 'select',   required: true,  options: ['All families', 'Ages 0–5', 'Ages 6–12', 'Teens', 'Parents only', 'All ages'] },
    ],
  },

  // ── 9. PARENT PICKS / BUSINESS SPOTLIGHT ─────────────────────────────────
  {
    type: 'parent-picks',
    label: 'Parent Picks', shortLabel: 'Business Spotlight', emoji: '🏪',
    group: 'Spotlight a Local Business', groupSlug: 'business',
    headline: 'Tell Us About a Local Business You Love',
    description: 'Parent Picks celebrates local River Region businesses that families actually use and trust. If a business has made your family life better, nominate them.',
    whoShouldUse: 'Parents who want to share a positive experience with a local business they recommend to other families.',
    whatHappensNext: 'Our editorial team reviews all picks. Featured businesses are included in the Parent Picks section of the magazine and our digital guides.',
    estimatedTime: '3 minutes',
    nomineeContact:     'required',
    nomineeContactRole: 'business',  // contact is someone at the business
    photoRequired: false,
    photoHint: 'A photo of the business, product, or your family\'s experience. Email to photos@riverregionparents.com.',
    publications: ['rrp', 'mbp', 'aop', 'esp', 'gpp'],
    fields: [
      { id: 'business_name',   label: 'Business Name',           type: 'text',     required: true,  coreField: 'related_business_name', placeholder: 'River Region Pediatrics' },
      { id: 'business_type',   label: 'Type of Business',        type: 'text',     required: true,  placeholder: 'Pediatric Practice / Childcare / Restaurant / etc.' },
      { id: 'why_love',        label: 'Why do you love this business?', type: 'textarea', required: true, rows: 4, placeholder: 'What do you love most about them? Tell us a specific experience or story that captures why families should know about this business.' },
      { id: 'business_website',label: 'Business Website',        type: 'url',      required: false, placeholder: 'https://...' },
      { id: 'have_used',       label: 'Have you personally visited or worked with this business?', type: 'select', required: true, options: ['Yes, we use them regularly', 'Yes, we\'ve visited', 'I was referred by a friend', 'Other'] },
    ],
  },

  // ── 10. BOOM PROFILE ──────────────────────────────────────────────────────
  {
    type: 'boom-profile',
    label: 'Boom Community Profile', shortLabel: 'Boom Profile', emoji: '⚡',
    group: 'Be Featured or Interviewed', groupSlug: 'feature',
    headline: 'Apply to Be Featured in River Region Boom',
    description: 'River Region Boom profiles the people, entrepreneurs, and community leaders shaping the River Region\'s future. Apply to share your story.',
    whoShouldUse: 'Entrepreneurs, community leaders, professionals, and change-makers in the River Region.',
    whatHappensNext: 'Our editorial team reviews applications and reaches out to schedule a profile interview. Selected profiles appear in River Region Boom magazine.',
    estimatedTime: '5 minutes',
    nomineeContact: 'self',  // apply yourself
    photoLabel: 'Your Professional / Lifestyle Photo',
    photoRequired: false,
    photoHint: 'A confident, authentic photo of yourself — professional portrait, at work, or in your element. Email to photos@riverregionparents.com.',
    publications: ['boom'],
    fields: [
      { id: 'name',            label: 'Your Full Name',          type: 'text',     required: true,  coreField: 'related_person_name', placeholder: 'Jason Watson' },
      { id: 'city',            label: 'City / Neighborhood',     type: 'text',     required: true,  placeholder: 'Montgomery, AL' },
      { id: 'occupation',      label: 'Occupation or Business',  type: 'text',     required: true,  coreField: 'related_business_name', placeholder: 'Publisher, River Region Parents' },
      { id: 'your_story',      label: 'Tell us your story — who are you and what drives you?', type: 'textarea', required: true, rows: 5, placeholder: 'Go deep. What shaped you? What are you building? What gets you out of bed?' },
      { id: 'love_river_region',label: 'What do you love most about the River Region?', type: 'textarea', required: true, rows: 3, placeholder: 'Be specific. A place, a community, an opportunity — what makes this place worth building here?' },
      { id: 'current_project', label: 'What are you currently working on or most excited about?', type: 'textarea', required: true, rows: 3, placeholder: 'A project, initiative, business launch, or community effort.' },
      { id: 'next_feature',    label: 'Who do you think we should feature next? (optional)', type: 'text', required: false, placeholder: 'Name and why' },
    ],
  },

  // ── 11. FAMILY FAVORITES NOMINATION ──────────────────────────────────────
  // Redirects to the /family-favorites page rather than a custom form
  {
    type: 'family-favorites-nomination',
    label: 'Family Favorites Nomination', shortLabel: 'FF Nomination', emoji: '⭐',
    group: 'Spotlight a Local Business', groupSlug: 'business',
    headline: 'Nominate for Family Favorites',
    description: 'Family Favorites is the annual River Region community recognition program. Nominate your favorite local businesses across 30 categories.',
    whoShouldUse: 'Any River Region family who wants to recognize a local business they love.',
    whatHappensNext: 'Nominations are reviewed by our editorial team. Finalists are announced and community voting determines the winners.',
    estimatedTime: '2 minutes',
    photoRequired: false,
    publications: ['rrp'],
    externalUrl: '/family-favorites',
    fields: [], // handled by the Family Favorites system
  },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

export function getSubmissionType(type: string): SubmissionTypeConfig | undefined {
  return SUBMISSION_TYPES.find(t => t.type === type)
}

export function getTypesByGroup(groupSlug: string): SubmissionTypeConfig[] {
  return SUBMISSION_TYPES.filter(t => t.groupSlug === groupSlug && !t.externalUrl)
}

// Aligned to the site palette (globals.css @theme). Primary = coral #ef6442,
// secondary = teal #3d8e8e, accent = gold #f3bf24. Non-themed types map to
// supporting hues that still read well on the cream background.
export const TYPE_COLORS: Record<string, string> = {
  'teacher-of-the-month':       '#ef6442',  // primary coral
  'mom-to-mom':                 '#e11d48',  // rose-600 — Mom to Mom brand
  'grands-are-the-greatest':    '#f3bf24',  // accent gold
  'play-ball':                  '#3d8e8e',  // secondary teal — matches homepage spotlight
  'student-spotlight':          '#8b5cf6',
  'school-news':                '#0284c7',
  'birthday-celebration':       '#ec4899',
  'event-submission':           '#0d9488',
  'parent-picks':               '#ef6442',  // primary coral
  'boom-profile':               '#374151',
  'family-favorites-nomination':'#f3bf24',  // accent gold
}
