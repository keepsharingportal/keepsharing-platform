// Sticky right-column sidebar for the per-age gift guide page. Four
// slots in priority order:
//   1. Email capture — "Get the printable gift checklist" (lead-magnet)
//   2. Other ages — sibling-bucket pivot
//   3. Sponsor / local-spotlight placeholder — paid slot
//   4. Cross-sell to vendor directory + party planner
//
// All four are intentionally simple so the editor can swap copy /
// images without code changes once they're in production.

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Mail, Gift, MapPin, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react'
import { AGE_BUCKETS, type AgeBucket } from '@/lib/birthday/gift-guides'

export function GiftPageSidebar({ currentSlug, accent }: { currentSlug: string; accent: string }) {
  const others = AGE_BUCKETS.filter(b => b.slug !== currentSlug)
  return (
    <aside className="lg:col-span-4 space-y-5 lg:sticky lg:top-6 lg:self-start">
      <EmailCaptureCard accent={accent} ageSlug={currentSlug} />
      <OtherAgesCard others={others} currentSlug={currentSlug} />
      <SponsorSlotCard />
      <PartyPlanningCard accent={accent} />
    </aside>
  )
}

// ── Email capture ─────────────────────────────────────────────────

function EmailCaptureCard({ accent, ageSlug }: { accent: string; ageSlug: string }) {
  const [email, setEmail] = useState('')
  const [busy, setBusy]   = useState(false)
  const [done, setDone]   = useState(false)
  const [err, setErr]     = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setBusy(true); setErr(null)
    try {
      // Lands in birthday_planning_subscribers via the existing
      // subscribe endpoint; lead-magnet email is configured at
      // /admin/lead-magnets if/when the editor sets one up for the
      // 'gift-guide:[age]' source.
      const res = await fetch('/api/birthday/subscribe', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: email.trim(), source: 'newsletter', brand_slug: 'rrp' }),
      })
      const j = await res.json()
      if (!res.ok) { setErr(j?.error ?? 'Subscribe failed'); return }
      setDone(true)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Network error')
    } finally { setBusy(false) }
  }

  if (done) {
    return (
      <div className="rounded-2xl p-5 border-2"
        style={{ borderColor: accent, background: `linear-gradient(135deg, ${accent}14, ${accent}08)` }}>
        <div className="flex items-center gap-2 mb-1">
          <CheckCircle2 size={16} style={{ color: accent }} />
          <p className="text-[13px] font-bold text-slate-900">You&apos;re on the list.</p>
        </div>
        <p className="text-[12px] text-slate-600 leading-relaxed">
          Watch your inbox — when we publish next year&apos;s update, you&apos;ll be the first to know.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl p-5 bg-white border border-black/5 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <Mail size={14} style={{ color: accent }} />
        <p className="text-[11px] font-black uppercase tracking-widest" style={{ color: accent }}>
          Save this list
        </p>
      </div>
      <h3 className="text-[15px] font-bold text-slate-900 leading-tight mb-1">
        Get next year&apos;s update
      </h3>
      <p className="text-[12px] text-slate-600 leading-snug mb-3">
        We refresh the picks every year. Subscribe and we&apos;ll email you when {ageSlug.replace('-', ' ')}&apos;s list gets a refresh.
      </p>
      <form onSubmit={submit} className="space-y-2">
        <input
          type="email" required
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="your email"
          className="w-full px-2.5 py-2 text-[12px] border border-slate-200 rounded-lg outline-none focus:border-slate-400"
        />
        <button
          type="submit"
          disabled={busy || !email.trim()}
          className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-[12px] font-bold text-white rounded-lg hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: accent }}
        >
          {busy ? <Loader2 size={11} className="animate-spin" /> : null}
          {busy ? 'Subscribing…' : 'Subscribe'}
        </button>
        {err && <p className="text-[11px] text-rose-600">{err}</p>}
        <p className="text-[10px] text-slate-500">No spam. Unsubscribe anytime.</p>
      </form>
    </div>
  )
}

// ── Other ages nav ────────────────────────────────────────────────

function OtherAgesCard({ others, currentSlug }: { others: AgeBucket[]; currentSlug: string }) {
  return (
    <div className="rounded-2xl bg-white border border-black/5 shadow-sm overflow-hidden">
      <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 inline-flex items-center gap-1.5">
          <Gift size={11} /> Other ages
        </p>
      </div>
      <div className="p-2">
        {others.map(b => (
          <Link
            key={b.slug}
            href={`/birthday-party-guide/gifts/${b.slug}`}
            className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-sm hover:bg-slate-50 transition-colors group"
          >
            <span
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ backgroundColor: b.color }}
            >
              <Gift size={14} className="text-white" />
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-black uppercase tracking-widest" style={{ color: b.color }}>
                Ages {b.range}
              </div>
              <div className="text-[13px] font-bold text-slate-900 truncate group-hover:text-slate-700">
                {b.label}
              </div>
            </div>
            <ArrowRight size={12} className="text-slate-300 group-hover:text-slate-500 shrink-0" />
          </Link>
        ))}
      </div>
    </div>
  )
}

// ── Sponsor / local-spotlight placeholder ─────────────────────────

function SponsorSlotCard() {
  return (
    <Link
      href="/advertise/get-listed"
      className="block rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/50 p-5 hover:border-[#ff7a59]/40 hover:bg-[#ff7a59]/5 transition-colors group"
    >
      <div className="flex items-center gap-2 mb-2">
        <MapPin size={14} className="text-slate-400" />
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
          Local spotlight
        </p>
      </div>
      <h3 className="text-[14px] font-bold text-slate-900 leading-tight mb-1">
        Your toy store, gift shop, or kids' boutique here.
      </h3>
      <p className="text-[12px] text-slate-600 leading-snug mb-3">
        Parents browse this page year-round looking for birthday gifts. Get your business in front of them.
      </p>
      <span className="text-[12px] font-bold text-[#ff7a59] inline-flex items-center gap-0.5 group-hover:gap-1.5 transition-all">
        See sponsorship options <ArrowRight size={11} />
      </span>
    </Link>
  )
}

// ── Cross-sell to vendor + party planner ──────────────────────────

function PartyPlanningCard({ accent }: { accent: string }) {
  return (
    <div className="rounded-2xl p-5 text-white relative overflow-hidden"
      style={{ background: `linear-gradient(135deg, #1e293b, #0f172a)` }}
    >
      <div className="absolute -right-4 -bottom-4 w-32 h-32 rounded-full opacity-20"
        style={{ backgroundColor: accent }} />
      <div className="relative">
        <p className="text-[10px] font-black uppercase tracking-widest text-white/70 mb-1">
          Throwing the party?
        </p>
        <h3 className="text-[15px] font-bold leading-tight mb-2">
          Find your venue, cake, or entertainer.
        </h3>
        <p className="text-[12px] text-white/80 leading-snug mb-4">
          The full River Region birthday vendor guide — venues, cakes, entertainers, rentals — all in one place.
        </p>
        <Link
          href="/birthday-party-guide"
          className="inline-flex items-center gap-1.5 px-4 py-2 text-[12px] font-bold text-slate-900 bg-white rounded-lg hover:bg-white/95"
        >
          Open Birthday Guide <ArrowRight size={11} />
        </Link>
      </div>
    </div>
  )
}
