import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Navigation } from '@/components/Navigation'
import { PublicFooter } from '@/components/PublicFooter'
import { ListingBadges } from '@/components/listings/ListingBadges'
import { ListingMap } from '@/components/listings/ListingMap'
import { ListingMessageForm } from '@/components/listings/ListingMessageForm'
import { SectionRenderer } from '@/components/listings/sections/SectionRenderer'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  MapPin, Phone, Globe, Mail, CheckCircle2, Clock,
  CalendarDays, ArrowRight, BookOpen, Sparkles, Info,
  Share2, Heart, MessageCircle, Star, ArrowLeft,
} from 'lucide-react'
import { getFallbackByContext } from '@/lib/image-fallbacks'
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

const GUIDE_FIELD_LABELS: Record<string, Record<string, string>> = {
  'private-school': { grade: 'Grades', leadership: 'Head of School', mission: 'Mission', extracurricula: 'Activities' },
  'childcare':      { ages: 'Ages Served', hours: 'Hours', meals: 'Meals', staff_ratio: 'Staff Ratio' },
  'healthy-kids':   { ages: 'Ages Served', hours: 'Hours' },
  'summer-fun':     { ages: 'Ages', cost: 'Cost' },
  'birthday-party': { capacity: 'Capacity', price_range: 'Price Range' },
  'afterschool':    { ages: 'Ages', hours: 'Hours' },
  'special-needs':  { ages: 'Ages Served' },
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
    supabase
      .from('guide_listings')
      .select('id, advertiser_accounts ( slug, business_name, neighborhood, city_state_zip )')
      .eq('guide_type_slug', guideSlug)
      .eq('is_published', true)
      .neq('advertiser_account_id', acct.id)
      .order('listing_tier', { ascending: true })
      .limit(3),
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
  ])

  // ── Data processing ───────────────────────────────────────────────────────

  // guideSlug is resolved above (after guide_types query)
  const guideData   = (listing?.guide_data ?? {}) as Record<string, string>
  const isFeatured  = ['featured', 'tier-1-featured-listing', 'tier-2-spotlight', 'tier-3-business-spotlight'].includes(listing?.listing_tier ?? '')
  const fieldLabels = GUIDE_FIELD_LABELS[guideSlug] ?? {}

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

  const heroImg = acct.hero_photo_url || getFallbackByContext(guideSlug, acct.slug)

  return (
    <div className="min-h-screen bg-background font-sans">
      {includeShell && <Navigation />}

      {/* ── Hero Banner ───────────────────────────────────────────────────── */}
      <div className="h-64 md:h-96 w-full relative">
        <Image
          src={heroImg}
          alt={acct.business_name}
          fill
          style={{ objectFit: 'cover' }}
          sizes="100vw"
          priority
          unoptimized
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />

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

            {/* Featured in Guides */}
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

            {/* About — fieldLabels summary is already in the header key-facts row;
                  show the long-form text here. guideData.description supplements detail_lead. */}
            {(acct.detail_lead || guideData.description) && (
              <div className="space-y-4">
                <h2 className="text-3xl font-bold text-foreground">About {acct.business_name}</h2>
                {acct.detail_lead && (
                  <p className="text-muted-foreground text-lg leading-relaxed">{acct.detail_lead}</p>
                )}
                {guideData.description && (
                  <p className="text-muted-foreground text-base leading-relaxed">{guideData.description}</p>
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

            {/* Gallery — square grid, 4-across on md+ */}
            <div className="space-y-6">
              <h2 className="text-3xl font-bold text-foreground">Gallery</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  acct.hero_photo_url || getFallbackByContext(guideSlug, `${acct.slug}-1`),
                  getFallbackByContext(guideSlug, `${acct.slug}-2`),
                  getFallbackByContext(guideSlug, `${acct.slug}-3`),
                  getFallbackByContext(guideSlug, `${acct.slug}-4`),
                ].map((src, i) => (
                  <div key={i} className="relative aspect-square rounded-2xl overflow-hidden border border-border/50 shadow-sm group cursor-zoom-in">
                    <Image
                      src={src}
                      alt={`${acct.business_name} ${i + 1}`}
                      fill
                      style={{ objectFit: 'cover' }}
                      sizes="(max-width: 640px) 50vw, 25vw"
                      unoptimized
                      className="group-hover:scale-105 transition-transform duration-700"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Related editorial articles from the same guide */}
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
                      ? `/columns/${article.column_slug}/${article.slug}`
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
                            unoptimized
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

            {/* Flexible CMS sections — features_bullets handled above */}
            {sections?.filter(s => s.section_type !== 'features_bullets').map(section => (
              <SectionRenderer key={section.id} section={section} />
            ))}

            {/* Contact form */}
            {showMessageForm && (
              <Card className="border-primary/20 shadow-xl overflow-hidden rounded-[2rem]" id="message-form">
                <CardHeader className="bg-primary text-white p-8">
                  <CardTitle className="text-2xl flex items-center gap-3">
                    <MessageCircle className="h-7 w-7" />
                    Inquire Now
                  </CardTitle>
                  <p className="text-white/80 mt-2">
                    Interested in {acct.business_name}? Send them a direct message and they&apos;ll be in touch quickly.
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
          </div>

          {/* ── Sidebar ──────────────────────────────────────────── */}
          <aside className="lg:col-span-4 space-y-6 lg:sticky lg:top-24 lg:self-start">

            {/* Map widget */}
            <ListingMap
              address={address}
              cityStateZip={cityZip}
              businessName={acct.business_name}
            />

            {/* Contact card — icon-box links + CTAs */}
            <Card className="rounded-[2rem] border-border/50 shadow-sm overflow-hidden">
              <CardContent className="p-8 space-y-5">
                {phone && (
                  <a
                    href={`tel:${phone.replace(/[^0-9]/g, '')}`}
                    className="flex items-center gap-4 text-base font-medium hover:text-primary transition-colors group"
                  >
                    <div className="h-10 w-10 rounded-xl bg-muted/50 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all shrink-0">
                      <Phone className="h-5 w-5" />
                    </div>
                    {phone}
                  </a>
                )}
                {website && (
                  <a
                    href={website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-4 text-base font-medium hover:text-primary transition-colors group"
                  >
                    <div className="h-10 w-10 rounded-xl bg-muted/50 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all shrink-0">
                      <Globe className="h-5 w-5" />
                    </div>
                    <span className="truncate">{website.replace(/^https?:\/\//, '')}</span>
                  </a>
                )}
                {email && (
                  <a
                    href={`mailto:${email}`}
                    className="flex items-center gap-4 text-base font-medium hover:text-primary transition-colors group"
                  >
                    <div className="h-10 w-10 rounded-xl bg-muted/50 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all shrink-0">
                      <Mail className="h-5 w-5" />
                    </div>
                    <span className="truncate">{email}</span>
                  </a>
                )}
                {/* CTAs */}
                <div className="space-y-2.5 pt-2 border-t border-border/50">
                  {website && (
                    <Button asChild className="w-full rounded-full mt-4">
                      <a href={website} target="_blank" rel="noopener noreferrer">Visit Website</a>
                    </Button>
                  )}
                  {showMessageForm && (
                    <Button variant="outline" asChild className="w-full rounded-full">
                      <a href="#message-form">Send a Message</a>
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

            {/* Help / engagement widget */}
            <Card className="bg-secondary text-white border-none rounded-[2rem] shadow-lg overflow-hidden relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
              <CardContent className="p-8">
                <div className="h-12 w-12 bg-white/20 rounded-2xl flex items-center justify-center mb-6">
                  <Info className="h-6 w-6" />
                </div>
                <h3 className="text-2xl font-bold mb-3">Interested?</h3>
                <p className="text-white/80 mb-6 text-sm leading-relaxed">
                  Mention &quot;River Region Parents&quot; when you reach out to {acct.business_name} — our readers receive special attention from local partners.
                </p>
                {showMessageForm ? (
                  <Button className="w-full bg-white text-secondary hover:bg-white/90 rounded-xl font-bold h-12" asChild>
                    <a href="#message-form">Send a Message</a>
                  </Button>
                ) : website ? (
                  <Button className="w-full bg-white text-secondary hover:bg-white/90 rounded-xl font-bold h-12" asChild>
                    <a href={website} target="_blank" rel="noopener noreferrer">Visit Website</a>
                  </Button>
                ) : null}
              </CardContent>
            </Card>

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
      {related && related.length > 0 && (
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
              {related.map(r => {
                const ra = r.advertiser_accounts as unknown as {
                  slug: string; business_name: string; neighborhood?: string | null; city_state_zip?: string | null
                } | null
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
