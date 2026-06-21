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
  // The richest schema — every birthday vendor potentially has packages,
  // hours, themes, add-ons, FAQ, policies. The page degrades gracefully
  // when sections aren't filled in.
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
}

export function schemaForGuide(guideSlug: string): GuideSchema | null {
  return GUIDE_SCHEMAS[guideSlug] ?? null
}
