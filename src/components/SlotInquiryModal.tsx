'use client'

// SlotInquiryModal — phase-1 "Claim This Spot" capture. Replaces the
// existing dumb Link → /advertise with a modal that gathers business
// name + email + message and emails the editor + saves to ad_inquiries.
// Closes on success and shows a brief thank-you.

import { useEffect, useState, type FormEvent } from 'react'
import { X, Send } from 'lucide-react'

interface Props {
  open:           boolean
  onClose:        () => void
  /** Optional placement context — pre-fills the slot info in the email. */
  placementType?: string
  placementLabel?: string
}

export function SlotInquiryModal({ open, onClose, placementType, placementLabel }: Props) {
  const [businessName, setBusinessName] = useState('')
  const [contactName,  setContactName]  = useState('')
  const [email,        setEmail]        = useState('')
  const [phone,        setPhone]        = useState('')
  const [message,      setMessage]      = useState('')
  const [status,       setStatus]       = useState<'idle' | 'sending' | 'success' | 'error'>('idle')
  const [errorMsg,     setErrorMsg]     = useState<string | null>(null)

  // Reset state every time the modal opens — so an editor re-opening
  // doesn't see the previous attempt's "thank you" state.
  useEffect(() => {
    if (open) {
      setStatus('idle')
      setErrorMsg(null)
    }
  }, [open])

  // Close on Escape.
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (status === 'sending') return
    setStatus('sending')
    setErrorMsg(null)
    try {
      const sourceUrl = typeof window !== 'undefined' ? window.location.href : ''
      const res = await fetch('/api/ad-inquiry', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          placement_type: placementType,
          business_name:  businessName,
          contact_name:   contactName,
          email,
          phone,
          message,
          source_url:     sourceUrl,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setStatus('error')
        setErrorMsg(json?.error ?? `HTTP ${res.status}`)
        return
      }
      setStatus('success')
      setBusinessName(''); setContactName(''); setEmail(''); setPhone(''); setMessage('')
    } catch (e) {
      setStatus('error')
      setErrorMsg(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-6 pt-5 pb-3 border-b border-gray-100 flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-primary mb-0.5">Advertise with us</p>
            <h2 className="text-lg font-black text-gray-900 leading-tight">
              {placementLabel ? `Tell us about ${placementLabel}` : 'Reach River Region families'}
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              We&apos;ll email you back within one business day with pricing, audience, and a hold on the spot while you decide.
            </p>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {status === 'success' ? (
          <div className="px-6 py-10 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-green-100 text-green-700 mb-4">
              <Send size={24} />
            </div>
            <p className="text-base font-bold text-gray-900 mb-1">Got it — message sent.</p>
            <p className="text-sm text-gray-600">
              We&apos;ll be in touch within one business day. Check your inbox for a reply from
              <strong> hello@riverregionparents.com</strong>.
            </p>
            <button
              onClick={onClose}
              className="mt-6 inline-flex items-center justify-center px-5 py-2 rounded-full text-sm font-bold bg-gray-900 text-white hover:bg-gray-700"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="p-6 space-y-3">
            <Field label="Business name *">
              <input
                type="text"
                value={businessName}
                onChange={e => setBusinessName(e.target.value)}
                required
                placeholder="e.g. Bright Smiles Pediatric Dentistry"
                className={inputCls}
              />
            </Field>
            <Field label="Your name">
              <input
                type="text"
                value={contactName}
                onChange={e => setContactName(e.target.value)}
                placeholder="First and last"
                autoComplete="name"
                className={inputCls}
              />
            </Field>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Email *">
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="you@business.com"
                  autoComplete="email"
                  className={inputCls}
                />
              </Field>
              <Field label="Phone (optional)">
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="(334) 555-0100"
                  autoComplete="tel"
                  className={inputCls}
                />
              </Field>
            </div>
            <Field label={placementLabel ? `Anything else about this spot?` : `Anything else?`}>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={3}
                placeholder="Specific dates? Goals? Existing creative? Optional."
                className={`${inputCls} resize-y`}
              />
            </Field>
            {placementLabel && (
              <p className="text-[11px] text-gray-500 bg-gray-50 px-3 py-2 rounded-lg">
                Spot you&apos;re interested in: <strong>{placementLabel}</strong>
              </p>
            )}
            {errorMsg && (
              <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {errorMsg}
              </p>
            )}
            <button
              type="submit"
              disabled={status === 'sending'}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {status === 'sending' ? 'Sending…' : (<><Send size={14} /> Send inquiry</>)}
            </button>
            <p className="text-[10px] text-gray-400 text-center">
              No spam. We use this only to follow up about your inquiry.
            </p>
          </form>
        )}
      </div>
    </div>
  )
}

const inputCls = 'w-full text-sm px-3 py-2 border border-gray-200 rounded-lg bg-white outline-none focus:border-gray-400 transition-colors'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-600 mb-1">{label}</label>
      {children}
    </div>
  )
}
