// Real River Region Parties — UGC photo wall. The "moat" block:
// authentic local proof no AI can fake. Editor approves submissions
// from /admin/birthday/real-parties before they land here.

import Link from 'next/link'
import { SectionHeader } from './BudgetTiers'
import { Camera, Upload } from 'lucide-react'

interface Party {
  id:              string
  child_name?:     string | null
  child_age?:      number | null
  party_theme?:    string | null
  venue?:          string | null
  vendor_credits?: string[] | null
  caption:         string
  photo_url:       string
  party_month?:    number | null
  party_year?:     number | null
  submitter_name?: string | null
}

export function RealRiverRegionParties({ parties }: { parties: Array<Record<string, unknown>> }) {
  const useParties: Party[] = parties.map(p => ({
    id:              p.id as string,
    child_name:      p.child_name as string | null,
    child_age:       p.child_age as number | null,
    party_theme:     p.party_theme as string | null,
    venue:           p.venue as string | null,
    vendor_credits:  (p.vendor_credits as string[] | null) ?? null,
    caption:         p.caption as string,
    photo_url:       p.photo_url as string,
    party_month:     p.party_month as number | null,
    party_year:      p.party_year as number | null,
    submitter_name:  p.submitter_name as string | null,
  }))

  return (
    <div>
      <SectionHeader
        eyebrow="The moat"
        title="Real River Region parties"
        kicker="Photos and stories from real local moms. Tested in the wild, not staged for a magazine."
      />

      {useParties.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {useParties.map(p => (
              <article key={p.id} className="bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden group">
                <div className="aspect-square bg-slate-100 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.photo_url} alt={p.party_theme ?? 'Birthday party'} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
                <div className="p-3">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#ff7a59]">
                    <Camera size={10} />
                    {p.party_theme ?? 'Birthday party'}
                  </div>
                  <div className="text-[14px] font-bold text-slate-900 mt-1">
                    {p.child_name ?? 'A local kid'}{p.child_age ? `'s ${ordinal(p.child_age)}` : ''}
                  </div>
                  <p className="text-[12px] text-slate-600 mt-1 leading-snug line-clamp-3">{p.caption}</p>
                  {(p.venue || p.vendor_credits?.length) && (
                    <div className="mt-2 pt-2 border-t border-slate-100">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Vendors</div>
                      <div className="text-[11px] text-slate-700 mt-0.5">
                        {[p.venue, ...(p.vendor_credits ?? [])].filter(Boolean).join(' · ')}
                      </div>
                    </div>
                  )}
                  {p.submitter_name && (
                    <div className="text-[10px] text-slate-500 mt-2">
                      Shared by {p.submitter_name}
                      {p.party_month && p.party_year && ` · ${new Date(p.party_year, p.party_month - 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`}
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        </>
      )}

      <div className="mt-5 bg-gradient-to-r from-[#fff0eb] to-[#ffe6dd] rounded-2xl p-5 flex items-start sm:items-center gap-4 flex-col sm:flex-row">
        <div className="w-12 h-12 rounded-xl bg-white text-[#ff7a59] flex items-center justify-center shrink-0">
          <Upload size={22} />
        </div>
        <div className="flex-1">
          <h3 className="text-[15px] font-bold text-slate-900">Share your kid&apos;s last birthday</h3>
          <p className="text-[12px] text-slate-700 mt-0.5">
            Help other River Region moms see what real parties cost, look like, and feel like.
            We&apos;ll feature submissions with photo + 2-3 sentences about how it went.
          </p>
        </div>
        <Link
          href="/birthday-party-guide/share-yours"
          className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-bold text-white bg-[#ff7a59] rounded-lg hover:opacity-90 shrink-0"
        >
          Share yours →
        </Link>
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center">
      <Camera size={28} className="text-slate-300 mx-auto mb-2" />
      <h3 className="text-[15px] font-bold text-slate-900">Be the first to share</h3>
      <p className="text-[12px] text-slate-600 mt-1 max-w-md mx-auto">
        We&apos;re building a wall of real River Region birthdays. Your photo could be the one that gives another mom the confidence to host hers.
      </p>
    </div>
  )
}

function ordinal(n: number): string {
  if (n % 100 >= 11 && n % 100 <= 13) return `${n}th`
  switch (n % 10) {
    case 1: return `${n}st`
    case 2: return `${n}nd`
    case 3: return `${n}rd`
    default: return `${n}th`
  }
}
