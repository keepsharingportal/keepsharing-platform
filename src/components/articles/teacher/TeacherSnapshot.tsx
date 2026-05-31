// TeacherSnapshot — sidebar Quick Facts card. Navy header strip with
// red+gold star accents above the title, then divided rows with red
// FeatureIcon circles. Data-driven from the TEACHER spotlight template
// topStrip fields. Vertical card layout (not the horizontal magazine
// strip used for Play Ball / Grands) since Teacher's Quick Facts live
// in the sidebar in the mockup.

import type { LucideIcon } from 'lucide-react'
import {
  GraduationCap, Trophy, Calendar, Award, Music, Star, Quote, Heart,
  Users, Megaphone, BookOpen, Flag, Sparkles, Apple,
} from 'lucide-react'

const ICON_BY_TEMPLATE_ICON: Record<string, LucideIcon> = {
  GraduationCap, Trophy, Calendar, Award, Music, Star, Quote, Heart,
  Users, Megaphone, BookOpen, Flag, Sparkles, Apple,
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

export function TeacherSnapshot({ fields, values }: Props) {
  const filled = fields.filter(f => {
    const v = values[f.key]
    return v && String(v).trim().length > 0
  })
  if (filled.length === 0) return null

  return (
    <aside className="overflow-hidden rounded-2xl border border-[#E9D8C7] bg-white shadow-[0_12px_30px_rgba(8,38,74,0.08)]">
      {/* Navy header — red dashes + gold stars flanking the title */}
      <div className="bg-[#08264A] px-5 py-4 text-center">
        <div className="flex items-center justify-center gap-3">
          <span className="h-px w-10 bg-[#E4312B]" />
          <Star className="h-4 w-4 fill-[#D9A21B] text-[#D9A21B]" />
          <h2 className="text-sm font-black uppercase tracking-[0.16em] text-white">
            Quick Facts
          </h2>
          <Star className="h-4 w-4 fill-[#D9A21B] text-[#D9A21B]" />
          <span className="h-px w-10 bg-[#E4312B]" />
        </div>
      </div>

      <div className="divide-y divide-[#E9D8C7] px-5">
        {filled.map(field => {
          const Icon = ICON_BY_TEMPLATE_ICON[field.icon] ?? Apple
          return (
            <div key={field.key} className="flex gap-4 py-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#FDECEC] text-[#E4312B] ring-1 ring-[#E4312B]/20">
                <Icon className="h-5 w-5" strokeWidth={2.3} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-black uppercase tracking-[0.13em] text-[#E4312B]">
                  {field.label}
                </p>
                <p className="mt-1 text-sm font-bold leading-snug text-[#08264A]">
                  {String(values[field.key]).trim()}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </aside>
  )
}
