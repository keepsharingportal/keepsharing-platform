// ── /school-zone/school-bits ───────────────────────────────────────────────
// Public browse page for School Bits — cards layout like the print magazine.
// Reader can filter by area or specific school; the chosen school is saved
// to localStorage so it's the default the next time they visit.

import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Navigation } from '@/components/Navigation'
import { PublicFooter } from '@/components/PublicFooter'
import { Sparkles, ArrowRight, Megaphone } from 'lucide-react'
import { AREA_LABELS, isValidArea, type Area } from '@/lib/school-news/areas'
import { normalizeUnicodeText } from '@/lib/school-news/text'
import { HeroSponsorCard } from '@/components/verticals/HeroSponsorCard'
import { SchoolBitsBrowser } from './SchoolBitsBrowser'
import { getActiveAds } from '@/lib/get-active-ads'
import { SponsorAdBanner } from '@/components/calendar/CalendarAds'

const SITE_URL    = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://riverregionparents.com'
const DEFAULT_DESC = 'Celebrating student achievements, awards, and school news across the River Region.'

export const revalidate = 300  // 5-minute ISR

interface PageParams {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

// ── Dynamic OG metadata ─────────────────────────────────────────────────────
// When ?focus=<id> is set, render the bit's own card so a shared link
// unfurls beautifully on Facebook / iMessage / Twitter (the kid's photo,
// the headline, the school).
//
// When ?school=<id> or ?area=<a> is set, the OG card is the filtered view —
// "School Bits at <School>" so the share reads as that school's feed.
//
// Default fallback uses the latest published bit's hero as the OG image so
// the generic /school-zone/school-bits link always shares a "living" card,
// not a static placeholder.
export async function generateMetadata({ searchParams }: PageParams): Promise<Metadata> {
  const params  = await searchParams
  const focusId = typeof params.focus  === 'string' ? params.focus  : null
  const areaP   = typeof params.area   === 'string' ? params.area   : null
  const schoolP = typeof params.school === 'string' ? params.school : null

  const supabase = supabaseAdmin()

  // 1. Single-bit share (highest priority — this is the viral path)
  if (focusId) {
    const { data: bit } = await supabase
      .from('school_bits')
      .select('title, school_name, blurb, image_web_url')
      .eq('id', focusId)
      .in('status', ['approved', 'published'])
      .maybeSingle()
    if (bit) {
      const row = bit as { title: string; school_name: string; blurb: string; image_web_url: string | null }
      const title = normalizeUnicodeText(row.title)
      const blurb = normalizeUnicodeText(row.blurb).replace(/\s+/g, ' ').trim()
      const desc  = blurb.length > 200 ? blurb.slice(0, 197) + '…' : blurb
      const url   = `${SITE_URL}/school-zone/school-bits?focus=${encodeURIComponent(focusId)}`
      const images = row.image_web_url ? [{ url: row.image_web_url }] : []
      return {
        title:       `${title} — ${row.school_name} | River Region Parents`,
        description: desc,
        openGraph: {
          title:       title,
          description: `${row.school_name} — ${desc}`,
          url,
          type:        'article',
          siteName:    'River Region Parents',
          images,
        },
        twitter: {
          card:        'summary_large_image',
          title:       title,
          description: `${row.school_name} — ${desc}`,
          images:      row.image_web_url ? [row.image_web_url] : undefined,
        },
        alternates: { canonical: url },
      }
    }
  }

  // 2. School-filtered view
  if (schoolP) {
    const { data: schoolRow } = await supabase
      .from('schools')
      .select('name')
      .eq('id', schoolP)
      .maybeSingle()
    if (schoolRow) {
      const name = (schoolRow as { name: string }).name
      return baseMetadata({
        title:       `School Bits at ${name} | River Region Parents`,
        description: `Award winners, achievements, and good news from ${name}.`,
        canonical:   `${SITE_URL}/school-zone/school-bits?school=${encodeURIComponent(schoolP)}`,
        latestHero:  await fetchLatestHeroForSchool(supabase, schoolP),
      })
    }
  }

  // 3. Area-filtered view
  if (areaP) {
    const label = areaP === 'private' ? 'Private Schools'
                : isValidArea(areaP)  ? AREA_LABELS[areaP as Area]
                :                       null
    if (label) {
      return baseMetadata({
        title:       `School Bits — ${label} | River Region Parents`,
        description: `Award winners, achievements, and good news from ${label}.`,
        canonical:   `${SITE_URL}/school-zone/school-bits?area=${encodeURIComponent(areaP)}`,
        latestHero:  await fetchLatestHero(supabase),
      })
    }
  }

  // 4. Default — latest bit's hero powers the OG card so the generic
  //    /school-zone/school-bits link always shares something photo-rich.
  return baseMetadata({
    title:       'School Bits — River Region Parents',
    description: DEFAULT_DESC,
    canonical:   `${SITE_URL}/school-zone/school-bits`,
    latestHero:  await fetchLatestHero(supabase),
  })
}

function baseMetadata(opts: {
  title:        string
  description:  string
  canonical:    string
  latestHero:   string | null
}): Metadata {
  const images = opts.latestHero ? [{ url: opts.latestHero }] : []
  return {
    title:       opts.title,
    description: opts.description,
    openGraph: {
      title:       opts.title,
      description: opts.description,
      url:         opts.canonical,
      type:        'website',
      siteName:    'River Region Parents',
      images,
    },
    twitter: {
      card:        opts.latestHero ? 'summary_large_image' : 'summary',
      title:       opts.title,
      description: opts.description,
      images:      opts.latestHero ? [opts.latestHero] : undefined,
    },
    alternates: { canonical: opts.canonical },
  }
}

async function fetchLatestHero(supabase: ReturnType<typeof supabaseAdmin>): Promise<string | null> {
  const { data } = await supabase
    .from('school_bits')
    .select('image_web_url')
    .eq('market', MARKET)
    .in('status', ['approved', 'published'])
    .not('image_web_url', 'is', null)
    .lte('published_at', new Date().toISOString())
    .order('published_at', { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle()
  return (data as { image_web_url: string | null } | null)?.image_web_url ?? null
}

async function fetchLatestHeroForSchool(supabase: ReturnType<typeof supabaseAdmin>, schoolId: string): Promise<string | null> {
  const { data } = await supabase
    .from('school_bits')
    .select('image_web_url')
    .eq('market', MARKET)
    .eq('school_id', schoolId)
    .in('status', ['approved', 'published'])
    .not('image_web_url', 'is', null)
    .lte('published_at', new Date().toISOString())
    .order('published_at', { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle()
  return (data as { image_web_url: string | null } | null)?.image_web_url ?? null
}

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

const MARKET = 'rrp'

export interface PublicSchoolBit {
  id:             string
  school_id:      string | null
  school_name:    string
  title:          string
  blurb:          string
  image_web_url:  string | null
  image_width:    number | null
  image_height:   number | null
  published_at:   string | null
  created_at:     string
  /** Count of photos in school_bit_images. >1 → show a "View N photos" badge. */
  image_count:    number
}

export interface PublicSchool {
  id:         string
  name:       string
  area:       Area
  is_private: boolean
}

// ── Ad-related shapes for the page ────────────────────────────────────────
// Sponsor card matches the HeroSponsorCard component contract used by FRG /
// School Zone. Inline + transition ads are full ad_placements rows that
// the client component rotates per Load More batch.

export interface SchoolBitsSponsor {
  businessName: string
  slug:         string | null
  headline:     string | null
  // YMCA-inline-ad fields — fed into HeroSponsorCard's image/copy/CTA.
  imageUrl?:    string | null
  description?: string | null
  ctaLabel?:    string | null
  link?:        string | null
  placementId:  string
}

export interface InlineAd {
  id:             string
  ad_eyebrow:     string | null
  ad_headline:    string | null
  ad_description: string | null
  ad_cta_label:   string | null
  ad_image_url:   string | null
  ad_link:        string | null
  advertiser_name: string | null
}

export default async function SchoolBitsPage(_props: PageParams) {
  // searchParams are read at the metadata level for OG cards; the browser
  // (client component) reads them itself via useSearchParams so we can
  // skip passing them through here.
  void _props
  const supabase = supabaseAdmin()
  const probe = await supabase.from('school_bits').select('id').limit(1)
  if (probe.error) {
    return <MigrationFallback />
  }

  // Pull bits + schools + all five ad slots in parallel.
  // Future-dated bits (scheduled drip) stay hidden until their publish moment
  // arrives — `lte(published_at, now)` is the time gate.
  // Top/bottom banners mirror the calendar's top/bottom banner pattern
  // — same SponsorAdBanner component renders them.
  const nowIso = new Date().toISOString()
  const [bitsRes, schoolsRes, sponsorRes, inlineAdsRes, transitionAdsRes, topBannerAds, bottomBannerAds] = await Promise.all([
    supabase
      .from('school_bits')
      .select('id, school_id, school_name, title, blurb, image_web_url, image_width, image_height, published_at, created_at')
      .eq('market', MARKET)
      .in('status', ['approved', 'published'])
      .lte('published_at', nowIso)
      .order('published_at', { ascending: false, nullsFirst: false })
      .order('created_at',   { ascending: false })
      .limit(60),
    supabase
      .from('schools')
      .select('id, name, area, is_private')
      .eq('market', MARKET)
      .eq('status', 'active')
      .order('name', { ascending: true }),

    // Top sponsor — 1 active section_sponsor for School Bits. Reuses the
    // section_sponsor placement_type the rest of the site uses for hero
    // anchors. Match on placement_context so the same DB shape works for
    // every vertical.
    supabase.from('ad_placements')
      .select('id, ad_headline, ad_description, ad_cta_label, ad_link, ad_image_url, advertiser:advertiser_accounts(business_name, slug)')
      .eq('placement_type', 'section_sponsor')
      .eq('is_active', true)
      .ilike('placement_context', '%school-bits%')
      .limit(1)
      .maybeSingle(),

    // Inline ad pool — the masonry rotates two of these per Load More batch.
    // We grab up to 10 so the rotation has variety; the client picks two
    // per batch using the page index as the offset.
    supabase.from('ad_placements')
      .select('id, ad_eyebrow, ad_headline, ad_description, ad_cta_label, ad_image_url, ad_link, advertiser:advertiser_accounts(business_name, slug)')
      .eq('placement_type', 'school_bits_inline')
      .eq('is_active', true)
      .order('display_priority', { ascending: false })
      .limit(10),

    // Transition ad pool — shown ABOVE each batch after the first when the
    // reader hits Load More. Different inventory tier from inline.
    supabase.from('ad_placements')
      .select('id, ad_eyebrow, ad_headline, ad_description, ad_cta_label, ad_image_url, ad_link, advertiser:advertiser_accounts(business_name, slug)')
      .eq('placement_type', 'school_bits_transition')
      .eq('is_active', true)
      .order('display_priority', { ascending: false })
      .limit(10),

    // Top + bottom banner slots — wide horizontal ads bracketing the
    // feed. getActiveAds handles archived_at + slot-disable + creative
    // shape so the SponsorAdBanner component can render directly.
    getActiveAds('school_bits_top_banner',    'school-bits', 3, { rotate: true }),
    getActiveAds('school_bits_bottom_banner', 'school-bits', 3, { rotate: true }),
  ])

  // Pick one ad per banner slot. Active rotation lives inside
  // getActiveAds; we just take the first result. null when nothing is
  // booked — SponsorAdBanner handles the placeholder state.
  const topBannerAd    = topBannerAds[0]    ?? null
  const bottomBannerAd = bottomBannerAds[0] ?? null

  const rawBits = (bitsRes.data ?? []) as Array<Omit<PublicSchoolBit, 'image_count'>>
  const schools = (schoolsRes.data ?? []) as PublicSchool[]

  // Fetch image counts for the bits we just loaded so the card can decide
  // whether to show a "View N photos" badge. One round-trip — pulls every
  // bit_id row, then we tally client-side.
  const bitIds = rawBits.map(b => b.id)
  let countByBitId = new Map<string, number>()
  if (bitIds.length > 0) {
    const { data: imgRows } = await supabase
      .from('school_bit_images')
      .select('bit_id')
      .in('bit_id', bitIds)
    for (const row of (imgRows ?? []) as Array<{ bit_id: string }>) {
      countByBitId.set(row.bit_id, (countByBitId.get(row.bit_id) ?? 0) + 1)
    }
  }
  const bits: PublicSchoolBit[] = rawBits.map(b => ({
    ...b,
    // Treat hero-only bits (no rows in school_bit_images) as count=1 if
    // image_web_url is set — the table only tracks the multi-image set, so
    // counting rows alone would under-report.
    image_count: countByBitId.get(b.id) ?? (b.image_web_url ? 1 : 0),
  }))

  // Count bits per school for the typeahead labels
  const bitsBySchool = new Map<string, number>()
  for (const b of bits) {
    if (!b.school_id) continue
    bitsBySchool.set(b.school_id, (bitsBySchool.get(b.school_id) ?? 0) + 1)
  }

  // ── Shape the ad results ────────────────────────────────────────────────
  type RawAdRow = {
    id: string
    ad_eyebrow?:     string | null
    ad_headline:     string | null
    ad_description?: string | null
    ad_cta_label?:   string | null
    ad_image_url?:   string | null
    ad_link?:        string | null
    advertiser?:     { business_name?: string | null; slug?: string | null } | null
  }
  function shapeAd(row: RawAdRow): InlineAd {
    return {
      id:              row.id,
      ad_eyebrow:      row.ad_eyebrow      ?? null,
      ad_headline:     row.ad_headline     ?? null,
      ad_description:  row.ad_description  ?? null,
      ad_cta_label:    row.ad_cta_label    ?? null,
      ad_image_url:    row.ad_image_url    ?? null,
      ad_link:         row.ad_link         ?? null,
      advertiser_name: row.advertiser?.business_name ?? null,
    }
  }

  const sponsorRow = sponsorRes.data as {
    id:             string
    ad_headline:    string | null
    ad_description: string | null
    ad_cta_label:   string | null
    ad_link:        string | null
    ad_image_url:   string | null
    advertiser:     { business_name?: string | null; slug?: string | null } | null
  } | null
  const sponsor: SchoolBitsSponsor | null = sponsorRow?.advertiser?.business_name
    ? {
        businessName: sponsorRow.advertiser.business_name,
        slug:         sponsorRow.advertiser.slug ?? null,
        headline:     sponsorRow.ad_headline ?? null,
        imageUrl:     sponsorRow.ad_image_url ?? null,
        description:  sponsorRow.ad_description ?? null,
        ctaLabel:     sponsorRow.ad_cta_label ?? null,
        link:         sponsorRow.ad_link ?? null,
        placementId:  sponsorRow.id,
      }
    : null

  const inlineAds:     InlineAd[] = ((inlineAdsRes.data     ?? []) as RawAdRow[]).map(shapeAd)
  const transitionAds: InlineAd[] = ((transitionAdsRes.data ?? []) as RawAdRow[]).map(shapeAd)

  return (
    <div className="min-h-screen bg-background public-page">
      <Navigation />

      {/* HERO */}
      <section className="relative overflow-hidden border-b border-border/40 bg-muted">
        <div
          className="absolute inset-0 opacity-[0.08] pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, var(--color-foreground) 1px, transparent 0)', backgroundSize: '24px 24px' }}
        />
        <div className="container relative z-10 py-12 md:py-16 text-center max-w-4xl">
          <div className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-widest px-4 py-1.5 rounded-full bg-secondary text-secondary-foreground mb-5 shadow-sm">
            <Sparkles className="h-4 w-4" />
            School Zone
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-foreground mb-3 leading-tight">School Bits</h1>
          <p className="text-base md:text-lg text-foreground/80 mb-6">
            Award winners, achievements, ribbon cuttings, and good news from across the River Region.
          </p>

          <Link
            href="/school-bits/submit"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-bold rounded-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm transition-colors mb-14 md:mb-16"
          >
            <Megaphone className="h-4 w-4" />
            Share your school&apos;s news <ArrowRight className="h-4 w-4" />
          </Link>

          {/* Top sponsor — Brain-Games-style. Renders the compact placeholder
               when no advertiser is wired so the slot looks intentional.
               Generous bottom padding so the sponsor sits in its own breathing
               room instead of pressing against the section border. */}
          <div className="flex justify-center pb-2 md:pb-4">
            <HeroSponsorCard
              sponsor={sponsor}
              aboveLabel="School Bits Is Sponsored By"
              verticalSlug="school-bits"
              placeholderName="Anchor School Bits for the year"
              placeholderTagline="One advertiser, every brag. Parents and grandparents come here to read about their kid's school — your brand sits at the top of every moment."
              placeholderCtaLabel="Claim This Spot"
            />
          </div>
        </div>
      </section>

      <main className="container py-10 md:py-12 space-y-8">
        {/* Top banner — wide sponsor ad above the feed. Same component
            as the calendar's top banner. Renders a placeholder when
            no advertiser is booked so the slot is always visible to
            potential buyers (and never collapses the layout). */}
        <SponsorAdBanner placement="school-bits-top" variant="tan" ad={topBannerAd} />

        {bits.length === 0 ? (
          <div className="rounded-3xl border-2 border-dashed border-border bg-card p-12 text-center max-w-2xl mx-auto">
            <p className="text-base font-bold text-foreground mb-1">No School Bits published yet</p>
            <p className="text-sm text-muted-foreground mb-5">
              Be the first to share — submit your school&apos;s news using the button above.
            </p>
            <Link
              href="/school-bits/submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-bold rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Submit a bit
            </Link>
          </div>
        ) : (
          // Suspense boundary required because SchoolBitsBrowser uses
          // useSearchParams() — without it Next.js opts the whole page into
          // dynamic rendering and warns at build time.
          <Suspense fallback={null}>
            <SchoolBitsBrowser
              initialBits={bits}
              schools={schools.map(s => ({ ...s, bit_count: bitsBySchool.get(s.id) ?? 0 }))}
              inlineAds={inlineAds}
              transitionAds={transitionAds}
            />
          </Suspense>
        )}

        {/* Bottom banner — wide sponsor ad after the feed. Coral
            variant to visually differ from the top banner so it reads
            as a separate slot to readers (and to ad-blockers' heuristics). */}
        <SponsorAdBanner placement="school-bits-bottom" variant="coral" ad={bottomBannerAd} />
      </main>

      <PublicFooter />
    </div>
  )
}

function MigrationFallback() {
  return (
    <div className="min-h-screen bg-background public-page">
      <Navigation />
      <main className="container py-16 max-w-2xl text-center">
        <h1 className="text-3xl font-bold text-foreground mb-3">School Bits</h1>
        <p className="text-sm text-muted-foreground">
          School Bits is being set up. Check back soon.
        </p>
      </main>
      <PublicFooter />
    </div>
  )
}
