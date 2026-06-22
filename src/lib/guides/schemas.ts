// Per-guide schemas — declare what fields each guide surfaces on the
// canonical ListingDetailPage. Two outputs per guide:
//
//   headlineFacts: the icon-chip row near the title. First 4 with data
//                  render. Keys map into guide_listings.guide_data.
//
//   sections:      structured CMS sections in render order. The page
//                  pulls listing_sections rows, matches by section_type
//                  in this list, and renders them top-down — sections
//                  the listing doesn't have data for are silently
//                  skipped. Sections NOT declared here render last in
//                  display_order so a guide-specific section can still
//                  appear without code changes.
//
// To onboard a new guide: copy a block, swap the fact keys + sections.
// To add a section type: drop a renderer in components/listings/sections,
// register it in SectionRenderer, then add it to a guide's `sections`
// array here in the slot where you want it to appear.

export interface HeadlineFact {
  key:   string   // matches a key in guide_listings.guide_data JSONB
  label: string   // shown beside the icon chip
}

export interface SchemaSection {
  section_type:    string   // matches listing_sections.section_type
  defaultHeadline?: string  // used when the row has no headline set
}

export interface GuideSchema {
  headlineFacts: HeadlineFact[]
  sections:      SchemaSection[]
}

export const GUIDE_SCHEMAS: Record<string, GuideSchema> = {
  // ── Birthday Party Guide ────────────────────────────────────────
  'birthday-party': {
    headlineFacts: [
      { key: 'ages',           label: 'Ages' },
      { key: 'capacity',       label: 'Capacity' },
      { key: 'price_range',    label: 'Price Range' },
      { key: 'party_duration', label: 'Party Length' },
    ],
    sections: [
      { section_type: 'our_story',        defaultHeadline: 'About the Party' },
      { section_type: 'party_packages',   defaultHeadline: 'Party Packages' },
      { section_type: 'whats_different',  defaultHeadline: 'What Makes This Special' },
      { section_type: 'features_bullets', defaultHeadline: "What's Included" },
      { section_type: 'themes_available', defaultHeadline: 'Themes Available' },
      { section_type: 'party_addons',     defaultHeadline: 'Add-On Options' },
      { section_type: 'party_hours',      defaultHeadline: 'Party Hours' },
      { section_type: 'best_for',         defaultHeadline: 'Best For' },
      { section_type: 'parents_say',      defaultHeadline: 'Parents Say' },
      { section_type: 'faq',              defaultHeadline: 'Frequently Asked' },
      { section_type: 'booking_notes',    defaultHeadline: 'Booking & Policies' },
      { section_type: 'health_safety',    defaultHeadline: 'Health & Safety' },
      { section_type: 'special_offer',    defaultHeadline: 'Special Offer' },
    ],
  },

  // ── Summer Camp Guide ───────────────────────────────────────────
  // party_packages serves as "Sessions Offered"; party_hours becomes
  // "Camp Hours"; party_addons becomes "Add-Ons & Extras".
  'summer-camp': {
    headlineFacts: [
      { key: 'camp_type', label: 'Camp Type' },
      { key: 'ages',      label: 'Ages' },
      { key: 'dates',     label: 'Session Dates' },
      { key: 'cost',      label: 'Weekly Cost' },
    ],
    sections: [
      { section_type: 'our_story',        defaultHeadline: 'About the Camp' },
      { section_type: 'party_packages',   defaultHeadline: 'Sessions Offered' },
      { section_type: 'whats_different',  defaultHeadline: 'Why Families Pick Us' },
      { section_type: 'features_bullets', defaultHeadline: "What's Included" },
      { section_type: 'party_addons',     defaultHeadline: 'Add-Ons & Extras' },
      { section_type: 'party_hours',      defaultHeadline: 'Camp Hours' },
      { section_type: 'best_for',         defaultHeadline: 'Best For' },
      { section_type: 'meet_team',        defaultHeadline: 'Meet the Counselors' },
      { section_type: 'parents_say',      defaultHeadline: 'Parents Say' },
      { section_type: 'faq',              defaultHeadline: 'Frequently Asked' },
      { section_type: 'booking_notes',    defaultHeadline: 'Registration & Policies' },
      { section_type: 'health_safety',    defaultHeadline: 'Health & Safety' },
      { section_type: 'special_offer',    defaultHeadline: 'Early-Bird Offer' },
    ],
  },

  // ── Summer Fun Guide ────────────────────────────────────────────
  // Activities, events, places — lighter than camps, no sessions.
  'summer-fun': {
    headlineFacts: [
      { key: 'activity_type',    label: 'Activity' },
      { key: 'ages',             label: 'Ages' },
      { key: 'city',             label: 'Location' },
      { key: 'cost',             label: 'Cost' },
    ],
    sections: [
      { section_type: 'our_story',        defaultHeadline: 'About This Spot' },
      { section_type: 'whats_different',  defaultHeadline: 'Why Families Love It' },
      { section_type: 'features_bullets', defaultHeadline: "What's Here" },
      { section_type: 'party_hours',      defaultHeadline: 'Hours & Access' },
      { section_type: 'best_for',         defaultHeadline: 'Best For' },
      { section_type: 'parents_say',      defaultHeadline: 'Parents Say' },
      { section_type: 'faq',              defaultHeadline: 'Frequently Asked' },
      { section_type: 'special_offer',    defaultHeadline: 'Special Offer' },
    ],
  },

  // ── Private School Guide ────────────────────────────────────────
  // No packages or hours grid; emphasis on team, accreditations, FAQ.
  'private-school': {
    headlineFacts: [
      { key: 'grade',                 label: 'Grades' },
      { key: 'enrollment',            label: 'Enrollment' },
      { key: 'tuition',               label: 'Tuition' },
      { key: 'religious_affiliation', label: 'Affiliation' },
    ],
    sections: [
      { section_type: 'our_story',        defaultHeadline: 'About the School' },
      { section_type: 'whats_different',  defaultHeadline: 'What Sets Us Apart' },
      { section_type: 'features_bullets', defaultHeadline: 'Programs & Curriculum' },
      { section_type: 'meet_team',        defaultHeadline: 'Leadership' },
      { section_type: 'best_for',         defaultHeadline: 'Best For' },
      { section_type: 'parents_say',      defaultHeadline: 'What Families Say' },
      { section_type: 'faq',              defaultHeadline: 'Admissions FAQ' },
      { section_type: 'booking_notes',    defaultHeadline: 'Application Process' },
      { section_type: 'special_offer',    defaultHeadline: 'Tour or Open House' },
    ],
  },

  // ── Childcare Guide ─────────────────────────────────────────────
  'childcare': {
    headlineFacts: [
      { key: 'ages',          label: 'Ages Served' },
      { key: 'hours',         label: 'Hours' },
      { key: 'teacher_ratio', label: 'Teacher Ratio' },
      { key: 'license',       label: 'License' },
    ],
    sections: [
      { section_type: 'our_story',        defaultHeadline: 'About Our Center' },
      { section_type: 'whats_different',  defaultHeadline: 'Our Approach' },
      { section_type: 'features_bullets', defaultHeadline: 'Programs Offered' },
      { section_type: 'party_hours',      defaultHeadline: 'Hours' },
      { section_type: 'best_for',         defaultHeadline: 'Best For' },
      { section_type: 'meet_team',        defaultHeadline: 'Meet Our Team' },
      { section_type: 'parents_say',      defaultHeadline: 'Parents Say' },
      { section_type: 'faq',              defaultHeadline: 'Frequently Asked' },
      { section_type: 'booking_notes',    defaultHeadline: 'Enrollment & Waitlist' },
      { section_type: 'health_safety',    defaultHeadline: 'Health & Safety' },
      { section_type: 'special_offer',    defaultHeadline: 'New-Family Offer' },
    ],
  },

  // ── Healthy Kids Guide (pediatricians, dentists, specialists) ──
  'healthy-kids': {
    headlineFacts: [
      { key: 'specialty',             label: 'Specialty' },
      { key: 'providers',             label: 'Providers' },
      { key: 'accepts_new_patients',  label: 'New Patients' },
      { key: 'insurance',             label: 'Insurance' },
    ],
    sections: [
      { section_type: 'our_story',        defaultHeadline: 'About the Practice' },
      { section_type: 'whats_different',  defaultHeadline: 'Our Approach to Care' },
      { section_type: 'features_bullets', defaultHeadline: 'Services Offered' },
      { section_type: 'meet_team',        defaultHeadline: 'Meet the Providers' },
      { section_type: 'party_hours',      defaultHeadline: 'Office Hours' },
      { section_type: 'parents_say',      defaultHeadline: 'Parents Say' },
      { section_type: 'faq',              defaultHeadline: 'Frequently Asked' },
      { section_type: 'booking_notes',    defaultHeadline: 'New Patients & Insurance' },
      { section_type: 'special_offer',    defaultHeadline: 'New Patient Offer' },
    ],
  },

  // ── Special Needs Guide ─────────────────────────────────────────
  'special-needs': {
    headlineFacts: [
      { key: 'specialty',  label: 'Specialty' },
      { key: 'ages',       label: 'Ages Served' },
      { key: 'services',   label: 'Services' },
      { key: 'insurance',  label: 'Insurance' },
    ],
    sections: [
      { section_type: 'our_story',        defaultHeadline: 'About Us' },
      { section_type: 'whats_different',  defaultHeadline: 'Our Approach' },
      { section_type: 'features_bullets', defaultHeadline: 'Services Offered' },
      { section_type: 'meet_team',        defaultHeadline: 'Meet Our Team' },
      { section_type: 'best_for',         defaultHeadline: 'Best For' },
      { section_type: 'parents_say',      defaultHeadline: 'Families Say' },
      { section_type: 'faq',              defaultHeadline: 'Frequently Asked' },
      { section_type: 'booking_notes',    defaultHeadline: 'Intake & Insurance' },
    ],
  },

  // ── After-School Guide ──────────────────────────────────────────
  'afterschool': {
    headlineFacts: [
      { key: 'ages',            label: 'Ages' },
      { key: 'hours',           label: 'Pickup Window' },
      { key: 'pickup_schools',  label: 'Pickup From' },
      { key: 'cost',            label: 'Cost' },
    ],
    sections: [
      { section_type: 'our_story',        defaultHeadline: 'About the Program' },
      { section_type: 'whats_different',  defaultHeadline: 'What Makes It Special' },
      { section_type: 'features_bullets', defaultHeadline: 'Programs Offered' },
      { section_type: 'party_hours',      defaultHeadline: 'Hours & Pickup' },
      { section_type: 'best_for',         defaultHeadline: 'Best For' },
      { section_type: 'parents_say',      defaultHeadline: 'Parents Say' },
      { section_type: 'faq',              defaultHeadline: 'Frequently Asked' },
      { section_type: 'booking_notes',    defaultHeadline: 'Enrollment Info' },
      { section_type: 'special_offer',    defaultHeadline: 'Special Offer' },
    ],
  },

  // ── Newcomer / Family Resource Guide ────────────────────────────
  'newcomer': {
    headlineFacts: [
      { key: 'category',     label: 'Category' },
      { key: 'services',     label: 'Services' },
      { key: 'area_served',  label: 'Area Served' },
      { key: 'hours',        label: 'Hours' },
    ],
    sections: [
      { section_type: 'our_story',        defaultHeadline: 'About Us' },
      { section_type: 'whats_different',  defaultHeadline: 'Why Families Choose Us' },
      { section_type: 'features_bullets', defaultHeadline: 'Services Offered' },
      { section_type: 'party_hours',      defaultHeadline: 'Hours' },
      { section_type: 'parents_say',      defaultHeadline: 'Families Say' },
      { section_type: 'faq',              defaultHeadline: 'Frequently Asked' },
      { section_type: 'special_offer',    defaultHeadline: 'Special Offer' },
    ],
  },
}

export function schemaForGuide(guideSlug: string): GuideSchema | null {
  return GUIDE_SCHEMAS[guideSlug] ?? null
}
