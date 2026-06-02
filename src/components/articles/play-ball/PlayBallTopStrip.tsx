// PlayBallTopStrip — horizontal magazine snapshot strip for the Play
// Ball feature treatment. Each filled topStrip field renders as a
// centered tile (cream/gold icon circle over uppercase label over navy
// value), wrapping 2-up on mobile, 3-up at sm, and N-up (capped at 5)
// at lg. Same shape as the Grands snapshot strip — different palette.

import type { LucideIcon } from 'lucide-react'
import {
  GraduationCap, Trophy, Calendar, Award, Music, Star, Quote, Heart,
  Users, Megaphone, BookOpen, Flag, Sparkles,
} from 'lucide-react'

const ICON_BY_TEMPLATE_ICON: Record<string, LucideIcon> = {
  GraduationCap, Trophy, Calendar, Award, Music, Star, Quote, Heart,
  Users, Megaphone, BookOpen, Flag, Sparkles,
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
  5: 'lg:grid-cols-5',
}

export function PlayBallTopStrip({ fields, values }: Props) {
  const filled = fields.filter(f => {
    const v = values[f.key]
    return v && String(v).trim().length > 0
  })
  if (filled.length === 0) return null

  const lgCols = LG_COLS_BY_COUNT[Math.min(filled.length, 5)] ?? 'lg:grid-cols-5'

  return (
    <section className="rounded-2xl border border-[#EADBA5] bg-[#08264A] p-5 md:p-6 shadow-[0_12px_30px_rgba(8,38,74,0.12)]">
      <h2 className="mb-5 text-center text-xs font-black uppercase tracking-[0.18em] text-white">
        Player Snapshot
      </h2>
      {/* Icon-left rows on mobile + 2-up at sm + N-up at lg — matches
          the Mom snapshot pattern that the user already likes. Avoids
          the cramped 2-up icon-above-centered layout that was rendering
          poorly on phones. */}
      <div className={`grid gap-4 sm:grid-cols-2 ${lgCols}`}>
        {filled.map(field => {
          const Icon = ICON_BY_TEMPLATE_ICON[field.icon] ?? Star
          return (
            <div key={field.key} className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FFF6D9] text-[#08264A] ring-1 ring-[#F3BF24]">
                <Icon className="h-5 w-5" strokeWidth={2.25} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wide text-[#F3BF24]">
                  {field.label}
                </p>
                <p className="text-sm font-semibold leading-snug text-white break-words">
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
