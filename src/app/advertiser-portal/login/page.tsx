'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ArrowRight, Check, RefreshCw } from 'lucide-react'

export default function AdvertiserLoginPage() {
  const [email, setEmail]   = useState('')
  const [saving, setSaving] = useState(false)
  const [sent, setSent]     = useState(false)
  const [error, setError]   = useState<string | null>(null)

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return
    setSaving(true)
    setError(null)

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/advertiser-portal`,
      },
    })

    if (authError) {
      setError('Could not send link. Please try again or contact Jason.')
    } else {
      setSent(true)
    }
    setSaving(false)
  }

  const inp = 'w-full px-4 py-3 text-base rounded-xl border border-gray-200 outline-none focus:border-[#4a90d9] transition-all bg-white'

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--fg-cream, #faf8f5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: 'var(--font-dm-sans, sans-serif)' }}>
      <div style={{ backgroundColor: 'white', borderRadius: 20, padding: '44px 36px', maxWidth: 420, width: '100%', boxShadow: '0 8px 32px rgba(0,0,0,0.10)' }}>

        {/* Logo */}
        <div style={{ marginBottom: 32, textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 20, fontWeight: 700, color: 'var(--fg-navy, #1a2744)', marginBottom: 4 }}>
            River Region <span style={{ color: 'var(--fg-sky, #4a90d9)' }}>Parents</span>
          </div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-terra, #ef6442)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Advertiser Portal
          </div>
        </div>

        {sent ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--fg-sage-light, #edf5f0)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Check size={24} color="var(--fg-sage, #5a8a6a)" strokeWidth={2.5} />
            </div>
            <h2 style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 20, fontWeight: 700, color: 'var(--fg-navy)', marginBottom: 10 }}>
              Check your email
            </h2>
            <p style={{ fontSize: 14, color: 'var(--fg-mid, #666)', lineHeight: 1.6 }}>
              We sent a login link to <strong>{email}</strong>. Click it to access your dashboard.
            </p>
          </div>
        ) : (
          <>
            <h1 style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 24, fontWeight: 700, color: 'var(--fg-navy)', marginBottom: 8 }}>
              Welcome back
            </h1>
            <p style={{ fontSize: 14, color: 'var(--fg-mid, #666)', lineHeight: 1.6, marginBottom: 28 }}>
              Enter your email and we&apos;ll send a secure login link — no password needed.
            </p>
            <form onSubmit={sendMagicLink} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 6 }}>Email address</label>
                <input type="email" required className={inp} placeholder="you@yourbusiness.com" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              {error && <p style={{ fontSize: 13, color: 'var(--fg-terra)', fontWeight: 600 }}>{error}</p>}
              <button type="submit" disabled={saving || !email} style={{
                padding: '13px 20px', borderRadius: 12, fontSize: 14, fontWeight: 700,
                backgroundColor: !email || saving ? '#ccc' : 'var(--fg-navy, #1a2744)',
                color: 'white', border: 'none', cursor: email && !saving ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}>
                {saving ? <><RefreshCw size={14} className="animate-spin" /> Sending…</> : <>Send login link <ArrowRight size={14} /></>}
              </button>
            </form>
            <p style={{ fontSize: 12, color: 'var(--fg-dim, #999)', textAlign: 'center', marginTop: 20, lineHeight: 1.5 }}>
              Only active River Region Parents partners can log in. Questions? Email Jason.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
