// GrandparentSnapshot — vertical magazine snapshot card. Each filled
// spotlight field renders as one row with a FeatureIcon, an uppercase
// label, and a navy value. Empty fields are skipped automatically, so
// adding new fields to the GRAND template just shows up here.

import type { LucideIcon } from 'lucide-react'
import { Users, Heart, BookOpen, Flag, Calendar, Sparkles, Award, Star } from 'lucide-react'

const ICON_BY_TEMPLATE_ICON: Record<string, LucideIcon> = {
  Users, Heart, BookOpen, Flag, Calendar, Sparkles, Award, Star,
}

interface FieldDef {
  key:   string
  label: string
  icon:  string
}

interface Props {
  /** Ordered list of fields to potentially show (from the GRAND template). */
  fields: FieldDef[]
  /** Filled values keyed by field key. */
  values: Record<string, string | null | undefined>
}

function FeatureIcon({ Icon }: { Icon: LucideIcon }) {
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F4EAF7] text-[#6F2C8F] ring-1 ring-[#E4C8EE]">
      <Icon className="h-5 w-5" strokeWidth={2.25} />
    </div>
  )
}

export function GrandparentSnapshot({ fields, values }: Props) {
  // Filter to filled fields only
  const filled = fields.filter(f => {
    const v = values[f.key]
    return v && String(v).trim().length > 0
  })

  if (filled.length === 0) return null

  return (
    <section className="rounded-2xl border border-[#E8D8EE] bg-white/95 p-5 md:p-6 shadow-[0_12px_30px_rgba(75,23,104,0.08)]">
      <h2 className="mb-5 text-xs font-black uppercase tracking-[0.18em] text-[#6F2C8F]">
        Grandparent Snapshot
      </h2>
      <div className="space-y-5">
        {filled.map(field => {
          const Icon = ICON_BY_TEMPLATE_ICON[field.icon] ?? Star
          return (
            <div key={field.key} className="flex items-start gap-3">
              <FeatureIcon Icon={Icon} />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  {field.label}
                </p>
                <p className="mt-0.5 text-sm font-semibold leading-snug text-[#08264A]">
                  {String(values[field.key]).trim()}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
