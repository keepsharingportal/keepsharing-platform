import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'
import { LeadMagnetFunnel } from '@/components/partner-engine/templates/LeadMagnetFunnel'
import type { LeadMagnetFunnelProps } from '@/components/partner-engine/templates/LeadMagnetFunnel'
import { mapToLeadMagnetProps } from '@/lib/template-prop-mapper'
import type { PartnerPageData } from '@/components/partner-engine/types'
import { DEFAULT_BRAND, getContrastTextColor, lightenColor } from '@/lib/brand-colors'

export const metadata: Metadata = {
  title: 'Get the 2026 RRP Media Kit — River Region Parents',
  description: 'See how local family businesses are growing through the biggest community influencer for parents in the River Region. Print. Social. Website. Email. All in one customer acquisition system.',
}

const STATIC_FALLBACK_PROPS: LeadMagnetFunnelProps = {
  business_name:          'River Region Parents',
  display_logo_emoji:     '📰',
  hero_badge:             'Free Resource',
  hero_headline:          'Get the 2026',
  hero_headline_emphasis: 'RRP Media Kit',
  hero_description:       'See how local family businesses are growing through the biggest community influencer for parents in the River Region. Print magazine. Social media. Website. Email newsletter. All built into one customer acquisition system.',
  hero_benefits: [
    'Full breakdown of all 4 Partner tiers — from $125/mo to $1,500/mo',
    'The complete customer acquisition system explained',
    'Real ROI math from existing RRP partners',
  ],
  form_headline:          'Drop Your Email',
  form_subheadline:       'We will send you the full kit instantly — no call required.',
  form_button_label:      'Send Me the Media Kit',
  form_extra_fields:      'category-interest',
  whats_inside_headline:  'What Is Inside the Kit',
  whats_inside_features: [
    { icon: 'Layers',     title: '4 Partner Tiers',           description: 'Compare every tier from Featured Listing at $125/mo to The KeepSharing Partner Engine at $1,500/mo. Real deliverables, real pricing, no fluff.' },
    { icon: 'TrendingUp', title: 'The System That Works',     description: 'Print, social, website, email, and the offer page that converts. See how the customer acquisition system delivers results.' },
    { icon: 'Calculator', title: 'ROI That Surprises Most',   description: 'The math behind why this works for businesses serving families. Real numbers from real partners.' },
  ],
  final_cta_headline:     'Ready to See How',
  final_cta_emphasis:     'Local Family Businesses Win',
  final_cta_button_label: 'Send Me the Media Kit',
  redirect_after_submit:  '/advertise?utm_source=media-kit&utm_campaign=media-kit',
  partner_id:             'rrp-system',
  offer_id:               'media-kit-static',
  color_scheme:           'sky-terra',
}

async function getMediaKitProps(): Promise<LeadMagnetFunnelProps> {
  try {
    const supabase = await createClient()

    const { data: account } = await supabase
      .from('advertiser_accounts')
      .select('*')
      .eq('slug', 'river-region-parents-system')
      .maybeSingle()

    if (!account) return STATIC_FALLBACK_PROPS

    const { data: offer } = await supabase
      .from('partner_offers')
      .select('*')
      .eq('advertiser_id', account.id)
      .eq('is_active', true)
      .eq('template_slug', 'lead-magnet')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!offer) return STATIC_FALLBACK_PROPS

    const brand = {
      primary:      account.brand_color_primary ?? DEFAULT_BRAND.primary,
      accent:       account.brand_color_accent  ?? DEFAULT_BRAND.accent,
      primaryText:  getContrastTextColor(account.brand_color_primary ?? DEFAULT_BRAND.primary),
      accentText:   getContrastTextColor(account.brand_color_accent  ?? DEFAULT_BRAND.accent),
      primaryLight: lightenColor(account.brand_color_primary ?? DEFAULT_BRAND.primary, 0.92),
      accentLight:  lightenColor(account.brand_color_accent  ?? DEFAULT_BRAND.accent,  0.88),
    }

    const data: PartnerPageData = {
      account, offer, brand,
      locations: [], team: [], testimonials: [],
      trustSignals: [], photos: [], services: [], faqs: [],
    }

    return mapToLeadMagnetProps(data)
  } catch {
    return STATIC_FALLBACK_PROPS
  }
}

export default async function GetMediaKitPage() {
  const props = await getMediaKitProps()
  return <LeadMagnetFunnel {...props} />
}
