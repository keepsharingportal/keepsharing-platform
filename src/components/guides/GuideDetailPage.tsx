import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Navigation } from '@/components/Navigation'
import { PublicFooter } from '@/components/PublicFooter'
import { SectionSponsorBanner } from '@/components/guides/SectionSponsorBanner'
import { GuideMapCard } from '@/components/guides/GuideMapCard'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Star, BookOpen, Filter, Building2, ArrowRight, Crown, CalendarDays, Megaphone } from 'lucide-react'
import { getFallbackByContext } from '@/lib/image-fallbacks'
import { shouldSkipNextOptimizer } from '@/lib/images'
import { articleHref } from '@/lib/articles/slug'
import { PageHeader, SectionHeader, SidebarWidget, ListingCard } from '@/components/theme'
import { GuideCategoryBlocks } from '@/components/guides/GuideCategoryBlocks'
import { guideIsLive } from '@/lib/guides/live'
import {
  categoryListingRenderable,
  coerceJoin,
  datedEventCardFacts,
  freeListingFromRow,
  isDatedEventGuide,
  resolveCompactCard,
  type CompactCardModel,
  type InlineListingIdentity,
} from '@/lib/guides/free-listings'
import type { ListingData } from '@/components/theme/ListingCard'
import type { Metadata } from 'next'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

export async function generateGuideDetailMetadata(urlSlug: string): Promise<Metadata> {
  const supabase = getSupabase()
  const { data } = await supabase
    .from('guide_types')
    // select('*') on purpose: live_from / live_until only exist once migration
    // 230 is applied, and PostgREST fails the whole query on an unknown column
    // name — which would title EVERY guide 'Guide Not Found' in the meantime.
    .select('*')
    .eq('url_slug', urlSlug)
    .single()
  if (!data) return { title: 'Guide Not Found' }

  // A guide that isn't live must not be indexed, even when someone is looking
  // at it through ?preview=1 — otherwise a preview link shared internally can
  // put next month's hub into search results early.
  const { data: cfg } = await supabase
    .from('guide_configs')
    .select('is_active')
    .eq('guide_type_slug', data.slug)
    .maybeSingle()
  const live = guideIsLive(data as { live_from?: string | null; live_until?: string | null }, cfg)

  return {
    title:       `${data.display_name} | River Region Parents`,
    description: data.short_description ?? undefined,
    ...(live ? {} : { robots: { index: false, follow: false } }),
  }
}

// Fisher-Yates. Called per request so no advertiser permanently owns the
// top featured slot. Kept outside the page component so the randomness
// isn't inside render.
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function CompactListingGrid({
  cards,
  guideUrlSlug,
  guideContext,
  ad,
}: {
  cards: Array<{ id: string } & CompactCardModel>
  guideUrlSlug: string
  guideContext: string
  ad?: {
    ad_headline?: string | null
    ad_description?: string | null
    ad_cta_label?: string | null
    ad_link?: string | null
  } | null
}) {
  return (
    <div className="grid sm:grid-cols-2 gap-4">
      {cards.map((card, i) => (
        <div key={card.id}>
          {i === 4 && ad && (
            <Card className="col-span-full mb-0 border-secondary/30 bg-secondary/5">
              <CardContent className="p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">AD</p>
                {ad.ad_headline && <p className="font-semibold text-sm text-foreground mb-1">{ad.ad_headline}</p>}
                {ad.ad_description && <p className="text-xs text-muted-foreground mb-2">{ad.ad_description}</p>}
                {ad.ad_cta_label && ad.ad_link && (
                  <Button asChild size="sm" variant="secondary" className="rounded-full">
                    <Link href={ad.ad_link}>{ad.ad_cta_label}</Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
          <ListingCard
            listing={card.listing}
            guideUrlSlug={guideUrlSlug}
            guideContext={guideContext}
            variant="compact"
            facts={card.facts}
          />
        </div>
      ))}
    </div>
  )
}

interface Props {
  urlSlug: string
  categoryFilter?: string
  /**
   * Render a seasonal guide that isn't live yet, for review before go-live.
   * Adds a banner and noindex. Only bypasses the date window / active switch —
   * it can't conjure a guide that doesn't exist.
   */
  preview?: boolean
}

export async function GuideDetailPage({ urlSlug, categoryFilter, preview = false }: Props) {
  const supabase = getSupabase()

  const { data: guide } = await supabase
    .from('guide_types')
    .select('*')
    .eq('url_slug', urlSlug)
    .single()

  if (!guide) notFound()

  // Seasonal gate. live_from / live_until arrive with migration 230; select('*')
  // simply returns undefined for them until it is applied, which reads as "no
  // window" — so the is_active switch alone still holds the gate closed in the
  // meantime. No probe needed, and no behaviour change for existing guides.
  const { data: guideConfig } = await supabase
    .from('guide_configs')
    .select('is_active')
    .eq('guide_type_slug', guide.slug)
    .maybeSingle()

  const isLive = guideIsLive(guide as { live_from?: string | null; live_until?: string | null }, guideConfig)
  if (!isLive && !preview) notFound()

  // Featured listings — pull badge fields. We pull every featured listing
  // for this guide (or category when filtered) and pick the display set in
  // JS so the home page can rotate them.
  let featuredQuery = supabase
    .from('guide_listings')
    .select(`
      id, listing_tier, category, guide_data,
      business_name, card_hook, office_phone, mobile_phone, website_url,
      contact_email, address, city_state_zip, neighborhood, hero_photo_url,
      advertiser_accounts (
        id, slug, business_name, card_hook, hero_photo_url, neighborhood, city_state_zip,
        website_url, office_phone,
        has_military_discount, is_veteran_owned, is_woman_owned, is_minority_owned, is_locally_owned
      )
    `)
    .eq('guide_type_slug', guide.slug)
    .eq('is_published', true)
    .in('listing_tier', ['featured', 'tier-1-featured-listing', 'tier-2-spotlight', 'tier-3-business-spotlight'])
    .order('display_order', { ascending: true })

  if (categoryFilter) featuredQuery = featuredQuery.eq('category', categoryFilter)
  const { data: featuredAll } = await featuredQuery

  // Every featured listing shows on the guide home page, not a rotating 3.
  // These are the paying advertisers and there are rarely more than a dozen
  // per guide — hiding two thirds of them behind a reload sells them short and
  // makes the page's most valuable content the least reliable to find. Order is
  // still shuffled so no one advertiser permanently owns the top slot.
  const featured = categoryFilter
    ? (featuredAll ?? [])
    : shuffle(featuredAll ?? [])

  // Dated event guides (Fall Festivities today) are a directory of free
  // events, so the home page has to show the cards. Program guides still
  // keep the standard directory behind a category pick — featured advertisers
  // stay the only listings on those home pages.
  const isEventGuide = isDatedEventGuide(guide.slug)

  // Standard listings. Category view is capped at 50, same as before.
  // An event-guide home page loads the whole free directory so each
  // category section can render its cards.
  type StandardRow = InlineListingIdentity & {
    listing_tier: string
    category: string | null
    guide_data: Record<string, unknown> | null
    advertiser_accounts: {
      id?: string
      slug: string
      business_name: string
      card_hook?: string | null
      hero_photo_url?: string | null
      neighborhood?: string | null
      city_state_zip?: string | null
    } | null
  }
  let standard: StandardRow[] | null = null
  if (categoryFilter || isEventGuide) {
    let standardQuery = supabase
      .from('guide_listings')
      .select(`
        id, listing_tier, category, guide_data,
        business_name, card_hook, office_phone, mobile_phone, website_url,
        contact_email, address, city_state_zip, neighborhood, hero_photo_url,
        advertiser_accounts ( id, slug, business_name, card_hook, hero_photo_url, neighborhood, city_state_zip )
      `)
      .eq('guide_type_slug', guide.slug)
      .eq('is_published', true)
      .not('listing_tier', 'in', '(featured,tier-1-featured-listing,tier-2-spotlight,tier-3-business-spotlight)')
      .order('display_order', { ascending: true })
    if (categoryFilter) {
      standardQuery = standardQuery.eq('category', categoryFilter).range(0, 49)
    } else {
      standardQuery = standardQuery.limit(500)
    }
    const { data } = await standardQuery
    standard = (data ?? null) as unknown as StandardRow[] | null
  }

  // Category counts — only listings a card can actually render. A category
  // whose rows all lack both an advertiser and an inline name used to show
  // up as a header over an empty grid.
  const { data: catRows } = await supabase
    .from('guide_listings')
    .select('category, business_name, advertiser_accounts(business_name)')
    .eq('guide_type_slug', guide.slug)
    .eq('is_published', true)
    .not('category', 'is', null)

  const catMap: Record<string, number> = {}
  for (const r of catRows ?? []) {
    if (!r.category || !categoryListingRenderable(r)) continue
    catMap[r.category] = (catMap[r.category] ?? 0) + 1
  }
  const categories = Object.entries(catMap).sort((a, b) => b[1] - a[1])

  // Check for active section sponsor for this guide
  const { data: sectionSponsor } = await supabase
    .from('ad_placements')
    .select('*, advertiser:advertiser_accounts(business_name, slug)')
    .eq('placement_type', 'section_sponsor')
    .eq('is_active', true)
    .ilike('placement_context', `%${guide.slug}%`)
    .limit(1)
    .maybeSingle()

  // Active inline ad
  const { data: ad } = await supabase
    .from('ad_placements')
    .select('*, advertiser:advertiser_accounts(business_name, slug)')
    .eq('placement_type', 'guide_directory_inline_ad')
    .eq('is_active', true)
    .lte('starts_at', new Date().toISOString())
    .or(`ends_at.is.null,ends_at.gte.${new Date().toISOString()}`)
    .order('display_priority', { ascending: false })
    .limit(1)
    .maybeSingle()

  // Related articles — fetch up to 4 for the editorial grid. Try both slug
  // variants since older articles were tagged with the URL slug ("summer-fun-guide")
  // and newer ones with the internal slug ("summer-fun").
  const { data: articlesRaw } = await supabase
    .from('guide_articles')
    .select('id, title, slug, hero_image_url, excerpt, column_slug')
    .eq('published', true)
    .in('guide_slug', [guide.slug, urlSlug])
    .order('published_at', { ascending: false, nullsFirst: false })
    .limit(4)
  const articles = articlesRaw ?? []
  const article  = articles[0] ?? null   // sidebar "Editor's Pick"

  // True guide-wide total (independent of any active category filter).
  // Counts renderable listings only, so the header matches the cards below.
  const totalListings = Object.values(catMap).reduce((sum, n) => sum + n, 0)
  const guideName = (guide.display_name as string).replace(' Guide', '').replace(' guide', '')

  // Category links drop every other query param. While a guide is only
  // reachable with ?preview=1, losing that flag 404s the next click. The
  // gate itself is unchanged — this only keeps the flag on links that
  // already came from a preview.
  const guideHref = (category?: string) => {
    const parts = [
      category ? `category=${encodeURIComponent(category)}` : '',
      preview ? 'preview=1' : '',
    ].filter(Boolean)
    return parts.length > 0 ? `/${urlSlug}?${parts.join('&')}` : `/${urlSlug}`
  }

  // Linked featured cards keep the advertiser account as their whole identity.
  // A featured row with no account (there isn't one on the guides that sell
  // this tier) falls back to the inline columns and renders compact, because
  // a detail page needs an advertiser slug.
  type GuideCard = {
    key: string
    variant: 'featured' | 'compact'
    listing: ListingData
    facts?: CompactCardModel['facts']
  }
  const featuredCards: GuideCard[] = featured.flatMap((l): GuideCard[] => {
    const raw = l.advertiser_accounts as unknown as ListingData | ListingData[] | null
    const a = coerceJoin(raw)
    const gd = (l.guide_data ?? {}) as Record<string, string>
    if (a) {
      // Description fills an empty card_hook. Featured cards were the ones
      // most likely to render with no copy — on the After-School Guide that
      // was 5 of 10 paying advertisers — and the compact cards already did this.
      const withHook = a.card_hook ? a : { ...a, card_hook: gd.description ?? null }
      return [{ key: l.id, variant: 'featured', listing: withHook }]
    }
    const free = freeListingFromRow(l as unknown as InlineListingIdentity)
    if (!free) return []
    return [{
      key: l.id,
      variant: 'compact',
      listing: free.card_hook ? free : { ...free, card_hook: gd.description ?? null },
      facts: isEventGuide ? datedEventCardFacts((l.guide_data ?? null) as Record<string, unknown> | null) : [],
    }]
  })

  const compactCards = (standard ?? []).flatMap(row => {
    const card = resolveCompactCard(row, isEventGuide)
    return card ? [{ id: row.id, category: row.category, ...card }] : []
  })
  const uncategorizedCards = compactCards.filter(card => !card.category)
  const hubSections = (!categoryFilter && isEventGuide)
    ? [
        ...categories.flatMap(([cat]) => {
          const cards = compactCards.filter(card => card.category === cat)
          return cards.length > 0 ? [{ cat, cards }] : []
        }),
        ...(uncategorizedCards.length > 0 ? [{ cat: 'Other', cards: uncategorizedCards }] : []),
      ]
    : []

  return (
    <div className="min-h-screen bg-background public-page">
      <Navigation />

      {/* Only reachable via ?preview=1 on a guide that isn't live yet. Loud on
          purpose: the whole risk of a preview link is someone forgetting which
          one they're looking at and reporting the unfinished version as broken. */}
      {!isLive && preview && (
        <div className="bg-amber-100 border-b-2 border-amber-400 text-amber-900">
          <div className="container py-2.5 text-sm font-semibold text-center">
            Preview — this guide is not public yet.
            {guide.live_from ? ` Scheduled to go live ${guide.live_from}.` : ' Turn it on in guide settings when ready.'}
          </div>
        </div>
      )}

      <PageHeader
        title={guide.display_name}
        subtitle={guide.pitch ?? guide.hub_intro_paragraph ?? guide.short_description}
        badge={{ text: `${new Date().getFullYear()} Edition`, variant: 'default' }}
        variant="primary"
        size="lg"
        heroImageUrl={guide.hero_image_url}
      >
        <div className={`flex items-center gap-4 text-sm ${guide.hero_image_url ? 'text-white/85' : 'text-muted-foreground'}`}>
          <span className="flex items-center gap-1.5">
            <BookOpen className={`h-4 w-4 ${guide.hero_image_url ? 'text-white' : 'text-primary'}`} />
            {totalListings} listings
          </span>
          {categories.length > 0 && (
            <span className="flex items-center gap-1.5">
              <Filter className={`h-4 w-4 ${guide.hero_image_url ? 'text-white' : 'text-primary'}`} />
              {categories.length} categories
            </span>
          )}
        </div>
      </PageHeader>

      <main className="container py-10 lg:py-14">
        <div className="grid lg:grid-cols-12 gap-10">

          {/* ── Main column ───────────────────────────────────── */}
          <div className="lg:col-span-8 space-y-12">

            {/* Section sponsor banner — shown ABOVE featured providers */}
            {sectionSponsor ? (
              // Paid sponsor — premium "Presented By" banner
              (() => {
                const adv = sectionSponsor.advertiser as { business_name?: string; slug?: string } | null
                const sponsorName = adv?.business_name ?? sectionSponsor.ad_headline ?? 'Our Sponsor'
                const sponsorHref = adv?.slug ? `/${urlSlug}/listings/${adv.slug}` : null
                return (
                  <div className="flex items-center justify-between gap-4 py-3.5 px-5 rounded-2xl bg-gradient-to-r from-accent/20 via-accent/10 to-accent/5 border border-accent/35">
                    <div className="flex items-center gap-3 min-w-0">
                      <Crown className="h-4 w-4 text-accent shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-widest text-accent/80 leading-none mb-1">
                          Proudly Presented By
                        </p>
                        <p className="font-bold text-foreground leading-tight truncate">{sponsorName}</p>
                      </div>
                    </div>
                    {sponsorHref && (
                      <Link
                        href={sponsorHref}
                        className="shrink-0 text-xs font-bold text-primary hover:text-primary/80 transition-colors whitespace-nowrap flex items-center gap-1"
                      >
                        View Profile <ArrowRight className="h-3 w-3" />
                      </Link>
                    )}
                  </div>
                )
              })()
            ) : (
              // No sponsor — show "available" CTA
              <SectionSponsorBanner guideName={guideName} guideUrlSlug={urlSlug} />
            )}

            {/* Quick category navigation — main column, prominent.
                Only when there are 4+ categories worth surfacing. */}
            {categories.length >= 4 && (
              <section>
                <SectionHeader title="Browse by Category" icon={Filter} />
                {/* Every category, as colour blocks. This was 8 grey outline
                    chips with truncated labels ("Dance, Gymnastics & …") and a
                    line of text sending the rest to a sidebar filter — so on
                    the After-School Guide, 6 of 14 categories were effectively
                    invisible, including every one a parent might be searching
                    for by name. */}
                <GuideCategoryBlocks
                  categories={categories}
                  urlSlug={urlSlug}
                  activeFilter={categoryFilter}
                  preview={preview}
                />
              </section>
            )}

            {/* Featured providers — every one of them, on both the guide home
                page and the category view. */}
            {featuredCards.length > 0 && (
              <section>
                <SectionHeader
                  title={categoryFilter ? `Featured in ${categoryFilter}` : 'Featured Providers'}
                  icon={Star}
                  iconColor="accent"
                />
                {/* Two across from lg up. The featured card is internally
                    side-by-side already (image left, copy right), so a single
                    column wasted half the width and pushed a 10-listing guide
                    into an unreadably long scroll. Stays single-column below lg
                    so the card's own two-column split doesn't get crushed. */}
                <div className="grid gap-5 lg:grid-cols-2">
                  {featuredCards.map(card => (
                    <ListingCard
                      key={card.key}
                      listing={card.listing}
                      guideUrlSlug={urlSlug}
                      guideContext={guide.slug}
                      variant={card.variant}
                      facts={card.variant === 'compact' ? card.facts : undefined}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Editorial highlights — main-column article grid.
                Only when this guide has multiple articles; sidebar still shows
                the "Editor's Pick" as well. */}
            {articles.length >= 2 && (
              <section>
                <SectionHeader title="Editorial" icon={BookOpen} />
                <div className="grid sm:grid-cols-2 gap-4">
                  {articles.slice(0, 4).map(a => {
                    const href = articleHref(a)
                    const img  = a.hero_image_url || getFallbackByContext(guide.slug, a.slug)
                    return (
                      <Link key={a.id} href={href} className="group rounded-2xl overflow-hidden border border-border hover:border-primary/30 hover:shadow-sm transition-all bg-card flex flex-col">
                        <div className="relative aspect-video bg-muted">
                          <Image src={img} alt={a.title} fill style={{ objectFit: 'cover' }} sizes="(max-width: 640px) 100vw, 320px" unoptimized={shouldSkipNextOptimizer(a.hero_image_url)} className="group-hover:scale-105 transition-transform duration-500" />
                        </div>
                        <div className="p-4 flex flex-col flex-1 gap-2">
                          <h4 className="font-bold text-base leading-snug text-foreground group-hover:text-primary transition-colors line-clamp-2">{a.title}</h4>
                          {a.excerpt && <p className="text-sm text-muted-foreground line-clamp-2 flex-1">{a.excerpt}</p>}
                          <span className="text-xs font-semibold text-primary inline-flex items-center gap-1 mt-auto pt-1">
                            Read article <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                          </span>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </section>
            )}

            {/* Program guides keep the directory behind a category pick so
                featured advertisers are what you see first. A dated event
                guide has no paying tier to lead with — the events are the
                page — so each category renders its cards here. A category
                with nothing renderable is left out rather than shown empty. */}
            {!categoryFilter && hubSections.length === 0 && (
              <section className="rounded-2xl border border-primary/20 bg-primary/5 p-7 text-center">
                <Filter className="h-6 w-6 text-primary mx-auto mb-3" />
                <h3 className="text-lg font-bold text-foreground mb-1">
                  Pick a category to browse all listings
                </h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  {totalListings.toLocaleString()} listings across {categories.length} categories. Tap any category above to see every business in that section.
                </p>
              </section>
            )}

            {hubSections.map(section => (
              <section key={section.cat}>
                <h2 className="text-2xl font-bold text-foreground mb-6">{section.cat}</h2>
                <CompactListingGrid
                  cards={section.cards}
                  guideUrlSlug={urlSlug}
                  guideContext={guide.slug}
                />
              </section>
            ))}

            {categoryFilter && (
            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-foreground">
                  More in {categoryFilter}
                </h2>
                <Button variant="ghost" size="sm" asChild>
                  <Link href={guideHref()}>Show All ×</Link>
                </Button>
              </div>

              {compactCards.length > 0 ? (
                <CompactListingGrid
                  cards={compactCards}
                  guideUrlSlug={urlSlug}
                  guideContext={guide.slug}
                  ad={ad}
                />
              ) : (
                <div className="rounded-2xl border-2 border-dashed border-border/60 bg-muted/20 px-8 py-14 text-center">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                    <Building2 className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-2">
                    {categoryFilter
                      ? `No listings yet in "${categoryFilter}"`
                      : `Be the first listed in the ${guideName} Guide`}
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6 leading-relaxed">
                    {categoryFilter
                      ? `We're still building out this category. Know a business that belongs here?`
                      : `River Region families are already searching here. Get your business in front of them before your competitors do.`}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button asChild className="rounded-full">
                      <Link href="/advertise">
                        List Your Business <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                    {categoryFilter && (
                      <Button asChild variant="outline" className="rounded-full">
                        <Link href={guideHref()}>View All Categories</Link>
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </section>
            )}

            {/* Calendar / events tie-in — lightweight link, no fake data */}
            <section className="rounded-2xl border border-secondary/30 bg-secondary/5 p-6 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-start gap-3 min-w-0">
                <div className="h-10 w-10 rounded-xl bg-secondary/15 flex items-center justify-center text-secondary shrink-0">
                  <CalendarDays className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-foreground leading-tight">Events on the community calendar</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Family-friendly events across the River Region — updated weekly.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button asChild variant="outline" size="sm" className="rounded-full">
                  <Link href="/calendar">View Calendar</Link>
                </Button>
                <Button asChild size="sm" className="rounded-full">
                  <Link href="/calendar/submit">Submit Event</Link>
                </Button>
              </div>
            </section>

            {/* Business closing CTA — main-column, larger than the sidebar version */}
            <section className="rounded-2xl border border-accent/40 bg-gradient-to-br from-accent/15 via-accent/8 to-primary/5 p-7">
              <div className="flex items-start gap-3 mb-4">
                <div className="h-10 w-10 rounded-xl bg-accent/20 flex items-center justify-center text-accent shrink-0">
                  <Megaphone className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[11px] font-black uppercase tracking-widest text-accent/80 mb-1">For Local Businesses</p>
                  <h3 className="text-xl font-bold text-foreground leading-tight">
                    Reach families browsing the {guideName} Guide
                  </h3>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
                Get a featured listing, upgrade your existing listing, or claim the section sponsorship to put your business in front of every family planning their summer.
              </p>
              <div className="flex flex-wrap gap-2.5">
                <Button asChild className="rounded-full">
                  <Link href={`/advertise/${urlSlug}`}>Get Listed</Link>
                </Button>
                <Button asChild variant="outline" className="rounded-full">
                  <Link href={`/advertise/${urlSlug}#sponsor`}>Sponsor This Guide</Link>
                </Button>
              </div>
            </section>
          </div>

          {/* ── Sidebar ───────────────────────────────────────── */}
          <aside className="lg:col-span-4 space-y-6 lg:sticky lg:top-20 lg:self-start">

            {/* Category filter */}
            {categories.length > 0 && (
              <SidebarWidget title="Filter Results" icon={Filter}>
                <div className="flex flex-wrap gap-2">
                  <Link href={guideHref()}>
                    <Badge variant={!categoryFilter ? 'default' : 'outline'} className="cursor-pointer">All</Badge>
                  </Link>
                  {categories.map(([cat, cnt]) => (
                    <Link key={cat} href={guideHref(cat)}>
                      <Badge variant={categoryFilter === cat ? 'default' : 'outline'} className="cursor-pointer">
                        {cat} ({cnt})
                      </Badge>
                    </Link>
                  ))}
                </div>
              </SidebarWidget>
            )}

            {/* Map card */}
            <GuideMapCard guideName={guideName} listingCount={totalListings} />

            {/* Editorial intro */}
            {guide.editorial_intro && (
              <SidebarWidget title="About This Guide">
                <p className="text-sm text-muted-foreground leading-relaxed line-clamp-6">
                  {(guide.editorial_intro as string).split('\n\n')[0]}
                </p>
              </SidebarWidget>
            )}

            {/* Insider tips */}
            {Array.isArray(guide.insider_tips) && guide.insider_tips.length > 0 && (
              <SidebarWidget>
                <h3 className="font-bold mb-3 text-foreground flex items-center gap-2">
                  <Star className="h-4 w-4 text-accent fill-accent" />Insider Tips
                </h3>
                <ul className="space-y-4">
                  {(guide.insider_tips as Array<{ tip: string }>).slice(0, 4).map((t, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex gap-2.5 leading-relaxed">
                      <span className="text-primary font-bold shrink-0">→</span>
                      <span>{t.tip}</span>
                    </li>
                  ))}
                </ul>
              </SidebarWidget>
            )}

            {/* Related article */}
            {article && (
              <SidebarWidget variant="tinted">
                {article.hero_image_url && (
                  <div className="aspect-video relative -mx-5 -mt-5 mb-4 overflow-hidden rounded-t-2xl">
                    <Image src={article.hero_image_url} alt={article.title} fill style={{ objectFit: 'cover' }} sizes="320px" unoptimized={shouldSkipNextOptimizer(article.hero_image_url)} />
                  </div>
                )}
                <div className="flex items-center gap-2 text-secondary font-bold text-sm mb-3">
                  <BookOpen className="h-4 w-4" />
                  Editor&apos;s Pick
                </div>
                <h3 className="text-xl font-bold mb-3 leading-tight text-foreground">{article.title}</h3>
                {article.excerpt && (
                  <p className="text-sm text-muted-foreground line-clamp-3 mb-4">{article.excerpt}</p>
                )}
                <Button variant="link" className="p-0 h-auto text-secondary hover:text-secondary/80" asChild>
                  <Link href={articleHref(article)}>Read Full Article →</Link>
                </Button>
              </SidebarWidget>
            )}

            {/* Advertise CTA */}
            <div className="rounded-2xl bg-gradient-to-br from-primary to-primary/80 p-6 text-white text-center shadow-md">
              <p className="text-xs font-bold uppercase tracking-widest text-white/60 mb-2">Get Listed</p>
              <p className="font-bold text-xl leading-snug mb-2">
                Reach families actively searching the {guideName}
              </p>
              <p className="text-sm text-white/75 mb-5 leading-relaxed">
                Featured placements, standard listings, and exclusive section sponsorships available.
              </p>
              <Button asChild size="sm" className="w-full rounded-full bg-white text-primary hover:bg-white/90 font-bold mb-3">
                <Link href="/advertise">Get Listed Today →</Link>
              </Button>
              <p className="text-[11px] text-white/50 leading-snug">
                Founding advertiser rates available — limited spots
              </p>
            </div>
          </aside>
        </div>
      </main>

      <PublicFooter />
    </div>
  )
}
