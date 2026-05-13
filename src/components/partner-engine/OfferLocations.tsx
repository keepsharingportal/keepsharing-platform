import type { PartnerPageData } from './types'
import { ArrowRight } from 'lucide-react'

const DAY_ORDER = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function OfferLocations({ data }: { data: PartnerPageData }) {
  const { locations, account, brand } = data

  if (!locations.length) return null

  return (
    <section style={{ backgroundColor: 'white', padding: '72px 20px' }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: brand.accent, marginBottom: 10 }}>
          Locations
        </p>
        <h2 style={{
          fontFamily: 'var(--font-fraunces, serif)',
          fontSize: 'clamp(22px, 4vw, 32px)',
          fontWeight: 700,
          color: '#1a1a1a',
          marginBottom: 8,
        }}>
          Find us near you
        </h2>
        <p style={{ fontSize: 14, color: '#888', marginBottom: 36 }}>
          {account.business_name} serves families across the River Region.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 }}>
          {locations.sort((a, b) => a.display_order - b.display_order).map(loc => {
            const hoursEntries = loc.hours_json
              ? DAY_ORDER.filter(d => loc.hours_json![d]).map(d => `${d}: ${loc.hours_json![d]}`)
              : []

            const mapsQuery = encodeURIComponent(`${loc.address_line_1 ?? ''} ${loc.city ?? ''} ${loc.state ?? 'AL'}`)

            return (
              <div key={loc.id} style={{
                backgroundColor: 'var(--fg-cream, #faf8f5)',
                borderRadius: 16,
                padding: '22px 20px',
                border: loc.is_primary ? `2px solid ${brand.accent}` : '1px solid rgba(0,0,0,0.07)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <h3 style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 17, fontWeight: 700, color: brand.primary }}>
                    {loc.location_name}
                  </h3>
                  {loc.is_primary && (
                    <span style={{ fontSize: 9, fontWeight: 700, padding: '3px 8px', borderRadius: 4, backgroundColor: brand.accent, color: 'white', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                      Main
                    </span>
                  )}
                </div>
                {loc.address_line_1 && (
                  <p style={{ fontSize: 13, color: '#555', lineHeight: 1.5, marginBottom: 8 }}>
                    {loc.address_line_1}{(loc as unknown as Record<string, unknown>).address_line_2 ? `, ${(loc as unknown as Record<string, unknown>).address_line_2 as string}` : ''}<br />
                    {loc.city}{loc.zip ? `, AL ${loc.zip}` : ', AL'}
                  </p>
                )}
                {hoursEntries.length > 0 && (
                  <p style={{ fontSize: 12, color: '#888', marginBottom: 12, lineHeight: 1.6 }}>
                    {hoursEntries.join(' · ')}
                  </p>
                )}
                {loc.accepting_new && (
                  <span style={{ display: 'inline-block', fontSize: 11, fontWeight: 600, padding: '2px 10px', borderRadius: 20, backgroundColor: '#edf5f0', color: '#5a8a6a', marginBottom: 12 }}>
                    ✓ Accepting new patients
                  </span>
                )}
                <a href={`https://www.google.com/maps/search/?api=1&query=${mapsQuery}`} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, color: brand.accent, textDecoration: 'none' }}>
                  Get Directions <ArrowRight size={11} />
                </a>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
