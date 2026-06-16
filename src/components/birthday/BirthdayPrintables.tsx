// Birthday Printables — downloadable templates. is_premium rows
// require email capture before download. Editor uploads files via
// /admin/birthday/printables.

'use client'

import { useState } from 'react'
import { SectionHeader } from './BudgetTiers'
import { Download, Mail, FileText, Lock } from 'lucide-react'

interface Printable {
  id:          string
  name:        string
  category:    string
  description?: string | null
  file_url:    string
  preview_url?: string | null
  is_premium:  boolean
}

const CATEGORY_PILL: Record<string, string> = {
  invitation: 'Invitations',
  'thank-you': 'Thank-you notes',
  tag:        'Tags',
  schedule:   'Schedules',
  banner:     'Banners',
  sign:       'Signs',
}

export function BirthdayPrintables({ printables, brandSlug }: { printables: Array<Record<string, unknown>>; brandSlug: string }) {
  const items: Printable[] = printables.map(p => ({
    id:          p.id as string,
    name:        p.name as string,
    category:    p.category as string,
    description: p.description as string | null,
    file_url:    p.file_url as string,
    preview_url: p.preview_url as string | null,
    is_premium:  p.is_premium as boolean,
  }))

  const [unlockedId, setUnlockedId] = useState<string | null>(null)
  const [activePremium, setActivePremium] = useState<Printable | null>(null)
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function unlock(e: React.FormEvent) {
    e.preventDefault()
    if (!activePremium || !email.trim()) return
    setBusy(true); setError(null)
    try {
      const res = await fetch('/api/birthday/subscribe', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: email.trim(), source: `printables:${activePremium.id}`, brand_slug: brandSlug }),
      })
      const j = await res.json()
      if (!res.ok) { setError(j?.error ?? 'subscribe failed'); return }
      setUnlockedId(activePremium.id)
      // Trigger the actual download
      window.open(activePremium.file_url, '_blank', 'noopener')
      setActivePremium(null)
      setEmail('')
    } finally { setBusy(false) }
  }

  function handleClick(p: Printable, e: React.MouseEvent) {
    if (p.is_premium && unlockedId !== p.id) {
      e.preventDefault()
      setActivePremium(p)
    }
  }

  return (
    <div>
      <SectionHeader
        eyebrow="Free downloads"
        title="Printables library"
        kicker="Invitations, thank-you notes, banners — designed for River Region parties. Drop in your details, print, done."
      />

      {items.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-6 text-center">
          <FileText size={28} className="text-slate-300 mx-auto mb-2" />
          <p className="text-[13px] text-slate-600">
            Editor adds printables in <code>/admin/birthday/printables</code>. Upload a PDF or PNG; we&apos;ll render the tile.
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map(p => (
            <a
              key={p.id}
              href={p.file_url}
              target="_blank" rel="noopener noreferrer"
              onClick={(e) => handleClick(p, e)}
              className="bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden hover:shadow-md transition-shadow group flex flex-col"
            >
              <div className="aspect-[4/3] bg-gradient-to-br from-slate-50 to-slate-100 relative overflow-hidden">
                {p.preview_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.preview_url} alt={p.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <FileText size={48} className="text-slate-300" />
                  </div>
                )}
                {p.is_premium && unlockedId !== p.id && (
                  <div className="absolute top-2 right-2 bg-amber-100 text-amber-800 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded inline-flex items-center gap-1 border border-amber-200">
                    <Lock size={9} /> Email to download
                  </div>
                )}
              </div>
              <div className="p-3 flex-1 flex flex-col">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#ff7a59]">{CATEGORY_PILL[p.category] ?? p.category}</div>
                <h3 className="text-[13px] font-bold text-slate-900 mt-0.5 group-hover:text-[#ff7a59] transition-colors">{p.name}</h3>
                {p.description && <p className="text-[11px] text-slate-600 mt-1 leading-snug">{p.description}</p>}
                <div className="mt-auto pt-2 inline-flex items-center gap-1 text-[11px] font-bold text-[#ff7a59]">
                  <Download size={11} /> {p.is_premium && unlockedId !== p.id ? 'Unlock + download' : 'Download'}
                </div>
              </div>
            </a>
          ))}
        </div>
      )}

      {/* Email-capture modal for premium printables */}
      {activePremium && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setActivePremium(null)}>
          <div className="bg-white rounded-2xl max-w-sm w-full p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 text-slate-900 mb-2">
              <Mail size={18} className="text-[#ff7a59]" />
              <h3 className="text-[15px] font-bold">Get <span className="text-[#ff7a59]">{activePremium.name}</span></h3>
            </div>
            <p className="text-[12px] text-slate-600 mb-3 leading-relaxed">
              Drop your email and we&apos;ll send the file — plus add you to Birthday Insider so you don&apos;t miss new printables.
            </p>
            <form onSubmit={unlock} className="space-y-2">
              <input
                type="email" required value={email} onChange={e => setEmail(e.target.value)}
                placeholder="your email"
                className="w-full px-3 py-2 text-[13px] border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-[#ff7a59]"
              />
              <div className="flex items-center gap-2">
                <button
                  type="submit" disabled={busy || !email.trim()}
                  className="flex-1 px-3 py-2 text-[13px] font-bold text-white bg-[#ff7a59] rounded-lg hover:opacity-90 disabled:opacity-50"
                >{busy ? 'Unlocking…' : 'Download'}</button>
                <button
                  type="button" onClick={() => setActivePremium(null)}
                  className="px-3 py-2 text-[12px] text-slate-500 hover:text-slate-700"
                >Cancel</button>
              </div>
              {error && <div className="text-[12px] text-rose-600">{error}</div>}
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
