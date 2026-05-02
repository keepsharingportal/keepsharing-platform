import type { PartnerPageData } from './types'
import { hexWithOpacity } from '@/lib/brand-colors'

function StarRating({ rating }: { rating: number }) {
  return (
    <span style={{ color: '#f4a261', letterSpacing: 2 }}>
      {'★'.repeat(Math.min(rating, 5))}{'☆'.repeat(Math.max(0, 5 - rating))}
    </span>
  )
}

export function OfferProof({ data }: { data: PartnerPageData }) {
  const { testimonials, trustSignals, offer, account, brand } = data

  if (!testimonials.length && !trustSignals.length) return null

  const avgRating = testimonials.length
    ? Math.round((testimonials.reduce((s, t) => s + (t.rating ?? 5), 0) / testimonials.length) * 10) / 10
    : null

  return (
    <section style={{ backgroundColor: 'white', padding: '72px 20px' }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>

        {/* Big proof numbers */}
        {(offer?.proof_points?.length ?? 0) > 0 && (
          <div style={{ display: 'flex', gap: 32, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 56, textAlign: 'center' }}>
            {avgRating && (
              <div>
                <div style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 48, fontWeight: 900, color: brand.primary, lineHeight: 1 }}>{avgRating}</div>
                <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}><StarRating rating={Math.round(avgRating)} /> avg rating</div>
              </div>
            )}
            <div>
              <div style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 48, fontWeight: 900, color: brand.primary, lineHeight: 1 }}>{testimonials.length}+</div>
              <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>verified reviews</div>
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 48, fontWeight: 900, color: brand.primary, lineHeight: 1 }}>30+</div>
              <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>years in the River Region</div>
            </div>
          </div>
        )}

        {/* Trust signals strip */}
        {trustSignals.length > 0 && (
          <div style={{
            display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center',
            marginBottom: 48, padding: '16px 20px',
            borderRadius: 12, backgroundColor: hexWithOpacity(brand.primary, 0.04),
            border: `1px solid ${hexWithOpacity(brand.primary, 0.08)}`,
          }}>
            {trustSignals.map(ts => (
              <div key={ts.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 20, backgroundColor: 'white', border: '1px solid rgba(0,0,0,0.08)', fontSize: 12, fontWeight: 600, color: brand.primary }}>
                <span style={{ color: brand.accent }}>✓</span> {ts.label}
              </div>
            ))}
          </div>
        )}

        {/* Testimonials */}
        {testimonials.length > 0 && (
          <>
            <h2 style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 'clamp(22px, 4vw, 30px)', fontWeight: 700, color: '#1a1a1a', textAlign: 'center', marginBottom: 32 }}>
              What River Region families say
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
              {testimonials.slice(0, 4).map(t => (
                <div key={t.id} style={{
                  backgroundColor: 'var(--fg-cream, #faf8f5)',
                  borderRadius: 16,
                  padding: 24,
                  border: '1px solid rgba(0,0,0,0.06)',
                  display: 'flex', flexDirection: 'column', gap: 14,
                }}>
                  {t.rating && <div><StarRating rating={t.rating} /></div>}
                  <p style={{ fontSize: 14, color: '#444', lineHeight: 1.65, fontStyle: 'italic', flex: 1 }}>
                    &ldquo;{t.quote}&rdquo;
                  </p>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: brand.primary }}>{t.author_name}</p>
                    {t.author_context && <p style={{ fontSize: 11, color: '#888' }}>{t.author_context}</p>}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  )
}
