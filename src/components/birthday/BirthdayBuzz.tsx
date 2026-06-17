// Birthday Buzz — micro-shoutout stream. Editor-curated or
// UGC-sourced micro-content (1-2 sentences) that gives the portal
// a "living" feel between major content drops.

import { SectionHeader } from './BudgetTiers'
import Link from 'next/link'
import { Sparkles, Star, Trophy, ThumbsUp, Megaphone } from 'lucide-react'

interface Buzz {
  id:            string
  kind:          'shoutout' | 'tip' | 'milestone' | 'vendor_spotlight' | 'editor_pick'
  body:          string
  from_name:     string | null
  image_url:     string | null
  vendor_name:   string | null
  link_url:      string | null
  posted_at:     string
}

const KIND_ICON: Record<Buzz['kind'], React.ComponentType<{ size?: number }>> = {
  shoutout:         Megaphone,
  tip:              ThumbsUp,
  milestone:        Trophy,
  vendor_spotlight: Star,
  editor_pick:      Sparkles,
}
const KIND_LABEL: Record<Buzz['kind'], string> = {
  shoutout:         'Shoutout',
  tip:              'Tip',
  milestone:        'Milestone',
  vendor_spotlight: 'Vendor spotlight',
  editor_pick:      'Editor pick',
}

export function BirthdayBuzz({ buzz }: { buzz: Array<Record<string, unknown>> }) {
  const items: Buzz[] = buzz.map(b => ({
    id:            b.id as string,
    kind:          (b.kind as Buzz['kind']) ?? 'shoutout',
    body:          b.body as string,
    from_name:     b.from_name as string | null,
    image_url:     b.image_url as string | null,
    vendor_name:   b.vendor_name as string | null,
    link_url:      b.link_url as string | null,
    posted_at:     b.posted_at as string,
  }))

  if (items.length === 0) return null  // Hide entirely until editor seeds

  return (
    <div>
      <SectionHeader
        eyebrow="Birthday Buzz"
        title="What just happened in River Region birthdays"
        kicker="Shoutouts, tips, milestones — the heartbeat of local birthday planning."
      />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.slice(0, 6).map(b => {
          const Icon = KIND_ICON[b.kind]
          const Inner = (
            <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-4 hover:shadow-md transition-shadow h-full flex flex-col">
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#ff7a59] mb-2">
                <Icon size={11} /> {KIND_LABEL[b.kind]}
              </div>
              {b.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={b.image_url} alt="" className="w-full aspect-[3/2] rounded-lg object-cover bg-slate-100 mb-2" />
              )}
              <p className="text-[13px] text-slate-800 leading-relaxed flex-1">{b.body}</p>
              {(b.from_name || b.vendor_name) && (
                <div className="mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                  {b.from_name && <span>{b.from_name}</span>}
                  {b.from_name && b.vendor_name && <span> · </span>}
                  {b.vendor_name && <span className="font-semibold">{b.vendor_name}</span>}
                </div>
              )}
            </div>
          )
          return b.link_url
            ? <Link key={b.id} href={b.link_url}>{Inner}</Link>
            : <div key={b.id}>{Inner}</div>
        })}
      </div>
    </div>
  )
}
