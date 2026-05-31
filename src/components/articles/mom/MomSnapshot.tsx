// MomSnapshot — soft horizontal snapshot strip used in the Mom to Mom
// feature treatment. Renders below the hero so the at-a-glance vitals
// sit right under the title. Each filled topStrip field becomes a tile
// with a blush icon circle + coral label + navy value.

import type { LucideIcon } from 'lucide-react'
import {
  GraduationCap, Trophy, Calendar, Award, Music, Star, Quote, Heart,
  Users, Megaphone, BookOpen, Flag, Sparkles, MapPin, Coffee, Home,
} from 'lucide-react'

const ICON_BY_TEMPLATE_ICON: Record<string, LucideIcon> = {
  GraduationCap, Trophy, Calendar, Award, Music, Star, Quote, Heart,
  Users, Megaphone, BookOpen, Flag, Sparkles, MapPin, Coffee, Home,
}

interface FieldDef {
  key:   string
  label: string
  icon:  string
}

interface Props {
  fields: FieldDef[]
  values: Record<string, string | null | undefined>
}

const LG_COLS_BY_COUNT: Record<number, string> = {
  1: 'lg:grid-cols-1',
  2: 'lg:grid-cols-2',
  3: 'lg:grid-cols-3',
  4: 'lg:grid-cols-4',
}

export function MomSnapshot({ fields, values }: Props) {
  const filled = fields.filter(f => {
    const v = values[f.key]
    return v && String(v).trim().length > 0
  })
  if (filled.length === 0) return null

  const lgCols = LG_COLS_BY_COUNT[Math.min(filled.length, 4)] ?? 'lg:grid-cols-4'

  return (
    <section className="rounded-2xl border border-[#E8C9C6] bg-white/95 p-5 md:p-6 shadow-[0_12px_30px_rgba(8,38,74,0.07)]">
      <h2 className="mb-4 text-center text-xs font-black uppercase tracking-[0.18em] text-[#C96F73] md:text-left">
        Mom Snapshot
      </h2>
      <div className={`grid gap-4 sm:grid-cols-2 ${lgCols}`}>
        {filled.map(field => {
          const Icon = ICON_BY_TEMPLATE_ICON[field.icon] ?? Heart
          return (
            <div key={field.key} className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F7E3E1] text-[#C96F73] ring-1 ring-[#E8C9C6]">
                <Icon className="h-5 w-5" strokeWidth={2.25} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  {field.label}
                </p>
                <p className="text-sm font-semibold leading-snug text-[#08264A] break-words">
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
