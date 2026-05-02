'use client'

import { useState } from 'react'
import type { PartnerPageData } from './types'
import { ChevronDown } from 'lucide-react'
import { hexWithOpacity } from '@/lib/brand-colors'

export function OfferFAQ({ data }: { data: PartnerPageData }) {
  const { faqs, offer, brand } = data
  const [openIdx, setOpenIdx] = useState<number | null>(0)

  // Offer-specific objections first, then general FAQs
  const offerFaqs = (offer?.objection_responses ?? []).map((or, i) => ({
    id: `offer-${i}`,
    question: or.objection,
    answer: or.response,
    relates_to_offer: true,
    display_order: i,
  }))

  const allFaqs = [...offerFaqs, ...faqs.filter(f => !f.relates_to_offer)]
  if (!allFaqs.length) return null

  return (
    <section style={{ backgroundColor: 'var(--fg-cream, #faf8f5)', padding: '72px 20px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <h2 style={{
          fontFamily: 'var(--font-fraunces, serif)',
          fontSize: 'clamp(22px, 4vw, 32px)',
          fontWeight: 700,
          color: '#1a1a1a',
          marginBottom: 8,
        }}>
          Questions parents ask
        </h2>
        <p style={{ fontSize: 14, color: '#888', marginBottom: 32 }}>
          Honest answers. No runaround.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {allFaqs.map((faq, i) => {
            const isOpen = openIdx === i
            return (
              <div key={faq.id} style={{
                backgroundColor: 'white',
                borderRadius: 12,
                border: isOpen ? `1.5px solid ${hexWithOpacity(brand.accent, 0.4)}` : '1px solid rgba(0,0,0,0.07)',
                overflow: 'hidden',
                transition: 'border-color 0.2s',
              }}>
                <button
                  onClick={() => setOpenIdx(isOpen ? null : i)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '16px 18px', background: 'none', border: 'none', cursor: 'pointer',
                    textAlign: 'left', gap: 12,
                  }}>
                  <span style={{ fontSize: 15, fontWeight: 600, color: '#1a1a1a', lineHeight: 1.4 }}>
                    {faq.question}
                  </span>
                  <ChevronDown
                    size={16}
                    style={{ flexShrink: 0, color: brand.accent, transform: isOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}
                  />
                </button>
                {isOpen && (
                  <div style={{ padding: '0 18px 18px' }}>
                    <p style={{ fontSize: 14, color: '#555', lineHeight: 1.7 }}>{faq.answer}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
