import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import Image from 'next/image'
import { Navigation } from '@/components/Navigation'
import { PublicFooter } from '@/components/PublicFooter'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { BookOpen, MapPin, Star } from 'lucide-react'
import { PageHeader, SectionHeader, ContentCard } from '@/components/theme'
import type { Metadata } from 'next'

export const revalidate = 3600

export const metadata: Metadata = {
  title:       'Local Guides | River Region Parents',
  description: 'Nine guides covering schools, childcare, health, activities, and more for River Region families.',
}

const GUIDE_EMOJIS: Record<string, string> = {
  newcomer:       '🏡', 'private-school': '📚', 'summer-camp': '⛺',
  childcare:      '🧸', 'healthy-kids': '🩺', 'summer-fun': '☀️',
  'birthday-party':'🎂', afterschool: '🎨', 'special-needs': '💙',
}

async function getData() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  const { data: guides } = await supabase
    .from('guide_types')
    .select('slug, url_slug, display_name, short_description, hero_image_url, pitch, display_order')
    .not('url_slug', 'is', null)
    .order('display_order', { ascending: true })

  const counts = await Promise.all(
    (guides ?? []).map(g =>
      supabase
        .from('guide_listings')
        .select('id', { count: 'exact', head: true })
        .eq('guide_type_slug', g.slug)
        .eq('is_published', true)
        .then(({ count }) => ({ slug: g.slug, count: count ?? 0 }))
    )
  )
  const countMap = Object.fromEntries(counts.map(c => [c.slug, c.count]))

  const { data: featured } = await supabase
    .from('guide_listings')
    .select(`
      id, listing_tier, guide_type_slug,
      advertiser_accounts ( slug, business_name, card_hook, hero_photo_url, city_state_zip ),
      guide_types ( display_name, url_slug )
    `)
    .in('listing_tier', ['featured', 'tier-1-featured-listing', 'tier-3-business-spotlight'])
    .eq('is_published', true)
    .limit(2)

  return {
    guides: (guides ?? []).map(g => ({ ...g, count: countMap[g.slug] ?? 0 })),
    featured: featured ?? [],
  }
}

export default async function LocalGuidesPage() {
  const { guides, featured } = await getData()

  return (
    <div className="min-h-screen bg-background public-page">
      <Navigation />

      <PageHeader
        title="Community Guides"
        subtitle="Your comprehensive directories for everything family-related in the River Region. Curated, trusted, and always up-to-date."
        badge={{ text: 'Local Resources', variant: 'secondary' }}
        variant="cream"
        align="center"
        withBlur={true}
      />

      <main className="container py-12">

        {/* Featured Partners — shown if we have featured listings */}
        {featured.length > 0 && (
          <section className="mb-12">
            <SectionHeader title="Featured Partners" icon={Star} iconColor="accent" />
            <div className="grid md:grid-cols-2 gap-5">
              {featured.map(f => {
                const a = f.advertiser_accounts as unknown as {
                  slug: string; business_name: string; card_hook?: string | null;
                  hero_photo_url?: string | null; city_state_zip?: string | null
                } | null
                const gt = f.guide_types as unknown as { display_name: string; url_slug: string } | null
                if (!a || !gt) return null
                return (
                  <Card key={f.id} className="overflow-hidden group cursor-pointer border-accent/20 hover:border-accent/50 transition-colors">
                    <div className="flex h-32">
                      <div className="w-1/3 relative overflow-hidden">
                        {a.hero_photo_url
                          ? <Image src={a.hero_photo_url} alt={a.business_name} fill style={{ objectFit: 'cover' }} unoptimized sizes="160px" className="group-hover:scale-105 transition-transform" />
                          : <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                              <span className="text-4xl font-bold text-primary/40">{a.business_name[0]}</span>
                            </div>
                        }
                      </div>
                      <CardContent className="p-5 flex-1">
                        <Badge variant="accent" className="mb-2 text-xs">Featured</Badge>
                        <h3 className="font-bold text-foreground mb-1">{a.business_name}</h3>
                        {a.card_hook && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{a.card_hook}</p>
                        )}
                        {a.city_state_zip && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" />{a.city_state_zip}
                          </p>
                        )}
                      </CardContent>
                    </div>
                  </Card>
                )
              })}
            </div>
          </section>
        )}

        {/* All 9 Guide Cards */}
        <section>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {guides.map(g => {
              const emoji   = GUIDE_EMOJIS[g.slug] ?? '📖'
              const urlSlug = g.url_slug ?? g.slug

              return (
                <Link key={g.slug} href={`/${urlSlug}`} className="group block">
                  <Card className="overflow-hidden border-border/50 hover:border-primary/50 hover:shadow-lg transition-all h-full flex flex-col">
                    {/* Hero image */}
                    <div className="relative aspect-[4/3] overflow-hidden">
                      {g.hero_image_url
                        ? <Image
                            src={g.hero_image_url}
                            alt={g.display_name}
                            fill
                            style={{ objectFit: 'cover' }}
                            className="group-hover:scale-105 transition-transform duration-700"
                            sizes="(max-width: 640px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          />
                        : <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center text-5xl">
                            {emoji}
                          </div>
                      }
                    </div>

                    {/* Card content */}
                    <CardContent className="p-6 flex flex-col flex-1">
                      <div className="flex items-center gap-2 text-primary text-sm mb-3 font-medium">
                        <BookOpen className="h-4 w-4" />
                        {g.count} Listings
                      </div>
                      <h3 className="text-xl font-bold text-foreground leading-tight mb-2 group-hover:text-primary transition-colors">
                        {g.display_name}
                      </h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {g.pitch ?? g.short_description}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="mt-14 text-center">
          <div className="max-w-xl mx-auto">
            <ContentCard variant="tinted" size="lg">
              <BookOpen className="h-10 w-10 text-primary mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-foreground mb-2">Get your business listed</h3>
              <p className="text-muted-foreground mb-6">
                Reach thousands of River Region families searching in our local guides.
              </p>
              <Button asChild className="rounded-full">
                <Link href="/advertise">Learn About Partnerships →</Link>
              </Button>
            </ContentCard>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  )
}
