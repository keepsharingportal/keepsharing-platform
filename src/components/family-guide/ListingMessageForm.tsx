'use client'

import { useState } from 'react'
import { ArrowRight, Check, RefreshCw } from 'lucide-react'

interface Props {
  listingSlug: string
  listingName: string
  advertiserId?: string | null
}

export function ListingMessageForm({ listingSlug, listingName, advertiserId }: Props) {
  const [name, setName]       = useState('')
  const [email, setEmail]     = useState('')
  const [message, setMessage] = useState('')
  const [saving, setSaving]   = useState(false)
  const [done, setDone]       = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !message) return
    setSaving(true)
    try {
      await fetch('/api/listing-leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          message,
          listingSlug,
          listingName,
          advertiserId: advertiserId ?? undefined,
        }),
      })
    } catch { /* non-blocking */ }
    setDone(true)
    setSaving(false)
  }

  const inp = 'w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 outline-none focus:border-[#ef6442] transition-all bg-white'

  if (done) return (
    <div style={{ textAlign: 'center', padding: '24px 16px' }}>
      <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--fg-sage-light, #edf5f0)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
        <Check size={20} color="var(--fg-sage, #5a8a6a)" strokeWidth={2.5} />
      </div>
      <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg-navy)', marginBottom: 6 }}>Message sent!</p>
      <p style={{ fontSize: 12, color: 'var(--fg-mid)', lineHeight: 1.55 }}>
        We&apos;ve also subscribed you to our Family Resource Guide updates — unsubscribe anytime.
      </p>
    </div>
  )

  return (
    <div style={{ backgroundColor: 'white', borderRadius: 16, border: '1px solid rgba(0,0,0,0.07)', padding: '20px 20px 24px', boxShadow: '0 2px 16px rgba(0,0,0,0.07)' }}>
      <h3 style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 16, fontWeight: 700, color: 'var(--fg-navy)', marginBottom: 4 }}>
        Send {listingName} a Message
      </h3>
      <p style={{ fontSize: 12, color: 'var(--fg-mid)', marginBottom: 18, lineHeight: 1.5 }}>
        Get answers fast — straight from the source.
      </p>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#666', marginBottom: 4 }}>Your name</label>
          <input className={inp} placeholder="First and last" value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#666', marginBottom: 4 }}>Email <span style={{ color: 'var(--fg-terra)' }}>*</span></label>
          <input type="email" required className={inp} placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#666', marginBottom: 4 }}>Message <span style={{ color: 'var(--fg-terra)' }}>*</span></label>
          <textarea required rows={4} className={`${inp} resize-none`} placeholder="What can we help you with?" value={message} onChange={e => setMessage(e.target.value)} />
        </div>
        <button type="submit" disabled={saving || !email || !message} style={{
          padding: '10px 16px', borderRadius: 9, fontSize: 13, fontWeight: 700,
          backgroundColor: !email || !message || saving ? '#ccc' : 'var(--fg-terra, #ef6442)',
          color: 'white', border: 'none', cursor: email && message && !saving ? 'pointer' : 'not-allowed',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>
          {saving ? <><RefreshCw size={12} className="animate-spin" /> Sending…</> : <>Send Message <ArrowRight size={13} /></>}
        </button>
      </form>
    </div>
  )
}
