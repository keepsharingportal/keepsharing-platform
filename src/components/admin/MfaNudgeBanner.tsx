'use client'

// A persistent banner that shows at the top of every admin page when the
// signed-in user has no verified TOTP factor. Doesn't block work (we don't
// hard-enforce 2FA yet — we want users to set up reliably before then) but
// makes it unmissable.
//
// The check runs client-side because Supabase MFA factors are a per-session
// concept — querying from a server component would require a fresh auth
// roundtrip on every page nav.

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ShieldAlert, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export function MfaNudgeBanner() {
  const [show,        setShow]        = useState(false)
  const [dismissed,   setDismissed]   = useState(false)
  const [loading,     setLoading]     = useState(true)

  useEffect(() => {
    // Dismissal is session-scoped — sessionStorage clears at browser close.
    // We want the nudge back tomorrow if the user keeps ignoring it.
    if (typeof window !== 'undefined' && window.sessionStorage.getItem('kp.mfa.dismissed') === '1') {
      setDismissed(true)
    }
    const supabase = createClient()
    supabase.auth.mfa.listFactors().then(({ data, error }) => {
      if (error || !data) { setLoading(false); return }
      const verified = [...(data.totp ?? []), ...(data.phone ?? [])]
        .some(f => f.status === 'verified')
      setShow(!verified)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  function dismiss() {
    try { window.sessionStorage.setItem('kp.mfa.dismissed', '1') } catch {}
    setDismissed(true)
  }

  if (loading || !show || dismissed) return null

  return (
    <div className="bg-portal-amber-lt border-b border-portal-amber/40 px-6 py-2.5 flex items-center justify-between gap-3 print:hidden">
      <div className="flex items-center gap-2 text-portal-amber text-sm font-semibold">
        <ShieldAlert size={14} />
        <span>Two-factor authentication is OFF for your account.</span>
        <Link href="/admin/settings/security" className="underline font-bold hover:text-portal-amber/80">
          Set it up now
        </Link>
        <span className="text-portal-amber/70 font-normal">— takes about 60 seconds.</span>
      </div>
      <button
        type="button"
        onClick={dismiss}
        title="Dismiss until next browser session"
        className="text-portal-amber hover:opacity-70"
      >
        <X size={14} />
      </button>
    </div>
  )
}
