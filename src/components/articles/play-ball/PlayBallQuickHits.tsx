// PlayBallQuickHits — cream/gold magazine Quick Hits card. Matches the
// print-magazine look: cream bg with a thin gold border, a centered gold
// star+rule accent at the top, and each row using the new FeatureIcon
// style (cream-tinted circle + gold ring + navy icon) like the Grands
// snapshot.

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
  title:  string
  fields: FieldDef[]
  values: Record<string, string | null | undefined>
}

export function PlayBallQuickHits({ title, fields, values }: Props) {
  const filled = fields.filter(f => {
    const v = values[f.key]
    return v && String(v).trim().length > 0
  })
  if (filled.length === 0) return null

  return (
    <section className="relative overflow-hidden rounded-2xl border border-[#D9A21B]/70 bg-[#FFFDF8] p-6 md:p-8 shadow-[0_14px_34px_rgba(8,38,74,0.10)]">
      {/* Inner gold hairline (double-border look) */}
      <div className="pointer-events-none absolute inset-2 rounded-xl border border-[#F3BF24]/60" />

      {/* Top accent rule with star */}
      <div className="relative mb-2 flex items-center justify-center gap-3">
        <span className="h-px w-16 bg-[#D9A21B] md:w-24" />
        <Star className="h-4 w-4 fill-[#D9A21B] text-[#D9A21B]" />
        <span className="h-px w-16 bg-[#D9A21B] md:w-24" />
      </div>

      <h2 className="relative text-center text-2xl font-black uppercase tracking-[0.18em] text-[#08264A] md:text-3xl">
        {title}
      </h2>

      {/* Small star below title to match the print mockup */}
      <div className="relative mb-6 mt-2 flex justify-center">
        <Star className="h-3 w-3 fill-[#D9A21B] text-[#D9A21B]" />
      </div>

      <div className="relative space-y-6 md:space-y-7">
        {filled.map(field => {
          const Icon = ICON_BY_TEMPLATE_ICON[field.icon] ?? Trophy
          return (
            <div key={field.key} className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#FFF6D9] text-[#08264A] ring-1 ring-[#F3BF24]">
                <Icon className="h-5 w-5" strokeWidth={2.25} />
              </div>
              <div className="min-w-0 flex-1 pt-1">
                <p className="mb-1.5 text-sm font-black uppercase leading-tight tracking-[0.06em] text-[#08264A] md:text-base">
                  {field.label}
                </p>
                <p className="text-base leading-relaxed text-slate-700 md:text-lg">
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
