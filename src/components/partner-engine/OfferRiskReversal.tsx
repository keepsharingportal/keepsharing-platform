import type { PartnerPageData } from './types'
import { hexWithOpacity } from '@/lib/brand-colors'

const RISK_COPY: Record<string, string> = {
  'schedule_consult': 'Not the right fit after the first visit? No charge ever. Cancel any time before your appointment — no questions, no pressure.',
  'discount_code': 'Not what you expected? Don\'t use the code. Zero obligation.',
  'booking_link': 'Need to reschedule? Just call. We\'ll find a time that works.',
  'info_request': 'Not ready to commit? That\'s fine. This is just a conversation.',
  'limited_promo': 'Changed your mind? Just let us know before your appointment.',
}

export function OfferRiskReversal({ data }: { data: PartnerPageData }) {
  const { offer, brand } = data
  if (!offer) return null

  const copy = RISK_COPY[offer.offer_type] ?? RISK_COPY['schedule_consult']

  return (
    <section style={{ backgroundColor: 'white', padding: '32px 20px' }}>
      <div style={{ maxWidth: 600, margin: '0 auto', textAlign: 'center' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 10,
          padding: '14px 24px', borderRadius: 12,
          backgroundColor: hexWithOpacity(brand.primary, 0.04),
          border: `1px solid ${hexWithOpacity(brand.primary, 0.1)}`,
        }}>
          <span style={{ fontSize: 20 }}>🛡️</span>
          <p style={{ fontSize: 14, color: '#555', lineHeight: 1.5, textAlign: 'left' }}>
            <strong style={{ color: brand.primary }}>Zero risk. </strong>
            {copy}
          </p>
        </div>
      </div>
    </section>
  )
}
