import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Navigation } from '@/components/Navigation'
import { PublicFooter } from '@/components/PublicFooter'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { ListingBadges } from '@/components/listings/ListingBadges'
import { ListingMap } from '@/components/listings/ListingMap'
import { ListingMessageForm } from '@/components/listings/ListingMessageForm'
import { TrackedContactLink } from '@/components/listings/TrackedContactLink'
import { SectionRenderer } from '@/components/listings/sections/SectionRenderer'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  MapPin, Phone, Globe, Mail, CheckCircle2, Clock,
  CalendarDays, ArrowRight, BookOpen, Sparkles,
  Share2, Heart, MessageCircle, Star, ArrowLeft, Filter,
} from 'lucide-react'
import { getFallbackByContext } from '@/lib/image-fallbacks'
import { shouldSkipNextOptimizer } from '@/lib/images'
import { articleHref } from '@/lib/articles/slug'
import { schemaForGuide } from '@/lib/guides/schemas'
import type { Metadata } from 'next'

// ── Supabase client ───────────────────────────────────────────────────────────

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

// ── Metadata helper ───────────────────────────────────────────────────────────

export async function generateListingMetadata(listingSlug: string): Promise<Metadata> {
  const { data } = await getSupabase()
    .from('advertiser_accounts')
    .select('business_name, detail_lead')
    .eq('slug', listingSlug)
    .single()
  if (!data) return { title: 'Listing Not Found' }
  return {
    title:       `${data.business_name} | River Region Parents`,
    description: data.detail_lead ?? undefined,
  }
}

// ── Static data maps ──────────────────────────────────────────────────────────

// Guide-specific fact labels surfaced in the key-facts row near the title.
// Order matters — the first 4 with data are shown as icon chips. Anything not
// listed here still lives in `guide_data` and renders in the long-form sections.
// Keep these tight: they're the headline facts a parent needs at a glance.
const GUIDE_FIELD_LABELS: Record<string, Record<string, string>> = {
  'summer-fun':     { activity_type: 'Activity', ages: 'Ages', city: 'Location', registration_url: 'Register' },
  'summer-camp':    { camp_type: 'Type', ages: 'Ages', dates: 'Dates', cost: 'Cost', registration_url: 'Register' },
  'childcare':      { ages: 'Ages Served', hours: 'Hours', programs: 'Programs', license: 'License', accreditation: 'Accreditation', teacher_ratio: 'Teacher Ratio' },
  'private-school': { grade: 'Grades', enrollment: 'Enrollment', tuition: 'Tuition', religious_affiliation: 'Affiliation', accreditation: 'Accreditation', leadership: 'Head of School' },
  'healthy-kids':   { specialty: 'Specialty', providers: 'Providers', accepts_new_patients: 'New Patients', insurance: 'Insurance', ages: 'Ages Served', hours: 'Hours' },
  'newcomer':       { category: 'Category', services: 'Services', area_served: 'Area Served', hours: 'Hours' },
  'birthday-party': { capacity: 'Capacity', ages: 'Ages', price_range: 'Price Range', includes: 'Includes' },
  'afterschool':    { ages: 'Ages', hours: 'Hours', pickup_schools: 'Pickup From', programs: 'Programs' },
  'special-needs':  { ages: 'Ages Served', specialty: 'Specialty', services: 'Services', insurance: 'Insurance' },
}

// Branded gradient backgrounds when a listing has no real hero photo. Keyed by
// guide_types.slug. Better than serving a random Unsplash image that may not
// match the listing's actual character (e.g. a library getting a beach photo).
const GUIDE_GRADIENTS: Record<string, string> = {
  'summer-fun':     'linear-gradient(135deg, #4c1d0d 0%, #9a3412 45%, #d97706 100%)',
  'summer-camp':    'linear-gradient(135deg, #064e3b 0%, #047857 45%, #10b981 100%)',
  'private-school': 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 45%, #3b82f6 100%)',
  'childcare':      'linear-gradient(135deg, #581c87 0%, #7c3aed 45%, #a855f7 100%)',
  'healthy-kids':   'linear-gradient(135deg, #14532d 0%, #16a34a 45%, #22c55e 100%)',
  'newcomer':       'linear-gradient(135deg, #7c2d12 0%, #c2410c 45%, #f97316 100%)',
}

// Used to resolve display names / URL slugs for "Featured in Guides" chips.
// Keys are guide_types.slug values (internal), not url_slug values.
// 'newcomer' is the internal slug for the Family Resource Guide.
const GUIDE_URL_MAP: Record<string, { displayName: string; urlSlug: string }> = {
  'newcomer':        { displayName: 'Family Resource Guide',    urlSlug: 'family-resource-guide' },
  'family-resource': { displayName: 'Family Resource Guide',    urlSlug: 'family-resource-guide' },
  'summer-camp':     { displayName: '2026 Summer Camp Guide',   urlSlug: 'summer-camp-guide' },
  'summer-fun':      { displayName: 'Summer Fun Guide',         urlSlug: 'summer-fun-guide' },
  'private-school':  { displayName: 'Private School Guide',     urlSlug: 'private-school-guide' },
  'childcare':       { displayName: 'Childcare Guide',          urlSlug: 'childcare-guide' },
  'healthy-kids':    { displayName: 'Healthy Kids Guide',       urlSlug: 'healthy-kids-guide' },
  'birthday-party':  { displayName: 'Birthday Party Guide',     urlSlug: 'birthday-party-guide' },
  'afterschool':     { displayName: 'After-School Guide',       urlSlug: 'afterschool-guide' },
  'special-needs':   { displayName: 'Special Needs Guide',      urlSlug: 'special-needs-guide' },
}

// Icon + color rotation for the key facts row
const FACT_CONFIG = [
  { Icon: CheckCircle2, bg: 'bg-primary/10',   text: 'text-primary' },
  { Icon: CalendarDays, bg: 'bg-secondary/10', text: 'text-secondary' },
  { Icon: Clock,        bg: 'bg-accent/20',    text: 'text-accent-foreground' },
  { Icon: Star,         bg: 'bg-primary/10',   text: 'text-primary' },
]

// ── Component props ───────────────────────────────────────────────────────────

interface Props {
  urlSlug:      string
  listingSlug:  string
  // Set false when the parent layout already renders Navigation + PublicFooter.
  // Prevents double-navigation on guide listing pages (e.g. /family-resource-guide/listings/*).
  includeShell?: boolean
}

// ── Page ──────────────────────────────────────────────────────────────────────

export async function ListingDetailPage({ urlSlug, listingSlug, includeShell = true }: Props) {
  const supabase = getSupabase()

  // Step 1 — advertiser account (needed for all other queries)
  const { data: acct } = await supabase
    .from('advertiser_accounts')
    .select('*')
    .eq('slug', listingSlug)
    .single()

  if (!acct) notFound()

  // Step 2 — resolve guide type FIRST so guide.slug is correct for downstream queries.
  // guide_types.slug (e.g. "newcomer") differs from the URL slug (e.g. "family-resource-guide"),
  // so we cannot derive it with a string operation — we must query the table.
  const { data: guide } = await supabase
    .from('guide_types')
    .select('slug, display_name, url_slug')
    .eq('url_slug', urlSlug)
    .single()

  // The guide_listings table uses guide_types.slug (internal), not url_slug.
  const guideSlug = guide?.slug ?? urlSlug.replace(/-guide$/, '')

  // Step 3 — parallel queries, all using the real guideSlug
  const [
    { data: listing },
    { data: sections },
    { data: related },
    { data: allGuideListings },
    { data: guideArticles },
    { data: siblingCategoryRows },
  ] = await Promise.all([
    supabase
      .from('guide_listings')
      .select('*')
      .eq('advertiser_account_id', acct.id)
      .eq('guide_type_slug', guideSlug)
      .maybeSingle(),
    supabase
      .from('listing_sections')
      .select('*')
      .eq('advertiser_account_id', acct.id)
      .eq('is_active', true)
      .order('display_order', { ascending: true }),
    // Related — pull a wider set and dedupe by advertiser_account_id
    // in JS so a vendor listed under multiple categories doesn't render
    // twice in the "More in" rail. The 3-card display set is sliced
    // after dedup below.
    supabase
      .from('guide_listings')
      .select('id, advertiser_account_id, advertiser_accounts ( slug, business_name, neighborhood, city_state_zip )')
      .eq('guide_type_slug', guideSlug)
      .eq('is_published', true)
      .neq('advertiser_account_id', acct.id)
      .order('listing_tier', { ascending: true })
      .limit(20),
    // All guides this advertiser is published in (for "Featured in Guides" chips)
    supabase
      .from('guide_listings')
      .select('guide_type_slug')
      .eq('advertiser_account_id', acct.id)
      .eq('is_published', true),
    // Editorial articles from this guide — guide_articles.guide_slug stores the URL slug
    supabase
      .from('guide_articles')
      .select('id, slug, title, hero_image_url, column_slug, guide_slug')
      .eq('guide_slug', urlSlug)
      .eq('published', true)
      .order('display_order')
      .limit(2),
    // Sibling categories — drives the sidebar "Browse other categories"
    // widget. Pulls every distinct category for this guide; counts
    // computed in JS. Excludes the current listing's category from the
    // displayed list so the widget surfaces alternatives.
    supabase
      .from('guide_listings')
      .select('category')
      .eq('guide_type_slug', guideSlug)
      .eq('is_published', true)
      .not('category', 'is', null)
      .limit(1000),
  ])

  // ── Data processing ───────────────────────────────────────────────────────

  // guideSlug is resolved above (after guide_types query)
  const guideData   = (listing?.guide_data ?? {}) as Record<string, string>
  const isFeatured  = ['featured', 'tier-1-featured-listing', 'tier-2-spotlight', 'tier-3-business-spotlight'].includes(listing?.listing_tier ?? '')
  // GUIDE_SCHEMAS (per-guide field+section manifests) takes precedence
  // over the legacy GUIDE_FIELD_LABELS map when present. Schema-driven
  // guides also reorder listing_sections by their declared section_type
  // order (instead of display_order alone).
  const schema      = schemaForGuide(guideSlug)
  const fieldLabels = schema
    ? Object.fromEntries(schema.headlineFacts.map(f => [f.key, f.label]))
    : (GUIDE_FIELD_LABELS[guideSlug] ?? {})

  const phone   = (acct.office_phone ?? acct.contact_phone ?? acct.mobile_phone ?? null) as string | null
  const website = (acct.website_url ?? null) as string | null
  const address = (acct.address ?? null) as string | null
  const cityZip = (acct.city_state_zip ?? null) as string | null
  const email   = (acct.contact_email ?? acct.email ?? null) as string | null

  const showMessageForm = acct.accepts_messages !== false && acct.id

  // Build "Featured in Guides" chip list from all published guide_listings for this advertiser
  const guideSlugsForAdvertiser = [...new Set([
    guideSlug,
    ...(allGuideListings ?? []).map((l: { guide_type_slug: string }) => l.guide_type_slug),
  ])]
  const featuredInGuides = guideSlugsForAdvertiser
    .map(slug => GUIDE_URL_MAP[slug])
    .filter(Boolean) as Array<{ displayName: string; urlSlug: string }>

  // Key facts: only field-label entries that have data
  const keyFacts = Object.entries(fieldLabels)
    .slice(0, 4)
    .map(([key, label]) => ({ key, label, val: guideData[key] }))
    .filter(f => f.val)

  const heroImg     = acct.hero_photo_url || null
  const heroGradient = GUIDE_GRADIENTS[guideSlug] ?? 'linear-gradient(135deg, #1f2937, #374151, #6b7280)'
  const galleryImgs  = (acct.gallery_image_urls ?? []) as string[]
  const hasRealGallery = !!heroImg || galleryImgs.length > 0

  // Schema-driven section ordering. If the guide has a schema, we
  // render the rich sections in the schema-declared order; any sections
  // NOT in the schema still render afterwards in display_order so a
  // bespoke editor-added section doesn't get silently dropped.
  // features_bullets is intentionally rendered inline higher up as
  // "What We Offer" — keep skipping it in this rail to avoid dupes.
  const allSections = (sections ?? []) as Array<{ id: string; section_type: string; is_active: boolean; display_order: number }>
  let orderedSections: typeof allSections = []
  if (schema) {
    const ordering = new Map<string, number>(schema.sections.map((s, i) => [s.section_type, i]))
    const scored = allSections
      .filter(s => s.section_type !== 'features_bullets')
      .map(s => ({ s, rank: ordering.get(s.section_type) ?? 999 + s.display_order }))
      .sort((a, b) => a.rank - b.rank)
    orderedSections = scored.map(x => x.s)
  } else {
    orderedSections = allSections.filter(s => s.section_type !== 'features_bullets')
  }

  // Breadcrumb category hop — only when the listing has a category
  // value that ties to a section anchor on the parent guide. Falls
  // through to a 3-tier crumb when there's no category.
  const breadcrumbCategoryHref = listing?.category
    ? `/${urlSlug}#dir-${(listing.category as string).toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
    : null

  // Sibling categories for the sidebar "Browse other categories"
  // widget — distinct category names with counts, sorted by size,
  // current listing's category surfaced first (highlighted as "current").
  const siblingCatMap: Record<string, number> = {}
  for (const r of (siblingCategoryRows ?? []) as Array<{ category: string | null }>) {
    if (r.category) siblingCatMap[r.category] = (siblingCatMap[r.category] ?? 0) + 1
  }
  const currentCategory = (listing?.category as string | null | undefined) ?? null
  const siblingCategories = Object.entries(siblingCatMap)
    .map(([cat, count]) => ({ cat, count, isCurrent: cat === currentCategory }))
    .sort((a, b) => {
      // Current first, then by count descending
      if (a.isCurrent && !b.isCurrent) return -1
      if (!a.isCurrent && b.isCurrent) return 1
      return b.count - a.count
    })
    .slice(0, 8)

  // Dedupe related listings by advertiser_account_id so a vendor with
  // multiple category listings in the same guide doesn't render twice.
  // Slice to 3 AFTER dedup.
  type RelatedRow = {
    id: string
    advertiser_account_id: string | null
    advertiser_accounts: { slug: string; business_name: string; neighborhood?: string | null; city_state_zip?: string | null } | null
  }
  const relatedSeen = new Set<string>()
  const relatedDeduped: RelatedRow[] = []
  for (const r of (related ?? []) as unknown as RelatedRow[]) {
    const key = r.advertiser_account_id ?? r.id
    if (relatedSeen.has(key)) continue
    relatedSeen.add(key)
    relatedDeduped.push(r)
    if (relatedDeduped.length === 3) break
  }

  return (
    <div className="min-h-screen bg-background font-sans">
      {includeShell && <Navigation />}

      {/* Breadcrumb trail — Home > [Guide Name] [> Category] > [Listing].
          Always renders regardless of includeShell, since the trail is
          page-level navigation independent of the site shell. */}
      <div className="border-b border-border/40 bg-background">
        <div className="container py-3">
          <Breadcrumbs
            items={[
              { label: 'Home', href: '/' },
              { label: guide?.display_name ?? 'Guide', href: `/${urlSlug}` },
              ...(listing?.category && breadcrumbCategoryHref
                ? [{ label: listing.category as string, href: breadcrumbCategoryHref }]
                : []),
              { label: acct.business_name as string },
            ]}
          />
        </div>
      </div>

      {/* ── Hero Banner ───────────────────────────────────────────────────── */}
      <div className="h-64 md:h-96 w-full relative" style={!heroImg ? { background: heroGradient } : undefined}>
        {heroImg && (
          <Image
            src={heroImg}
            alt={acct.business_name}
            fill
            style={{ objectFit: 'cover' }}
            sizes="100vw"
            priority
            unoptimized={shouldSkipNextOptimizer(heroImg)}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        {/* When there's no photo, show the business name large in the gradient */}
        {!heroImg && (
          <div className="absolute inset-x-0 bottom-12 md:bottom-16 px-6 text-center pointer-events-none">
            <p className="text-white/60 text-xs font-bold uppercase tracking-widest mb-2">{guide?.display_name ?? 'Local Listing'}</p>
            <h2 className="text-white text-3xl md:text-5xl font-black leading-tight" style={{ textShadow: '0 2px 6px rgba(0,0,0,0.4)' }}>
              {acct.business_name}
            </h2>
          </div>
        )}

        {/* Back link — deep-links to category anchor when category is known */}
        <div className="absolute top-6 left-6 flex flex-col gap-2">
          {listing?.category && (
            <Link
              href={`/${urlSlug}#dir-${(listing.category as string).toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
              className="inline-flex items-center gap-1.5 text-sm font-medium bg-background/80 backdrop-blur-sm text-foreground hover:text-primary px-3 py-1.5 rounded-full border border-border/50 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {listing.category as string}
            </Link>
          )}
          <Link
            href={`/${urlSlug}`}
            className="inline-flex items-center gap-1.5 text-xs font-medium bg-background/70 backdrop-blur-sm text-muted-foreground hover:text-primary px-3 py-1.5 rounded-full border border-border/40 transition-colors"
          >
            <ArrowLeft className="h-3 w-3" />
            {guide?.display_name ?? 'Back to Guide'}
          </Link>
        </div>

        {/* Share + Save */}
        <div className="absolute top-6 right-6 flex gap-3">
          <Button variant="outline" size="icon" className="rounded-full bg-background/80 backdrop-blur border-none shadow-lg hover:bg-background">
            <Share2 className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="rounded-full bg-background/80 backdrop-blur border-none shadow-lg hover:bg-background text-primary">
            <Heart className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* ── Main content ──────────────────────────────────────────────────── */}
      <main className="container pt-8 pb-16 -mt-24 relative z-10">
        <div className="grid lg:grid-cols-12 gap-10">

          {/* ── Main column ─────────────────────────────────────────── */}
          <div className="lg:col-span-8 space-y-10">

            {/* Header info card */}
            <Card className="overflow-hidden shadow-xl rounded-[2rem]">
              <CardContent className="p-8 md:p-10 relative overflow-hidden">
                {/* Decorative blur orb */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

                <div className="flex flex-wrap items-start justify-between gap-6 mb-6">
                  <div className="flex-1 min-w-0">
                    {/* Badge row */}
                    <div className="flex flex-wrap items-center gap-2 mb-4">
                      {isFeatured && (
                        <Badge className="bg-accent text-accent-foreground border-none px-3 py-1">
                          ⭐ Premium Sponsor
                        </Badge>
                      )}
                      {listing?.category && (
                        <Badge variant="outline" className="border-primary/30 text-primary">
                          {listing.category}
                        </Badge>
                      )}
                    </div>
                    {/* Business name */}
                    <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-4 leading-tight">
                      {acct.business_name}
                    </h1>
                    {/* Location */}
                    {(address ?? cityZip) && (
                      <div className="flex items-center gap-2 text-muted-foreground font-medium">
                        <MapPin className="h-5 w-5 text-primary shrink-0" />
                        <span>{address ?? cityZip}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Tagline */}
                {acct.card_hook && (
                  <p className="text-lg text-muted-foreground mb-6 leading-relaxed">{acct.card_hook}</p>
                )}

                {/* Key facts row — icon circles, one per field label with data */}
                {keyFacts.length > 0 && (
                  <div className="flex flex-wrap gap-6 pt-8 border-t border-border/50 mt-6">
                    {keyFacts.map(({ key, label, val }, idx) => {
                      const { Icon, bg, text } = FACT_CONFIG[idx % FACT_CONFIG.length]
                      return (
                        <div key={key} className="flex items-center gap-3 text-base font-semibold">
                          <div className={`h-10 w-10 rounded-full ${bg} flex items-center justify-center ${text} shrink-0`}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <span className="text-foreground">{label}: {val}</span>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Ownership / special badges */}
                <ListingBadges
                  hasMilitaryDiscount={acct.has_military_discount}
                  isVeteranOwned={acct.is_veteran_owned}
                  isWomanOwned={acct.is_woman_owned}
                  isMinorityOwned={acct.is_minority_owned}
                  isLocallyOwned={acct.is_locally_owned}
                  className="mt-6"
                />
              </CardContent>
            </Card>

            {/* About — fieldLabels summary is already in the header key-facts row;
                  show the long-form text here. guideData.description supplements detail_lead. */}
            {(acct.detail_lead || guideData.description) && (
              <div className="space-y-4">
                <h2 className="text-3xl font-bold text-foreground">About {acct.business_name}</h2>
                {acct.detail_lead && (
                  <p className="text-muted-foreground text-lg leading-relaxed">{acct.detail_lead}</p>
                )}
                {guideData.description && (
                  <p className="text-muted-foreground text-base leading-relaxed whitespace-pre-wrap">{guideData.description}</p>
                )}
              </div>
            )}

            {/* Features / What We Offer — from features_bullets section */}
            {(() => {
              const featuresSection = sections?.find(s => s.section_type === 'features_bullets' && s.is_active)
              if (!featuresSection?.bullet_points?.length) return null
              const headline = featuresSection.headline || `What ${acct.business_name} Offers`
              return (
                <div className="space-y-6">
                  <h2 className="text-3xl font-bold text-foreground">{headline}</h2>
                  <ul className="grid sm:grid-cols-2 gap-4">
                    {featuresSection.bullet_points.map((feature: string, i: number) => (
                      <li key={i} className="flex items-center gap-4 bg-card p-4 rounded-2xl border border-border/50 shadow-sm">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                          <CheckCircle2 className="h-4 w-4" />
                        </div>
                        <span className="font-bold text-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })()}

            {/* Gallery — only when the listing has real photos. No more random
                Unsplash fillers that don't match the listing (e.g. tennis shoes
                under a library). */}
            {hasRealGallery && (
              <div className="space-y-6">
                <h2 className="text-3xl font-bold text-foreground">Gallery</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[heroImg, ...galleryImgs].filter(Boolean).slice(0, 4).map((src, i) => (
                    <div key={i} className="relative aspect-square rounded-2xl overflow-hidden border border-border/50 shadow-sm group cursor-zoom-in">
                      <Image
                        src={src!}
                        alt={`${acct.business_name} ${i + 1}`}
                        fill
                        style={{ objectFit: 'cover' }}
                        sizes="(max-width: 640px) 50vw, 25vw"
                        unoptimized={shouldSkipNextOptimizer(src!)}
                        className="group-hover:scale-105 transition-transform duration-700"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Flexible CMS sections — features_bullets handled above.
                Order driven by the guide schema when present (see
                lib/guides/schemas.ts), otherwise by display_order. */}
            {orderedSections.map(section => (
              <SectionRenderer key={section.id} section={section as unknown as Parameters<typeof SectionRenderer>[0]['section']} />
            ))}

            {/* Featured in Guides — sits at the END of the listing's
                content (per editor request) so it functions as a "this
                business is in these other guides too" cross-promo
                signal after the reader has consumed the listing detail.
                Only renders when this advertiser is published in 2+
                guides. */}
            {featuredInGuides.length > 0 && (
              <div className="bg-muted/50 rounded-3xl p-8 border border-border/50">
                <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-6 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Featured in these Digital Guides
                </h3>
                <div className="flex flex-wrap gap-4">
                  {featuredInGuides.map(g => (
                    <Link
                      key={g.urlSlug}
                      href={`/${g.urlSlug}`}
                      className="bg-background border border-border/50 px-5 py-3 rounded-2xl flex items-center gap-3 hover:border-primary/50 hover:shadow-md transition-all group"
                    >
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors shrink-0">
                        <BookOpen className="h-4 w-4" />
                      </div>
                      <span className="font-bold text-sm">{g.displayName}</span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Contact form — primary CTA for free listings; lives ABOVE
                the editorial articles so anyone ready to act doesn't
                have to scroll past four article cards first. Honest
                wording: admin forwards to the business; we don't claim
                to email them directly. */}
            {showMessageForm && (
              <Card className="border-primary/20 shadow-xl overflow-hidden rounded-[2rem]" id="message-form">
                <CardHeader className="bg-primary text-white p-8">
                  <CardTitle className="text-2xl flex items-center gap-3">
                    <MessageCircle className="h-7 w-7" />
                    Request Info
                  </CardTitle>
                  <p className="text-white/80 mt-2">
                    Send your question and our team will pass it to {acct.business_name} within 1 business day.
                  </p>
                </CardHeader>
                <CardContent className="p-8">
                  <ListingMessageForm
                    advertiserAccountId={acct.id}
                    advertiserName={acct.business_name}
                    guideTypeSlug={guideSlug}
                  />
                </CardContent>
              </Card>
            )}

            {/* Related editorial articles — sits BELOW the request form
                so the primary CTA is what readers see after the listing
                body. Skipped if the guide has no published articles. */}
            {guideArticles && guideArticles.length > 0 && (
              <div className="pt-10 border-t border-border/50">
                <h3 className="text-2xl font-bold mb-8 text-foreground">
                  From the {guide?.display_name ?? 'Guide'}
                </h3>
                <div className="grid sm:grid-cols-2 gap-6">
                  {guideArticles.map((article: {
                    id: string; slug: string; title: string;
                    hero_image_url?: string | null; column_slug?: string | null; guide_slug?: string | null
                  }) => {
                    const href = article.column_slug
                      ? articleHref(article)
                      : `/${urlSlug}/articles/${article.slug}`
                    return (
                      <Link key={article.id} href={href} className="group flex flex-col gap-3">
                        <div className="relative aspect-video rounded-2xl overflow-hidden border border-border/50">
                          <Image
                            src={article.hero_image_url || getFallbackByContext(guideSlug, article.slug)}
                            alt={article.title}
                            fill
                            style={{ objectFit: 'cover' }}
                            sizes="(max-width: 640px) 100vw, 50vw"
                            unoptimized={shouldSkipNextOptimizer(article.hero_image_url)}
                            className="group-hover:scale-105 transition-transform duration-500"
                          />
                          {article.column_slug && (
                            <div className="absolute top-3 left-3">
                              <Badge className="bg-white/90 text-foreground backdrop-blur border-none font-bold capitalize">
                                {article.column_slug.replace(/-/g, ' ')}
                              </Badge>
                            </div>
                          )}
                        </div>
                        <h4 className="font-bold text-lg group-hover:text-primary transition-colors leading-snug">
                          {article.title}
                        </h4>
                      </Link>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ── Sidebar ──────────────────────────────────────────── */}
          <aside className="lg:col-span-4 space-y-6 lg:sticky lg:top-24 lg:self-start">

            {/* Map widget */}
            <ListingMap
              address={address}
              cityStateZip={cityZip}
              businessName={acct.business_name}
            />

            {/* Contact card — icon-box links + CTAs. Renders only what's
                available. No phone/website/email/form → shows a friendly
                "coming soon" message instead of dead buttons. */}
            <Card className="rounded-[2rem] border-border/50 shadow-sm overflow-hidden">
              <CardContent className="p-8 space-y-5">
                {!phone && !website && !email && !showMessageForm && (
                  <div className="text-center py-2">
                    <p className="text-sm font-semibold text-foreground mb-1">Contact info coming soon</p>
                    <p className="text-xs text-muted-foreground">We&apos;re updating this listing. Check back shortly or browse other options below.</p>
                  </div>
                )}
                {phone && (
                  <TrackedContactLink
                    advertiserId={acct.id}
                    eventType="tel"
                    href={`tel:${phone.replace(/[^0-9]/g, '')}`}
                    className="flex items-center gap-4 text-base font-medium hover:text-primary transition-colors group"
                  >
                    <div className="h-10 w-10 rounded-xl bg-muted/50 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all shrink-0">
                      <Phone className="h-5 w-5" />
                    </div>
                    {phone}
                  </TrackedContactLink>
                )}
                {website && (
                  <TrackedContactLink
                    advertiserId={acct.id}
                    eventType="website"
                    href={website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-4 text-base font-medium hover:text-primary transition-colors group"
                  >
                    <div className="h-10 w-10 rounded-xl bg-muted/50 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all shrink-0">
                      <Globe className="h-5 w-5" />
                    </div>
                    <span className="truncate">{website.replace(/^https?:\/\//, '')}</span>
                  </TrackedContactLink>
                )}
                {email && (
                  <TrackedContactLink
                    advertiserId={acct.id}
                    eventType="mailto"
                    href={`mailto:${email}`}
                    className="flex items-center gap-4 text-base font-medium hover:text-primary transition-colors group"
                  >
                    <div className="h-10 w-10 rounded-xl bg-muted/50 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all shrink-0">
                      <Mail className="h-5 w-5" />
                    </div>
                    <span className="truncate">{email}</span>
                  </TrackedContactLink>
                )}
                {/* CTAs */}
                <div className="space-y-2.5 pt-2 border-t border-border/50">
                  {website && (
                    <Button asChild className="w-full rounded-full mt-4">
                      <TrackedContactLink
                        advertiserId={acct.id}
                        eventType="website"
                        href={website}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Visit Website
                      </TrackedContactLink>
                    </Button>
                  )}
                  {showMessageForm && (
                    <Button variant="outline" asChild className="w-full rounded-full">
                      <a href="#message-form">Request Info Through Us</a>
                    </Button>
                  )}
                  <Button variant="outline" asChild className="w-full rounded-full">
                    <Link href={`/${urlSlug}`}>
                      <ArrowLeft className="h-4 w-4 mr-1.5" />
                      Back to {guide?.display_name ?? 'Guide'}
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Hours of Operation */}
            {acct.hours_of_operation && (
              <Card className="rounded-[2rem] border-border/50 shadow-sm overflow-hidden">
                <CardHeader className="p-6 border-b border-border/50 bg-muted/30">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="h-5 w-5 text-primary" /> Hours &amp; Access
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-3 text-sm">
                  {Object.entries(acct.hours_of_operation as Record<string, string>).map(([day, hours], i, arr) => (
                    <div
                      key={day}
                      className={`flex justify-between items-center ${i < arr.length - 1 ? 'border-b border-border/50 pb-3' : ''}`}
                    >
                      <span className="text-muted-foreground font-medium capitalize">{day.replace(/_/g, ' ')}</span>
                      <span className={hours.toLowerCase() === 'closed' ? 'font-medium text-muted-foreground' : 'font-bold text-foreground'}>
                        {hours}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Browse other categories — replaces the old "Interested?"
                duplicate-CTA block. Surfaces sibling categories with
                their counts so a reader who came in via search can
                pivot inside the guide instead of bouncing back home.
                The current listing's category lands first, marked as
                "you're here". */}
            {siblingCategories.length > 0 && (
              <Card className="rounded-[2rem] border-border/50 shadow-sm overflow-hidden">
                <CardHeader className="p-6 border-b border-border/50 bg-muted/30">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Filter className="h-5 w-5 text-primary" />
                    Browse {guide?.display_name?.replace(' Guide', '') ?? 'Guide'} Categories
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3">
                  <div className="space-y-1">
                    {siblingCategories.map(({ cat, count, isCurrent }) => (
                      <Link
                        key={cat}
                        href={`/${urlSlug}#dir-${cat.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                        className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                          isCurrent
                            ? 'bg-primary/10 text-primary font-bold'
                            : 'text-foreground hover:bg-muted/60 font-semibold'
                        }`}
                      >
                        <span className="flex items-center gap-2 min-w-0">
                          <span className="truncate">{cat}</span>
                          {isCurrent && (
                            <span className="text-[9px] font-black uppercase tracking-widest text-primary/70 shrink-0">
                              You&apos;re here
                            </span>
                          )}
                        </span>
                        <span className={`text-xs tabular-nums shrink-0 ${isCurrent ? 'text-primary/70' : 'text-muted-foreground'}`}>
                          {count}
                        </span>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Platform ad / media kit CTA */}
            <Link
              href={`/advertise/${urlSlug}`}
              className="bg-muted aspect-square rounded-[2rem] border border-dashed border-muted-foreground/30 flex flex-col items-center justify-center p-8 text-center group hover:border-primary/50 transition-colors block"
            >
              <div className="h-16 w-16 bg-background rounded-2xl shadow-sm flex items-center justify-center mb-4 group-hover:scale-105 transition-transform border border-border/50">
                <Star className="h-8 w-8 text-accent" />
              </div>
              <h4 className="font-bold text-lg mb-2">Get Your Business Listed</h4>
              <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                Reach thousands of River Region families. See listing options and get started today.
              </p>
              <span className="inline-flex items-center justify-center w-full px-4 py-2.5 rounded-xl border border-primary text-primary text-sm font-bold group-hover:bg-primary/5 transition-colors">
                See Listing Options
              </span>
            </Link>
          </aside>
        </div>
      </main>

      {/* ── Other Resources for You (full-width, below fold) ─────────────── */}
      {relatedDeduped.length > 0 && (
        <section className="bg-muted/30 py-20 mt-12 border-t border-border/50">
          <div className="container">
            <div className="flex items-center justify-between mb-10">
              <h2 className="text-3xl font-bold text-foreground">
                {listing?.category
                  ? `More ${listing.category as string} Resources`
                  : `More in ${guide?.display_name ?? 'This Guide'}`}
              </h2>
              <Button variant="ghost" className="font-bold hidden sm:flex gap-1.5" asChild>
                <Link href={`/${urlSlug}`}>
                  View All Listings <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
            <div className="grid sm:grid-cols-3 gap-8">
              {relatedDeduped.map(r => {
                const ra = r.advertiser_accounts
                if (!ra) return null
                return (
                  <Link
                    key={r.id}
                    href={`/${urlSlug}/listings/${ra.slug}`}
                    className="bg-card rounded-3xl border border-border/50 overflow-hidden hover:shadow-xl transition-all group block"
                  >
                    <div className="aspect-video overflow-hidden relative">
                      <Image
                        src={getFallbackByContext(guideSlug, ra.slug)}
                        alt={ra.business_name}
                        fill
                        style={{ objectFit: 'cover' }}
                        sizes="(max-width: 640px) 100vw, 33vw"
                        unoptimized
                        className="group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                    <div className="p-6">
                      <h4 className="font-bold text-lg group-hover:text-primary transition-colors mb-1 leading-snug">
                        {ra.business_name}
                      </h4>
                      {(ra.neighborhood ?? ra.city_state_zip) && (
                        <p className="text-sm text-muted-foreground font-medium flex items-center gap-1 mt-1">
                          <MapPin className="h-3.5 w-3.5 shrink-0" />
                          {ra.neighborhood ?? ra.city_state_zip}
                        </p>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {includeShell && <PublicFooter />}
    </div>
  )
}
