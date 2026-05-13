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
import { Star, BookOpen, Filter, Building2, ArrowRight, Crown } from 'lucide-react'
import { getFallbackByContext } from '@/lib/image-fallbacks'
import { PageHeader, SectionHeader, SidebarWidget, ListingCard } from '@/components/theme'
import type { Metadata } from 'next'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

export async function generateGuideDetailMetadata(urlSlug: string): Promise<Metadata> {
  const { data } = await getSupabase()
    .from('guide_types')
    .select('display_name, short_description')
    .eq('url_slug', urlSlug)
    .single()
  if (!data) return { title: 'Guide Not Found' }
  return {
    title:       `${data.display_name} | River Region Parents`,
    description: data.short_description ?? undefined,
  }
}

interface Props {
  urlSlug: string
  categoryFilter?: string
}

export async function GuideDetailPage({ urlSlug, categoryFilter }: Props) {
  const supabase = getSupabase()

  const { data: guide } = await supabase
    .from('guide_types')
    .select('*')
    .eq('url_slug', urlSlug)
    .single()

  if (!guide) notFound()

  // Featured listings — pull badge fields
  const { data: featured } = await supabase
    .from('guide_listings')
    .select(`
      id, listing_tier, category, guide_data,
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
    .limit(3)

  // Standard listings
  let stdQuery = supabase
    .from('guide_listings')
    .select(`
      id, listing_tier, category, guide_data,
      advertiser_accounts ( id, slug, business_name, card_hook, hero_photo_url, neighborhood, city_state_zip )
    `)
    .eq('guide_type_slug', guide.slug)
    .eq('is_published', true)
    .not('listing_tier', 'in', '(featured,tier-1-featured-listing,tier-2-spotlight,tier-3-business-spotlight)')
    .order('display_order', { ascending: true })

  if (categoryFilter) stdQuery = stdQuery.eq('category', categoryFilter)
  const { data: standard } = await stdQuery.range(0, 23)

  // Category counts
  const { data: catRows } = await supabase
    .from('guide_listings')
    .select('category')
    .eq('guide_type_slug', guide.slug)
    .eq('is_published', true)
    .not('category', 'is', null)

  const catMap: Record<string, number> = {}
  for (const r of catRows ?? []) {
    if (r.category) catMap[r.category] = (catMap[r.category] ?? 0) + 1
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

  // Related article — filter by guide_slug (category column doesn't exist in guide_articles)
  const { data: article } = await supabase
    .from('guide_articles')
    .select('id, title, slug, hero_image_url, excerpt')
    .eq('published', true)
    .eq('guide_slug', guide.slug)
    .limit(1)
    .maybeSingle()

  const totalListings = (featured?.length ?? 0) + (standard?.length ?? 0)
  const guideName = (guide.display_name as string).replace(' Guide', '').replace(' guide', '')

  return (
    <div className="min-h-screen bg-background public-page">
      <Navigation />

      <PageHeader
        title={guide.display_name}
        subtitle={guide.pitch ?? guide.hub_intro_paragraph ?? guide.short_description}
        badge={{ text: `${new Date().getFullYear()} Edition`, variant: 'default' }}
        variant="primary"
        size="lg"
      >
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <BookOpen className="h-4 w-4 text-primary" />
            {totalListings} listings
          </span>
          {categories.length > 0 && (
            <span className="flex items-center gap-1.5">
              <Filter className="h-4 w-4 text-primary" />
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

            {/* Featured providers */}
            {featured && featured.length > 0 && (
              <section>
                <SectionHeader title="Featured Providers" icon={Star} iconColor="accent" />
                <div className="space-y-5">
                  {featured.map(l => {
                    const a = l.advertiser_accounts as unknown as Parameters<typeof ListingCard>[0]['listing'] | null
                    if (!a) return null
                    return (
                      <ListingCard
                        key={l.id}
                        listing={a}
                        guideUrlSlug={urlSlug}
                        guideContext={guide.slug}
                        variant="featured"
                      />
                    )
                  })}
                </div>
              </section>
            )}

            {/* Directory */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-foreground">
                  {categoryFilter ? `${categoryFilter} Listings` : 'All Listings'}
                </h2>
                {categoryFilter && (
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/${urlSlug}`}>Show All ×</Link>
                  </Button>
                )}
              </div>

              {standard && standard.length > 0 ? (
                <div className="grid sm:grid-cols-2 gap-4">
                  {standard.map((l, i) => {
                    const a = l.advertiser_accounts as unknown as {
                      slug: string; business_name: string; card_hook?: string | null;
                      hero_photo_url?: string | null; neighborhood?: string | null; city_state_zip?: string | null
                    } | null
                    if (!a) return null
                    const gd = (l.guide_data ?? {}) as Record<string, string>
                    const hook = a.card_hook ?? gd.description ?? null
                    return (
                      <div key={l.id}>
                        {/* Inline ad after 4th listing */}
                        {i === 4 && ad && (
                          <Card key="inline-ad" className="col-span-full mb-0 border-secondary/30 bg-secondary/5">
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
                          listing={a as Parameters<typeof ListingCard>[0]['listing']}
                          guideUrlSlug={urlSlug}
                          guideContext={guide.slug}
                          variant="standard"
                        />
                      </div>
                    )
                  })}
                </div>
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
                        <Link href={`/${urlSlug}`}>View All Categories</Link>
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </section>
          </div>

          {/* ── Sidebar ───────────────────────────────────────── */}
          <aside className="lg:col-span-4 space-y-6 lg:sticky lg:top-20 lg:self-start">

            {/* Category filter */}
            {categories.length > 0 && (
              <SidebarWidget title="Filter Results" icon={Filter}>
                <div className="flex flex-wrap gap-2">
                  <Link href={`/${urlSlug}`}>
                    <Badge variant={!categoryFilter ? 'default' : 'outline'} className="cursor-pointer">All</Badge>
                  </Link>
                  {categories.map(([cat, cnt]) => (
                    <Link key={cat} href={`/${urlSlug}?category=${encodeURIComponent(cat)}`}>
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
                    <Image src={article.hero_image_url} alt={article.title} fill style={{ objectFit: 'cover' }} sizes="320px" unoptimized />
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
                  <Link href={`/articles/${article.slug}`}>Read Full Article →</Link>
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
