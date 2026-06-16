// Birthday Freebies — local businesses giving kids free stuff on
// their birthday. Searchable + sortable. The SEO darling that ranks
// for "birthday freebies Montgomery AL." Email-capture for the
// downloadable list reinforces the lead-magnet angle.

'use client'

import { useState, useMemo } from 'react'
import { SectionHeader } from './BudgetTiers'
import { Gift, ExternalLink, Mail, CheckCircle2 } from 'lucide-react'

interface Freebie {
  id:           string
  business:     string
  category:     string
  offer:        string
  details?:     string | null
  website?:     string | null
  age_limit?:   number | null
  is_verified?: boolean
}

const CATEGORY_LABEL: Record<string, string> = {
  food:         'Restaurants',
  dessert:      'Desserts & treats',
  entertainment: 'Entertainment',
  retail:       'Stores',
  other:        'Other',
}

export function BirthdayFreebies({ freebies, brandSlug }: { freebies: Array<Record<string, unknown>>; brandSlug: string }) {
  const useFreebies: Freebie[] = freebies.map(f => ({
    id:           f.id as string,
    business:     f.business as string,
    category:     f.category as string,
    offer:        f.offer as string,
    details:      f.details as string | null,
    website:      f.website as string | null,
    age_limit:    f.age_limit as number | null,
    is_verified:  f.is_verified as boolean,
  }))

  const [search, setSearch] = useState('')
  const [showEmail, setShowEmail] = useState(false)
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const grouped = useMemo(() => {
    const filtered = useFreebies.filter(f =>
      !search.trim() ||
      f.business.toLowerCase().includes(search.toLowerCase()) ||
      f.offer.toLowerCase().includes(search.toLowerCase())
    )
    const byCat = new Map<string, Freebie[]>()
    for (const f of filtered) {
      if (!byCat.has(f.category)) byCat.set(f.category, [])
      byCat.get(f.category)!.push(f)
    }
    return Array.from(byCat.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [useFreebies, search])

  async function subscribe(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setBusy(true); setError(null)
    try {
      const res = await fetch('/api/birthday/subscribe', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: email.trim(), source: 'freebies', brand_slug: brandSlug }),
      })
      const j = await res.json()
      if (!res.ok) setError(j?.error ?? 'subscribe failed')
      else         setDone(true)
    } finally { setBusy(false) }
  }

  return (
    <div>
      <SectionHeader
        eyebrow="Local freebies"
        title="Birthday freebies in the River Region"
        kicker="Local spots that give your kid a free treat, gift, or experience on their birthday. Verified by our team. Bring ID."
      />

      {/* Email capture banner */}
      <div className="bg-gradient-to-r from-[#fff0eb] to-[#ffe6dd] rounded-2xl p-4 mb-4 flex items-start sm:items-center gap-4 flex-col sm:flex-row">
        <div className="w-10 h-10 rounded-xl bg-white text-[#ff7a59] flex items-center justify-center shrink-0">
          <Mail size={18} />
        </div>
        <div className="flex-1">
          <h3 className="text-[14px] font-bold text-slate-900">Get the printable Freebies List PDF</h3>
          <p className="text-[12px] text-slate-700 mt-0.5">
            Print it for the fridge so you don&apos;t miss a single free birthday treat.
          </p>
        </div>
        {done ? (
          <div className="text-[12px] text-emerald-700 inline-flex items-center gap-1.5">
            <CheckCircle2 size={14} /> Check your inbox
          </div>
        ) : showEmail ? (
          <form onSubmit={subscribe} className="flex items-center gap-2 w-full sm:w-auto">
            <input
              type="email" required value={email} onChange={e => setEmail(e.target.value)}
              placeholder="your email"
              className="flex-1 sm:w-56 px-3 py-2 text-[13px] border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-[#ff7a59]"
            />
            <button
              type="submit" disabled={busy || !email.trim()}
              className="px-4 py-2 text-[12px] font-bold text-white bg-[#ff7a59] rounded-lg hover:opacity-90 disabled:opacity-50"
            >
              {busy ? '…' : 'Send'}
            </button>
          </form>
        ) : (
          <button
            type="button" onClick={() => setShowEmail(true)}
            className="px-4 py-2 text-[13px] font-bold text-white bg-[#ff7a59] rounded-lg hover:opacity-90 shrink-0"
          >
            Get the PDF
          </button>
        )}
      </div>
      {error && <div className="text-[12px] text-rose-600 mb-3">{error}</div>}

      {/* Search */}
      {useFreebies.length > 0 && (
        <input
          type="search" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by business or offer…"
          className="w-full px-3 py-2 text-[13px] border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-[#ff7a59] mb-4"
        />
      )}

      {useFreebies.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-6 text-center">
          <Gift size={28} className="text-slate-300 mx-auto mb-2" />
          <p className="text-[13px] text-slate-600">
            Editor adds freebies in <code>/admin/birthday/freebies</code>. We&apos;re seeding the first 20 now.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map(([cat, items]) => (
            <div key={cat} className="bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden">
              <div className="px-4 py-2 bg-slate-50 border-b border-slate-100">
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-700">{CATEGORY_LABEL[cat] ?? cat} ({items.length})</h3>
              </div>
              <ul className="divide-y divide-slate-100">
                {items.map(f => (
                  <li key={f.id} className="px-4 py-3 flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-[#fff0eb] text-[#ff7a59] flex items-center justify-center shrink-0">
                      <Gift size={13} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[13px] font-bold text-slate-900">{f.business}</span>
                        {f.is_verified && <span className="text-[9px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded-full border border-emerald-200">Verified</span>}
                        {f.age_limit && <span className="text-[10px] text-slate-500">Ages ≤ {f.age_limit}</span>}
                      </div>
                      <p className="text-[12px] text-slate-700 mt-0.5">{f.offer}</p>
                      {f.details && <p className="text-[11px] text-slate-500 mt-1">{f.details}</p>}
                    </div>
                    {f.website && (
                      <a
                        href={f.website.startsWith('http') ? f.website : `https://${f.website}`}
                        target="_blank" rel="noopener noreferrer"
                        className="shrink-0 text-[#ff7a59] hover:opacity-80"
                      >
                        <ExternalLink size={14} />
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
