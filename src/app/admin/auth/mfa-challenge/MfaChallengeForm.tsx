'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ShieldCheck, RefreshCw, AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export function MfaChallengeForm() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const next         = searchParams.get('next') || '/admin'

  const [code, setCode] = useState('')
  const [factorId, setFactorId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr]   = useState<string | null>(null)
  const [bootError, setBootError] = useState<string | null>(null)
  const [bootDone, setBootDone] = useState(false)

  // On mount: resolve the user's verified TOTP factor id. If they're not
  // signed in, bounce to login. If they're signed in but have no factors,
  // bounce to security settings to enroll (preserves the original `next`).
  useEffect(() => {
    let cancelled = false
    void (async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (cancelled) return
      if (!user) {
        router.replace(`/admin/login?next=${encodeURIComponent(next)}`)
        return
      }
      try {
        const { data, error } = await supabase.auth.mfa.listFactors()
        if (error) throw error
        const verified = (data?.totp ?? []).find(f => f.status === 'verified')
        if (!verified) {
          // User isn't enrolled in TOTP. Send them to enrollment.
          router.replace('/admin/settings/security?gate=required')
          return
        }
        setFactorId(verified.id)

        // If the session is ALREADY at AAL2 (e.g. they came here directly
        // after just verifying on another tab), bounce them straight through.
        const aal = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
        if (aal.data?.currentLevel === 'aal2') {
          router.replace(next)
          return
        }
      } catch (e) {
        setBootError(e instanceof Error ? e.message : String(e))
      } finally {
        if (!cancelled) setBootDone(true)
      }
    })()
    return () => { cancelled = true }
  }, [router, next])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!factorId || !code) return
    setBusy(true); setErr(null)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.mfa.challengeAndVerify({
        factorId,
        code: code.trim(),
      })
      if (error) {
        setErr(error.message || 'Verification failed')
        setBusy(false)
        return
      }
      // Force a full nav so server-side context picks up the elevated session.
      window.location.href = next
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Verification failed')
      setBusy(false)
    }
  }

  if (!bootDone) {
    return (
      <div className="text-center text-sm text-portal-sub py-8">
        <RefreshCw size={16} className="inline-block animate-spin" /> Checking session…
      </div>
    )
  }
  if (bootError) {
    return (
      <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md p-3">
        Could not start the MFA challenge: {bootError}
      </div>
    )
  }

  return (
    <form onSubmit={submit}>
      <div className="text-center mb-4">
        <div className="w-12 h-12 rounded-full bg-portal-blue-lt flex items-center justify-center mx-auto mb-3">
          <ShieldCheck size={22} className="text-portal-blue" />
        </div>
        <h1 className="font-serif text-lg font-bold text-[#1a2744] mb-1">Two-factor required</h1>
        <p className="text-sm text-portal-sub">Open your authenticator app and enter the current 6-digit code.</p>
      </div>

      <input
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        autoFocus
        value={code}
        onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
        placeholder="000000"
        className="w-full px-4 py-3 text-2xl text-center font-mono tracking-widest rounded-lg border border-portal-border outline-none focus:border-[#4a90d9] bg-white"
      />

      {err && (
        <div className="mt-3 flex items-start gap-2 text-xs text-portal-red bg-portal-red-lt border border-portal-red/30 rounded-lg p-3">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <span>{err}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={busy || code.length !== 6}
        className="mt-5 w-full inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold rounded-lg bg-[#c4622d] text-white hover:bg-[#a85426] transition-colors disabled:opacity-40"
      >
        {busy ? <RefreshCw size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
        {busy ? 'Verifying…' : 'Verify and continue'}
      </button>

      <p className="mt-4 text-[11px] text-center text-portal-muted">
        Lost your device?{' '}
        <a href={`/admin/auth/recovery?next=${encodeURIComponent(next)}`} className="text-portal-blue hover:underline">
          Use a recovery code
        </a>
        {' '}or ask a super-admin to reset 2FA at <strong>/admin/users</strong>.
      </p>
    </form>
  )
}
