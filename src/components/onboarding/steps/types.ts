// Shared prop shape for every section-builder step.
//
// The wizard passes the existing listing_sections row (or null when
// the section hasn't been authored yet) plus a save callback that
// writes a partial patch back to the same row via the API endpoint.

export interface SectionRowShape {
  id?:                string
  section_type:       string
  headline?:          string | null
  subheadline?:       string | null
  body_content?:      string | null
  bullet_points?:     string[] | null
  items?:             Array<Record<string, unknown>> | null
  faqs?:              Array<{ question: string; answer: string }> | null
  offer_text?:        string | null
  offer_expiration?:  string | null
  offer_cta_label?:   string | null
  offer_cta_url?:     string | null
  is_active?:         boolean
}

export interface SectionStepProps {
  /** Existing row, or null if the section hasn't been authored yet. */
  section: SectionRowShape | null
  /** Partial save — only changed fields. The endpoint upserts the row. */
  onSave:  (patch: Partial<SectionRowShape>) => void
}
