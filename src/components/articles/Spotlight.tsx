// Magazine-matching Spotlight components.
//
//   SpotlightTopStrip — navy bar shown ABOVE the article body. Five columns,
//                       each with a small icon + ALL-CAPS label + value.
//                       Matches the strip in the magazine layout exactly.
//
//   SpotlightQuickHits — navy header card + cream body with the Q&A list,
//                        coral circle icon + ALL-CAPS label + answer text.
//                        Designed to sit in the article sidebar on desktop
//                        and stack below the article body on mobile.

import {
  GraduationCap, Trophy, Calendar, Award, Music, Star, Quote, Heart,
  Users, Megaphone, BookOpen, Flag, Sparkles,
} from 'lucide-react'
import {
  getSpotlightTemplate, type SpotlightField, type SpotlightIcon,
} from '@/lib/articles/spotlight-templates'

const ICONS: Record<SpotlightIcon, React.ComponentType<{ className?: string; size?: number }>> = {
  GraduationCap, Trophy, Calendar, Award, Music, Star, Quote, Heart,
  Users, Megaphone, BookOpen, Flag, Sparkles,
}

function Icon({ name, className, size = 16 }: { name: SpotlightIcon; className?: string; size?: number }) {
  const C = ICONS[name] ?? Star
  return <C className={className} size={size} />
}

interface Props {
  spotlightType: string | null
  spotlightData: Record<string, unknown> | null
}

// ── Top strip ──────────────────────────────────────────────────────────────
export function SpotlightTopStrip({ spotlightType, spotlightData }: Props) {
  const tpl = getSpotlightTemplate(spotlightType)
  if (!tpl || !spotlightData) return null

  const filled = tpl.topStrip.filter(f => {
    const v = spotlightData[f.key]
    return v !== undefined && v !== null && String(v).trim() !== ''
  })
  if (filled.length === 0) return null

  return (
    <div className="bg-[#1a2744] text-white rounded-xl overflow-hidden shadow-md">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 divide-y md:divide-y-0 md:divide-x divide-white/10">
        {filled.map(f => (
          <Cell key={f.key} field={f} value={String(spotlightData[f.key])} />
        ))}
      </div>
    </div>
  )
}

function Cell({ field, value }: { field: SpotlightField; value: string }) {
  return (
    <div className="px-4 py-3 md:px-5 md:py-4 flex items-center gap-3">
      <div className="shrink-0 w-9 h-9 rounded-full bg-[#f3bf24] flex items-center justify-center text-[#1a2744]">
        <Icon name={field.icon} size={16} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#f3bf24] leading-tight">
          {field.label}
        </p>
        <p className="text-sm font-bold text-white leading-snug">
          {value}
        </p>
      </div>
    </div>
  )
}

// ── Quick Hits sidebar ─────────────────────────────────────────────────────
export function SpotlightQuickHits({ spotlightType, spotlightData }: Props) {
  const tpl = getSpotlightTemplate(spotlightType)
  if (!tpl || !spotlightData) return null

  const filled = tpl.quickHits.filter(f => {
    const v = spotlightData[f.key]
    return v !== undefined && v !== null && String(v).trim() !== ''
  })
  if (filled.length === 0) return null

  return (
    <div className="bg-[#faf8f5] rounded-2xl overflow-hidden ring-1 ring-[#1a2744]/10 shadow-md">
      {/* Navy header */}
      <div className="bg-[#1a2744] text-white text-center py-4 md:py-5 relative">
        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-[#f3bf24]">
          <Sparkles size={16} />
        </div>
        <h3 className="text-xl md:text-2xl font-black tracking-wide">
          QUICK HITS
        </h3>
        <div className="absolute right-5 top-1/2 -translate-y-1/2 text-[#f3bf24]">
          <Sparkles size={16} />
        </div>
        {/* Gold star underline */}
        <div className="flex justify-center mt-1">
          <Star size={10} className="fill-[#f3bf24] text-[#f3bf24]" />
        </div>
      </div>

      {/* Q&A list */}
      <div className="p-6 md:p-8 space-y-6 md:space-y-7">
        {filled.map(f => (
          <QuickHitRow key={f.key} field={f} value={String(spotlightData[f.key])} />
        ))}
      </div>
    </div>
  )
}

function QuickHitRow({ field, value }: { field: SpotlightField; value: string }) {
  return (
    <div className="flex items-start gap-4">
      <div className="shrink-0 w-12 h-12 rounded-full bg-[#1a2744] flex items-center justify-center text-[#f3bf24] shadow-sm">
        <Icon name={field.icon} size={20} />
      </div>
      <div className="min-w-0 flex-1 pt-1">
        <p className="text-sm md:text-base font-black uppercase tracking-[0.06em] text-[#1a2744] mb-1.5 leading-tight">
          {field.label}
        </p>
        <p className="text-base md:text-lg text-[#3d3d3d] leading-relaxed">
          {value}
        </p>
      </div>
    </div>
  )
}

// ── Eyebrow tag (above the title, like the magazine) ───────────────────────
export function SpotlightEyebrow({ spotlightType }: { spotlightType: string | null }) {
  const tpl = getSpotlightTemplate(spotlightType)
  if (!tpl) return null
  return (
    <div className="inline-flex items-center gap-2 bg-[#1a2744] text-white px-3 py-1.5 rounded text-[10px] font-black uppercase tracking-[0.18em] mb-3">
      Play Ball Sports Spotlight
      <span className="text-[#f3bf24]">|</span>
      {tpl.eyebrow}
    </div>
  )
}
