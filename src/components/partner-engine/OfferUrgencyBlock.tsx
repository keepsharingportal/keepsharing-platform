import type { PartnerPageData } from './types'
import { hexWithOpacity } from '@/lib/brand-colors'

export function OfferUrgencyBlock({ data, variant = 'mid' }: { data: PartnerPageData; variant?: 'mid' | 'final' }) {
  const { offer, account, brand } = data

  if (!offer?.urgency_text && !offer?.urgency_count_remaining) return null

  const isFinal = variant === 'final'

  return (
    <section style={{
      backgroundColor: isFinal ? brand.primary : hexWithOpacity(brand.accent, 0.08),
      borderTop: isFinal ? undefined : `1px solid ${hexWithOpacity(brand.accent, 0.15)}`,
      borderBottom: isFinal ? undefined : `1px solid ${hexWithOpacity(brand.accent, 0.15)}`,
      padding: '28px 20px',
      textAlign: 'center',
    }}>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        {offer.urgency_count_remaining != null && (
          <div style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 900, color: isFinal ? 'white' : brand.accent, lineHeight: 1, marginBottom: 8 }}>
            {offer.urgency_count_remaining}
          </div>
        )}
        <p style={{
          fontSize: 15, fontWeight: 700,
          color: isFinal ? 'rgba(255,255,255,0.9)' : '#333',
          marginBottom: 16,
        }}>
          {offer.urgency_text ?? 'Limited availability this month'}
        </p>
        <a href="#offer-form" style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '11px 24px', borderRadius: 10, fontSize: 14, fontWeight: 700,
          backgroundColor: isFinal ? brand.accent : brand.primary,
          color: 'white', textDecoration: 'none',
        }}>
          {offer.cta_button_text ?? 'Reserve My Spot →'}
        </a>
      </div>
    </section>
  )
}
