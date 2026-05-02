'use client'

import { useState } from 'react'
import { X, ArrowRight } from 'lucide-react'
import { LeadCaptureModal } from '@/components/advertise/LeadCaptureModal'

export function MobileStickyPromo() {
  const [modalOpen, setModalOpen] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  return (
    <>
      <LeadCaptureModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        sourcePage="/newcomer-guide"
      />
      <div
        style={{
          position: 'fixed',
          bottom: 60, // above MobileNav
          left: 0, right: 0,
          zIndex: 150,
          padding: '0 8px 4px',
        }}
        className="md:hidden"
      >
        <div style={{
          backgroundColor: 'var(--fg-cream, #faf8f5)',
          border: '1px solid rgba(196,98,45,0.2)',
          borderRadius: 10,
          height: 36,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 12px',
          boxShadow: '0 -2px 12px rgba(0,0,0,0.08)',
        }}>
          <button
            onClick={() => setModalOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--fg-terra, #c4622d)' }}>
              Want to be Featured?
            </span>
            <ArrowRight size={12} color="var(--fg-terra)" />
          </button>
          <button onClick={() => setDismissed(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#aaa', padding: '4px 2px' }}>
            <X size={14} />
          </button>
        </div>
      </div>
    </>
  )
}
