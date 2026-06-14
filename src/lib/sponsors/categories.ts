// Sponsor categories — single source of truth for advertiser_accounts.
// sponsor_category_slug. Drives:
//   - the bulk categorizer (AI suggestion + manual select)
//   - the sponsor → content alignment matcher on the Content Deployment page
//   - the sponsor edit page (eventually)
//
// The list expands what the old TYPE_CATEGORY map in distribution/page.tsx
// covered (which only had 6 slugs and missed obvious cases like medical
// practices, churches, dance studios, etc.). Editors can still type a
// free-text slug if their case isn't here — but we'll get coverage on
// the common ones.
//
// Slug format: lowercase-kebab. Stable forever once a sponsor is filed
// against one (renaming breaks the alignment match), so add new slugs
// instead of renaming existing ones.

export interface SponsorCategory {
  slug:        string
  label:       string
  /** What a human would type into Google for this. Helps the AI classifier
   *  decide between near-options (e.g. orthodontics vs general dentistry). */
  description: string
  /** Editorial submission types whose content tends to align with this
   *  category. Used by the Content Deployment sponsor-alignment matcher. */
  alignedSubmissionTypes?: string[]
}

export const SPONSOR_CATEGORIES: SponsorCategory[] = [
  // ── Schools / Education ────────────────────────────────────────────
  { slug: 'private-independent-schools', label: 'Private / Independent Schools',
    description: 'Private K-12 schools, parochial schools, independent schools',
    alignedSubmissionTypes: ['school-news', 'teacher-of-the-month', 'student-spotlight'] },
  { slug: 'public-schools', label: 'Public Schools / School Districts',
    description: 'Public school districts, county boards of education',
    alignedSubmissionTypes: ['school-news', 'teacher-of-the-month', 'student-spotlight'] },
  { slug: 'preschools-childcare', label: 'Preschools / Childcare',
    description: 'Preschools, daycare centers, mother\'s day out, MDO programs' },
  { slug: 'tutoring-enrichment', label: 'Tutoring / Enrichment',
    description: 'Academic tutoring, learning centers, after-school enrichment',
    alignedSubmissionTypes: ['student-spotlight', 'school-news'] },
  { slug: 'colleges-universities', label: 'Colleges / Universities',
    description: 'Higher education, community colleges, trade schools' },

  // ── Health / Medical ───────────────────────────────────────────────
  { slug: 'pediatrics-family-medicine', label: 'Pediatrics / Family Medicine',
    description: 'Pediatric practices, family medicine, urgent care for families' },
  { slug: 'orthodontics-dental', label: 'Orthodontics / Dental',
    description: 'Orthodontists, pediatric dentists, family dentistry' },
  { slug: 'mom-wellness', label: 'OB/GYN / Mom Wellness',
    description: 'OBGYN, midwives, fertility, prenatal, postpartum, women\'s health',
    alignedSubmissionTypes: ['mom-to-mom'] },
  { slug: 'mental-health', label: 'Mental Health / Counseling',
    description: 'Therapists, counselors, behavioral health, family counseling' },
  { slug: 'specialty-medical', label: 'Specialty Medical',
    description: 'Dermatology, optometry, ENT, allergists, other specialty practices' },

  // ── Sports / Arts / Activities ─────────────────────────────────────
  { slug: 'sports-recreation', label: 'Sports / Recreation',
    description: 'Sports leagues, gyms, martial arts, swim schools, YMCAs',
    alignedSubmissionTypes: ['play-ball', 'event-submission'] },
  { slug: 'arts-music-dance', label: 'Arts / Music / Dance',
    description: 'Dance studios, music lessons, art classes, theater programs' },
  { slug: 'camps-summer-programs', label: 'Camps / Summer Programs',
    description: 'Summer camps, day camps, vacation programs' },

  // ── Family services ────────────────────────────────────────────────
  { slug: 'family-services', label: 'Family Services',
    description: 'Family law, financial planning, accountants, real estate for families' },
  { slug: 'home-services', label: 'Home Services',
    description: 'Cleaning, lawn care, pest control, HVAC, plumbing, contractors' },
  { slug: 'maternity-baby', label: 'Maternity / Baby Goods',
    description: 'Baby boutiques, maternity wear, kids consignment, gear, registries' },

  // ── Retail / Lifestyle ─────────────────────────────────────────────
  { slug: 'shopping-boutiques', label: 'Shopping / Boutiques',
    description: 'Clothing boutiques, gift shops, jewelry, accessories',
    alignedSubmissionTypes: ['birthday-celebration'] },
  { slug: 'food-restaurants', label: 'Food / Restaurants',
    description: 'Restaurants, cafes, bakeries, ice cream, family-friendly dining' },
  { slug: 'entertainment-attractions', label: 'Entertainment / Attractions',
    description: 'Theme parks, museums, bounce houses, family entertainment venues' },
  { slug: 'beauty-personal-care', label: 'Beauty / Personal Care',
    description: 'Salons, spas, hair, nails, skincare aimed at moms or kids' },

  // ── Community ──────────────────────────────────────────────────────
  { slug: 'faith-organizations', label: 'Faith Organizations',
    description: 'Churches, temples, faith-based programs, parish schools' },
  { slug: 'nonprofits-community', label: 'Nonprofits / Community',
    description: 'Charitable orgs, foundations, civic groups, government partners' },
  { slug: 'special-needs-resources', label: 'Special Needs Resources',
    description: 'Therapy, advocacy, support services for families of children with special needs' },

  // ── Publication / Internal ─────────────────────────────────────────
  { slug: 'publication-internal', label: 'Publication / Internal',
    description: 'The publication itself, sister publications, internal house ads — not a real advertiser' },
]

export const SPONSOR_CATEGORY_SLUGS = SPONSOR_CATEGORIES.map(c => c.slug)

export function categoryBySlug(slug: string | null | undefined): SponsorCategory | undefined {
  if (!slug) return undefined
  return SPONSOR_CATEGORIES.find(c => c.slug === slug)
}

export function categoryLabel(slug: string | null | undefined): string {
  return categoryBySlug(slug)?.label ?? (slug ?? '—')
}
