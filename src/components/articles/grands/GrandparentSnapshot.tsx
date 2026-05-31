// GrandparentSnapshot — clean magazine snapshot card. Three items: each
// with a lavender icon circle (FeatureIcon), tiny uppercase label, and
// brand-navy value. Lives INSIDE the article feature package (not in the
// sidebar) so the snapshot feels like part of the story instead of a
// sidebar widget.

import type { LucideIcon } from 'lucide-react'
import { Users, Heart, BookOpen } from 'lucide-react'

interface SnapshotItem {
  icon:  LucideIcon
  label: string
  value: string
}

// FeatureIcon — lavender bg, purple icon, lavender ring. Used across all
// Grands components per the spec.
function FeatureIcon({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F4EAF7] text-[#6F2C8F] ring-1 ring-[#E4C8EE]">
      <Icon className="h-5 w-5" strokeWidth={2.25} />
    </div>
  )
}

interface Props {
  /** Number of grandkids (e.g. "3 and one on the way") */
  grandkids?:  string | null
  /** Nicknames (e.g. "Debs & Big Al") */
  nickname?:   string | null
  /** Traditions / signature touch (e.g. "Cookies, books, FaceTime") */
  traditions?: string | null
}

export function GrandparentSnapshot({ grandkids, nickname, traditions }: Props) {
  // Build only the items that have values — empty fields don't render.
  const items: SnapshotItem[] = []
  if (grandkids?.trim())  items.push({ icon: Users,    label: 'Grandkids',  value: grandkids })
  if (nickname?.trim())   items.push({ icon: Heart,    label: 'Nicknames',  value: nickname })
  if (traditions?.trim()) items.push({ icon: BookOpen, label: 'Traditions', value: traditions })

  if (items.length === 0) return null

  return (
    <section className="rounded-2xl border border-[#E8D8EE] bg-white/95 p-5 shadow-[0_12px_30px_rgba(75,23,104,0.08)]">
      <h2 className="mb-4 text-center text-xs font-black uppercase tracking-[0.18em] text-[#6F2C8F] md:text-left">
        Grandparent Snapshot
      </h2>
      <div className="grid gap-4 sm:grid-cols-3 md:grid-cols-1 lg:grid-cols-3">
        {items.map(item => (
          <div key={item.label} className="flex items-start gap-3">
            <FeatureIcon icon={item.icon} />
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                {item.label}
              </p>
              <p className="text-sm font-semibold leading-snug text-[#08264A]">
                {item.value}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
