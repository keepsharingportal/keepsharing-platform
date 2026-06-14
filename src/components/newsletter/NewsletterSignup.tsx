'use client'

import { useState } from 'react'
import { ArrowRight, Check, RefreshCw, X, Mail } from 'lucide-react'

export interface NewsletterSignupProps {
  variant: 'inline' | 'compact' | 'popup'
  source: string
  context?: {
    article_slug?: string
    article_category?: string
    listing_slug?: string
  }
  headline?: string
  subheadline?: string
  cta_label?: string
  on_close?: () => void
}

const DEFAULT_HEADLINES: Record<string, string> = {
  'article-footer':       'Want more like this?',
  'newcomer-guide-footer': 'Stay in the Loop',
  'main-footer':          'Get the weekly newsletter',
  'popup':                'Join 8,000+ River Region Families',
  default:                'Subscribe to River Region Parents',
}

const DEFAULT_SUBS: Record<string, string> = {
  'article-footer':       'Get the best of River Region Parents in your inbox every Friday morning.',
  'newcomer-guide-footer': 'Get our weekly email with what\'s new, what\'s coming up, and what local moms are talking about.',
  'main-footer':          'Every Friday — the best of River Region Parents in your inbox.',
  'popup':                'Weekly local family life, hidden gems, and the events everyone\'s talking about.',
  default:                'Every Friday — what local families are doing, talking about, and recommending.',
}

function SuccessState({ variant }: { variant: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: variant === 'compact' ? '8px 0' : '16px 0' }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: '#edf5f0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Check size={16} color="#5a8a6a" strokeWidth={2.5} />
      </div>
      <div>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#1a2744' }}>You&apos;re on the list!</p>
        {variant !== 'compact' && (
          <p style={{ fontSize: 12, color: '#888' }}>First email arrives this Friday. Check your inbox.</p>
        )}
      </div>
    </div>
  )
}

export function NewsletterSignup({ variant, source, context, headline, subheadline, cta_label, on_close }: NewsletterSignupProps) {
  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const hl = headline ?? DEFAULT_HEADLINES[source] ?? DEFAULT_HEADLINES.default
  const sub = subheadline ?? DEFAULT_SUBS[source] ?? DEFAULT_SUBS.default
  const btn = cta_label ?? 'Subscribe'

  const tags = ['rrp-main-email', `source-${source}`]
  if (context?.article_category) tags.push(`interest-${context.article_category}`)
  if (context?.listing_slug) tags.push(`engaged-listing-${context.listing_slug}`)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.includes('@')) return
    setSubmitting(true)
    setErr(null)
    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, first_name: firstName || undefined, source, context, ghl_tags: tags }),
      })
      if (!res.ok) throw new Error('Server error')
      setSubmitted(true)
    } catch {
      setErr('Something went wrong — try again.')
    }
    setSubmitting(false)
  }

  // ── Compact variant ───────────────────────────────────────────────────────
  if (variant === 'compact') {
    return (
      <div style={{ padding: '16px 0' }}>
        {submitted ? <SuccessState variant="compact" /> : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: '1 1 200px' }}>
              <Mail size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#999' }} />
              <input
                type="email" required
                style={{ width: '100%', padding: '9px 12px 9px 30px', fontSize: 13, borderRadius: 8, border: '1px solid rgba(0,0,0,0.12)', outline: 'none', backgroundColor: 'white', boxSizing: 'border-box' }}
                placeholder="Your email"
                value={email} onChange={e => setEmail(e.target.value)}
              />
            </div>
            <button type="submit" disabled={submitting} style={{ padding: '9px 18px', borderRadius: 8, fontSize: 13, fontWeight: 700, backgroundColor: submitting ? '#ddd' : '#ef6442', color: submitting ? '#888' : 'white', border: 'none', cursor: submitting ? 'not-allowed' : 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'inherit' }}>
              {submitting ? <RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} /> : btn}
            </button>
          </form>
        )}
        {err && <p style={{ fontSize: 12, color: '#ef6442', marginTop: 4 }}>{err}</p>}
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  // ── Popup variant ─────────────────────────────────────────────────────────
  if (variant === 'popup') {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(26,39,68,0.7)', backdropFilter: 'blur(3px)' }} onClick={on_close} />
        <div style={{ position: 'relative', backgroundColor: 'white', borderRadius: 24, padding: '36px 32px', maxWidth: 460, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.25)', zIndex: 1 }}>
          {on_close && (
            <button onClick={on_close} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', cursor: 'pointer', color: '#999' }}>
              <X size={18} />
            </button>
          )}
          {submitted ? (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>✉️</div>
              <h3 style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 22, fontWeight: 700, color: '#1a2744', marginBottom: 8 }}>
                You&apos;re on the list!
              </h3>
              <p style={{ fontSize: 14, color: '#666', lineHeight: 1.65 }}>
                First email this Friday. Welcome to the RRP family.
              </p>
            </div>
          ) : (
            <>
              <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#ef6442', marginBottom: 10 }}>
                River Region Parents
              </p>
              <h2 style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 'clamp(22px, 4vw, 30px)', fontWeight: 700, color: '#1a2744', lineHeight: 1.2, marginBottom: 10 }}>
                {hl}
              </h2>
              <p style={{ fontSize: 14, color: '#666', lineHeight: 1.65, marginBottom: 24 }}>{sub}</p>
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    style={{ padding: '11px 14px', fontSize: 14, borderRadius: 8, border: '1.5px solid rgba(0,0,0,0.1)', outline: 'none', width: '100%', boxSizing: 'border-box' }}
                    placeholder="First name" value={firstName} onChange={e => setFirstName(e.target.value)}
                  />
                  <input
                    type="email" required
                    style={{ padding: '11px 14px', fontSize: 14, borderRadius: 8, border: '1.5px solid rgba(0,0,0,0.1)', outline: 'none', width: '100%', boxSizing: 'border-box' }}
                    placeholder="Email *" value={email} onChange={e => setEmail(e.target.value)}
                  />
                </div>
                <button type="submit" disabled={submitting} style={{ padding: '13px', borderRadius: 10, fontSize: 14, fontWeight: 800, backgroundColor: submitting ? '#ddd' : '#ef6442', color: submitting ? '#888' : 'white', border: 'none', cursor: submitting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontFamily: 'inherit' }}>
                  {submitting ? <><RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> Subscribing…</> : <>{btn} <ArrowRight size={14} /></>}
                </button>
                <p style={{ fontSize: 11, color: '#bbb', textAlign: 'center' }}>Every Friday. Free. Unsubscribe any time.</p>
              </form>
            </>
          )}
          {err && <p style={{ fontSize: 12, color: '#ef6442', marginTop: 8 }}>{err}</p>}
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  // ── Inline variant (default) ──────────────────────────────────────────────
  return (
    <section style={{ backgroundColor: 'var(--fg-sky-light, #e8f2fc)', borderRadius: 20, padding: '36px 32px', border: '1px solid rgba(74,144,217,0.15)', marginTop: 40, marginBottom: 16 }}>
      {submitted ? <SuccessState variant="inline" /> : (
        <>
          <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--fg-sky, #4a90d9)', marginBottom: 10 }}>
            River Region Parents Newsletter
          </p>
          <h3 style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 'clamp(20px, 3.5vw, 28px)', fontWeight: 700, color: 'var(--fg-navy, #1a2744)', lineHeight: 1.2, marginBottom: 8 }}>
            {hl}
          </h3>
          <p style={{ fontSize: 14, color: 'var(--fg-mid, #666)', lineHeight: 1.65, marginBottom: 22 }}>{sub}</p>
          <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', maxWidth: 480 }}>
            <input
              style={{ flex: '1 1 180px', padding: '11px 14px', fontSize: 14, borderRadius: 8, border: '1px solid rgba(0,0,0,0.1)', outline: 'none', backgroundColor: 'white', boxSizing: 'border-box' }}
              placeholder="First name (optional)"
              value={firstName} onChange={e => setFirstName(e.target.value)}
            />
            <input
              type="email" required
              style={{ flex: '2 1 200px', padding: '11px 14px', fontSize: 14, borderRadius: 8, border: '1px solid rgba(0,0,0,0.1)', outline: 'none', backgroundColor: 'white', boxSizing: 'border-box' }}
              placeholder="Your email *"
              value={email} onChange={e => setEmail(e.target.value)}
            />
            <button type="submit" disabled={submitting} style={{ padding: '11px 22px', borderRadius: 8, fontSize: 13, fontWeight: 800, backgroundColor: submitting ? '#ddd' : 'var(--fg-sky, #4a90d9)', color: submitting ? '#888' : 'white', border: 'none', cursor: submitting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0, fontFamily: 'inherit' }}>
              {submitting ? <><RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> …</> : <>{btn} <ArrowRight size={13} /></>}
            </button>
          </form>
          {err && <p style={{ fontSize: 12, color: '#ef6442', marginTop: 8 }}>{err}</p>}
          <p style={{ fontSize: 11, color: 'var(--fg-dim, #999)', marginTop: 10 }}>Every Friday. Free. Unsubscribe any time.</p>
        </>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </section>
  )
}
