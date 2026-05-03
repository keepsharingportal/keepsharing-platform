import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import Image from 'next/image'
import { Navigation } from '@/components/Navigation'
import { PublicFooter } from '@/components/PublicFooter'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { BookOpen, MapPin, Search, Star, ChevronRight, Users } from 'lucide-react'
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

      {/* Header */}
      <div className="bg-secondary/10 border-b border-border">
        <div className="container py-12 lg:py-16 text-center">
          <Badge variant="secondary" className="mb-4">River Region Parents</Badge>
          <h1 className="text-4xl md:text-6xl font-bold mb-4 text-foreground leading-tight">
            Local Resources.<br />
            <span className="text-primary">Real Recommendations.</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Nine guides covering the full arc of family life in the River Region. Built by the families who actually live here.
          </p>
          <div className="max-w-md mx-auto flex gap-2">
            <Input placeholder="Search guides and listings..." className="rounded-full" />
            <Button className="rounded-full px-5 shrink-0">
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <main className="container py-12">

        {/* Featured Partners — shown if we have featured listings */}
        {featured.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center gap-2 mb-6">
              <Star className="h-5 w-5 text-accent fill-accent" />
              <h2 className="text-2xl font-bold text-foreground">Featured Partners</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-5">
              {featured.map(f => {
                const a = f.advertiser_accounts as unknown as {
                  slug: string; business_name: string; card_hook?: string | null;
                  hero_photo_url?: string | null; city_state_zip?: string | null
                } | null
                const gt = f.guide_types as unknown as { display_name: string; url_slug: string } | null
                if (!a || !gt) return null
                return (
                  <Card key={f.id} className="overflow-hidden hover:shadow-md transition-shadow">
                    <div className="flex">
                      <div className="w-40 shrink-0 bg-muted relative">
                        {a.hero_photo_url
                          ? <Image src={a.hero_photo_url} alt={a.business_name} fill style={{ objectFit: 'cover' }} unoptimized sizes="160px" />
                          : <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                              <span className="text-4xl font-bold text-primary/40">{a.business_name[0]}</span>
                            </div>
                        }
                      </div>
                      <CardContent className="p-5 flex-1">
                        <Badge variant="accent" className="mb-2 text-xs">Featured</Badge>
                        <h3 className="font-bold text-foreground mb-1">{a.business_name}</h3>
                        {a.card_hook && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{a.card_hook}</p>
                        )}
                        {a.city_state_zip && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mb-3">
                            <MapPin className="h-3 w-3" />{a.city_state_zip}
                          </p>
                        )}
                        <Button asChild size="sm" variant="outline" className="rounded-full">
                          <Link href={`/${gt.url_slug}/listings/${a.slug}`}>View Profile</Link>
                        </Button>
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
          <h2 className="text-2xl font-bold text-foreground mb-6">Browse All Guides</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {guides.map(g => {
              const emoji   = GUIDE_EMOJIS[g.slug] ?? '📖'
              const urlSlug = g.url_slug ?? g.slug

              return (
                <Link key={g.slug} href={`/${urlSlug}`} className="group block">
                  <Card className="overflow-hidden hover:shadow-lg transition-all duration-200 h-full flex flex-col">
                    {/* Hero image */}
                    <div className="relative aspect-[4/3] bg-muted overflow-hidden">
                      {g.hero_image_url
                        ? <Image
                            src={g.hero_image_url}
                            alt={g.display_name}
                            fill
                            style={{ objectFit: 'cover' }}
                            className="group-hover:scale-105 transition-transform duration-500"
                            sizes="(max-width: 640px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          />
                        : <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center text-5xl">
                            {emoji}
                          </div>
                      }
                    </div>

                    {/* Card content */}
                    <CardContent className="p-5 flex-1 flex flex-col">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="font-bold text-foreground text-lg leading-snug">{g.display_name}</h3>
                        <ChevronRight className="h-4 w-4 text-primary shrink-0 mt-1 group-hover:translate-x-1 transition-transform" />
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed mb-3 flex-1">
                        {g.pitch ?? g.short_description}
                      </p>
                      <div className="flex items-center justify-between pt-3 border-t border-border">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {g.count} listings
                        </span>
                        <Badge variant="outline" className="text-xs">2026 Edition</Badge>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="mt-14 text-center">
          <Card className="bg-primary/5 border-primary/20 max-w-xl mx-auto">
            <CardContent className="p-8">
              <BookOpen className="h-10 w-10 text-primary mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-foreground mb-2">Get your business listed</h3>
              <p className="text-muted-foreground mb-6">
                Reach thousands of River Region families searching in our local guides.
              </p>
              <Button asChild className="rounded-full">
                <Link href="/advertise">Learn About Partnerships →</Link>
              </Button>
            </CardContent>
          </Card>
        </section>
      </main>

      <PublicFooter />
    </div>
  )
}
