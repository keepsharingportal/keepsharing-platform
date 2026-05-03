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
import { MapPin, Phone, Globe, Mail, ChevronRight, ArrowLeft, CheckCircle2, Clock } from 'lucide-react'
import { StructuredFieldValue } from '@/components/listings/StructuredFieldValue'
import { getFallbackByContext } from '@/lib/image-fallbacks'
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
  urlSlug:     string
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

  const guideData   = (listing?.guide_data ?? {}) as Record<string, string>
  const isFeatured  = ['featured', 'tier-1-featured-listing', 'tier-2-spotlight', 'tier-3-business-spotlight'].includes(listing?.listing_tier ?? '')
  const fieldLabels = GUIDE_FIELD_LABELS[guideSlug] ?? {}

  const phone   = (acct.office_phone ?? acct.contact_phone ?? acct.mobile_phone ?? null) as string | null
  const website = (acct.website_url ?? null) as string | null
  const address = (acct.address ?? null) as string | null
  const cityZip = (acct.city_state_zip ?? null) as string | null
  const email   = (acct.contact_email ?? acct.email ?? null) as string | null

  const showMessageForm = acct.accepts_messages !== false && acct.id

  return (
    <div className="min-h-screen bg-background public-page">
      <Navigation />

      {/* Full-bleed hero image */}
      <div className="h-64 md:h-96 w-full relative">
        <Image
          src={acct.hero_photo_url || getFallbackByContext(guideSlug, acct.slug)}
          alt={acct.business_name}
          fill
          style={{ objectFit: 'cover' }}
          sizes="100vw"
          priority
          unoptimized
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        {/* Back link overlay */}
        <div className="absolute top-4 left-4 sm:left-8">
          <Link
            href={`/${urlSlug}`}
            className="inline-flex items-center gap-1.5 text-sm font-medium bg-background/80 backdrop-blur-sm text-foreground hover:text-primary px-3 py-1.5 rounded-full border border-border/50 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {guide?.display_name ?? 'Back to Guide'}
          </Link>
        </div>
      </div>

      <main className="container pb-16 -mt-24 relative z-10">
        <div className="grid lg:grid-cols-12 gap-10">

          {/* ── Main column ───────────────────────────────────── */}
          <div className="lg:col-span-8 space-y-6">

            {/* Overlap info card */}
            <Card className="overflow-hidden shadow-md">
              <CardContent className="p-6 md:p-8">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                  <div className="flex flex-wrap gap-2">
                    {isFeatured && <Badge variant="accent" className="text-xs">Featured Partner</Badge>}
                    {listing?.category && <Badge variant="outline" className="text-xs">{listing.category}</Badge>}
                  </div>
                  {(address ?? cityZip) && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5 text-primary" />
                      {address ?? cityZip}
                    </span>
                  )}
                </div>
                <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2 leading-tight">
                  {acct.business_name}
                </h1>
                {acct.card_hook && (
                  <p className="text-lg text-muted-foreground mb-4">{acct.card_hook}</p>
                )}
                {/* Key facts row from guide_data */}
                {Object.keys(fieldLabels).length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 pt-4 border-t border-border/50">
                    {Object.entries(fieldLabels).slice(0, 4).map(([key, label]) => {
                      const val = guideData[key]
                      if (!val) return null
                      return (
                        <div key={key} className="text-center">
                          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-0.5">{label}</p>
                          <p className="text-sm font-semibold text-foreground">{val}</p>
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
                          <dd><StructuredFieldValue value={val as string} /></dd>
                        </div>
                      )
                    })}
                    {guideData.description && (
                      <div className="sm:col-span-2 bg-muted/50 rounded-xl p-3">
                        <dt className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Description</dt>
                        <dd><StructuredFieldValue value={guideData.description as string} pillThreshold={6} /></dd>
                      </div>
                    )}
                  </dl>
                </CardContent>
              </Card>
            )}

            {/* Camp Features — dedicated 2-col checkbox grid from features_bullets section */}
            {(() => {
              const featuresSection = sections?.find(s => s.section_type === 'features_bullets' && s.is_active)
              if (!featuresSection || !featuresSection.bullet_points || featuresSection.bullet_points.length === 0) return null
              const headline = featuresSection.headline || `${guide?.display_name?.replace(' Guide', '') ?? 'Listing'} Features`
              return (
                <Card>
                  <CardContent className="p-6 md:p-8">
                    <h2 className="text-2xl font-bold mb-6 text-foreground">{headline}</h2>
                    <ul className="grid sm:grid-cols-2 gap-4">
                      {featuresSection.bullet_points.map((feature: string, i: number) => (
                        <li key={i} className="flex items-center gap-3 text-muted-foreground bg-muted/20 p-3 rounded-lg border border-border/50">
                          <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                          <span className="font-medium text-foreground">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )
            })()}

            {/* Gallery — hero photo + 3 deterministic fallbacks in 2x2 grid */}
            <Card>
              <CardContent className="p-6 md:p-8">
                <h2 className="text-2xl font-bold mb-6 text-foreground">Gallery</h2>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    acct.hero_photo_url || getFallbackByContext(guideSlug, `${acct.slug}-1`),
                    getFallbackByContext(guideSlug, `${acct.slug}-2`),
                    getFallbackByContext(guideSlug, `${acct.slug}-3`),
                    getFallbackByContext(guideSlug, `${acct.slug}-4`),
                  ].map((src, i) => (
                    <div key={i} className="relative aspect-video rounded-xl overflow-hidden border border-border/50 shadow-sm group">
                      <Image
                        src={src}
                        alt={`${acct.business_name} ${i + 1}`}
                        fill
                        style={{ objectFit: 'cover' }}
                        sizes="(max-width: 640px) 50vw, 33vw"
                        unoptimized
                        className="group-hover:scale-105 transition-transform duration-700"
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Flexible sections — skip features_bullets (rendered above as dedicated card) */}
            {sections?.filter(s => s.section_type !== 'features_bullets').map(section => (
              <SectionRenderer key={section.id} section={section} />
            ))}

            {/* Inline Contact form Card */}
            {showMessageForm && (
              <Card className="border-primary/20 shadow-sm overflow-hidden" id="message-form">
                <CardHeader className="bg-primary/5 border-b border-primary/10">
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Mail className="h-5 w-5 text-primary" />
                    Contact {acct.business_name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <ListingMessageForm
                    advertiserAccountId={acct.id}
                    advertiserName={acct.business_name}
                    guideTypeSlug={guideSlug}
                  />
                </CardContent>
              </Card>
            )}
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
                    <a
                      href={`tel:${phone.replace(/[^0-9]/g, '')}`}
                      className="flex items-center gap-2.5 text-muted-foreground hover:text-primary transition-colors"
                    >
                      <Phone className="h-4 w-4 text-primary shrink-0" />
                      {phone}
                    </a>
                  )}
                  {website && (
                    <a
                      href={website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2.5 text-muted-foreground hover:text-primary transition-colors"
                    >
                      <Globe className="h-4 w-4 text-primary shrink-0" />
                      <span className="truncate">{website.replace(/^https?:\/\//, '')}</span>
                    </a>
                  )}
                  {email && (
                    <a
                      href={`mailto:${email}`}
                      className="flex items-center gap-2.5 text-muted-foreground hover:text-primary transition-colors"
                    >
                      <Mail className="h-4 w-4 text-primary shrink-0" />
                      {email}
                    </a>
                  )}
                </div>
                <div className="space-y-2.5">
                  {website && (
                    <Button asChild className="w-full rounded-full">
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
                      <ArrowLeft className="h-4 w-4" />
                      Back to {guide?.display_name ?? 'Guide'}
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Hours of Operation */}
            {acct.hours_of_operation && (
              <Card>
                <CardHeader className="py-4 border-b bg-muted/30">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="h-5 w-5 text-primary" /> Hours of Operation
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 space-y-3 text-sm">
                  {Object.entries(acct.hours_of_operation as Record<string, string>).map(([day, hours], i, arr) => (
                    <div key={day} className={`flex justify-between items-center ${i < arr.length - 1 ? 'border-b border-border/50 pb-2' : ''}`}>
                      <span className="text-muted-foreground capitalize">{day.replace(/_/g, ' ')}</span>
                      <span className={hours.toLowerCase() === 'closed' ? 'font-normal text-muted-foreground' : 'font-bold text-foreground'}>
                        {hours}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Map widget */}
            <ListingMap
              address={address}
              cityStateZip={cityZip}
              businessName={acct.business_name}
            />

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
                        <Link
                          key={r.id}
                          href={`/${urlSlug}/listings/${ra.slug}`}
                          className="flex items-center justify-between p-2.5 rounded-xl hover:bg-muted transition-colors"
                        >
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
