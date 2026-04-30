export type ListingTier = 'free' | 'enhanced' | 'featured'

export type GuideListing = {
  id: string
  category_id: string
  slug: string
  business_name: string
  address?: string | null
  city?: string | null
  zip?: string | null
  phone?: string | null
  website?: string | null
  email?: string | null
  description?: string | null
  editorial_blurb?: string | null
  listing_tier: ListingTier
  accepting_new_patients?: boolean | null
  serves_pediatrics?: string | null
  offers_military_discount?: string | null
  hours_summary?: string | null
  logo_url?: string | null
  cover_image_url?: string | null
  gallery_image_urls?: string[]
  google_maps_url?: string | null
  categories?: string[]
  tags?: string[]
  subcategory?: string | null
  needs_research?: boolean
  display_order: number
  advertiser_id?: string | null
}

export type GuideCategory = {
  id: string
  guide_slug: string
  slug: string
  name: string
  description?: string | null
  display_order: number
  icon_name?: string | null
  show_in_print: boolean
  parent_group?: string | null
  listings?: GuideListing[]
}

export type GuideArticle = {
  id: string
  guide_slug: string
  slug: string
  title: string
  excerpt?: string | null
  body?: string | null
  hero_image_url?: string | null
  author_name: string
  author_byline?: string | null
  priority: 'p0' | 'p1' | 'p2'
  display_order: number
  published: boolean
}
