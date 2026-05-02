/**
 * Partner Engine shared types.
 * All partner data is fetched server-side and passed as props to components.
 */

export interface PartnerOffer {
  id: string
  advertiser_id: string
  offer_name?: string | null
  offer_type: 'schedule_consult' | 'discount_code' | 'booking_link' | 'info_request' | 'limited_promo'
  offer_headline?: string | null
  offer_subheadline?: string | null
  offer_value_statement?: string | null
  urgency_text?: string | null
  urgency_expires_at?: string | null
  urgency_count_remaining?: number | null
  cta_button_text?: string | null
  discount_code?: string | null
  booking_url?: string | null
  proof_points?: ProofPoint[]
  objection_responses?: ObjectionResponse[]
  target_keywords?: string[]
  is_active: boolean
  start_date?: string | null
  end_date?: string | null
  // Template system (migration 019)
  template_slug?: string | null
  color_scheme?: string | null
  template_config?: Record<string, unknown> | null
}

export interface ProofPoint {
  claim: string
  source: string
}

export interface ObjectionResponse {
  objection: string
  response: string
}

export interface PartnerLocation {
  id: string
  location_name?: string | null
  address_line_1?: string | null
  city?: string | null
  state?: string | null
  zip?: string | null
  phone?: string | null
  hours_json?: Record<string, string> | null
  is_primary: boolean
  accepting_new: boolean
  display_order: number
}

export interface PartnerTeamMember {
  id: string
  display_name?: string | null
  title?: string | null
  credentials?: string | null
  bio?: string | null
  philosophy_quote?: string | null
  photo_url?: string | null
  years_with_practice?: number | null
  display_order: number
}

export interface PartnerTestimonial {
  id: string
  quote?: string | null
  author_name?: string | null
  author_context?: string | null
  rating?: number | null
  display_order: number
}

export interface PartnerTrustSignal {
  id: string
  signal_type?: string | null
  label?: string | null
  description?: string | null
  logo_url?: string | null
  display_order: number
}

export interface PartnerPhoto {
  id: string
  photo_url: string
  alt_text?: string | null
  caption?: string | null
  category?: string | null
}

export interface PartnerService {
  id: string
  service_name?: string | null
  description?: string | null
  icon?: string | null
  display_order: number
}

export interface PartnerFAQ {
  id: string
  question?: string | null
  answer?: string | null
  display_order: number
  relates_to_offer: boolean
}

export interface PartnerAccount {
  id: string
  business_name: string
  slug: string
  category?: string | null
  subcategory?: string | null
  contact_name?: string | null
  contact_email?: string | null
  contact_phone?: string | null
  brand_color_primary?: string | null
  brand_color_accent?: string | null
  logo_url?: string | null
  display_logo_emoji?: string | null
  mascot_url?: string | null
  mascot_alt?: string | null
  published_at?: string | null
  landing_page_published: boolean
}

export interface BrandColors {
  primary: string
  accent: string
  primaryText: 'white' | 'dark'
  accentText: 'white' | 'dark'
  primaryLight: string
  accentLight: string
}

export interface PartnerPageData {
  account: PartnerAccount
  offer: PartnerOffer | null
  locations: PartnerLocation[]
  team: PartnerTeamMember[]
  testimonials: PartnerTestimonial[]
  trustSignals: PartnerTrustSignal[]
  photos: PartnerPhoto[]
  services: PartnerService[]
  faqs: PartnerFAQ[]
  brand: BrandColors
}
