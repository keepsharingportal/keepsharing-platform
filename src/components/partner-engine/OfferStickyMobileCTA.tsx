'use client'

import { useEffect, useState } from 'react'
import type { PartnerPageData } from './types'
import { Phone } from 'lucide-react'

export function OfferStickyMobileCTA({ data }: { data: PartnerPageData }) {
  const { offer, account, brand } = data
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY
      const formEl = document.getElementById('offer-form')
      const formInView = formEl
        ? formEl.getBoundingClientRect().top < window.innerHeight && formEl.getBoundingClientRect().bottom > 0
        : false
      // Show after scrolling past hero (400px), hide when form is visible
      setVisible(scrollY > 400 && !formInView)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  if (!offer) return null

  return (
    <div
      className="md:hidden"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0, right: 0,
        zIndex: 200,
        backgroundColor: 'rgba(255,255,255,0.97)',
        backdropFilter: 'blur(8px)',
        borderTop: '1px solid rgba(0,0,0,0.08)',
        padding: '10px 14px 18px',
        display: 'flex',
        gap: 10,
        alignItems: 'center',
        boxShadow: '0 -4px 20px rgba(0,0,0,0.08)',
        transform: visible ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 0.3s ease',
      }}>
      {account.contact_phone && (
        <a
          href={`tel:${account.contact_phone}`}
          style={{
            width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backgroundColor: brand.primaryLight,
            color: brand.primary,
            textDecoration: 'none',
          }}>
          <Phone size={18} />
        </a>
      )}
      <a
        href="#offer-form"
        onClick={e => {
          e.preventDefault()
          document.getElementById('offer-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }}
        style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          height: 44, borderRadius: 10, fontSize: 14, fontWeight: 800,
          backgroundColor: brand.accent,
          color: brand.accentText === 'white' ? 'white' : '#111',
          textDecoration: 'none',
        }}>
        {offer.cta_button_text ?? 'Get Started →'}
      </a>
    </div>
  )
}
