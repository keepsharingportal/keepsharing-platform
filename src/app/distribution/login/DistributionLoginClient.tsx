'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Check, ArrowRight, Mail, KeyRound, Loader2 } from 'lucide-react'

type Mode = 'password' | 'magic' | 'reset'

export function DistributionLoginClient() {
  const searchParams = useSearchParams()
  const nextParam    = searchParams.get('next')
  const error404     = searchParams.get('error') === 'auth'

  const [mode,     setMode]     = useState<Mode>('password')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [busy,     setBusy]     = useState<Mode | null>(null)
  const [sentMagic, setSentMagic] = useState(false)
  const [sentReset, setSentReset] = useState(false)
  const [error,    setError]    = useState<string | null>(
    error404 ? 'Sign-in link expired or failed. Please try again.' : null,
  )

  // After password sign-in: resolve a destination. Honor ?next= if given;
  // otherwise look up the driver row to find their market and route them
  // to their own portal. Falls back to /distribution if neither resolves.
  async function resolveDestination(): Promise<string> {
    if (nextParam) return nextParam
    try {
      const res = await fetch('/api/circulation/driver/me', { cache: 'no-store' })
      if (res.ok) {
        const j = await res.json() as { market?: string }
        if (j.market) return `/distribution/${j.market}/driver`
      }
    } catch { /* fall through */ }
    return '/distribution'
  }

  async function signInWithPassword(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !password) return
    setBusy('password'); setError(null)
    try {
      const supabase = createClient()
      const { error: pwError } = await supabase.auth.signInWithPassword({
        email:    email.trim().toLowerCase(),
        password,
      })
      if (pwError) {
        setError('Invalid email or password. If you forgot your password, use Reset below.')
        return
      }
      window.location.href = await resolveDestination()
    } finally { setBusy(null) }
  }

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setBusy('magic'); setError(null)
    try {
      const supabase = createClient()
      const callbackNext = nextParam ?? '/distribution'
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(callbackNext)}` },
      })
      if (otpError) {
        setError('Could not send the link. Check the email address or try again in a moment.')
      } else { setSentMagic(true) }
    } finally { setBusy(null) }
  }

  async function sendResetLink(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setBusy('reset'); setError(null)
    try {
      const supabase = createClient()
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        { redirectTo: `${window.location.origin}/auth/callback?next=/distribution/login` },
      )
      if (resetErr) setError(resetErr.message || 'Could not send reset email.')
      else          setSentReset(true)
    } finally { setBusy(null) }
  }

  // Confirmation card after magic-link or reset email sent
  if (sentMagic || sentReset) {
    return (
      <Shell>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
            <Check size={22} color="#16A34A" strokeWidth={2.5} />
          </div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1E293B', marginBottom: 6 }}>Check your email</h2>
          <p style={{ fontSize: 13, color: '#64748B', lineHeight: 1.5, marginBottom: 4 }}>
            {sentReset
              ? <>We sent a password-reset link to <strong>{email}</strong>.</>
              : <>We sent a sign-in link to <strong>{email}</strong>.</>}
          </p>
          <p style={{ fontSize: 11, color: '#94A3B8' }}>The link expires in 1 hour.</p>
          <button
            type="button"
            onClick={() => { setSentMagic(false); setSentReset(false); setError(null); setMode('password') }}
            style={{ marginTop: 20, fontSize: 12, color: '#1A5FA8', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
          >
            Use a different sign-in method
          </button>
        </div>
      </Shell>
    )
  }

  return (
    <Shell>
      <div style={{ fontSize: 16, fontWeight: 600, color: '#1E293B', marginBottom: 18, textAlign: 'center' }}>
        Sign in to your account
      </div>

      {error && (
        <div style={{ padding: '10px 13px', borderRadius: 8, background: '#FEE2E2', color: '#991B1B', border: '1px solid #FCA5A5', fontSize: 12, marginBottom: 14, lineHeight: 1.4 }}>
          {error}
        </div>
      )}

      {mode === 'password' && (
        <form onSubmit={signInWithPassword} autoComplete="on">
          <Field label="Email address">
            <input
              type="email" name="email" required autoFocus autoComplete="email"
              value={email} onChange={e => setEmail(e.target.value)}
              style={inputStyle}
            />
          </Field>
          <Field label="Password">
            <input
              type="password" name="password" required autoComplete="current-password"
              value={password} onChange={e => setPassword(e.target.value)}
              style={inputStyle}
            />
          </Field>
          <button type="submit" disabled={busy === 'password'} style={primaryButtonStyle}>
            {busy === 'password' ? <><Loader2 size={14} className="animate-spin" /> Signing in…</> : <>Sign in <ArrowRight size={14} /></>}
          </button>
        </form>
      )}

      {mode === 'magic' && (
        <form onSubmit={sendMagicLink}>
          <Field label="Email address">
            <input
              type="email" required autoFocus autoComplete="email"
              value={email} onChange={e => setEmail(e.target.value)}
              style={inputStyle}
            />
          </Field>
          <button type="submit" disabled={busy === 'magic'} style={primaryButtonStyle}>
            {busy === 'magic' ? <><Loader2 size={14} className="animate-spin" /> Sending…</> : <><Mail size={14} /> Send sign-in link</>}
          </button>
          <p style={{ fontSize: 11, color: '#64748B', marginTop: 8, textAlign: 'center', lineHeight: 1.4 }}>
            We&apos;ll email you a one-time link. No password needed.
          </p>
        </form>
      )}

      {mode === 'reset' && (
        <form onSubmit={sendResetLink}>
          <Field label="Email address">
            <input
              type="email" required autoFocus autoComplete="email"
              value={email} onChange={e => setEmail(e.target.value)}
              style={inputStyle}
            />
          </Field>
          <button type="submit" disabled={busy === 'reset'} style={primaryButtonStyle}>
            {busy === 'reset' ? <><Loader2 size={14} className="animate-spin" /> Sending…</> : <><KeyRound size={14} /> Send reset link</>}
          </button>
          <p style={{ fontSize: 11, color: '#64748B', marginTop: 8, textAlign: 'center', lineHeight: 1.4 }}>
            We&apos;ll email you a link to set a new password.
          </p>
        </form>
      )}

      <div style={{ borderTop: '1px solid #F1F5F9', marginTop: 18, paddingTop: 14, display: 'flex', gap: 12, justifyContent: 'center', fontSize: 12 }}>
        {mode !== 'password' && <ModeLink onClick={() => setMode('password')}>Password</ModeLink>}
        {mode !== 'magic'    && <ModeLink onClick={() => setMode('magic')}>Email me a link</ModeLink>}
        {mode !== 'reset'    && <ModeLink onClick={() => setMode('reset')}>Forgot password?</ModeLink>}
      </div>
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontFamily: '"DM Sans", system-ui, sans-serif',
      background: 'linear-gradient(135deg, #0F2640 0%, #1E3A5F 100%)',
      minHeight: '100vh',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontFamily: 'Georgia, serif', fontSize: 30, fontWeight: 700, color: 'white', letterSpacing: '-.5px', filter: 'drop-shadow(0 2px 8px rgba(0,0,0,.3))' }}>
            Keep<span style={{ color: '#60A5FA' }}>Sharing</span>
          </div>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(255,255,255,.35)', marginTop: 6 }}>
            Distribution Portal
          </div>
        </div>
        <div style={{
          background: 'white',
          borderRadius: 14,
          padding: 32,
          boxShadow: '0 20px 60px rgba(0,0,0,.3)',
        }}>
          {children}
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{
        display: 'block', fontSize: 11, fontWeight: 600, color: '#64748B',
        marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.3px',
      }}>{label}</label>
      {children}
    </div>
  )
}

function ModeLink({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button" onClick={onClick}
      style={{ background: 'none', border: 'none', color: '#1A5FA8', cursor: 'pointer', padding: 0, fontSize: 12, fontWeight: 500 }}
    >{children}</button>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '11px 13px',
  border: '1.5px solid #E2E8F0', borderRadius: 8,
  fontSize: 15, color: '#1E293B', outline: 'none',
  fontFamily: 'inherit',
}

const primaryButtonStyle: React.CSSProperties = {
  width: '100%', padding: 13,
  background: '#0F2640', color: 'white',
  border: 'none', borderRadius: 8,
  fontSize: 15, fontWeight: 600,
  cursor: 'pointer', fontFamily: 'inherit',
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
}
