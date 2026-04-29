export type UpdateStatus = 'not_sent' | 'sent' | 'responded' | 'updated'

export interface GuideListing {
  id: string
  publication: string
  guideMonth: number
  year: number
  guideName: string
  businessName: string
  contactName: string
  phone: string
  email: string
  website: string
  address: string
  category: string
  description: string
  lastVerified: string | null
  updateStatus: UpdateStatus
  updateRequestSentAt: string | null
  updateToken: string | null
  pendingChanges: Partial<GuideListing> | null
}

export const GUIDE_CALENDAR: { month: number; name: string; topCategories: string[] }[] = [
  { month: 1,  name: 'New Year Family Reset',   topCategories: ['Fitness', 'Tutoring', 'Therapy', 'Financial'] },
  { month: 2,  name: 'Love & Family',           topCategories: ['Date venues', 'Florists', 'Couples therapy'] },
  { month: 3,  name: 'Summer Camp Guide',        topCategories: ['Camps', 'Recreation', 'Sports', 'Arts'] },
  { month: 4,  name: 'Child Care Guide',         topCategories: ['Daycares', 'Preschools', 'Pediatricians'] },
  { month: 5,  name: 'Summer Fun + VBS',         topCategories: ['Churches', 'Pools', 'Recreation', 'Travel'] },
  { month: 6,  name: 'Newcomers Guide',          topCategories: ['Real estate', 'Pediatricians', 'Schools'] },
  { month: 7,  name: 'Birthday Guide',           topCategories: ['Party venues', 'Bakeries', 'Entertainment'] },
  { month: 8,  name: 'Back to School',           topCategories: ['Schools', 'Tutoring', 'Sports', 'Uniforms'] },
  { month: 9,  name: 'Special Needs Guide',      topCategories: ['Therapy', 'Specialists', 'Adaptive sports'] },
  { month: 10, name: 'Fall Family Fun',          topCategories: ['Entertainment', 'Pumpkin', 'Family venues'] },
  { month: 11, name: 'Healthy Kids Guide',       topCategories: ['Pediatricians', 'Dental', 'Ortho', 'Health'] },
  { month: 12, name: 'Holiday Happenings',       topCategories: ['Retail', 'Entertainment', 'Charities'] },
]

export const MOCK_GUIDE_LISTINGS: GuideListing[] = [
  // ── March: Summer Camp Guide ──────────────────────────────────────────────
  { id: 'g001', publication: 'RRP', guideMonth: 3, year: 2026, guideName: 'Summer Camp Guide', businessName: 'Camp Cheaha', contactName: 'Director Tom Weaver', phone: '(256) 362-2525', email: 'director@campcheaha.com', website: 'www.campcheaha.com', address: '2141 Bald Rock Rd, Talladega, AL 35160', category: 'Overnight Camps', description: 'Overnight and day camps for ages 7–17. Swimming, hiking, rock climbing, zipline, and more.', lastVerified: null, updateStatus: 'not_sent', updateRequestSentAt: null, updateToken: null, pendingChanges: null },
  { id: 'g002', publication: 'RRP', guideMonth: 3, year: 2026, guideName: 'Summer Camp Guide', businessName: 'Camp Winnataska', contactName: 'Camp Director', phone: '(205) 338-4911', email: 'info@winnataska.org', website: 'www.winnataska.org', address: '1120 Winnataska Rd, Pell City, AL 35128', category: 'Overnight Camps', description: 'Christian adventure camp for boys and girls ages 7–17. Resident and day camp options.', lastVerified: '2025-03-12', updateStatus: 'sent', updateRequestSentAt: '2026-02-01', updateToken: 'tok_g002_update_2026', pendingChanges: null },
  { id: 'g003', publication: 'RRP', guideMonth: 3, year: 2026, guideName: 'Summer Camp Guide', businessName: 'Elite Gymnastics Montgomery', contactName: 'Carrie Holbrook', phone: '(334) 271-9808', email: 'info@elitegymnasticsmontgomery.com', website: 'www.elitegymnasticsmontgomery.com', address: '2740 Zelda Rd, Montgomery, AL 36106', category: 'Sports Camps', description: 'Summer gymnastics camps for all skill levels, ages 4–16. Daily and weekly sessions available.', lastVerified: '2026-01-28', updateStatus: 'updated', updateRequestSentAt: '2026-01-15', updateToken: 'tok_g003_update_2026', pendingChanges: null },
  { id: 'g004', publication: 'RRP', guideMonth: 3, year: 2026, guideName: 'Summer Camp Guide', businessName: 'Alabama Martial Arts Academy', contactName: 'Coach Ray Simmons', phone: '(334) 272-7000', email: 'info@alabamamartialarts.com', website: 'www.alabamamartialarts.com', address: '3561 McGehee Rd, Montgomery, AL 36111', category: 'Sports Camps', description: 'Summer martial arts day camps. Karate, jiu-jitsu, confidence-building programs for ages 5–16.', lastVerified: null, updateStatus: 'not_sent', updateRequestSentAt: null, updateToken: null, pendingChanges: null },
  { id: 'g005', publication: 'RRP', guideMonth: 3, year: 2026, guideName: 'Summer Camp Guide', businessName: 'Liberty Park Sports Complex', contactName: 'Events Coordinator', phone: '(334) 260-6107', email: 'events@libertyparkmontgomery.com', website: 'www.libertyparkmontgomery.com', address: '7001 Fain Park Dr, Montgomery, AL 36117', category: 'Sports Camps', description: 'Multi-sport summer camps including soccer, basketball, and flag football for ages 5–14.', lastVerified: '2025-03-20', updateStatus: 'responded', updateRequestSentAt: '2026-01-15', updateToken: 'tok_g005_update_2026', pendingChanges: { phone: '(334) 260-6200', description: 'Multi-sport summer camps including soccer, basketball, flag football, and NEW pickleball for ages 5–14.' } },
  { id: 'g006', publication: 'RRP', guideMonth: 3, year: 2026, guideName: 'Summer Camp Guide', businessName: 'Imagination Station', contactName: 'Greg Norris', phone: '(334) 262-6000', email: 'info@imaginationstationmgm.com', website: 'www.imaginationstationmgm.com', address: '3090 McGehee Rd, Montgomery, AL 36111', category: 'Arts & STEM', description: 'Creative arts and STEM-focused summer day camps for ages 5–14. Theater, art, coding, robotics.', lastVerified: '2026-02-10', updateStatus: 'updated', updateRequestSentAt: '2026-01-15', updateToken: 'tok_g006_update_2026', pendingChanges: null },

  // ── April: Child Care Guide ────────────────────────────────────────────────
  { id: 'g007', publication: 'RRP', guideMonth: 4, year: 2026, guideName: 'Child Care Guide', businessName: 'EarlyBird Learning Center', contactName: 'Patricia Owens', phone: '(334) 277-3200', email: 'info@earlybirdalabama.com', website: 'www.earlybirdalabama.com', address: '2480 Bell Rd, Montgomery, AL 36117', category: 'Daycare & Preschool', description: 'Full-day and part-time childcare for infants through Pre-K. NAEYC accredited.', lastVerified: '2026-03-05', updateStatus: 'updated', updateRequestSentAt: '2026-03-01', updateToken: 'tok_g007_update_2026', pendingChanges: null },
  { id: 'g008', publication: 'RRP', guideMonth: 4, year: 2026, guideName: 'Child Care Guide', businessName: 'KinderCare Learning Centers', contactName: 'Center Director', phone: '(334) 281-5400', email: 'montgomery@kindercare.com', website: 'www.kindercare.com', address: '350 N Eastern Blvd, Montgomery, AL 36117', category: 'Daycare & Preschool', description: 'National leader in early childhood education. Infant through pre-K programs, before/after school.', lastVerified: '2025-04-10', updateStatus: 'sent', updateRequestSentAt: '2026-03-01', updateToken: 'tok_g008_update_2026', pendingChanges: null },
  { id: 'g009', publication: 'RRP', guideMonth: 4, year: 2026, guideName: 'Child Care Guide', businessName: "Anthony's Pediatrics", contactName: 'Dr. Anthony Richards', phone: '(334) 279-5890', email: 'front@anthonyspediatrics.com', website: 'www.anthonyspediatrics.com', address: '7910 Vaughn Rd, Montgomery, AL 36116', category: 'Pediatricians', description: 'Board-certified pediatrician serving newborns through adolescents. Same-day sick visits.', lastVerified: null, updateStatus: 'not_sent', updateRequestSentAt: null, updateToken: null, pendingChanges: null },
  { id: 'g010', publication: 'RRP', guideMonth: 4, year: 2026, guideName: 'Child Care Guide', businessName: 'Sunshine Montessori School', contactName: 'Head of School', phone: '(334) 271-4200', email: 'admissions@sunshinemontessori.com', website: 'www.sunshinemontessori.com', address: '3600 McGehee Rd, Montgomery, AL 36111', category: 'Daycare & Preschool', description: 'Authentic Montessori education for ages 18 months through 6 years. Small classes, mixed-age groups.', lastVerified: null, updateStatus: 'not_sent', updateRequestSentAt: null, updateToken: null, pendingChanges: null },
]

export function getListingsForGuide(month: number, year: number, pub = 'RRP'): GuideListing[] {
  return MOCK_GUIDE_LISTINGS.filter((l) => l.guideMonth === month && l.year === year && l.publication === pub)
}

export function getGuideEntryByToken(token: string): GuideListing | null {
  return MOCK_GUIDE_LISTINGS.find((l) => l.updateToken === token) ?? null
}

export function getGuideStats(month: number, year: number, pub = 'RRP') {
  const listings = getListingsForGuide(month, year, pub)
  return {
    total:      listings.length,
    not_sent:   listings.filter((l) => l.updateStatus === 'not_sent').length,
    sent:       listings.filter((l) => l.updateStatus === 'sent').length,
    responded:  listings.filter((l) => l.updateStatus === 'responded').length,
    updated:    listings.filter((l) => l.updateStatus === 'updated').length,
  }
}
