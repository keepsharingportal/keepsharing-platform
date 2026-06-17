// Birthday Buzz — hyperlocal community feed. NO paid placements here —
// this is editorial/community chatter that builds trust + return visits.
//
// What goes here (editor populates via /admin/birthday/buzz):
//   - milestone        → kid birthday celebrations (Olivia turned 5!)
//   - shoutout         → mom party stories (success + honest fails)
//   - tip              → quick mom-to-mom advice (cake hack, decor tip)
//   - editor_pick      → editor's observation ("we spotted this at...")
//
// Paid vendor spotlights live in FeaturedBirthdayPros — they are
// editorially DIFFERENT from community Buzz, so the reader trusts both
// for their different jobs.

import Link from 'next/link'
import { SectionHeader } from './BudgetTiers'
import { Cake, Sparkles, ThumbsUp, Heart, Send } from 'lucide-react'

interface Buzz {
  id:            string
  kind:          'shoutout' | 'tip' | 'milestone' | 'editor_pick' | 'vendor_spotlight'
  body:          string
  from_name:     string | null
  image_url:     string | null
  link_url:      string | null
  vendor_name:   string | null
  posted_at:     string
}

const KIND_META: Record<Buzz['kind'], { label: string; icon: React.ComponentType<{ size?: number; className?: string }>; color: string }> = {
  milestone:        { label: 'Birthday celebration', icon: Cake,     color: '#ff7a59' },
  shoutout:         { label: 'Party shoutout',       icon: Heart,    color: '#ec4899' },
  tip:              { label: 'Mom-to-mom tip',       icon: ThumbsUp, color: '#0ea5e9' },
  editor_pick:      { label: 'Editor spotted',       icon: Sparkles, color: '#a855f7' },
  vendor_spotlight: { label: 'Featured',             icon: Sparkles, color: '#ff7a59' }, // never rendered here
}

export function BirthdayBuzz({ buzz }: { buzz: Array<Record<string, unknown>> }) {
  const items: Buzz[] = buzz
    .map(b => ({
      id:           b.id           as string,
      kind:         ((b.kind        as Buzz['kind']) ?? 'shoutout'),
      body:         b.body         as string,
      from_name:    b.from_name    as string | null,
      image_url:    b.image_url    as string | null,
      link_url:     b.link_url     as string | null,
      vendor_name:  b.vendor_name  as string | null,
      posted_at:    b.posted_at    as string,
    }))
    // Defensive filter — page query already excludes vendor_spotlight, this
    // is belt-and-suspenders so a stray row never bleeds into the wrong section.
    .filter(b => b.kind !== 'vendor_spotlight')

  return (
    <div>
      <SectionHeader
        eyebrow="What's happening locally"
        title="Birthday Buzz"
        kicker="The real-life heartbeat of River Region birthdays — kid celebrations, mom party stories (the wins AND the fails), and the little tips that actually help."
      />

      {items.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.slice(0, 9).map(b => {
            const meta  = KIND_META[b.kind]
            const Icon  = meta.icon
            const Inner = (
              <div className="bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden h-full flex flex-col hover:shadow-md transition-shadow">
                {b.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={b.image_url} alt="" className="w-full aspect-[3/2] object-cover bg-slate-100" />
                )}
                <div className="p-4 flex-1 flex flex-col">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: meta.color }}>
                    <Icon size={11} /> {meta.label}
                  </div>
                  <p className="text-[13px] text-slate-800 leading-relaxed flex-1 whitespace-pre-line">{b.body}</p>
                  {(b.from_name || b.vendor_name) && (
                    <div className="mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                      {b.from_name && <span className="font-semibold">{b.from_name}</span>}
                      {b.from_name && b.vendor_name && <span> · </span>}
                      {b.vendor_name && <span>at {b.vendor_name}</span>}
                    </div>
                  )}
                </div>
              </div>
            )
            return b.link_url
              ? <Link key={b.id} href={b.link_url} className="block h-full">{Inner}</Link>
              : <div key={b.id}>{Inner}</div>
          })}
        </div>
      )}

      <div className="mt-5 bg-gradient-to-r from-[#fff0eb] to-[#ffe6dd] rounded-2xl p-5 flex items-center gap-4 flex-wrap">
        <div className="w-10 h-10 rounded-xl bg-white text-[#ff7a59] flex items-center justify-center shrink-0">
          <Send size={18} />
        </div>
        <div className="flex-1 min-w-[220px]">
          <h3 className="text-[14px] font-bold text-slate-900">Share your buzz</h3>
          <p className="text-[12px] text-slate-700 mt-0.5">
            Your kid&apos;s birthday? A party win? A genuine fail you wish someone had warned you about? Send it — we&apos;ll feature it here.
          </p>
        </div>
        <Link
          href="/birthday-party-guide/share-yours"
          className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-bold text-white bg-[#ff7a59] rounded-lg hover:opacity-90"
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
      <Cake size={28} className="text-slate-300 mx-auto mb-2" />
      <h3 className="text-[15px] font-bold text-slate-900">Buzz is just getting started</h3>
      <p className="text-[12px] text-slate-600 mt-1 max-w-md mx-auto">
        Editor seeds with a few celebrations + mom stories to set the tone. Once moms see the section, submissions flow in.
      </p>
    </div>
  )
}
