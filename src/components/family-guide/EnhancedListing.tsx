import Link from 'next/link'
import { Phone, Globe, MapPin, Clock } from 'lucide-react'
import type { GuideListing } from './types'
import { TrackedContactLink } from '@/components/listings/TrackedContactLink'

function fmt(phone: string): string {
  return phone.replace(/[^\d]/g, '').replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3')
}

export function EnhancedListing({
  listing,
  guideUrlSlug = 'family-resource-guide',
}: {
  listing: GuideListing
  guideUrlSlug?: string
}) {
  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: 12,
      overflow: 'hidden',
      border: '1px solid rgba(74,144,217,0.2)',
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    }}>
      <div style={{ height: 2, background: 'var(--fg-sky, #4a90d9)' }} />
      <div style={{ padding: '14px 16px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--fg-sky, #4a90d9)', display: 'block', marginBottom: 3 }}>
              Enhanced
            </span>
            <h3 style={{
              fontFamily: 'var(--font-fraunces, serif)',
              fontSize: 15,
              fontWeight: 700,
              color: 'var(--fg-navy, #1a2744)',
              lineHeight: 1.25,
              marginBottom: 3,
            }}>
              {listing.business_name}
            </h3>
            {listing.city && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: '#888' }}>
                <MapPin size={10} />
                {listing.city}{listing.zip ? `, ${listing.zip}` : ''}
              </div>
            )}
          </div>
          {listing.accepting_new_patients && (
            <span style={{
              flexShrink: 0, padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 600,
              backgroundColor: 'var(--fg-sky-light, #e8f2fc)',
              color: 'var(--fg-sky, #4a90d9)',
              border: '1px solid rgba(74,144,217,0.2)',
              whiteSpace: 'nowrap',
            }}>
              ✓ New patients
            </span>
          )}
        </div>

        {listing.description && (
          <p style={{ fontSize: 12, color: '#555', lineHeight: 1.55, marginBottom: 8 }}>{listing.description}</p>
        )}

        {listing.editorial_blurb && (
          <p style={{
            fontSize: 12, fontStyle: 'italic', color: 'var(--fg-sky, #4a90d9)',
            lineHeight: 1.5, marginBottom: 8,
            borderLeft: '2px solid rgba(74,144,217,0.3)', paddingLeft: 8,
          }}>
            {listing.editorial_blurb}
          </p>
        )}

        {listing.hours_summary && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#aaa', marginBottom: 10 }}>
            <Clock size={10} /> {listing.hours_summary}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', paddingTop: 10, borderTop: '1px solid rgba(0,0,0,0.05)' }}>
          {listing.phone && (
            <TrackedContactLink
              advertiserId={listing.advertiser_id}
              eventType="tel"
              sourceListingId={listing.id}
              href={`tel:${listing.phone}`}
              style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, color: 'var(--fg-sky, #4a90d9)', textDecoration: 'none' }}>
              <Phone size={11} /> {fmt(listing.phone)}
            </TrackedContactLink>
          )}
          {listing.website && (
            <TrackedContactLink
              advertiserId={listing.advertiser_id}
              eventType="website"
              sourceListingId={listing.id}
              href={listing.website.startsWith('http') ? listing.website : `https://${listing.website}`}
              target="_blank" rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: '#888', textDecoration: 'none' }}>
              <Globe size={10} /> Website
            </TrackedContactLink>
          )}
          <Link href={`/${guideUrlSlug}/listings/${listing.slug}`} style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 600, color: 'var(--fg-sky, #4a90d9)', textDecoration: 'none' }}>
            Profile →
          </Link>
        </div>
      </div>
    </div>
  )
}
