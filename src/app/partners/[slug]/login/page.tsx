'use client'

import { useState } from 'react'
import { use } from 'react'
import { ArrowRight, RefreshCw, Check, Mail } from 'lucide-react'

export default function PartnerLoginPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function sendLink(e: React.FormEvent) {
    e.preventDefault()
    setSending(true)
    setError(null)
    try {
      const res = await fetch('/api/partner-auth/send-magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, slug }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong — check your email and try again.')
      } else {
        setSent(true)
      }
    } catch {
      setError('Network error — please try again.')
    }
    setSending(false)
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#faf8f5', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'var(--font-dm-sans, sans-serif)' }}>
      <div style={{ width: '100%', maxWidth: 400 }}>

        {/* Logo/header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <p style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 22, fontWeight: 700, color: '#1a2744', marginBottom: 6 }}>
            River Region Parents
          </p>
          <p style={{ fontSize: 13, color: '#888' }}>Partner Dashboard</p>
        </div>

        {sent ? (
          <div style={{ backgroundColor: 'white', borderRadius: 20, padding: '36px 32px', border: '1px solid rgba(0,0,0,0.07)', textAlign: 'center' }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', backgroundColor: '#edf5f0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Check size={24} color="#5a8a6a" strokeWidth={2.5} />
            </div>
            <h2 style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 20, fontWeight: 700, color: '#1a2744', marginBottom: 10 }}>
              Magic link sent!
            </h2>
            <p style={{ fontSize: 14, color: '#666', lineHeight: 1.65 }}>
              Check your email at <strong>{email}</strong> for your login link. It expires in 24 hours.
            </p>
          </div>
        ) : (
          <div style={{ backgroundColor: 'white', borderRadius: 20, padding: '36px 32px', border: '1px solid rgba(0,0,0,0.07)' }}>
            <h2 style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 22, fontWeight: 700, color: '#1a2744', marginBottom: 6 }}>
              Sign in to your dashboard
            </h2>
            <p style={{ fontSize: 13, color: '#888', marginBottom: 24 }}>
              Enter the email on your River Region Parents account. We&apos;ll send you a sign-in link.
            </p>

            <form onSubmit={sendLink} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 5 }}>Email address</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#999' }} />
                  <input
                    type="email"
                    required
                    style={{ width: '100%', padding: '11px 14px 11px 36px', fontSize: 14, borderRadius: 8, border: '1.5px solid rgba(0,0,0,0.12)', outline: 'none', backgroundColor: 'white', fontFamily: 'inherit', boxSizing: 'border-box' }}
                    placeholder="you@yourbusiness.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                </div>
              </div>

              {error && <p style={{ fontSize: 13, color: '#c4622d', fontWeight: 600 }}>{error}</p>}

              <button type="submit" disabled={sending} style={{ padding: '13px', borderRadius: 10, fontSize: 14, fontWeight: 800, backgroundColor: sending ? '#ddd' : '#1a2744', color: sending ? '#888' : 'white', border: 'none', cursor: sending ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'inherit' }}>
                {sending
                  ? <><RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> Sending…</>
                  : <>Send me a magic link <ArrowRight size={14} /></>
                }
              </button>
            </form>
          </div>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
