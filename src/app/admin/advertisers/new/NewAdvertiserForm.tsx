'use client'

// NewAdvertiserForm — create an advertiser_accounts row. Front-loads
// dedup so the editor sees 'this looks like Baptist Hospital' before
// they save and add another duplicate to a list they were going to
// merge anyway.
//
// On save: POSTs to /api/admin/advertisers/quick-add, then routes the
// editor to the new advertiser's profile so they can add contacts +
// placements next.

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AlertTriangle, Check, RefreshCw, Building2, ExternalLink } from 'lucide-react'
import { normalize, similarity } from '@/lib/advertisers/dedup'

interface ExistingRow {
  id:     string
  name:   string
  tokens: string[]
}

interface Props {
  existing: ExistingRow[]
}

export function NewAdvertiserForm({ existing }: Props) {
  const router = useRouter()
  const [businessName, setBusinessName] = useState('')
  const [email,        setEmail]        = useState('')
  const [phone,        setPhone]        = useState('')
  const [website,      setWebsite]      = useState('')
  const [busy,         setBusy]         = useState(false)
  const [err,          setErr]          = useState<string | null>(null)

  // Live dedup: every keystroke, normalize the entered name and score
  // against every existing business. Show the top 3 matches above 0.5.
  // Threshold lower than the duplicates page (0.75) because we want to
  // surface 'similar' matches the editor should glance at, not just
  // guaranteed dups.
  const dupCandidates = useMemo(() => {
    const tokens = normalize(businessName)
    if (tokens.length === 0) return []
    return existing
      .map(e => ({ ...e, score: similarity(tokens, e.tokens) }))
      .filter(e => e.score >= 0.5)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
  }, [businessName, existing])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    if (!businessName.trim()) { setErr('Business name is required'); return }
    setBusy(true)
    try {
      const res = await fetch('/api/admin/advertisers/quick-add', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          business_name: businessName.trim(),
          contact_email: email.trim()   || null,
          contact_phone: phone.trim()   || null,
          business_url:  website.trim() || null,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { setErr(json?.error ?? `HTTP ${res.status}`); return }
      router.push(`/admin/advertisers/${json.id}`)
    } finally { setBusy(false) }
  }

  const inp = 'w-full text-sm border border-portal-border rounded-lg px-3 py-2 outline-none focus:border-portal-blue bg-white'
  const lbl = 'block text-[10px] font-bold uppercase tracking-wider text-portal-sub mb-1.5'

  return (
    <form onSubmit={submit} className="bg-white rounded-lg border border-portal-border p-5 md:p-6 space-y-5">
      <div>
        <label className={lbl}>Business Name <span className="text-rose-600">*</span></label>
        <input
          value={businessName}
          onChange={e => setBusinessName(e.target.value)}
          required
          autoFocus
          placeholder="Dentistry for Children"
          className={inp}
        />
        {dupCandidates.length > 0 && (
          <div className="mt-2 rounded-lg bg-portal-amber-lt border border-amber-200 p-3 text-xs">
            <p className="font-bold text-amber-900 inline-flex items-center gap-1.5 mb-2">
              <AlertTriangle size={12} /> Looks similar to {dupCandidates.length === 1 ? 'this existing business' : 'these'}:
            </p>
            <ul className="space-y-1">
              {dupCandidates.map(c => (
                <li key={c.id} className="flex items-center justify-between gap-2">
                  <span className="text-amber-900 inline-flex items-center gap-1.5">
                    <Building2 size={11} /> {c.name}
                    <span className="text-portal-amber font-mono text-[10px]">
                      ({Math.round(c.score * 100)}% match)
                    </span>
                  </span>
                  <Link
                    href={`/admin/advertisers/${c.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] font-bold text-portal-amber hover:underline inline-flex items-center gap-0.5"
                  >
                    Open <ExternalLink size={10} />
                  </Link>
                </li>
              ))}
            </ul>
            <p className="text-[11px] text-portal-amber mt-2">
              Pick an existing one to edit it, or keep typing if this is genuinely a new business.
            </p>
          </div>
        )}
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className={lbl}>Email (optional)</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="info@business.com"
            className={inp}
          />
        </div>
        <div>
          <label className={lbl}>Phone (optional)</label>
          <input
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="334-555-1234"
            className={inp}
          />
        </div>
      </div>

      <div>
        <label className={lbl}>Website (optional)</label>
        <input
          type="url"
          value={website}
          onChange={e => setWebsite(e.target.value)}
          placeholder="https://business.com"
          className={inp}
        />
        <p className="mt-1 text-[10px] text-portal-sub">
          Used as the default destination on tracked links you create later. Skip if unknown — you can add it on the profile.
        </p>
      </div>

      {err && (
        <p className="text-sm text-portal-red font-semibold inline-flex items-center gap-1.5">
          <AlertTriangle size={13} /> {err}
        </p>
      )}

      <div className="flex items-center gap-3 pt-2 border-t border-portal-border">
        <button
          type="submit"
          disabled={busy || !businessName.trim()}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold bg-portal-navy text-white rounded-full hover:bg-portal-navy/90 disabled:opacity-40 shadow-sm"
        >
          {busy ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
          {busy ? 'Creating…' : 'Create Advertiser'}
        </button>
        <Link
          href="/admin/advertisers"
          className="px-4 py-2.5 text-sm font-semibold text-portal-sub hover:text-portal-text"
        >
          Cancel
        </Link>
      </div>
    </form>
  )
}
