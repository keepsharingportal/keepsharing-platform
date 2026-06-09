'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  ShieldCheck, ShieldAlert, RefreshCw, Trash2, KeyRound, CheckCircle2,
} from 'lucide-react'

interface Factor {
  id:            string
  friendly_name: string | null
  factor_type:   string
  status:        string
  created_at:    string
}

interface EnrollResult {
  factorId: string
  qrSvg:    string         // Supabase returns an SVG string
  secret:   string         // base32 secret for manual entry
}

export function SecurityClient({ userEmail }: { userEmail: string }) {
  const supabase = createClient()

  const [factors,      setFactors]      = useState<Factor[] | null>(null)
  const [loading,      setLoading]      = useState(true)
  const [enrolling,    setEnrolling]    = useState(false)
  const [enrollData,   setEnrollData]   = useState<EnrollResult | null>(null)
  const [code,         setCode]         = useState('')
  const [verifying,    setVerifying]    = useState(false)
  const [err,          setErr]          = useState<string | null>(null)
  const [msg,          setMsg]          = useState<string | null>(null)

  async function loadFactors() {
    setLoading(true); setErr(null)
    try {
      const { data, error } = await supabase.auth.mfa.listFactors()
      if (error) { setErr(error.message); return }
      // Combine totp + phone; surface verified factors first.
      const all = ([...(data?.totp ?? []), ...(data?.phone ?? [])] as Factor[])
        .sort((a, b) => (a.status === 'verified' ? -1 : 1))
      setFactors(all)
    } finally { setLoading(false) }
  }

  useEffect(() => { loadFactors() }, [])

  const verifiedFactor = factors?.find(f => f.status === 'verified') ?? null
  const hasTotp        = !!verifiedFactor

  async function startEnroll() {
    setEnrolling(true); setErr(null); setMsg(null)
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType:   'totp',
        friendlyName: `${userEmail}-${new Date().toISOString().slice(0, 10)}`,
      })
      if (error) { setErr(error.message); return }
      if (!data) { setErr('No enrollment data returned'); return }
      setEnrollData({
        factorId: data.id,
        qrSvg:    data.totp.qr_code,
        secret:   data.totp.secret,
      })
    } finally { setEnrolling(false) }
  }

  async function verifyEnroll() {
    if (!enrollData || !code.trim()) return
    setVerifying(true); setErr(null); setMsg(null)
    try {
      const ch = await supabase.auth.mfa.challenge({ factorId: enrollData.factorId })
      if (ch.error) { setErr(ch.error.message); return }
      const v = await supabase.auth.mfa.verify({
        factorId:    enrollData.factorId,
        challengeId: ch.data.id,
        code:        code.trim(),
      })
      if (v.error) { setErr(v.error.message); return }
      setMsg('Two-factor authentication enabled. From now on, sign-in will ask for a 6-digit code.')
      setEnrollData(null)
      setCode('')
      await loadFactors()
    } finally { setVerifying(false) }
  }

  async function cancelEnroll() {
    if (!enrollData) return
    // Best-effort unenroll the not-yet-verified factor.
    await supabase.auth.mfa.unenroll({ factorId: enrollData.factorId }).catch(() => {})
    setEnrollData(null)
    setCode('')
    setErr(null)
  }

  async function removeFactor(factorId: string) {
    if (!confirm('Remove this 2FA method? Your account will go back to email-link only until you re-enroll.')) return
    const { error } = await supabase.auth.mfa.unenroll({ factorId })
    if (error) { setErr(error.message); return }
    setMsg('Two-factor method removed.')
    await loadFactors()
  }

  return (
    <div className="space-y-5">
      <div className={`rounded-lg border px-5 py-4 ${
        hasTotp
          ? 'bg-portal-green-lt/40 border-portal-green/30'
          : 'bg-portal-amber-lt/40 border-portal-amber/40'
      }`}>
        <div className="flex items-center gap-3">
          {hasTotp
            ? <ShieldCheck className="text-portal-green" size={22} />
            : <ShieldAlert className="text-portal-amber" size={22} />}
          <div>
            <p className={`text-sm font-bold ${hasTotp ? 'text-portal-green' : 'text-portal-amber'}`}>
              {hasTotp ? '2FA is on' : '2FA is NOT enabled on your account'}
            </p>
            <p className="text-xs text-portal-sub mt-0.5 leading-relaxed">
              {hasTotp
                ? 'Sign-in requires both the magic-link email AND a 6-digit code from your authenticator app.'
                : 'A leaked magic-link email is currently enough for someone to sign in as you. Enable an authenticator app below for second-factor protection.'}
            </p>
          </div>
        </div>
      </div>

      {/* Existing verified factors */}
      <div className="bg-white border border-portal-border rounded-lg overflow-hidden">
        <div className="px-5 py-3 border-b border-portal-border">
          <h2 className="text-sm font-bold text-portal-text">Your 2FA methods</h2>
        </div>
        <div className="divide-y divide-portal-border">
          {loading ? (
            <div className="px-5 py-8 text-center text-sm text-portal-muted inline-flex items-center justify-center gap-2 w-full">
              <RefreshCw size={13} className="animate-spin" /> Loading…
            </div>
          ) : (factors ?? []).length === 0 ? (
            <div className="px-5 py-6 text-sm text-portal-muted">No 2FA methods set up yet.</div>
          ) : (factors ?? []).map(f => (
            <div key={f.id} className="px-5 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <KeyRound size={14} className="text-portal-blue" />
                <div>
                  <p className="text-sm font-semibold text-portal-text">
                    {f.factor_type === 'totp' ? 'Authenticator app' : f.factor_type}
                  </p>
                  <p className="text-[11px] text-portal-muted">
                    {f.friendly_name ?? '—'} · added {new Date(f.created_at).toLocaleDateString()}
                  </p>
                </div>
                {f.status === 'verified'
                  ? <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-portal-green bg-portal-green-lt border border-portal-green/30 px-1.5 py-0.5 rounded-full">
                      <CheckCircle2 size={9} /> Verified
                    </span>
                  : <span className="text-[10px] font-bold uppercase tracking-wider text-portal-amber bg-portal-amber-lt border border-portal-amber/30 px-1.5 py-0.5 rounded-full">
                      Pending
                    </span>}
              </div>
              <button
                type="button"
                onClick={() => removeFactor(f.id)}
                className="inline-flex items-center gap-1 text-xs text-portal-red hover:text-portal-red border border-portal-red/30 rounded-lg px-2.5 py-1 hover:bg-portal-red-lt"
              >
                <Trash2 size={11} /> Remove
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Enroll flow */}
      {!enrollData && !hasTotp && (
        <button
          type="button"
          onClick={startEnroll}
          disabled={enrolling}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-portal-navy text-white rounded-lg hover:bg-portal-navy/90 disabled:opacity-40"
        >
          {enrolling ? <RefreshCw size={13} className="animate-spin" /> : <ShieldCheck size={13} />}
          {enrolling ? 'Preparing…' : 'Set up authenticator app'}
        </button>
      )}

      {enrollData && (
        <div className="bg-white border border-portal-border rounded-lg p-5 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-portal-text mb-1">Scan this QR code</h3>
            <p className="text-xs text-portal-sub leading-relaxed">
              Open Google Authenticator, Authy, 1Password, or any TOTP app, and scan this image.
              Then enter the 6-digit code your app shows.
            </p>
          </div>
          <div className="flex items-start gap-5">
            <div
              className="shrink-0 bg-white p-2 rounded-lg border border-portal-border"
              // Supabase returns a complete SVG string; dangerouslySetInnerHTML
              // is safe here because the source is our own auth server.
              dangerouslySetInnerHTML={{ __html: enrollData.qrSvg }}
            />
            <div className="flex-1 space-y-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-portal-muted mb-1">Or enter manually</p>
                <code className="text-xs font-mono bg-portal-bg border border-portal-border rounded px-2 py-1 inline-block break-all">
                  {enrollData.secret}
                </code>
              </div>
              <div>
                <label className="block text-xs font-bold text-portal-text mb-1">6-digit code from your app</label>
                <input
                  value={code}
                  onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  inputMode="numeric"
                  pattern="\d{6}"
                  placeholder="123456"
                  className="w-40 px-3 py-2 text-lg font-mono tracking-widest border border-portal-border rounded-lg outline-none focus:border-portal-blue"
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={verifyEnroll}
                  disabled={verifying || code.length !== 6}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-portal-navy text-white rounded-lg hover:bg-portal-navy/90 disabled:opacity-40"
                >
                  {verifying ? <RefreshCw size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                  {verifying ? 'Verifying…' : 'Verify + enable'}
                </button>
                <button
                  type="button"
                  onClick={cancelEnroll}
                  className="px-3 py-2 text-xs text-portal-sub hover:text-portal-text"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {err && (
        <p className="text-xs text-portal-red font-semibold bg-portal-red-lt border border-portal-red/30 rounded-lg px-3 py-2">
          {err}
        </p>
      )}
      {msg && (
        <p className="text-xs text-portal-green font-semibold bg-portal-green-lt border border-portal-green/30 rounded-lg px-3 py-2">
          {msg}
        </p>
      )}
    </div>
  )
}
