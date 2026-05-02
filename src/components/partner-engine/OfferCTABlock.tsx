import type { PartnerPageData } from './types'

export function OfferCTABlock({ data }: { data: PartnerPageData }) {
  const { offer, account, brand } = data
  if (!offer) return null

  return (
    <section style={{ backgroundColor: brand.primary, padding: '48px 20px', textAlign: 'center' }}>
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        <h2 style={{
          fontFamily: 'var(--font-fraunces, serif)',
          fontSize: 'clamp(22px, 4vw, 32px)',
          fontWeight: 700,
          color: 'white',
          marginBottom: 12,
        }}>
          {offer.offer_headline}
        </h2>
        {offer.urgency_text && (
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 20 }}>{offer.urgency_text}</p>
        )}
        <a href="#offer-form" style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '14px 32px', borderRadius: 12, fontSize: 15, fontWeight: 800,
          backgroundColor: brand.accent,
          color: brand.accentText === 'white' ? 'white' : '#111',
          textDecoration: 'none',
        }}>
          {offer.cta_button_text ?? 'Get Started →'}
        </a>
      </div>
    </section>
  )
}
