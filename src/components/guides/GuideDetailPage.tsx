import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Navigation } from '@/components/Navigation'
import { PublicFooter } from '@/components/PublicFooter'
import { SectionSponsorBanner } from '@/components/guides/SectionSponsorBanner'
import { GuideMapCard } from '@/components/guides/GuideMapCard'
import { ListingBadges } from '@/components/listings/ListingBadges'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Star, MapPin, Globe, BookOpen, Filter,
  ChevronRight,
} from 'lucide-react'
import { getFallbackByContext } from '@/lib/image-fallbacks'
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

  // Related article
  const { data: article } = await supabase
    .from('guide_articles')
    .select('id, title, slug, hero_image_url, excerpt')
    .eq('editorial_review_status', 'approved')
    .ilike('category', `%${guide.slug}%`)
    .limit(1)
    .maybeSingle()

  const totalListings = (featured?.length ?? 0) + (standard?.length ?? 0)
  const guideName = (guide.display_name as string).replace(' Guide', '').replace(' guide', '')

  return (
    <div className="min-h-screen bg-background public-page">
      <Navigation />

      {/* Header band */}
      <div className="bg-primary/5 border-b border-border">
        <div className="container py-12 lg:py-16">
          <div className="max-w-3xl">
            <Badge className="mb-4 bg-primary text-primary-foreground">2026 Edition</Badge>
            <h1 className="text-4xl md:text-6xl font-bold mb-6 text-foreground leading-tight">
              {guide.display_name}
            </h1>
            <p className="text-xl text-muted-foreground">
              {guide.pitch ?? guide.hub_intro_paragraph ?? guide.short_description}
            </p>
            <div className="flex items-center gap-4 mt-6 text-sm text-muted-foreground">
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
          </div>
        </div>
      </div>

      <main className="container py-10 lg:py-14">
        <div className="grid lg:grid-cols-12 gap-10">

          {/* ── Main column ───────────────────────────────────── */}
          <div className="lg:col-span-8 space-y-12">

            {/* Section sponsor banner — shown ABOVE featured providers */}
            {sectionSponsor ? (
              // Paid sponsor — show their branding
              <div className="flex items-center gap-3 py-2.5 px-4 rounded-2xl bg-accent/10 border border-accent/20">
                <span className="text-xs font-bold uppercase tracking-wider text-accent shrink-0">Section Sponsor</span>
                <span className="w-px h-4 bg-accent/30 shrink-0" />
                <span className="text-sm font-semibold text-foreground">
                  {(sectionSponsor.advertiser as { business_name?: string } | null)?.business_name ?? sectionSponsor.ad_headline}
                </span>
              </div>
            ) : (
              // No sponsor — show "available" CTA
              <SectionSponsorBanner guideName={guideName} guideUrlSlug={urlSlug} />
            )}

            {/* Featured providers */}
            {featured && featured.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-6">
                  <Star className="h-5 w-5 text-accent fill-accent" />
                  <h2 className="text-2xl font-bold text-foreground">Featured Providers</h2>
                </div>
                <div className="space-y-5">
                  {featured.map(l => {
                    const a = l.advertiser_accounts as unknown as {
                      id: string; slug: string; business_name: string; card_hook?: string | null;
                      hero_photo_url?: string | null; neighborhood?: string | null;
                      city_state_zip?: string | null; website_url?: string | null; office_phone?: string | null;
                      has_military_discount?: boolean | null; is_veteran_owned?: boolean | null;
                      is_woman_owned?: boolean | null; is_minority_owned?: boolean | null; is_locally_owned?: boolean | null;
                    } | null
                    if (!a) return null
                    const gd = (l.guide_data ?? {}) as Record<string, string>
                    return (
                      <Card key={l.id} className="overflow-hidden border-accent/30 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex flex-col md:flex-row">
                          {/* Image */}
                          <div className="md:w-1/3 relative aspect-video md:aspect-auto">
                            <Image
                              src={a.hero_photo_url || getFallbackByContext(guide.slug, a.slug)}
                              alt={a.business_name}
                              fill
                              style={{ objectFit: 'cover' }}
                              unoptimized
                              sizes="208px"
                            />
                            <Badge className="absolute top-3 left-3 bg-accent text-accent-foreground">Premium Sponsor</Badge>
                          </div>
                          {/* Content */}
                          <CardContent className="p-6 md:w-2/3 flex flex-col justify-center">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div>
                                <h3 className="text-2xl font-bold mb-2">{a.business_name}</h3>
                              </div>
                            </div>
                            {(a.card_hook ?? gd.description) && (
                              <p className="text-muted-foreground text-sm leading-relaxed mb-3">
                                {a.card_hook ?? gd.description}
                              </p>
                            )}
                            {/* Badges */}
                            <ListingBadges
                              hasMilitaryDiscount={a.has_military_discount}
                              isVeteranOwned={a.is_veteran_owned}
                              isWomanOwned={a.is_woman_owned}
                              isMinorityOwned={a.is_minority_owned}
                              isLocallyOwned={a.is_locally_owned}
                              className="mb-3"
                            />
                            <div className="flex items-center gap-3 text-xs text-muted-foreground mb-4">
                              {(a.neighborhood ?? a.city_state_zip) && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {a.neighborhood ?? a.city_state_zip}
                                </span>
                              )}
                              {l.category && (
                                <span className="flex items-center gap-1">
                                  <Filter className="h-3 w-3" />
                                  {l.category}
                                </span>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <Button asChild size="sm">
                                <Link href={`/${urlSlug}/listings/${a.slug}`}>View Profile</Link>
                              </Button>
                              {a.website_url && (
                                <Button variant="outline" size="sm" asChild>
                                  <a href={a.website_url} target="_blank" rel="noopener noreferrer">
                                    <Globe className="h-3.5 w-3.5" /> Website
                                  </a>
                                </Button>
                              )}
                            </div>
                          </CardContent>
                        </div>
                      </Card>
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
                        <Card className="hover:shadow-sm transition-shadow h-full flex flex-col">
                          {a.hero_photo_url && (
                            <div className="relative aspect-video overflow-hidden rounded-t-2xl">
                              <Image src={a.hero_photo_url} alt={a.business_name} fill style={{ objectFit: 'cover' }} unoptimized sizes="320px" />
                            </div>
                          )}
                          <CardContent className="p-4 flex-1 flex flex-col">
                            <h3 className="font-bold text-foreground mb-1">{a.business_name}</h3>
                            {(a.neighborhood ?? a.city_state_zip) && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
                                <MapPin className="h-3 w-3" />{a.neighborhood ?? a.city_state_zip}
                              </p>
                            )}
                            {hook && (
                              <p className="text-sm text-muted-foreground leading-relaxed mb-3 flex-1 line-clamp-2">{hook}</p>
                            )}
                            <Button asChild variant="outline" size="sm" className="mt-auto">
                              <Link href={`/${urlSlug}/listings/${a.slug}`}>
                                View Details <ChevronRight className="h-3.5 w-3.5" />
                              </Link>
                            </Button>
                          </CardContent>
                        </Card>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <Card>
                  <CardContent className="p-10 text-center text-muted-foreground">
                    {categoryFilter ? `No listings found in "${categoryFilter}".` : 'Listings coming soon.'}
                  </CardContent>
                </Card>
              )}
            </section>
          </div>

          {/* ── Sidebar ───────────────────────────────────────── */}
          <aside className="lg:col-span-4 space-y-6 lg:sticky lg:top-20 lg:self-start">

            {/* Category filter */}
            {categories.length > 0 && (
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-bold mb-4">Filter Results</h3>
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
                </CardContent>
              </Card>
            )}

            {/* Map card */}
            <GuideMapCard guideName={guideName} listingCount={totalListings} />

            {/* Editorial intro */}
            {guide.editorial_intro && (
              <Card>
                <CardContent className="p-5">
                  <h3 className="font-bold mb-3 text-foreground">About This Guide</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed line-clamp-6">
                    {(guide.editorial_intro as string).split('\n\n')[0]}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Insider tips */}
            {Array.isArray(guide.insider_tips) && guide.insider_tips.length > 0 && (
              <Card>
                <CardContent className="p-5">
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
                </CardContent>
              </Card>
            )}

            {/* Related article */}
            {article && (
              <Card className="bg-secondary/5 border-secondary/20 overflow-hidden">
                {article.hero_image_url && (
                  <div className="aspect-video relative">
                    <Image src={article.hero_image_url} alt={article.title} fill style={{ objectFit: 'cover' }} sizes="320px" unoptimized />
                  </div>
                )}
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 text-secondary font-bold text-sm mb-3">
                    <BookOpen className="h-4 w-4" />
                    Editor&apos;s Pick
                  </div>
                  <h3 className="text-xl font-bold mb-3 leading-tight">{article.title}</h3>
                  {article.excerpt && (
                    <p className="text-sm text-muted-foreground line-clamp-3 mb-4">{article.excerpt}</p>
                  )}
                  <Button variant="link" className="p-0 h-auto text-secondary hover:text-secondary/80" asChild>
                    <Link href={`/newcomer-guide/articles/${article.slug}`}>Read Full Article →</Link>
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Advertise CTA */}
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-5 text-center">
                <p className="font-bold text-foreground mb-2">List Your Business</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Reach thousands of River Region families searching in this guide.
                </p>
                <Button asChild className="w-full rounded-full">
                  <Link href="/advertise">Learn About Listing →</Link>
                </Button>
              </CardContent>
            </Card>
          </aside>
        </div>
      </main>

      <PublicFooter />
    </div>
  )
}
