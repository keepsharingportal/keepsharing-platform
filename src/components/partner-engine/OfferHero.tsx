import Image from 'next/image'
import type { PartnerPageData } from './types'
import { hexWithOpacity } from '@/lib/brand-colors'

export function OfferHero({ data }: { data: PartnerPageData }) {
  const { account, offer, photos, brand } = data

  const heroPhoto = photos.find(p => p.category === 'hero') ?? photos[0]
  const hasImage = !!heroPhoto?.photo_url

  if (!offer) {
    // No active offer — graceful fallback
    return (
      <div style={{
        background: `linear-gradient(135deg, ${brand.primary} 0%, ${brand.accent} 100%)`,
        padding: '80px 20px',
        textAlign: 'center',
      }}>
        <h1 style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 'clamp(28px, 5vw, 48px)', fontWeight: 900, color: 'white', marginBottom: 16 }}>
          {account.business_name}
        </h1>
        {account.contact_phone && (
          <a href={`tel:${account.contact_phone}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 28px', borderRadius: 12, fontSize: 15, fontWeight: 700, backgroundColor: 'white', color: brand.primary, textDecoration: 'none' }}>
            Call us: {account.contact_phone}
          </a>
        )}
      </div>
    )
  }

  return (
    <section id="offer-hero" style={{ position: 'relative', overflow: 'hidden', minHeight: 520 }}>
      {/* Background */}
      {hasImage ? (
        <>
          <div style={{ position: 'absolute', inset: 0 }}>
            <Image src={heroPhoto.photo_url} alt={heroPhoto.alt_text ?? account.business_name} fill style={{ objectFit: 'cover', objectPosition: 'center 30%' }} sizes="100vw" priority />
          </div>
          <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to bottom, ${hexWithOpacity(brand.primary, 0.6)} 0%, ${hexWithOpacity(brand.primary, 0.92)} 100%)` }} />
        </>
      ) : (
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(160deg, ${brand.primary} 0%, ${hexWithOpacity(brand.accent, 0.6)} 100%)` }} />
      )}

      <div style={{ position: 'relative', maxWidth: 960, margin: '0 auto', padding: '72px 20px 64px' }}>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_400px] gap-10 items-center">

          {/* Left: Offer copy */}
          <div>
            {/* Eyebrow */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
              <span style={{ padding: '4px 12px', borderRadius: 4, fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', backgroundColor: brand.accent, color: 'white' }}>
                {account.subcategory?.replace(/-/g, ' ') ?? account.category ?? 'Partner'}
              </span>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', fontStyle: 'italic' }}>
                New Patient Special
              </span>
            </div>

            {/* Main headline */}
            <h1 style={{
              fontFamily: 'var(--font-fraunces, serif)',
              fontSize: 'clamp(36px, 6vw, 64px)',
              fontWeight: 900,
              fontStyle: 'italic',
              color: 'white',
              lineHeight: 1.05,
              letterSpacing: '-0.02em',
              marginBottom: 12,
            }}>
              {offer.offer_headline}
            </h1>

            {offer.offer_subheadline && (
              <p style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 'clamp(18px, 3vw, 26px)', fontWeight: 500, color: 'rgba(255,255,255,0.85)', marginBottom: 20, lineHeight: 1.3 }}>
                {offer.offer_subheadline}
              </p>
            )}

            {offer.offer_value_statement && (
              <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.75)', lineHeight: 1.7, maxWidth: 520, marginBottom: 28 }}>
                {offer.offer_value_statement}
              </p>
            )}

            {/* Urgency */}
            {offer.urgency_text && (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '8px 16px', borderRadius: 8, marginBottom: 28,
                backgroundColor: hexWithOpacity('#fff', 0.15),
                border: '1px solid rgba(255,255,255,0.3)',
              }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'white' }}>⏰ {offer.urgency_text}</span>
              </div>
            )}

            {/* CTA */}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <a href="#offer-form" style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '16px 32px', borderRadius: 12, fontSize: 16, fontWeight: 800,
                backgroundColor: brand.accent, color: brand.accentText === 'white' ? 'white' : '#111',
                textDecoration: 'none', letterSpacing: '-0.01em',
              }}>
                {offer.cta_button_text ?? 'Get Started →'}
              </a>
              {account.contact_phone && (
                <a href={`tel:${account.contact_phone}`} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '16px 24px', borderRadius: 12, fontSize: 15, fontWeight: 600,
                  border: '1.5px solid rgba(255,255,255,0.4)', color: 'white',
                  textDecoration: 'none',
                }}>
                  📞 {account.contact_phone}
                </a>
              )}
            </div>
          </div>

          {/* Right: Proof strip (desktop only) */}
          <div className="hidden md:block" style={{
            backgroundColor: 'rgba(255,255,255,0.1)',
            backdropFilter: 'blur(12px)',
            borderRadius: 20,
            padding: '28px 24px',
            border: '1px solid rgba(255,255,255,0.2)',
          }}>
            <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)', marginBottom: 16 }}>
              Why families choose {account.business_name.split(' ')[0]}
            </p>
            {(offer.proof_points ?? []).slice(0, 5).map((pp, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 12, alignItems: 'flex-start' }}>
                <span style={{ color: brand.accent, fontSize: 14, marginTop: 1, flexShrink: 0 }}>✓</span>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', lineHeight: 1.5 }}>{pp.claim}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
