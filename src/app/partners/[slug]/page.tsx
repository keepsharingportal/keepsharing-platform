import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'
import type { PartnerPageData, BrandColors } from '@/components/partner-engine/types'
import { getContrastTextColor, lightenColor, DEFAULT_BRAND } from '@/lib/brand-colors'
import { PartnerSEO } from '@/components/partner-engine/PartnerSEO'
import { PartnerSocialProof } from '@/components/partner-engine/PartnerSocialProof'
import { OfferHero } from '@/components/partner-engine/OfferHero'
import { OfferProblemAgitate } from '@/components/partner-engine/OfferProblemAgitate'
import { OfferSolution } from '@/components/partner-engine/OfferSolution'
import { OfferUrgencyBlock } from '@/components/partner-engine/OfferUrgencyBlock'
import { OfferProof } from '@/components/partner-engine/OfferProof'
import { OfferTeam } from '@/components/partner-engine/OfferTeam'
import { OfferCTABlock } from '@/components/partner-engine/OfferCTABlock'
import { OfferLocations } from '@/components/partner-engine/OfferLocations'
import { OfferFAQ } from '@/components/partner-engine/OfferFAQ'
import { OfferRiskReversal } from '@/components/partner-engine/OfferRiskReversal'
import { OfferConversionForm } from '@/components/partner-engine/OfferConversionForm'
import { OfferStickyMobileCTA } from '@/components/partner-engine/OfferStickyMobileCTA'
import { getTemplate } from '@/components/partner-engine/templates'
import { mapToConsultBookingProps, mapToGiveawayProps, mapToLeadMagnetProps } from '@/lib/template-prop-mapper'

interface Props { params: Promise<{ slug: string }> }

async function getPartnerData(slug: string): Promise<PartnerPageData | null> {
  try {
    const supabase = await createClient()

    const { data: account } = await supabase
      .from('advertiser_accounts')
      .select('*')
      .eq('slug', slug)
      .eq('landing_page_published', true)
      .maybeSingle()

    if (!account) return null

    // Fetch all related data in parallel
    const [offersRes, locationsRes, teamRes, testimonialsRes, trustRes, photosRes, servicesRes, faqsRes] = await Promise.all([
      account.current_offer_id
        ? supabase.from('partner_offers').select('*').eq('id', account.current_offer_id).maybeSingle()
        : supabase.from('partner_offers').select('*').eq('advertiser_id', account.id).eq('is_active', true).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('advertiser_locations').select('*').eq('advertiser_id', account.id).order('display_order'),
      supabase.from('advertiser_team_members').select('*').eq('advertiser_id', account.id).order('display_order'),
      supabase.from('advertiser_testimonials').select('*').eq('advertiser_id', account.id).order('display_order'),
      supabase.from('advertiser_trust_signals').select('*').eq('advertiser_id', account.id).order('display_order'),
      supabase.from('advertiser_photos').select('*').eq('advertiser_id', account.id).order('display_order'),
      supabase.from('advertiser_services').select('*').eq('advertiser_id', account.id).order('display_order'),
      supabase.from('advertiser_faqs').select('*').eq('advertiser_id', account.id).order('display_order'),
    ])

    const primary = account.brand_color_primary ?? DEFAULT_BRAND.primary
    const accent  = account.brand_color_accent  ?? DEFAULT_BRAND.accent

    const brand: BrandColors = {
      primary,
      accent,
      primaryText: getContrastTextColor(primary),
      accentText:  getContrastTextColor(accent),
      primaryLight: lightenColor(primary, 0.92),
      accentLight:  lightenColor(accent, 0.88),
    }

    return {
      account,
      offer:        (offersRes.data ?? null) as PartnerPageData['offer'],
      locations:    (locationsRes.data ?? []) as PartnerPageData['locations'],
      team:         (teamRes.data ?? []) as PartnerPageData['team'],
      testimonials: (testimonialsRes.data ?? []) as PartnerPageData['testimonials'],
      trustSignals: (trustRes.data ?? []) as PartnerPageData['trustSignals'],
      photos:       (photosRes.data ?? []) as PartnerPageData['photos'],
      services:     (servicesRes.data ?? []) as PartnerPageData['services'],
      faqs:         (faqsRes.data ?? []) as PartnerPageData['faqs'],
      brand,
    }
  } catch (e) {
    console.error('[partners/slug] error fetching partner data:', e)
    return null
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const data = await getPartnerData(slug)
  if (!data) return {}
  const { account, offer } = data
  const title = offer?.offer_headline
    ? `${offer.offer_headline} — ${account.business_name}`
    : `${account.business_name} — River Region Parents Partner`
  return {
    title,
    description: offer?.offer_value_statement ?? offer?.offer_subheadline ?? `${account.business_name} is a River Region Parents Trusted Partner.`,
    openGraph: { title, description: offer?.offer_value_statement ?? '' },
  }
}

function DemoBanner({ businessName }: { businessName: string }) {
  return (
    <div style={{ backgroundColor: 'var(--fg-terra, #ef6442)', padding: '10px 20px', textAlign: 'center', position: 'relative', zIndex: 9999 }}>
      <p style={{ fontSize: 13, color: 'white', fontWeight: 600, margin: 0 }}>
        ✨ Sample of The KeepSharing Partner Engine for {businessName}.{' '}
        <Link href="/advertise" style={{ color: 'rgba(255,255,255,0.85)', textDecoration: 'underline', fontWeight: 700 }}>
          Want your practice to convert like this? Talk to us →
        </Link>
      </p>
    </div>
  )
}

export default async function PartnerPage({ params }: Props) {
  const { slug } = await params
  const data = await getPartnerData(slug)

  if (!data) notFound()

  const { account, offer, brand } = data
  const isDemo = !account.published_at

  // ── Template-aware rendering ──────────────────────────────────────────────
  if (offer?.template_slug) {
    const templateDef = getTemplate(offer.template_slug)
    const TemplateComponent = templateDef.component

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let templateProps: Record<string, any>
    switch (offer.template_slug) {
      case 'giveaway':
        templateProps = mapToGiveawayProps(data)
        break
      case 'lead-magnet':
        templateProps = mapToLeadMagnetProps(data)
        break
      default:
        templateProps = mapToConsultBookingProps(data)
    }

    return (
      <>
        <PartnerSEO data={data} />
        {isDemo && <DemoBanner businessName={account.business_name} />}
        <TemplateComponent {...templateProps} />
      </>
    )
  }

  // ── Legacy section-by-section renderer (partners without template_slug) ───
  return (
    <div style={{ backgroundColor: 'var(--fg-cream, #faf8f5)', fontFamily: 'var(--font-dm-sans, sans-serif)' }}>
      <PartnerSEO data={data} />

      {isDemo && <DemoBanner businessName={account.business_name} />}

      <OfferHero data={data} />
      <PartnerSocialProof data={data} />
      <OfferProblemAgitate data={data} />
      <OfferSolution data={data} />
      <OfferUrgencyBlock data={data} variant="mid" />
      <OfferProof data={data} />
      <OfferTeam data={data} />
      <OfferCTABlock data={data} />
      <OfferLocations data={data} />
      <OfferFAQ data={data} />
      <OfferRiskReversal data={data} />
      <OfferConversionForm data={data} />
      <OfferUrgencyBlock data={data} variant="final" />

      <footer style={{ backgroundColor: brand.primary, padding: '28px 20px', paddingBottom: 80, textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 16, fontWeight: 700, color: 'white', marginBottom: 6 }}>
          {account.business_name}
        </div>
        {account.contact_phone && (
          <a href={`tel:${account.contact_phone}`} style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', textDecoration: 'none', display: 'block', marginBottom: 14 }}>
            {account.contact_phone}
          </a>
        )}
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontStyle: 'italic' }}>
          Powered by{' '}
          <Link href="/" style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>River Region Parents</Link>
          {' '}· Built by River Region Parents. Powered by KeepSharing.
        </p>
      </footer>

      <OfferStickyMobileCTA data={data} />
    </div>
  )
}
