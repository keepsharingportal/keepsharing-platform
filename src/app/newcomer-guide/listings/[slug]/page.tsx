import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, Phone, Globe, Mail, MapPin, Clock, Navigation } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'
import type { GuideListing, GuideCategory } from '@/components/family-guide/types'
import { FeaturedListing } from '@/components/family-guide/FeaturedListing'
import { EnhancedListing } from '@/components/family-guide/EnhancedListing'
import { ListingMessageForm } from '@/components/family-guide/ListingMessageForm'
import { InlineSubmissionWidget } from '@/components/community/InlineSubmissionWidget'

interface Props { params: Promise<{ slug: string }> }

function fmt(phone: string): string {
  return phone.replace(/[^\d]/g, '').replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3')
}

async function getListing(slug: string): Promise<(GuideListing & { category?: GuideCategory }) | null> {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('guide_listings')
      .select('*, guide_categories!inner(id, name, slug, guide_slug)')
      .eq('slug', slug)
      .maybeSingle()
    if (!data) return null
    const { guide_categories: cat, ...listing } = data as GuideListing & { guide_categories: GuideCategory }
    return { ...listing, category: cat as unknown as string & typeof cat }
  } catch {
    return null
  }
}

async function getRelated(categoryId: string, excludeSlug: string): Promise<GuideListing[]> {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('guide_listings')
      .select('*')
      .eq('category_id', categoryId)
      .neq('slug', excludeSlug)
      .in('listing_tier', ['featured', 'enhanced'])
      .order('listing_tier')
      .limit(4)
    return (data ?? []) as GuideListing[]
  } catch {
    return []
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const listing = await getListing(slug)
  if (!listing) return {}
  return {
    title: `${listing.business_name} — River Region Family Guide`,
    description: listing.editorial_blurb ?? listing.description ?? undefined,
  }
}

export default async function ListingDetailPage({ params }: Props) {
  const { slug } = await params
  const listing = await getListing(slug)
  if (!listing) notFound()

  const supabase = await createClient()

  // Fetch photos and advertiser account in parallel
  const [related, photosRes, accountRes] = await Promise.all([
    getRelated(listing.category_id ?? '', slug),
    supabase.from('advertiser_listing_photos').select('*').eq('listing_id', listing.id).order('display_order').limit(20),
    supabase.from('advertiser_accounts').select('id').eq('listing_id', listing.id).maybeSingle(),
  ])

  const photos = (photosRes.data ?? []) as { id: string; photo_url: string; alt_text?: string }[]
  const advertiserId = accountRes.data?.id ?? null

  const featuredRelated = related.filter(l => l.listing_tier === 'featured')
  const enhancedRelated = related.filter(l => l.listing_tier === 'enhanced')

  const mapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  const isFeatured = listing.listing_tier === 'featured'
  const initial = (listing.business_name || '?')[0].toUpperCase()

  const schemaOrg = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: listing.business_name,
    description: listing.description ?? listing.editorial_blurb ?? undefined,
    address: listing.address ? {
      '@type': 'PostalAddress',
      streetAddress: listing.address,
      addressLocality: listing.city ?? 'Montgomery',
      addressRegion: 'AL',
      postalCode: listing.zip ?? undefined,
      addressCountry: 'US',
    } : undefined,
    telephone: listing.phone ?? undefined,
    url: listing.website ?? undefined,
  }

  return (
    <div style={{ backgroundColor: 'var(--fg-cream, #faf8f5)', minHeight: '100vh', fontFamily: 'var(--font-dm-sans, sans-serif)' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaOrg) }} />

      {/* Breadcrumb */}
      <div style={{ backgroundColor: 'white', borderBottom: '1px solid rgba(0,0,0,0.06)', padding: '10px 20px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
          <Link href="/newcomer-guide" style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--fg-sky, #4a90d9)', textDecoration: 'none', fontWeight: 600 }}>
            <ArrowLeft size={13} /> Family Guide
          </Link>
          {listing.category && (
            <>
              <span style={{ color: '#ccc' }}>/</span>
              <span style={{ color: '#888' }}>{listing.category.name}</span>
            </>
          )}
        </div>
      </div>

      {/* Profile hero */}
      <div style={{
        position: 'relative',
        minHeight: isFeatured ? 200 : 120,
        display: 'flex',
        alignItems: 'flex-end',
        overflow: 'hidden',
      }}>
        {/* Background: cover image or gradient */}
        {listing.cover_image_url ? (
          <>
            <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${listing.cover_image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(26,39,68,0.3) 0%, rgba(26,39,68,0.9) 100%)' }} />
          </>
        ) : (
          <div style={{
            position: 'absolute', inset: 0,
            background: isFeatured
              ? 'linear-gradient(135deg, var(--fg-navy, #1a2744) 0%, #2a3f6f 100%)'
              : 'linear-gradient(135deg, #f0f4fa 0%, #e8f2fc 100%)',
          }} />
        )}

        <div style={{ position: 'relative', width: '100%', maxWidth: 900, margin: '0 auto', padding: '40px 20px 32px', display: 'flex', alignItems: 'flex-end', gap: 20 }}>
          {/* Large initial avatar */}
          <div style={{
            width: 72, height: 72, borderRadius: 16, flexShrink: 0,
            background: isFeatured
              ? 'rgba(255,255,255,0.15)'
              : 'linear-gradient(135deg, var(--fg-navy, #1a2744) 0%, var(--fg-sky, #4a90d9) 100%)',
            border: isFeatured ? '2px solid rgba(255,255,255,0.3)' : 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-fraunces, serif)',
            fontSize: 28, fontWeight: 700,
            color: isFeatured ? 'white' : 'white',
            backdropFilter: 'blur(4px)',
          }}>
            {initial}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            {isFeatured && (
              <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.13em', textTransform: 'uppercase', color: 'var(--fg-gold, #d4a843)', display: 'block', marginBottom: 5 }}>
                ✦ Featured Partner
              </span>
            )}
            <h1 style={{
              fontFamily: 'var(--font-fraunces, serif)',
              fontSize: 'clamp(22px, 5vw, 34px)',
              fontWeight: 700,
              color: isFeatured || listing.cover_image_url ? 'white' : 'var(--fg-navy, #1a2744)',
              lineHeight: 1.15,
              marginBottom: 6,
            }}>
              {listing.business_name}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              {listing.city && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: isFeatured || listing.cover_image_url ? 'rgba(255,255,255,0.7)' : '#888' }}>
                  <MapPin size={12} />
                  {listing.address ? `${listing.address}, ` : ''}{listing.city}{listing.zip ? ` ${listing.zip}` : ''}
                </span>
              )}
              {listing.accepting_new_patients && (
                <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, backgroundColor: 'var(--fg-sky-light, #e8f2fc)', color: 'var(--fg-sky, #4a90d9)', border: '1px solid rgba(74,144,217,0.25)' }}>
                  ✓ Accepting new patients
                </span>
              )}
              {listing.offers_military_discount === 'YES' && (
                <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, backgroundColor: 'var(--fg-sage-light, #edf5f0)', color: 'var(--fg-sage, #5a8a6a)', border: '1px solid rgba(90,138,106,0.25)' }}>
                  🎖️ Military discount
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 20px 80px' }}>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-7">

          {/* Main content */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Photo gallery */}
            {photos.length > 0 && (
              <div style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.06)' }}>
                <div style={{ position: 'relative', aspectRatio: '16/9', backgroundColor: 'var(--fg-cream)' }}>
                  <Image src={photos[0].photo_url} alt={photos[0].alt_text ?? listing.business_name} fill style={{ objectFit: 'cover' }} sizes="(max-width: 900px) 100vw, 620px" />
                </div>
                {photos.length > 1 && (
                  <div style={{ display: 'flex', gap: 4, padding: '4px', backgroundColor: 'white', overflowX: 'auto' }}>
                    {photos.slice(1, 10).map(p => (
                      <div key={p.id} style={{ position: 'relative', width: 72, height: 54, borderRadius: 6, overflow: 'hidden', flexShrink: 0 }}>
                        <Image src={p.photo_url} alt={p.alt_text ?? listing.business_name} fill style={{ objectFit: 'cover' }} sizes="72px" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {listing.description && (
              <div style={{ backgroundColor: 'white', borderRadius: 16, border: '1px solid rgba(0,0,0,0.06)', padding: 24 }}>
                <p style={{ fontSize: 15, color: '#333', lineHeight: 1.7 }}>{listing.description}</p>
              </div>
            )}

            {listing.editorial_blurb && (
              <div style={{ borderRadius: 16, padding: 24, backgroundColor: 'var(--fg-terra-light, #fdf0eb)', border: '1px solid rgba(196,98,45,0.15)' }}>
                <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--fg-terra, #c4622d)', marginBottom: 10 }}>What families say</p>
                <blockquote style={{ fontStyle: 'italic', fontSize: 15, lineHeight: 1.65, color: '#444', borderLeft: '3px solid var(--fg-navy, #1a2744)', paddingLeft: 14 }}>
                  {listing.editorial_blurb}
                </blockquote>
              </div>
            )}

            {listing.hours_summary && (
              <div style={{ backgroundColor: 'white', borderRadius: 16, border: '1px solid rgba(0,0,0,0.06)', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Clock size={14} color="#aaa" />
                <span style={{ fontSize: 13, color: '#555' }}><strong>Hours:</strong> {listing.hours_summary}</span>
              </div>
            )}

            {/* Map */}
            {isFeatured && listing.city && (() => {
              const query = encodeURIComponent(`${listing.business_name} ${listing.address ?? ''} ${listing.city} AL`)
              const embedSrc = mapsApiKey
                ? `https://www.google.com/maps/embed/v1/search?key=${mapsApiKey}&q=${query}`
                : null
              const directionsUrl = `https://www.google.com/maps/search/?api=1&query=${query}`
              return (
                <div style={{ backgroundColor: 'white', borderRadius: 16, border: '1px solid rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                  {embedSrc ? (
                    <iframe src={embedSrc} style={{ width: '100%', height: 220, border: 0, display: 'block' }} loading="lazy" allowFullScreen referrerPolicy="no-referrer-when-downgrade" />
                  ) : (
                    <div style={{ height: 140, background: 'linear-gradient(135deg, #e8f2fc 0%, #f0f4fa 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 6, color: '#aaa' }}>
                      <MapPin size={24} />
                      <span style={{ fontSize: 13 }}>{listing.city}, AL</span>
                    </div>
                  )}
                  <div style={{ padding: '10px 18px', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                    <a href={directionsUrl} target="_blank" rel="noopener noreferrer"
                      style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--fg-sky, #4a90d9)', textDecoration: 'none' }}>
                      <Navigation size={13} /> Get Directions
                    </a>
                  </div>
                </div>
              )
            })()}
          </div>

          {/* Sticky contact sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ backgroundColor: 'white', borderRadius: 16, border: '1px solid rgba(0,0,0,0.06)', padding: 20, position: 'sticky', top: 76, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg-navy, #1a2744)', marginBottom: 2 }}>Contact</h3>
              {listing.phone && (
                <a href={`tel:${listing.phone}`} style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10,
                  fontSize: 13, fontWeight: 600, color: 'white',
                  backgroundColor: 'var(--fg-terra, #c4622d)', textDecoration: 'none',
                }}>
                  <Phone size={14} /> {fmt(listing.phone)}
                </a>
              )}
              {listing.website && (
                <a href={listing.website.startsWith('http') ? listing.website : `https://${listing.website}`}
                  target="_blank" rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600, border: '1.5px solid rgba(0,0,0,0.1)', color: 'var(--fg-navy, #1a2744)', textDecoration: 'none', backgroundColor: 'transparent' }}>
                  <Globe size={14} /> Visit website
                </a>
              )}
              {listing.email && (
                <a href={`mailto:${listing.email}`}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600, border: '1.5px solid rgba(0,0,0,0.1)', color: 'var(--fg-navy, #1a2744)', textDecoration: 'none', backgroundColor: 'transparent' }}>
                  <Mail size={14} /> Send email
                </a>
              )}
              {!listing.phone && !listing.website && !listing.email && (
                <p style={{ fontSize: 13, color: '#aaa', fontStyle: 'italic' }}>Contact info not listed.</p>
              )}
            </div>

            {listing.address && (
              <div style={{ backgroundColor: 'white', borderRadius: 16, border: '1px solid rgba(0,0,0,0.06)', padding: 20 }}>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg-navy, #1a2744)', marginBottom: 8 }}>Address</h3>
                <p style={{ fontSize: 13, color: '#555', lineHeight: 1.6 }}>
                  {listing.address}<br />
                  {listing.city}{listing.zip ? `, AL ${listing.zip}` : ', AL'}
                </p>
              </div>
            )}

            {/* Send a Message form */}
            <ListingMessageForm
              listingSlug={slug}
              listingName={listing.business_name}
              advertiserId={advertiserId}
            />

            {!isFeatured && (
              <div style={{ borderRadius: 14, padding: 18, textAlign: 'center', backgroundColor: 'var(--fg-terra-light, #fdf0eb)', border: '1px solid rgba(196,98,45,0.15)' }}>
                <p style={{ fontSize: 12, color: '#666', lineHeight: 1.55, marginBottom: 12 }}>
                  Is this your business? Upgrade to a Featured Listing for priority placement and a full profile.
                </p>
                <Link href="/advertise" style={{ display: 'block', fontSize: 12, fontWeight: 700, padding: '9px 14px', borderRadius: 8, backgroundColor: 'var(--fg-terra, #c4622d)', color: 'white', textDecoration: 'none' }}>
                  Learn about partnership →
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Mom Insiders inline widget */}
        <InlineSubmissionWidget
          contextQuestion={`Have you been to ${listing.business_name}? What should new families know?`}
          contextPlaceholder={`e.g. "The staff is incredibly patient, and they're great with anxious kids. Book at least 2 weeks ahead."`}
          source="inline-widget"
          sourceListing={listing.id}
        />

        {/* Related */}
        {(featuredRelated.length > 0 || enhancedRelated.length > 0) && (
          <div style={{ marginTop: 48 }}>
            <h2 style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 22, fontWeight: 700, color: 'var(--fg-navy, #1a2744)', marginBottom: 20 }}>
              More in {listing.category?.name ?? 'this category'}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {featuredRelated.map(l => <FeaturedListing key={l.id} listing={l} />)}
              {enhancedRelated.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
                  {enhancedRelated.map(l => <EnhancedListing key={l.id} listing={l} />)}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
