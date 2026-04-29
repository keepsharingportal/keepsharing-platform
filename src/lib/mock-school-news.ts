export type NewsSource = 'form' | 'email' | 'facebook' | 'manual'
export type NewsStatus = 'pending' | 'approved' | 'rejected'

export interface SchoolNewsItem {
  id: string
  school: string
  blurb: string
  imageUrl: string | null
  source: NewsSource
  status: NewsStatus
  submittedAt: string
  publication: string
  submittedBy?: string
  facebookUrl?: string
}

export const MONTGOMERY_SCHOOLS = [
  'Prattville Elementary', 'Eastchase Elementary', 'Bear Exploration Center',
  'Dalraida Elementary', 'McKee Middle School', 'Cloverdale Elementary',
  'Carver High School', 'Jefferson Davis High', 'Robert E. Lee High',
  'Montgomery Academy', 'Prattville Christian Academy', 'Covenant Christian',
  'Montessori School of Montgomery', 'St. James School', 'Edgewood Academy',
]

export const MOCK_SCHOOL_NEWS: SchoolNewsItem[] = [
  {
    id: 'sn001', school: 'Prattville Elementary', publication: 'RRP',
    blurb: 'Congratulations to our 4th grade Science Fair winners! Emma Johnson took first place with her experiment on solar energy efficiency, while Tyler Brooks earned 2nd for his study on water filtration. Both students will advance to the state competition in May.',
    imageUrl: null, source: 'form', status: 'pending', submittedAt: '2026-04-27', submittedBy: 'Mrs. Kelley Patterson, Principal',
  },
  {
    id: 'sn002', school: 'Carver High School', publication: 'RRP',
    blurb: 'Carver\'s robotics team, the "Iron Eagles," just qualified for the FIRST Robotics State Championship! The team of 12 students built a robot in just 6 weeks. Coach David Chen says this is the first time Carver has qualified in 7 years. Competition is May 3rd in Birmingham.',
    imageUrl: null, source: 'facebook', status: 'pending', submittedAt: '2026-04-26',
    facebookUrl: 'https://facebook.com/post/example-post-id',
  },
  {
    id: 'sn003', school: 'Montgomery Academy', publication: 'RRP',
    blurb: 'MA Lower School held its Spring Musical last Friday — "The Lion King Jr." — with 45 students grades 1–5. Standing ovation from a sold-out crowd of 400 parents and families. Director Mrs. Barnes says this was the best performance in her 12 years at the school.',
    imageUrl: null, source: 'email', status: 'pending', submittedAt: '2026-04-25', submittedBy: 'admissions@montgomeryacademy.org',
  },
  {
    id: 'sn004', school: 'Eastchase Elementary', publication: 'RRP',
    blurb: 'Eastchase Elementary is collecting school supplies for students at Title I schools this spring. Drop-off boxes are in the lobby through May 10th. Most-needed items: #2 pencils, wide-ruled notebooks, and backpacks.',
    imageUrl: null, source: 'manual', status: 'pending', submittedAt: '2026-04-24',
  },
  {
    id: 'sn005', school: 'St. James School', publication: 'RRP',
    blurb: 'St. James School held their annual Field Day last Thursday. Every student in K-8 competed in track and field events. The overall Spirit Award went to the 6th grade class for the third year in a row. Great weather made it one of the best Field Days in school history!',
    imageUrl: null, source: 'form', status: 'approved', submittedAt: '2026-04-22', submittedBy: 'communications@stjames.org',
  },
  {
    id: 'sn006', school: 'Prattville Christian Academy', publication: 'RRP',
    blurb: 'PCA senior Olivia Nguyen has been awarded a full scholarship to Auburn University\'s School of Nursing. Olivia plans to return to Montgomery after graduation to work at Baptist Health. Congratulations, Olivia!',
    imageUrl: null, source: 'email', status: 'approved', submittedAt: '2026-04-21', submittedBy: 'principal@prattvillechristian.org',
  },
]

export function getPendingSchoolNews(pub: string): SchoolNewsItem[] {
  return MOCK_SCHOOL_NEWS.filter((n) => n.publication === pub && n.status === 'pending')
}
