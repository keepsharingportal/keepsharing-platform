import Link from 'next/link'
import { Phone, Globe, MapPin, Clock } from 'lucide-react'
import type { GuideListing } from './types'
import { TrackedContactLink } from '@/components/listings/TrackedContactLink'

function fmt(phone: string): string {
  return phone.replace(/[^\d]/g, '').replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3')
}

function InitialPlaceholder({ name }: { name: string }) {
  const initial = (name || '?')[0].toUpperCase()
  return (
    <div style={{
      width: 56, height: 56, borderRadius: 12, flexShrink: 0,
      background: 'linear-gradient(135deg, var(--fg-navy, #1a2744) 0%, var(--fg-sky, #4a90d9) 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--font-fraunces, serif)',
      fontSize: 22, fontWeight: 700, color: 'white',
      letterSpacing: '-0.02em',
    }}>
      {initial}
    </div>
  )
}

export function FeaturedListing({
  listing,
  guideUrlSlug = 'family-resource-guide',
}: {
  listing: GuideListing
  guideUrlSlug?: string
}) {
  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: 16,
      overflow: 'hidden',
      border: '1.5px solid rgba(212,168,67,0.5)',
      boxShadow: '0 0 0 3px rgba(212,168,67,0.08), 0 4px 24px rgba(26,39,68,0.10)',
    }}>
      {/* Gold ribbon top bar */}
      <div style={{
        height: 3,
        background: 'linear-gradient(90deg, var(--fg-gold, #d4a843) 0%, #f0c040 50%, var(--fg-gold, #d4a843) 100%)',
      }} />

      <div style={{ padding: '18px 20px 20px' }}>
        {/* Header: initial + name + badge */}
        <div style={{ display: 'flex', gap: 14, marginBottom: 14 }}>
          <InitialPlaceholder name={listing.business_name} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.13em', textTransform: 'uppercase', color: 'var(--fg-gold, #d4a843)' }}>
                ✦ Featured Partner
              </span>
            </div>
            <h3 style={{
              fontFamily: 'var(--font-fraunces, serif)',
              fontSize: 18,
              fontWeight: 700,
              color: 'var(--fg-navy, #1a2744)',
              lineHeight: 1.2,
              marginBottom: 4,
            }}>
              {listing.business_name}
            </h3>
            {listing.city && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#888' }}>
                <MapPin size={11} />
                {listing.address ? `${listing.address}, ` : ''}{listing.city}{listing.zip ? ` ${listing.zip}` : ''}
              </div>
            )}
          </div>
        </div>

        {/* Pills */}
        {(listing.accepting_new_patients || listing.offers_military_discount === 'YES') && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
            {listing.accepting_new_patients && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                backgroundColor: 'var(--fg-sky-light, #e8f2fc)',
                color: 'var(--fg-sky, #4a90d9)',
                border: '1px solid rgba(74,144,217,0.25)',
              }}>
                ✓ Accepting new patients
              </span>
            )}
            {listing.offers_military_discount === 'YES' && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                backgroundColor: 'var(--fg-sage-light, #edf5f0)',
                color: 'var(--fg-sage, #5a8a6a)',
                border: '1px solid rgba(90,138,106,0.25)',
              }}>
                🎖️ Military discount
              </span>
            )}
          </div>
        )}

        {/* Description */}
        {listing.description && (
          <p style={{ fontSize: 13, color: '#444', lineHeight: 1.6, marginBottom: 10 }}>
            {listing.description}
          </p>
        )}

        {/* Editorial blurb */}
        {listing.editorial_blurb && (
          <blockquote style={{
            fontStyle: 'italic',
            fontSize: 13,
            lineHeight: 1.6,
            color: '#444',
            borderLeft: '3px solid var(--fg-navy, #1a2744)',
            paddingLeft: 12,
            marginBottom: 12,
          }}>
            {listing.editorial_blurb}
          </blockquote>
        )}

        {/* Hours */}
        {listing.hours_summary && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#888', marginBottom: 14 }}>
            <Clock size={12} />
            {listing.hours_summary}
          </div>
        )}

        {/* Action row */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
          paddingTop: 14, borderTop: '1px solid rgba(0,0,0,0.06)',
        }}>
          {listing.phone && (
            <TrackedContactLink
              advertiserId={listing.advertiser_id}
              eventType="tel"
              sourceListingId={listing.id}
              href={`tel:${listing.phone}`}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                backgroundColor: 'var(--fg-terra, #c4622d)', color: 'white',
                textDecoration: 'none',
              }}>
              <Phone size={13} /> {fmt(listing.phone)}
            </TrackedContactLink>
          )}
          {listing.website && (
            <TrackedContactLink
              advertiserId={listing.advertiser_id}
              eventType="website"
              sourceListingId={listing.id}
              href={listing.website.startsWith('http') ? listing.website : `https://${listing.website}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                border: '1.5px solid rgba(212,168,67,0.5)',
                color: 'var(--fg-navy, #1a2744)',
                textDecoration: 'none', backgroundColor: 'transparent',
              }}>
              <Globe size={13} /> Visit website
            </TrackedContactLink>
          )}
          <Link href={`/${guideUrlSlug}/listings/${listing.slug}`} style={{
            marginLeft: 'auto', fontSize: 12, fontWeight: 600,
            color: 'var(--fg-sky, #4a90d9)', textDecoration: 'none',
          }}>
            Full profile →
          </Link>
        </div>
      </div>
    </div>
  )
}
