// SpotlightSnapshot — sidebar card showing the same 4-5 vitals as the
// top strip, but stacked vertically as a magazine-style "snapshot" card.
// Shows on desktop (lg+); the horizontal top strip handles mobile so
// readers see vitals at the top of the article without scrolling.

import {
  GraduationCap, Trophy, Calendar, Award, Music, Star, Quote, Heart,
  Users, Megaphone, BookOpen, Flag, Sparkles,
} from 'lucide-react'
import {
  getSpotlightTemplate, type SpotlightField, type SpotlightIcon,
} from '@/lib/articles/spotlight-templates'
import { getColumnBrand } from '@/lib/articles/column-brand'
import { BrandWatermark } from '@/components/articles/BrandDecor'

const ICONS: Record<SpotlightIcon, React.ComponentType<{ className?: string; size?: number }>> = {
  GraduationCap, Trophy, Calendar, Award, Music, Star, Quote, Heart,
  Users, Megaphone, BookOpen, Flag, Sparkles,
}

function Icon({ name, size = 18 }: { name: SpotlightIcon; size?: number }) {
  const C = ICONS[name] ?? Star
  return <C size={size} />
}

interface Props {
  spotlightType: string | null
  spotlightData: Record<string, unknown> | null
  columnSlug:    string | null
}

export function SpotlightSnapshot({ spotlightType, spotlightData, columnSlug }: Props) {
  const tpl   = getSpotlightTemplate(spotlightType)
  const brand = getColumnBrand(columnSlug)
  if (!tpl || !spotlightData) return null

  const filled = tpl.topStrip.filter(f => {
    const v = spotlightData[f.key]
    return v !== undefined && v !== null && String(v).trim() !== ''
  })
  if (filled.length === 0) return null

  // Card title — column-aware. Mom = "Mom Snapshot", Grands = "Grandparent
  // Snapshot", Teacher = "Teacher Snapshot", Play Ball uses the existing
  // Quick Hits + top strip rather than this card.
  const snapshotTitle =
    columnSlug === 'mom-to-mom'        ? 'Mom Snapshot'
    : columnSlug === 'grands-greatest' ? 'Grandparent Snapshot'
    : columnSlug === 'teacher-of-month' ? 'Teacher Snapshot'
    :                                    'Snapshot'

  // Soft palette inputs (Mom/Teacher/Grands use these). Bold-style columns
  // (Play Ball) fall back to brand primary tints.
  const isSoft        = brand.style === 'soft'
  const bgColor       = isSoft ? (brand.softBg     ?? brand.primary + '0e') : (brand.primary + '0d')
  const borderColor   = isSoft ? (brand.softBorder ?? brand.primary + '22') : (brand.primary + '22')
  const circleColor   = isSoft ? (brand.softAccent ?? brand.primary)        : brand.primary
  const iconColor     = isSoft ? (brand.softIconColor ?? brand.softLabel ?? '#ffffff') : '#ffffff'
  const labelColor    = isSoft ? (brand.softLabel  ?? brand.primary)        : brand.primary

  return (
    <div
      className="rounded-2xl overflow-hidden border shadow-sm relative"
      style={{ backgroundColor: bgColor, borderColor }}
    >
      <div
        className="px-4 py-2.5 text-[10px] md:text-xs font-black uppercase tracking-widest text-white text-center"
        style={{ backgroundColor: brand.primary }}
      >
        {snapshotTitle}
      </div>
      {/* Watermark in the bottom-right corner of the card. Brand icon (Heart
          for Grands/Mom, Trophy for Play Ball, Apple for Teacher) renders
          large and faint behind the rows — adds the "designed" texture. */}
      <BrandWatermark
        columnSlug={columnSlug}
        className="absolute -right-3 -bottom-3 pointer-events-none"
        size={110}
        fillOpacity={0.07}
      />
      <div className="p-4 md:p-5 space-y-4 relative">
        {filled.map(f => (
          <SnapshotRow
            key={f.key}
            field={f}
            value={String(spotlightData[f.key])}
            circleColor={circleColor}
            iconColor={iconColor}
            labelColor={labelColor}
          />
        ))}
      </div>
    </div>
  )
}

function SnapshotRow({
  field, value, circleColor, iconColor, labelColor,
}: {
  field: SpotlightField
  value: string
  circleColor: string
  iconColor: string
  labelColor: string
}) {
  return (
    <div className="flex items-start gap-3">
      <div
        className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center mt-0.5"
        style={{ backgroundColor: circleColor, color: iconColor }}
      >
        <Icon name={field.icon} size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] leading-tight" style={{ color: labelColor }}>
          {field.label}
        </p>
        <p className="text-sm md:text-base font-bold text-foreground leading-snug mt-0.5">
          {value}
        </p>
      </div>
    </div>
  )
}
