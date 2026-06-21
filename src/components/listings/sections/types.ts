// listing_sections row shape — JSONB columns (items, faqs, etc.)
// match the loose shapes the editor's section forms produce. Each
// section renderer reads only the keys it cares about and tolerates
// missing data.

export interface ListingSection {
  id:                 string
  section_type:       string
  headline?:          string | null
  subheadline?:       string | null
  body_content?:      string | null
  bullet_points?:     string[] | null
  // items is intentionally loose — different section types lean on
  // different keys (party_packages → name/price/duration/includes;
  // party_addons → name/price; party_hours → day/open/close/closed).
  items?:             Array<Record<string, unknown>> | null
  faqs?:              Array<{ question: string; answer: string }> | null
  offer_text?:        string | null
  offer_expiration?:  string | null
  offer_cta_label?:   string | null
  offer_cta_url?:     string | null
  is_active:          boolean
}
