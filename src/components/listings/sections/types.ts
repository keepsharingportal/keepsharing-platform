export interface ListingSection {
  id: string
  section_type: string
  headline?: string | null
  subheadline?: string | null
  body_content?: string | null
  bullet_points?: string[] | null
  items?: Array<Record<string, string>> | null
  faqs?: Array<{ question: string; answer: string }> | null
  offer_text?: string | null
  offer_expiration?: string | null
  offer_cta_label?: string | null
  offer_cta_url?: string | null
  is_active: boolean
}
