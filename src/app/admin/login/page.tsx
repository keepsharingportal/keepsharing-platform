'use client'

// /admin/login — staff sign-in.
//
// Three options stacked, fastest first:
//
//   1. Sign in with Google         (recommended — one click for daily users)
//   2. Email + password             (traditional, fast after first login)
//   3. Send me a one-time link     (fallback for invited admins on first
//                                    login, or anyone who forgot their password)
//
// The Supabase callback at /auth/callback handles all three paths — they all
// end up exchanging a code or OTP for a session, then redirect to /admin.
// The admin_users lookup that runs server-side in requireAdmin() doesn't
// care which method got you here; it only cares that auth.users matches a
// row in admin_users by email.

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  ArrowRight, Check, RefreshCw, AlertTriangle, Mail, KeyRound, Sparkles,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

type Mode = 'password' | 'magic-link' | 'reset'

export default function AdminLoginPage() {
  return (
    <Suspense fallback={null}>
      <AdminLoginInner />
    </Suspense>
  )
}

function AdminLoginInner() {
  const searchParams = useSearchParams()
  const next         = searchParams.get('next') || '/admin'
  const showAuthErr  = searchParams.get('error') === 'auth'

  const [mode,     setMode]     = useState<Mode>('password')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [busy,     setBusy]     = useState<'google' | 'password' | 'magic' | 'reset' | null>(null)
  const [sentMagic, setSentMagic] = useState(false)
  const [sentReset, setSentReset] = useState(false)
  const [error,    setError]    = useState<string | null>(
    showAuthErr ? 'Sign-in link expired or failed. Please try again.' : null,
  )

  async function signInWithGoogle() {
    setBusy('google'); setError(null)
    const supabase = createClient()
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    })
    if (oauthError) {
      // Most common reason: Google provider isn't enabled in Supabase project
      // settings yet. Surface the message rather than spinning forever.
      setError(`Google sign-in failed: ${oauthError.message}`)
      setBusy(null)
    }
    // On success the browser is already navigating to Google's OAuth screen,
    // so we don't reset busy.
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
        // Supabase returns "Invalid login credentials" for both wrong-email
        // and wrong-password — we keep that ambiguity instead of leaking
        // whether the email exists in the system.
        setError(pwError.message || 'Sign-in failed')
        return
      }
      // On success, force a full nav so the proxy + admin context resolve
      // against the fresh session cookie.
      window.location.href = next
    } finally {
      setBusy(null)
    }
  }

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setBusy('magic'); setError(null)
    try {
      const supabase = createClient()
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
      })
      if (otpError) {
        setError('Could not send the link. Check the email address or try again in a moment.')
      } else {
        setSentMagic(true)
      }
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
        { redirectTo: `${window.location.origin}/auth/callback?next=/admin/settings/account` },
      )
      if (resetErr) {
        setError(resetErr.message || 'Could not send reset email')
      } else {
        setSentReset(true)
      }
    } finally { setBusy(null) }
  }

  // After a magic-link or reset send, render a confirmation card.
  if (sentMagic || sentReset) {
    return (
      <ShellCard>
        <div className="text-center">
          <div className="w-14 h-14 rounded-full bg-portal-green-lt flex items-center justify-center mx-auto mb-4">
            <Check size={24} className="text-emerald-600" strokeWidth={2.5} />
          </div>
          <h2 className="font-serif text-xl font-bold text-[#1a2744] mb-2">
            Check your email
          </h2>
          <p className="text-sm text-portal-sub leading-relaxed mb-1">
            {sentReset
              ? <>We sent a password-reset link to <strong>{email}</strong>.</>
              : <>We sent a sign-in link to <strong>{email}</strong>.</>}
          </p>
          <p className="text-xs text-portal-sub leading-relaxed">
            The link expires in 1 hour.
          </p>
          <button
            type="button"
            onClick={() => { setSentMagic(false); setSentReset(false); setError(null); setMode('password') }}
            className="mt-6 text-xs text-portal-sub hover:text-portal-text underline"
          >
            Use a different sign-in method
          </button>
        </div>
      </ShellCard>
    )
  }

  return (
    <ShellCard>
      <h1 className="font-serif text-xl font-bold text-[#1a2744] mb-1.5 text-center">
        Sign in to the admin
      </h1>
      <p className="text-sm text-portal-sub mb-6 leading-relaxed text-center">
        Three ways in — pick whichever you trust your hands to remember.
      </p>

      {/* 1. Google OAuth — top, fastest */}
      <button
        type="button"
        onClick={signInWithGoogle}
        disabled={busy !== null}
        className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-portal-border bg-white text-sm font-bold text-portal-text hover:bg-portal-bg hover:border-portal-border-2 transition-colors disabled:opacity-40"
      >
        {busy === 'google' ? (
          <RefreshCw size={16} className="animate-spin" />
        ) : (
          <GoogleGlyph />
        )}
        Sign in with Google
      </button>

      <div className="my-5 flex items-center gap-3">
        <span className="flex-1 h-px bg-gray-200" />
        <span className="text-[11px] uppercase tracking-wider font-bold text-portal-muted">or</span>
        <span className="flex-1 h-px bg-gray-200" />
      </div>

      {/* 2. Email + password, with a "send me a link" toggle on the right */}
      {mode === 'password' && (
        <form onSubmit={signInWithPassword}>
          <label className="block text-xs font-bold uppercase tracking-wider text-portal-sub mb-1.5">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoComplete="email"
            placeholder="you@example.com"
            className="w-full px-4 py-3 text-base rounded-xl border border-portal-border outline-none focus:border-[#4a90d9] bg-white"
          />

          <div className="mt-3 flex items-baseline justify-between">
            <label className="block text-xs font-bold uppercase tracking-wider text-portal-sub">
              Password
            </label>
            <button
              type="button"
              onClick={() => { setMode('reset'); setError(null) }}
              className="text-[11px] text-portal-sub hover:text-portal-text underline"
            >
              Forgot password?
            </button>
          </div>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            placeholder="••••••••"
            className="mt-1 w-full px-4 py-3 text-base rounded-xl border border-portal-border outline-none focus:border-[#4a90d9] bg-white"
          />

          {error && (
            <div className="mt-4 flex items-start gap-2 text-xs text-portal-red bg-portal-red-lt border border-portal-red/30 rounded-lg p-3">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={busy !== null || !email.trim() || !password}
            className="mt-5 w-full inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold rounded-xl bg-[#c4622d] text-white hover:bg-[#a85426] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {busy === 'password' ? <RefreshCw size={14} className="animate-spin" /> : <KeyRound size={14} />}
            {busy === 'password' ? 'Signing in…' : 'Sign in'}
          </button>

          <button
            type="button"
            onClick={() => { setMode('magic-link'); setError(null) }}
            className="mt-3 w-full inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-portal-sub hover:text-portal-text"
          >
            <Sparkles size={11} />
            Don&apos;t have a password yet? Email me a one-time sign-in link
          </button>
        </form>
      )}

      {/* 3. Magic-link fallback */}
      {mode === 'magic-link' && (
        <form onSubmit={sendMagicLink}>
          <label className="block text-xs font-bold uppercase tracking-wider text-portal-sub mb-1.5">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoFocus
            autoComplete="email"
            placeholder="you@example.com"
            className="w-full px-4 py-3 text-base rounded-xl border border-portal-border outline-none focus:border-[#4a90d9] bg-white"
          />
          <p className="mt-2 text-[11px] text-portal-sub leading-relaxed">
            We&apos;ll email you a one-time sign-in link. Useful if you&apos;ve never set a password or you&apos;re a new admin getting in for the first time.
          </p>

          {error && (
            <div className="mt-4 flex items-start gap-2 text-xs text-portal-red bg-portal-red-lt border border-portal-red/30 rounded-lg p-3">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={busy !== null || !email.trim()}
            className="mt-5 w-full inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold rounded-xl bg-[#c4622d] text-white hover:bg-[#a85426] transition-colors disabled:opacity-40"
          >
            {busy === 'magic' ? <RefreshCw size={14} className="animate-spin" /> : <Mail size={14} />}
            {busy === 'magic' ? 'Sending link…' : 'Send sign-in link'}
          </button>

          <button
            type="button"
            onClick={() => { setMode('password'); setError(null) }}
            className="mt-3 w-full text-xs text-portal-sub hover:text-portal-text underline"
          >
            Back to email + password
          </button>
        </form>
      )}

      {/* Reset-password form */}
      {mode === 'reset' && (
        <form onSubmit={sendResetLink}>
          <label className="block text-xs font-bold uppercase tracking-wider text-portal-sub mb-1.5">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoFocus
            autoComplete="email"
            placeholder="you@example.com"
            className="w-full px-4 py-3 text-base rounded-xl border border-portal-border outline-none focus:border-[#4a90d9] bg-white"
          />
          <p className="mt-2 text-[11px] text-portal-sub leading-relaxed">
            We&apos;ll email you a reset link. Click it and you&apos;ll be sent to a page where you can pick a new password.
          </p>

          {error && (
            <div className="mt-4 flex items-start gap-2 text-xs text-portal-red bg-portal-red-lt border border-portal-red/30 rounded-lg p-3">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={busy !== null || !email.trim()}
            className="mt-5 w-full inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold rounded-xl bg-[#c4622d] text-white hover:bg-[#a85426] transition-colors disabled:opacity-40"
          >
            {busy === 'reset' ? <RefreshCw size={14} className="animate-spin" /> : <ArrowRight size={14} />}
            {busy === 'reset' ? 'Sending…' : 'Send reset link'}
          </button>

          <button
            type="button"
            onClick={() => { setMode('password'); setError(null) }}
            className="mt-3 w-full text-xs text-portal-sub hover:text-portal-text underline"
          >
            Back to sign in
          </button>
        </form>
      )}

      <p className="mt-6 text-[11px] text-center text-portal-muted">
        Not an admin? <Link href="/" className="text-portal-sub hover:text-portal-text underline">Back to the site</Link>
      </p>
    </ShellCard>
  )
}

// ── Layout shell ─────────────────────────────────────────────────────────────

function ShellCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#faf8f5] flex items-center justify-center p-5">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-10">
        <div className="text-center mb-8">
          <div className="font-serif text-xl font-bold text-[#1a2744] mb-1">
            River Region <span className="text-[#4a90d9]">Parents</span>
          </div>
          <div className="text-xs font-semibold tracking-widest uppercase text-[#c4622d]">
            Admin
          </div>
        </div>
        {children}
      </div>
    </div>
  )
}

// Google's "G" mark — inline SVG so we don't bring in an icon library or
// hotlink an external asset. Matches the brand spec closely enough for a
// CTA button.
function GoogleGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A10.99 10.99 0 0 0 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09a6.62 6.62 0 0 1 0-4.18V7.07H2.18a10.99 10.99 0 0 0 0 9.86l3.66-2.84z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/>
    </svg>
  )
}
