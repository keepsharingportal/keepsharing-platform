'use client'

import { useState } from 'react'
import { ShieldAlert, RefreshCw, AlertTriangle, Check } from 'lucide-react'

export function RecoveryForm() {
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!code.trim()) return
    setBusy(true); setErr(null)
    try {
      const res = await fetch('/api/admin/auth/mfa-recovery', {
        method:  'POST',
        headers: { 'content-type': 'application/json' },
        body:    JSON.stringify({ code: code.trim() }),
      })
      const json = await res.json().catch(() => ({})) as { ok?: boolean; error?: string; redirect?: string }
      if (!res.ok || !json.ok) {
        const msg = res.status === 429
          ? 'Too many recovery attempts. Wait a minute and try again.'
          : json.error === 'invalid_code'
            ? 'That code didn\'t match any of yours. Try another, or contact a super-admin to reset 2FA.'
            : json.error === 'no_recovery_codes_configured'
              ? 'No recovery codes are configured on this account. Ask a super-admin to reset 2FA at /admin/users.'
              : (json.error ?? 'Recovery failed')
        setErr(msg); setBusy(false); return
      }
      // Successful recovery — bounce to enrollment.
      window.location.href = json.redirect ?? '/admin/settings/security?recovery=true'
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Network error')
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit}>
      <div className="text-center mb-4">
        <div className="w-12 h-12 rounded-full bg-portal-amber-lt flex items-center justify-center mx-auto mb-3">
          <ShieldAlert size={22} className="text-portal-amber" />
        </div>
        <h1 className="font-serif text-lg font-bold text-[#1a2744] mb-1">Use a recovery code</h1>
        <p className="text-sm text-portal-sub leading-relaxed">
          Enter one of the codes you saved when you set up 2FA. Using a code resets your 2FA — you&apos;ll re-scan a QR right after.
        </p>
      </div>

      <input
        type="text"
        autoComplete="one-time-code"
        autoFocus
        value={code}
        onChange={e => setCode(e.target.value)}
        placeholder="XXXXX-XXXXX"
        className="w-full px-4 py-3 text-xl text-center font-mono tracking-widest rounded-lg border border-portal-border outline-none focus:border-[#4a90d9] bg-white uppercase"
      />

      {err && (
        <div className="mt-3 flex items-start gap-2 text-xs text-portal-red bg-portal-red-lt border border-portal-red/30 rounded-lg p-3">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <span>{err}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={busy || code.trim().length < 8}
        className="mt-5 w-full inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold rounded-lg bg-[#ef6442] text-white hover:bg-[#a85426] transition-colors disabled:opacity-40"
      >
        {busy ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
        {busy ? 'Verifying…' : 'Use this code'}
      </button>

      <p className="mt-4 text-[11px] text-center text-portal-muted">
        Back to <a href="/admin/auth/mfa-challenge" className="underline">authenticator code</a>
      </p>
    </form>
  )
}
