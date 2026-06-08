'use client'

// Account settings — editable fields. Two independent forms (name + password)
// so a save on one doesn't punish you with the other's validation state.
//
// Password update: calls supabase.auth.updateUser({ password }) directly from
// the browser. Supabase requires the user to have an active session for this,
// which they do — getAdminContext() on the server side wouldn't have returned
// otherwise.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  KeyRound, CheckCircle2, RefreshCw, AlertTriangle, LogOut, User,
} from 'lucide-react'

interface Props {
  initialFullName: string
  adminId:         string
}

export function AccountSettingsClient({ initialFullName, adminId }: Props) {
  const router = useRouter()

  // ── Name form ──────────────────────────────────────────────────────────────
  const [fullName, setFullName] = useState(initialFullName)
  const [nameBusy, setNameBusy] = useState(false)
  const [nameMsg,  setNameMsg]  = useState<{ ok: boolean; text: string } | null>(null)

  async function saveName(e: React.FormEvent) {
    e.preventDefault()
    setNameBusy(true); setNameMsg(null)
    try {
      const res = await fetch(`/api/admin/users/${adminId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ full_name: fullName.trim() || null }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setNameMsg({ ok: false, text: json?.error ?? `HTTP ${res.status}` })
        return
      }
      setNameMsg({ ok: true, text: 'Saved' })
      router.refresh()
    } finally { setNameBusy(false) }
  }

  // ── Password form ──────────────────────────────────────────────────────────
  const [pw1,      setPw1]      = useState('')
  const [pw2,      setPw2]      = useState('')
  const [pwBusy,   setPwBusy]   = useState(false)
  const [pwMsg,    setPwMsg]    = useState<{ ok: boolean; text: string } | null>(null)

  async function savePassword(e: React.FormEvent) {
    e.preventDefault()
    setPwMsg(null)
    if (pw1.length < 8) {
      setPwMsg({ ok: false, text: 'Password must be at least 8 characters.' })
      return
    }
    if (pw1 !== pw2) {
      setPwMsg({ ok: false, text: 'Passwords don’t match.' })
      return
    }
    setPwBusy(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ password: pw1 })
      if (error) {
        setPwMsg({ ok: false, text: error.message })
        return
      }
      setPw1(''); setPw2('')
      setPwMsg({ ok: true, text: 'Password updated. Use it next time you sign in.' })
    } finally { setPwBusy(false) }
  }

  // ── Sign out ───────────────────────────────────────────────────────────────
  const [signingOut, setSigningOut] = useState(false)
  async function signOut() {
    setSigningOut(true)
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      window.location.href = '/admin/login'
    } finally { setSigningOut(false) }
  }

  const inp = 'w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 outline-none focus:border-portal-blue bg-white'
  const lbl = 'block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1.5'

  return (
    <>
      {/* Name edit */}
      <section className="bg-white rounded-2xl ring-1 ring-gray-200 p-6">
        <h2 className="text-sm font-bold text-gray-900 mb-4 inline-flex items-center gap-2">
          <User size={14} className="text-gray-400" /> Display name
        </h2>
        <form onSubmit={saveName}>
          <label className={lbl} htmlFor="full-name">Full name</label>
          <input
            id="full-name"
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            placeholder="Jane Smith"
            className={inp}
          />
          {nameMsg && (
            <p className={`mt-3 text-xs font-semibold inline-flex items-center gap-1 ${nameMsg.ok ? 'text-emerald-700' : 'text-rose-700'}`}>
              {nameMsg.ok ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
              {nameMsg.text}
            </p>
          )}
          <div className="mt-4">
            <button
              type="submit"
              disabled={nameBusy || fullName === initialFullName}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-portal-navy text-white hover:bg-portal-navy/90 transition-colors disabled:opacity-40"
            >
              {nameBusy ? <RefreshCw size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
              {nameBusy ? 'Saving…' : 'Save name'}
            </button>
          </div>
        </form>
      </section>

      {/* Password */}
      <section className="bg-white rounded-2xl ring-1 ring-gray-200 p-6">
        <h2 className="text-sm font-bold text-gray-900 mb-1 inline-flex items-center gap-2">
          <KeyRound size={14} className="text-gray-400" /> Password
        </h2>
        <p className="text-xs text-gray-500 mb-5 leading-relaxed">
          Set or change your sign-in password. Minimum 8 characters. After saving, the next time you sign in you can use email + password instead of waiting on a magic link.
        </p>
        <form onSubmit={savePassword} className="space-y-3">
          <div>
            <label className={lbl} htmlFor="pw1">New password</label>
            <input
              id="pw1"
              type="password"
              value={pw1}
              onChange={e => setPw1(e.target.value)}
              autoComplete="new-password"
              placeholder="At least 8 characters"
              className={inp}
            />
          </div>
          <div>
            <label className={lbl} htmlFor="pw2">Confirm new password</label>
            <input
              id="pw2"
              type="password"
              value={pw2}
              onChange={e => setPw2(e.target.value)}
              autoComplete="new-password"
              placeholder="Type it again"
              className={inp}
            />
          </div>
          {pwMsg && (
            <p className={`text-xs font-semibold inline-flex items-center gap-1 ${pwMsg.ok ? 'text-emerald-700' : 'text-rose-700'}`}>
              {pwMsg.ok ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
              {pwMsg.text}
            </p>
          )}
          <button
            type="submit"
            disabled={pwBusy || !pw1 || !pw2}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-portal-navy text-white hover:bg-portal-navy/90 transition-colors disabled:opacity-40"
          >
            {pwBusy ? <RefreshCw size={12} className="animate-spin" /> : <KeyRound size={12} />}
            {pwBusy ? 'Saving…' : 'Save password'}
          </button>
        </form>
      </section>

      {/* Sign out */}
      <section className="bg-white rounded-2xl ring-1 ring-gray-200 p-6">
        <h2 className="text-sm font-bold text-gray-900 mb-1">Sign out</h2>
        <p className="text-xs text-gray-500 mb-4 leading-relaxed">
          Ends your session on this browser. You&apos;ll need to sign in again next visit.
        </p>
        <button
          type="button"
          onClick={signOut}
          disabled={signingOut}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-white text-rose-700 ring-1 ring-rose-200 hover:bg-rose-50 transition-colors disabled:opacity-40"
        >
          {signingOut ? <RefreshCw size={12} className="animate-spin" /> : <LogOut size={12} />}
          {signingOut ? 'Signing out…' : 'Sign out'}
        </button>
      </section>
    </>
  )
}
