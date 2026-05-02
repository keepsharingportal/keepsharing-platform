import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Navigation } from '@/components/Navigation'
import { PublicFooter } from '@/components/PublicFooter'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MapPin, Phone, Globe, Mail, ChevronRight, ArrowLeft } from 'lucide-react'
import type { Metadata } from 'next'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

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

// Guide-type field labels
const GUIDE_FIELD_LABELS: Record<string, Record<string, string>> = {
  'private-school': { grade: 'Grades', leadership: 'Head of School', mission: 'Mission', extracurricula: 'Activities' },
  'childcare':      { ages: 'Ages Served', hours: 'Hours', meals: 'Meals', staff_ratio: 'Staff Ratio' },
  'healthy-kids':   { ages: 'Ages Served', hours: 'Hours' },
  'summer-fun':     { ages: 'Ages', cost: 'Cost' },
  'birthday-party': { capacity: 'Capacity', price_range: 'Price Range' },
  'afterschool':    { ages: 'Ages', hours: 'Hours' },
  'special-needs':  { ages: 'Ages Served' },
}

interface Props {
  urlSlug: string
  listingSlug: string
}

export async function ListingDetailPage({ urlSlug, listingSlug }: Props) {
  const supabase = getSupabase()

  const { data: acct } = await supabase
    .from('advertiser_accounts')
    .select('*')
    .eq('slug', listingSlug)
    .single()

  if (!acct) notFound()

  // Find guide by url_slug
  const { data: guide } = await supabase
    .from('guide_types')
    .select('slug, display_name, url_slug')
    .eq('url_slug', urlSlug)
    .single()

  const guideSlug = guide?.slug ?? urlSlug.replace('-guide', '')

  const { data: listing } = await supabase
    .from('guide_listings')
    .select('*')
    .eq('advertiser_account_id', acct.id)
    .eq('guide_type_slug', guideSlug)
    .maybeSingle()

  const { data: sections } = await supabase
    .from('listing_sections')
    .select('*')
    .eq('advertiser_account_id', acct.id)
    .eq('is_active', true)
    .order('display_order', { ascending: true })

  // Related listings (same guide, up to 5)
  const { data: related } = await supabase
    .from('guide_listings')
    .select(`
      id,
      advertiser_accounts ( slug, business_name, neighborhood, city_state_zip )
    `)
    .eq('guide_type_slug', guideSlug)
    .eq('is_published', true)
    .neq('advertiser_account_id', acct.id)
    .order('listing_tier', { ascending: true })
    .limit(5)

  const guideData    = (listing?.guide_data ?? {}) as Record<string, string>
  const isFeatured   = ['featured', 'tier-1-featured-listing', 'tier-2-spotlight', 'tier-3-business-spotlight'].includes(listing?.listing_tier ?? '')
  const fieldLabels  = GUIDE_FIELD_LABELS[guideSlug] ?? {}

  const phone   = (acct.office_phone ?? acct.contact_phone ?? acct.mobile_phone ?? null) as string | null
  const website = (acct.website_url ?? null) as string | null
  const address = (acct.address ?? null) as string | null
  const cityZip = (acct.city_state_zip ?? null) as string | null
  const email   = (acct.contact_email ?? acct.email ?? null) as string | null

  return (
    <div className="min-h-screen bg-background public-page">
      <Navigation />

      {/* Hero band */}
      <div className="relative bg-primary/5 border-b border-border overflow-hidden">
        {acct.hero_photo_url && (
          <div className="absolute inset-0">
            <Image src={acct.hero_photo_url} alt={acct.business_name} fill style={{ objectFit: 'cover' }} className="opacity-15" sizes="100vw" unoptimized />
          </div>
        )}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 lg:py-14 relative">
          <Link href={`/${urlSlug}`} className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 mb-5 font-medium">
            <ArrowLeft className="h-4 w-4" />
            {guide?.display_name ?? 'Back to Guide'}
          </Link>
          <div className="max-w-3xl">
            {isFeatured && <Badge variant="accent" className="mb-3">Featured Partner</Badge>}
            <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-3 leading-tight">
              {acct.business_name}
            </h1>
            {acct.card_hook && (
              <p className="text-lg text-muted-foreground">{acct.card_hook}</p>
            )}
            {listing?.category && (
              <Badge variant="outline" className="mt-3">{listing.category}</Badge>
            )}
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-10 lg:py-14">
        <div className="grid lg:grid-cols-12 gap-10">

          {/* ── Main column ───────────────────────────────────── */}
          <div className="lg:col-span-8 space-y-8">

            {/* Hero photo */}
            {acct.hero_photo_url && (
              <Card className="overflow-hidden">
                <div className="aspect-video relative">
                  <Image src={acct.hero_photo_url} alt={acct.business_name} fill style={{ objectFit: 'cover' }} sizes="800px" unoptimized />
                </div>
              </Card>
            )}

            {/* About */}
            {acct.detail_lead && (
              <Card>
                <CardContent className="p-6 md:p-8">
                  <h2 className="text-2xl font-bold mb-4 text-foreground">About {acct.business_name}</h2>
                  <p className="text-muted-foreground leading-relaxed">{acct.detail_lead}</p>
                </CardContent>
              </Card>
            )}

            {/* Guide-specific details */}
            {Object.keys(fieldLabels).length > 0 && (
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-bold mb-4 text-foreground">Details</h3>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {Object.entries(fieldLabels).map(([key, label]) => {
                      const val = guideData[key]
                      if (!val) return null
                      return (
                        <div key={key} className="bg-muted/50 rounded-xl p-3">
                          <dt className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">{label}</dt>
                          <dd className="text-sm text-foreground">{val}</dd>
                        </div>
                      )
                    })}
                    {guideData.description && (
                      <div className="sm:col-span-2 bg-muted/50 rounded-xl p-3">
                        <dt className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Description</dt>
                        <dd className="text-sm text-foreground leading-relaxed">{guideData.description}</dd>
                      </div>
                    )}
                  </dl>
                </CardContent>
              </Card>
            )}

            {/* Flexible sections */}
            {sections?.map(section => (
              <Card key={section.id}>
                <CardContent className="p-6 md:p-8">
                  {section.headline && <h3 className="text-xl font-bold mb-3 text-foreground">{section.headline}</h3>}
                  {section.subheadline && <p className="text-muted-foreground mb-4">{section.subheadline}</p>}
                  {section.body_content && (
                    <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{section.body_content}</p>
                  )}
                  {Array.isArray(section.bullet_points) && section.bullet_points.length > 0 && (
                    <ul className="mt-3 space-y-2">
                      {(section.bullet_points as string[]).map((pt, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <span className="text-primary mt-0.5">✓</span>{pt}
                        </li>
                      ))}
                    </ul>
                  )}
                  {section.offer_text && (
                    <div className="mt-4 p-4 bg-primary/5 border border-primary/20 rounded-xl">
                      <p className="text-xs font-bold uppercase tracking-wider text-primary mb-2">Special Offer</p>
                      <p className="text-foreground text-sm leading-relaxed">{section.offer_text}</p>
                      {section.offer_cta_label && website && (
                        <Button asChild size="sm" className="mt-3 rounded-full">
                          <a href={website} target="_blank" rel="noopener noreferrer">{section.offer_cta_label}</a>
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* ── Sidebar ───────────────────────────────────────── */}
          <aside className="lg:col-span-4 space-y-5 lg:sticky lg:top-20 lg:self-start">

            {/* Contact card */}
            <Card>
              <CardContent className="p-5">
                <h3 className="font-bold text-foreground mb-4">{acct.business_name}</h3>
                <div className="space-y-3 text-sm mb-5">
                  {(address ?? cityZip) && (
                    <div className="flex items-start gap-2.5 text-muted-foreground">
                      <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span>{address}{address && cityZip ? `, ${cityZip}` : cityZip}</span>
                    </div>
                  )}
                  {phone && (
                    <a href={`tel:${phone.replace(/[^0-9]/g, '')}`}
                      className="flex items-center gap-2.5 text-muted-foreground hover:text-primary transition-colors">
                      <Phone className="h-4 w-4 text-primary shrink-0" />
                      {phone}
                    </a>
                  )}
                  {website && (
                    <a href={website} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2.5 text-muted-foreground hover:text-primary transition-colors">
                      <Globe className="h-4 w-4 text-primary shrink-0" />
                      <span className="truncate">{website.replace(/^https?:\/\//, '')}</span>
                    </a>
                  )}
                  {email && (
                    <a href={`mailto:${email}`}
                      className="flex items-center gap-2.5 text-muted-foreground hover:text-primary transition-colors">
                      <Mail className="h-4 w-4 text-primary shrink-0" />
                      {email}
                    </a>
                  )}
                </div>
                <div className="space-y-2">
                  {website && (
                    <Button asChild className="w-full rounded-full">
                      <a href={website} target="_blank" rel="noopener noreferrer">Visit Website</a>
                    </Button>
                  )}
                  <Button variant="outline" asChild className="w-full rounded-full">
                    <Link href={`/${urlSlug}`}>
                      <ArrowLeft className="h-4 w-4" />
                      Back to {guide?.display_name ?? 'Guide'}
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* More in this guide */}
            {related && related.length > 0 && (
              <Card>
                <CardContent className="p-5">
                  <h3 className="font-bold text-foreground mb-3">More in {guide?.display_name ?? 'This Guide'}</h3>
                  <div className="space-y-2">
                    {related.map(r => {
                      const ra = r.advertiser_accounts as unknown as {
                        slug: string; business_name: string; neighborhood?: string | null; city_state_zip?: string | null
                      } | null
                      if (!ra) return null
                      return (
                        <Link key={r.id} href={`/${urlSlug}/listings/${ra.slug}`}
                          className="flex items-center justify-between p-2.5 rounded-xl hover:bg-muted transition-colors">
                          <div>
                            <p className="font-medium text-sm text-foreground">{ra.business_name}</p>
                            {(ra.neighborhood ?? ra.city_state_zip) && (
                              <p className="text-xs text-muted-foreground">{ra.neighborhood ?? ra.city_state_zip}</p>
                            )}
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                        </Link>
                      )
                    })}
                  </div>
                  <Button variant="outline" asChild className="w-full mt-3 rounded-full">
                    <Link href={`/${urlSlug}`}>View Full Guide</Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </aside>
        </div>
      </main>

      <PublicFooter />
    </div>
  )
}
