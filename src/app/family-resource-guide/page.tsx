// /family-resource-guide
// The distilled essentials for River Region moms. Photo hero → 8/4 portal:
//   main: Best Of → Coming Up Events → Discover the Guides → School Zone teaser → Community Spotlights
//   side: ad → magazine cover → featured partners → submit-a-tip → get listed
// Navigation + PublicFooter come from the family-resource-guide layout — don't render them again here.

import { createClient } from '@supabase/supabase-js'
import Image from 'next/image'
import Link from 'next/link'
import { ClaimSpotButton } from '@/components/ClaimSpotButton'
import { ArrowRight, Sparkles, GraduationCap } from 'lucide-react'
import type { Metadata } from 'next'

import { FRGHero }              from '@/components/family-resource-guide/FRGHero'
import { GuideHubCards }        from '@/components/family-resource-guide/GuideHubCards'
import { BestOfFeatureRow }     from '@/components/family-resource-guide/BestOfFeatureRow'
import { ComingUpEvents }       from '@/components/family-resource-guide/ComingUpEvents'
import { CommunitySpotlightsTeaser, type SpotlightArticle } from '@/components/family-resource-guide/CommunitySpotlightsTeaser'
import { RealTalkRow, type RealTalkArticle } from '@/components/family-resource-guide/RealTalkRow'
import { MagazineCoverSidebar } from '@/components/family-resource-guide/MagazineCoverSidebar'
import { FeaturedPartners }     from '@/components/family-resource-guide/FeaturedPartners'
import { GetListedCTA }         from '@/components/family-resource-guide/GetListedCTA'
// School Bits — uses the new card-style discovery panel (typeahead + per-school
// personalization) instead of the legacy SchoolBitsBlock that pulled long-form
// articles. Same component School Zone renders, full-width below the portal.
import {
  SchoolBitsDiscoveryPanel,
  type BitForFeatured,
  type SchoolForFeatured,
} from '@/components/school-zone/SchoolBitsDiscoveryPanel'

import type { GuideListing, ListingTier } from '@/components/family-guide/types'

// Use the same raw service-role client the home page uses. The /lib/supabase/server
// SSR client is anon, which gets blocked by RLS on calendar_events and a few
// other tables — that's why events weren't appearing.
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

export const revalidate = 600

export const metadata: Metadata = {
  title: 'Family Resource Guide | River Region Parents',
  description: 'The distilled essentials. River Region moms — local, new, or just trying to keep up — start here. Schools, pediatricians, parks, day trips, counselors, and more.',
}

interface AccRow {
  id: string
  slug: string
  business_name: string
  office_phone: string | null
  mobile_phone: string | null
  website_url: string | null
  address: string | null
  city_state_zip: string | null
  neighborhood: string | null
  hero_photo_url: string | null
  card_hook: string | null
}

interface RawListingRow {
  id: string
  listing_tier: string
  category: string | null
  guide_data: Record<string, unknown> | null
  display_order: number
  // Inline business identity (migration 134). Listings populate these
  // directly; the advertiser_accounts join below is only used as a
  // fallback for legacy rows or for the slug (which only exists when
  // a listing has been claimed and linked to a real advertiser).
  business_name:  string | null
  office_phone:   string | null
  mobile_phone:   string | null
  website_url:    string | null
  contact_email:  string | null
  address:        string | null
  city_state_zip: string | null
  neighborhood:   string | null
  hero_photo_url: string | null
  card_hook:      string | null
  advertiser_accounts: AccRow | null
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function FamilyResourceGuidePage() {
  const supabase = getSupabase()

  const [
    { data: guideType },
    { data: guideConfig },
    { data: guideMeta },
    { data: bestOfData },
    { data: listingsRaw },
    { data: sponsorRow },
    { data: upcomingEventsData },
    { data: spotlightsData },
    { data: realTalkData },
    { data: schoolBitsData },
    { data: schoolsData },
    { data: inlineAdRow },
    { data: sidebarAdRow },
  ] = await Promise.all([
    // Hero identity — canonical from guide_types. Query by url_slug since
    // that's the stable public identifier (the internal slug is the legacy
    // 'newcomer' value). The OR variant we had was returning null when
    // PostgREST's .maybeSingle() detected multiple ambiguous matches.
    supabase.from('guide_types')
      .select('slug, url_slug, display_name, pitch, hero_image_url, short_description')
      .eq('url_slug', 'family-resource-guide')
      .maybeSingle(),

    // Secondary hero image source — guide_configs.homepage_image_url is
    // what the admin "Homepage tile image" field saves to. Used as a
    // fallback if guide_types.hero_image_url is empty.
    // Also fetches print_cover_url + issuu_url for the From-the-Magazine
    // block.
    supabase.from('guide_configs')
      .select('homepage_image_url, fallback_image_url, print_cover_url, issuu_url')
      .in('guide_type_slug', ['newcomer', 'family-resource-guide'])
      .limit(1)
      .maybeSingle(),

    // Legacy hero copy fallback
    supabase.from('guide_meta')
      .select('hero_image_url, hero_eyebrow, hero_title, hero_subtitle, hero_issue_label')
      .eq('guide_slug', 'family-resource-guide')
      .maybeSingle(),

    // Best Of articles — 5 total (1 lead + 4 grid). 'See all' link picks up overflow.
    supabase.from('guide_articles')
      .select('id, slug, title, subtitle, excerpt, hero_image_url, published_at')
      .eq('column_slug', 'frg-best-of')
      .eq('published', true)
      .order('published_at', { ascending: false, nullsFirst: false })
      .limit(5),

    // Listings — read inline business identity columns first (migration
    // 134) so basic listings render even when not linked to an
    // advertiser. The advertiser_accounts join is kept for the slug
    // (claim/listing URL) and as a legacy fallback for any row whose
    // inline columns weren't backfilled.
    supabase.from('guide_listings')
      .select(`
        id, listing_tier, category, guide_data, display_order,
        business_name, office_phone, mobile_phone,
        website_url, contact_email, address, city_state_zip,
        neighborhood, hero_photo_url, card_hook,
        advertiser_accounts (
          id, slug, business_name,
          office_phone, mobile_phone,
          website_url, address, city_state_zip, neighborhood,
          hero_photo_url, card_hook
        )
      `)
      .in('guide_type_slug', ['newcomer', 'newcomer-guide', 'family-resource-guide', 'family-resource'])
      .eq('is_published', true)
      .order('display_order'),

    // Active section sponsor (if any)
    supabase.from('ad_placements')
      .select('id, ad_headline, advertiser:advertiser_accounts(business_name, slug)')
      .eq('placement_type', 'section_sponsor')
      .eq('is_active', true)
      .ilike('placement_context', '%family-resource%')
      .limit(1)
      .maybeSingle(),

    // Upcoming events for the "Coming Up" block. Next 6 events, today
    // forward.
    supabase.from('calendar_events')
      .select('id, slug, title, start_date, start_time, location_name, hero_image_url, category, is_free')
      .eq('status', 'published')
      .gte('start_date', new Date().toISOString().split('T')[0])
      .order('start_date', { ascending: true })
      .order('start_time', { ascending: true, nullsFirst: true })
      .limit(6),

    // Community Spotlights — same 4-column rotation the homepage uses
    // (mom-to-mom, teacher-of-month, grands-greatest, play-ball). Latest
    // published article per column. The component picks at most one per
    // column so legacy "-the-" slug variants don't double-count.
    supabase.from('guide_articles')
      .select('id, slug, title, excerpt, hero_image_url, profile_image_url, column_slug, author_name, published_at')
      .eq('published', true)
      .in('column_slug', [
        'mom-to-mom',
        'teacher-of-month', 'teacher-of-the-month',
        'grands-greatest',  'grands-are-the-greatest',
        'play-ball',
      ])
      .order('published_at', { ascending: false, nullsFirst: false })
      .limit(20),

    // Real Talk — articles tagged with at least one content topic via the
    // topics text[] column (migration 087). Cross-cutting longform that
    // surfaces on the FRG hub regardless of which column or guide it
    // primarily lives in. Newest 6; the row renders up to 3.
    supabase.from('guide_articles')
      .select('id, slug, title, excerpt, hero_image_url, author_name, published_at, column_slug, topics')
      .eq('published', true)
      .not('topics', 'is', null)
      .order('published_at', { ascending: false, nullsFirst: false })
      .limit(6),

    // School Bits — card-style submissions from the new submit flow. The
    // discovery panel uses these for the featured bit + 3 supporting cards.
    // Time-gated so future-dated/drip-scheduled bits stay hidden until
    // their published_at lands.
    supabase.from('school_bits')
      .select('id, school_id, school_name, title, blurb, image_web_url, published_at, created_at')
      .eq('market', 'rrp')
      .in('status', ['approved', 'published'])
      .lte('published_at', new Date().toISOString())
      .order('published_at', { ascending: false, nullsFirst: false })
      .order('created_at',   { ascending: false })
      .limit(4),

    // Active schools roster — feeds the discovery panel typeahead. Small
    // (low hundreds) so loading the full list up-front is fine.
    supabase.from('schools')
      .select('id, name, area, is_private')
      .eq('market', 'rrp')
      .eq('status', 'active')
      .order('name', { ascending: true }),

    // Inline ad. Looks for an active homepage_inline_ad placement so any
    // ad the admin wired up for the home page also surfaces on FRG. Later
    // we can split out a dedicated frg_inline_ad placement_type.
    supabase.from('ad_placements')
      .select('id, ad_eyebrow, ad_headline, ad_description, ad_cta_label, ad_image_url, ad_link, advertiser:advertiser_accounts(business_name, slug)')
      .eq('placement_type', 'homepage_inline_ad')
      .eq('is_active', true)
      .order('display_priority', { ascending: false })
      .limit(1)
      .maybeSingle(),

    // Sidebar ad — square image-overlay treatment matching the home page.
    supabase.from('ad_placements')
      .select('id, ad_eyebrow, ad_headline, ad_description, ad_cta_label, ad_image_url, ad_link')
      .eq('placement_type', 'homepage_sidebar_ad')
      .eq('is_active', true)
      .order('display_priority', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  // ── Identity (admin-editable, with fallbacks) ────────────────────────────
  // Hero image fallback chain — every place an admin might have set one:
  //   1. guide_types.hero_image_url       — the main "Hero image" field
  //   2. guide_configs.homepage_image_url — admin "Homepage tile image"
  //   3. guide_configs.fallback_image_url — admin "Fallback image"
  //   4. guide_meta.hero_image_url        — legacy
  const heroImageUrl =
    guideType?.hero_image_url ||
    guideConfig?.homepage_image_url ||
    guideConfig?.fallback_image_url ||
    guideMeta?.hero_image_url ||
    null

  const heroTitle = guideMeta?.hero_title || guideType?.display_name || 'Family Resource Guide'

  // ── Listings ─────────────────────────────────────────────────────────────
  // Prefer inline columns from guide_listings (migration 134) — listings
  // are now self-sufficient content. Fall back to the joined
  // advertiser_accounts row only when an inline value is missing
  // (legacy rows or fields the editor hasn't filled in yet).
  const listings: GuideListing[] = ((listingsRaw ?? []) as unknown as RawListingRow[]).map(row => {
    const acc = row.advertiser_accounts
    const gd  = (row.guide_data ?? {}) as Record<string, unknown>
    const phoneInline = row.office_phone ?? row.mobile_phone
    const phoneFromAcc = acc?.office_phone ?? acc?.mobile_phone
    const cityInline = row.neighborhood ?? row.city_state_zip?.split(',')[0]?.trim()
    const cityFromAcc = acc?.neighborhood ?? acc?.city_state_zip?.split(',')[0]?.trim()
    return {
      id:              row.id,
      slug:            acc?.slug ?? row.id,                  // claim URL slug only exists when linked
      business_name:   row.business_name ?? acc?.business_name ?? '',
      listing_tier:    (row.listing_tier ?? 'free') as ListingTier,
      category:        row.category ?? undefined,
      description:     (gd.description as string) ?? null,
      editorial_blurb: (gd.editorialBlurb as string) ?? row.card_hook ?? acc?.card_hook ?? null,
      hours_summary:   (gd.hours as string) ?? null,
      phone:           phoneInline ?? phoneFromAcc ?? null,
      website:         row.website_url ?? acc?.website_url ?? null,
      address:         row.address ?? acc?.address ?? null,
      city:            cityInline ?? cityFromAcc ?? null,
      cover_image_url: row.hero_photo_url ?? acc?.hero_photo_url ?? null,
      display_order:   row.display_order,
    }
  })

  // ── Best Of articles ─────────────────────────────────────────────────────
  const bestOf = (bestOfData ?? []) as Array<{
    id: string; slug: string; title: string; subtitle: string | null; excerpt: string | null
    hero_image_url: string | null; published_at: string | null
  }>

  // ── Upcoming events for Coming Up block ──────────────────────────────────
  const upcomingEvents = (upcomingEventsData ?? []) as Array<{
    id: string; slug: string; title: string
    start_date: string | null; start_time: string | null
    location_name: string | null; hero_image_url: string | null
    category: string | null; is_free: boolean | null
  }>

  // ── Community Spotlights — bucket by canonical column key so legacy
  //    "-the-" slug variants don't double-count. One spotlight per column
  //    in the canonical rotation order. ────────────────────────────────────
  const allSpotlights = (spotlightsData ?? []) as SpotlightArticle[]
  const ROTATION_COLUMNS = ['mom-to-mom', 'teacher-of-month', 'grands-greatest', 'play-ball'] as const
  function canonicalKey(slug: string | null): string | null {
    if (!slug) return null
    if (slug === 'teacher-of-the-month')    return 'teacher-of-month'
    if (slug === 'grands-are-the-greatest') return 'grands-greatest'
    return slug
  }
  const latestByColumn: Record<string, SpotlightArticle> = {}
  for (const a of allSpotlights) {
    const key = canonicalKey(a.column_slug)
    if (key && !latestByColumn[key]) latestByColumn[key] = a
  }
  const spotlights: SpotlightArticle[] = ROTATION_COLUMNS
    .map(col => latestByColumn[col])
    .filter((x): x is SpotlightArticle => Boolean(x))

  // ── Real Talk articles — drop rows whose tag array is technically
  //    non-null but empty. Cap at 3 so the row reads as one tidy 3-up grid. ─
  const realTalk = ((realTalkData ?? []) as RealTalkArticle[])
    .filter(a => Array.isArray(a.topics) && a.topics.length > 0)
    .slice(0, 3)

  // ── School Bits Discovery Panel props ────────────────────────────────────
  const schoolBits  = (schoolBitsData ?? []) as BitForFeatured[]
  const panelSchools = (schoolsData ?? []) as SchoolForFeatured[]

  // ── Inline ad row (matches the home page placement) ──────────────────────
  const inlineAd = inlineAdRow as {
    id: string; ad_eyebrow: string | null; ad_headline: string | null;
    ad_description: string | null; ad_cta_label: string | null;
    ad_image_url: string | null; ad_link: string | null;
    advertiser: { business_name?: string | null; slug?: string | null } | null
  } | null

  // ── Sidebar ad ───────────────────────────────────────────────────────────
  const sidebarAd = sidebarAdRow as {
    id: string; ad_eyebrow: string | null; ad_headline: string | null;
    ad_description: string | null; ad_cta_label: string | null;
    ad_image_url: string | null; ad_link: string | null;
  } | null

  // ── Featured Partners (sidebar) — top featured-tier listings from the
  //    FRG directory. Surfaces partners above the directory itself. ────────
  const featuredPartners = listings.filter(l => l.listing_tier === 'featured').slice(0, 4)

  // ── Sponsor ──────────────────────────────────────────────────────────────
  const sponsorAd = sponsorRow as {
    id:          string
    ad_headline: string | null
    advertiser:  { business_name?: string | null; slug?: string | null } | null
  } | null
  const sponsor = sponsorAd?.advertiser?.business_name
    ? {
        businessName: sponsorAd.advertiser.business_name,
        slug:         sponsorAd.advertiser.slug ?? null,
        headline:     sponsorAd.ad_headline   ?? null,
        placementId:  sponsorAd.id,
      }
    : null

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── LAYER 1: Hero (sponsor card now lives INSIDE the hero) ── */}
      <FRGHero
        heroImageUrl={heroImageUrl}
        title={heroTitle}
        sponsor={sponsor}
        sponsorLabel="Proudly Presented By"
      />

      <main className="container py-8 space-y-10">

        {/* ── 8/4 PORTAL — same shape as the home page.
             items-start so the columns don't stretch to match each other's
             height — that left the main col with a blank slab at the bottom
             whenever the sidebar happened to be taller. */}
        <div className="grid lg:grid-cols-12 gap-10 items-start">

          {/* ── MAIN COLUMN ──
               Order follows what matters most for a mom landing here:
                 1. Best Of editorial (the "what's best around here" hook)
                 2. Discover the Guides (funnel into the topical guides)
                 3. Coming Up events (timely, what's happening this week)
               School Zone now lives full-width below the portal so the
               discovery panel + typeahead get the breathing room they need.
               Community Spotlights lives in the sidebar under the digital
               issue card so the faces of the region show up on first paint. */}
          <div className="lg:col-span-8 space-y-10">

            {/* 1. Best Of editorial */}
            <BestOfFeatureRow articles={bestOf} />

            {/* 2. Discover the Guides — magazine cards that funnel into the
                 dedicated topical guide pages (Private School, Childcare, etc.) */}
            <GuideHubCards />

            {/* In-feed sponsored ad — exact home page treatment */}
            {inlineAd && inlineAd.ad_link && (
              <Link
                href={inlineAd.ad_link}
                className="bg-muted/50 border border-border/50 rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-6 relative overflow-hidden group hover:border-primary/30 hover:shadow-md transition-all"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/10 rounded-full blur-2xl pointer-events-none" />
                <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0 z-10 bg-background border shadow-sm">
                  {inlineAd.ad_image_url ? (
                    <Image
                      src={inlineAd.ad_image_url}
                      alt={inlineAd.ad_headline ?? 'Sponsored'}
                      width={80}
                      height={80}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Sparkles className="h-8 w-8 text-secondary" />
                    </div>
                  )}
                </div>
                <div className="flex-1 text-center sm:text-left z-10 min-w-0">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1 block">
                    {inlineAd.ad_eyebrow ?? 'Sponsored'}
                  </span>
                  {inlineAd.ad_headline && (
                    <h4 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors">
                      {inlineAd.ad_headline}
                    </h4>
                  )}
                  {inlineAd.ad_description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{inlineAd.ad_description}</p>
                  )}
                </div>
                {inlineAd.ad_cta_label && (
                  <span className="shrink-0 z-10 inline-flex items-center justify-center px-4 py-2 bg-background border rounded-full text-sm font-medium hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors">
                    {inlineAd.ad_cta_label}
                  </span>
                )}
              </Link>
            )}

            {/* 3. Features from contributors — cross-cutting longform tagged
                 via topics[]. Sits above events so the reflective beat lands
                 before the calendar / what-to-do content. */}
            <RealTalkRow articles={realTalk} />

            {/* 4. Coming Up — next 6 events (timely, what's happening this week) */}
            <ComingUpEvents events={upcomingEvents} />
          </div>

          {/* ── SIDEBAR ── */}
          <aside className="lg:col-span-4 space-y-8">

            {/* Sidebar ad — square image-overlay (matches home page) */}
            {sidebarAd && sidebarAd.ad_image_url && sidebarAd.ad_link ? (
              <Link
                href={sidebarAd.ad_link}
                className="block aspect-square rounded-3xl overflow-hidden relative group cursor-pointer"
              >
                <Image
                  src={sidebarAd.ad_image_url}
                  alt={sidebarAd.ad_headline ?? 'Advertisement'}
                  fill
                  sizes="(max-width: 1024px) 100vw, 400px"
                  style={{ objectFit: 'cover' }}
                  className="group-hover:scale-105 transition-transform duration-700"
                  unoptimized
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/10" />
                <div className="absolute top-4 left-4">
                  <span className="text-[10px] text-white/90 font-bold uppercase tracking-widest bg-black/40 px-2 py-1 rounded backdrop-blur-sm">
                    {sidebarAd.ad_eyebrow ?? 'Advertisement'}
                  </span>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  {sidebarAd.ad_headline && (
                    <h3 className="text-xl font-bold text-white mb-2" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
                      {sidebarAd.ad_headline}
                    </h3>
                  )}
                  {sidebarAd.ad_description && (
                    <p className="text-sm text-white/90 mb-4 line-clamp-2" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
                      {sidebarAd.ad_description}
                    </p>
                  )}
                  {sidebarAd.ad_cta_label && (
                    <span className="inline-block px-4 py-2 bg-white text-foreground rounded-full text-sm font-semibold group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      {sidebarAd.ad_cta_label}
                    </span>
                  )}
                </div>
              </Link>
            ) : (
              <ClaimSpotButton
                as="a"
                href="/advertise/family-resource-guide"
                placementType="guide_sidebar_sticky"
                placementLabel="Family Resource Guide — sidebar sponsor"
                className="w-full bg-gradient-to-br from-primary/8 via-background to-secondary/6 aspect-square rounded-3xl border-2 border-dashed border-primary/25 flex flex-col items-center justify-center p-7 text-center relative overflow-hidden hover:border-primary/50 hover:shadow-md transition-all group"
              >
                <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest absolute top-4">Premium Placement</span>
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-5 mt-2 group-hover:scale-105 transition-transform">
                  <Sparkles className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2 leading-tight">Reach River Region Families</h3>
                <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
                  This premium sidebar placement reaches every Family Resource Guide visitor.
                </p>
                <span className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-primary text-primary-foreground rounded-full text-sm font-bold group-hover:bg-primary/90 transition-colors shadow-sm">
                  Claim This Spot <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </ClaimSpotButton>
            )}

            {/* From the Magazine — print cover + Issuu link */}
            <MagazineCoverSidebar
              printCoverUrl={guideConfig?.print_cover_url ?? null}
              issuuUrl={guideConfig?.issuu_url ?? null}
              issueLabel="2026 Edition"
            />

            {/* Community Spotlights — Teacher of the Month, Mom to Mom,
                 Grands are the Greatest, Play Ball. Sidebar-tight layout. */}
            <CommunitySpotlightsTeaser spotlights={spotlights} variant="sidebar" />

            {/* Featured Partners — top featured-tier listings */}
            <FeaturedPartners listings={featuredPartners} />

            {/* Get listed (sidebar variant) */}
            <GetListedCTA variant="sidebar" />
          </aside>
        </div>

        {/* ── FULL-WIDTH SCHOOL ZONE ── reuses the /school-zone discovery panel
             so visitors can type in their school and surface bits for it
             directly from the FRG home. Same data, same UX, no duplicate. */}
        <section>
          <div className="flex items-end justify-between mb-5 flex-wrap gap-2">
            <div>
              <div className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-primary mb-1.5">
                <GraduationCap className="h-3 w-3" />
                School Zone
              </div>
              <h2 className="text-2xl md:text-3xl font-black text-foreground leading-tight">
                Find Your School's News
              </h2>
            </div>
            <Link
              href="/school-zone"
              className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
            >
              Explore School Zone <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <SchoolBitsDiscoveryPanel
            initialBits={schoolBits}
            initialSchools={panelSchools}
          />
        </section>

        {/* ── Get Listed banner ── */}
        <GetListedCTA variant="banner" />

        {/* ── Newsletter ── */}
        <section className="rounded-3xl bg-gradient-to-r from-secondary/10 to-primary/10 border border-border/50 p-8 md:p-12 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-2">The River Region Weekly</p>
          <h2 className="text-2xl font-bold text-foreground mb-2">
            One email. The week, distilled.
          </h2>
          <p className="text-sm md:text-base text-muted-foreground max-w-xl mx-auto mb-5 leading-relaxed">
            New Best-Of lists, town highlights, weekend events, and Mom Knows Best posts —
            delivered every Friday morning.
          </p>
          <Link
            href="/newsletter/subscribe"
            className="inline-flex items-center gap-1.5 px-6 py-3 bg-primary text-primary-foreground rounded-full text-sm font-bold hover:bg-primary/90 transition-colors"
          >
            Subscribe <ArrowRight className="h-4 w-4" />
          </Link>
        </section>
      </main>
    </>
  )
}
