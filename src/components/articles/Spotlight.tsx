// Magazine-matching Spotlight components, brand-aware.
//
//   SpotlightEyebrow   — column-branded eyebrow shown above the article title.
//                        For Play Ball it preserves the "PLAY BALL | PLAYER
//                        SPOTLIGHT" pipe pattern. For other columns (Mom,
//                        Teacher) it renders just the column label.
//
//   SpotlightTopStrip  — color-coordinated bar above the body. Five cells
//                        max, each a small icon + ALL-CAPS label + value.
//                        Colors come from getColumnBrand(columnSlug) so the
//                        same component works for Play Ball (navy), Teacher
//                        (apple red), Mom (rose), etc.
//
//   SpotlightQuickHits — sidebar Q&A list, similarly brand-aware. Only
//                        renders when the template has filled quickHits
//                        entries — Mom + Teacher omit by default.
//
//   SpotlightAboutCard — "About [Name]" closing card with profile photo +
//                        bio paragraph. Used by Mom to Mom; safe to use on
//                        any spotlight that fills the bio field.

import Image from 'next/image'
import {
  GraduationCap, Trophy, Calendar, Award, Music, Star, Quote, Heart,
  Users, Megaphone, BookOpen, Flag, Sparkles, Apple,
} from 'lucide-react'
import {
  getSpotlightTemplate, type SpotlightField, type SpotlightIcon,
} from '@/lib/articles/spotlight-templates'
import { getColumnBrand } from '@/lib/articles/column-brand'

const ICONS: Record<SpotlightIcon, React.ComponentType<{ className?: string; size?: number }>> = {
  GraduationCap, Trophy, Calendar, Award, Music, Star, Quote, Heart,
  Users, Megaphone, BookOpen, Flag, Sparkles,
}

// Used by the eyebrow when a column brand declares an inline icon (e.g.
// Apple for Teacher of the Month). Separate from ICONS because brand icons
// are not part of the SpotlightField pool.
const BRAND_ICONS: Record<string, React.ComponentType<{ className?: string; size?: number }>> = {
  Apple, Heart, GraduationCap, Trophy, Sparkles, Star,
}

function Icon({ name, className, size = 16 }: { name: SpotlightIcon; className?: string; size?: number }) {
  const C = ICONS[name] ?? Star
  return <C className={className} size={size} />
}

interface Props {
  spotlightType: string | null
  spotlightData: Record<string, unknown> | null
  columnSlug:    string | null
}

// ── Top strip ──────────────────────────────────────────────────────────────
// Brand-colored bar with the spotlight's vitals. Up to 5 cells; auto-grids
// to 2 col on mobile, 3 col on tablet, 5 col on desktop. Cells with no
// value are filtered out so partial data doesn't leave empty boxes.
export function SpotlightTopStrip({ spotlightType, spotlightData, columnSlug }: Props) {
  const tpl = getSpotlightTemplate(spotlightType)
  if (!tpl || !spotlightData) return null

  const filled = tpl.topStrip.filter(f => {
    const v = spotlightData[f.key]
    return v !== undefined && v !== null && String(v).trim() !== ''
  })
  if (filled.length === 0) return null

  const brand    = getColumnBrand(columnSlug)
  const isSoft   = brand.style === 'soft'
  const colCount = Math.min(filled.length, 5)
  // Tailwind needs literal class names — explicit grid mapping by count.
  const gridCls  = colCount === 2 ? 'grid-cols-2'
                 : colCount === 3 ? 'grid-cols-2 md:grid-cols-3'
                 : colCount === 4 ? 'grid-cols-2 md:grid-cols-4'
                 :                  'grid-cols-2 md:grid-cols-3 lg:grid-cols-5'

  if (isSoft) {
    // Soft variant — pale tint bg + accent-colored circles + brand-primary
    // labels + dark values. Mom uses peach (coral tint) bg, teal circles,
    // rose labels — circles get the site accent for cohesion while labels
    // keep the column's brand identity. Falls back to brand.primary for
    // both when no soft palette is configured.
    const bgColor     = brand.softBg     ?? (brand.primary + '0e')
    const borderColor = brand.softBorder ?? (brand.primary + '22')
    const circleColor = brand.softAccent ?? brand.primary  // teal for Mom
    const labelColor  = brand.primary                       // rose for Mom — brand identity stays on the labels
    return (
      <div
        className="rounded-xl overflow-hidden border"
        style={{ backgroundColor: bgColor, borderColor }}
      >
        <div className={`grid ${gridCls}`}>
          {filled.map(f => (
            <SoftCell
              key={f.key}
              field={f}
              value={String(spotlightData[f.key])}
              circleColor={circleColor}
              labelColor={labelColor}
            />
          ))}
        </div>
      </div>
    )
  }

  // Bold variant (Play Ball, Teacher, Grands) — dark/saturated full-bleed
  // bar with accent circles and white text. Magazine-poster vibe.
  const stripAccent = brand.topStripAccent ?? brand.accent
  return (
    <div
      className="rounded-xl overflow-hidden shadow-md text-white"
      style={{ backgroundColor: brand.primary }}
    >
      <div className={`grid ${gridCls} divide-y md:divide-y-0 md:divide-x divide-white/10`}>
        {filled.map(f => (
          <Cell
            key={f.key}
            field={f}
            value={String(spotlightData[f.key])}
            primary={brand.primary}
            accent={stripAccent}
          />
        ))}
      </div>
    </div>
  )
}

function Cell({
  field, value, primary, accent,
}: {
  field: SpotlightField; value: string; primary: string; accent: string
}) {
  return (
    <div className="px-4 py-3 md:px-5 md:py-4 flex items-center gap-3">
      <div
        className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center"
        style={{ backgroundColor: accent, color: primary }}
      >
        <Icon name={field.icon} size={16} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] leading-tight" style={{ color: accent }}>
          {field.label}
        </p>
        <p className="text-sm font-bold text-white leading-snug">
          {value}
        </p>
      </div>
    </div>
  )
}

// Soft variant cell — `circleColor` paints the icon circle (teal for Mom);
// `labelColor` paints the ALL-CAPS field label (rose for Mom — keeps the
// column's brand identity on the labels). Value text is dark foreground.
// Same size + alignment as the bold Cell.
function SoftCell({
  field, value, circleColor, labelColor,
}: {
  field: SpotlightField; value: string; circleColor: string; labelColor: string
}) {
  return (
    <div className="px-4 py-3 md:px-5 md:py-4 flex items-center gap-3">
      <div
        className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-white"
        style={{ backgroundColor: circleColor }}
      >
        <Icon name={field.icon} size={16} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] leading-tight" style={{ color: labelColor }}>
          {field.label}
        </p>
        <p className="text-sm font-bold text-foreground leading-snug">
          {value}
        </p>
      </div>
    </div>
  )
}

// ── Quick Hits sidebar ─────────────────────────────────────────────────────
// Brand-aware version of the Play Ball Quick Hits card. Mom + Teacher
// templates leave quickHits empty so this returns null for them.
export function SpotlightQuickHits({ spotlightType, spotlightData, columnSlug }: Props) {
  const tpl = getSpotlightTemplate(spotlightType)
  if (!tpl || !spotlightData) return null

  const filled = tpl.quickHits.filter(f => {
    const v = spotlightData[f.key]
    return v !== undefined && v !== null && String(v).trim() !== ''
  })
  if (filled.length === 0) return null

  const brand = getColumnBrand(columnSlug)

  return (
    <div className="bg-[#faf8f5] rounded-2xl overflow-hidden shadow-md ring-1" style={{ ['--brand' as string]: brand.primary }}>
      {/* Brand-colored header */}
      <div
        className="text-white text-center py-4 md:py-5 relative"
        style={{ backgroundColor: brand.primary }}
      >
        <div className="absolute left-5 top-1/2 -translate-y-1/2" style={{ color: brand.accent }}>
          <Sparkles size={16} />
        </div>
        <h3 className="text-xl md:text-2xl font-black tracking-wide uppercase">
          {tpl.quickHitsTitle}
        </h3>
        <div className="absolute right-5 top-1/2 -translate-y-1/2" style={{ color: brand.accent }}>
          <Sparkles size={16} />
        </div>
        <div className="flex justify-center mt-1">
          <Star size={10} style={{ color: brand.accent, fill: brand.accent }} />
        </div>
      </div>

      <div className="p-6 md:p-8 space-y-6 md:space-y-7">
        {filled.map(f => (
          <QuickHitRow
            key={f.key}
            field={f}
            value={String(spotlightData[f.key])}
            primary={brand.primary}
            accent={brand.accent}
          />
        ))}
      </div>
    </div>
  )
}

function QuickHitRow({
  field, value, primary, accent,
}: {
  field: SpotlightField; value: string; primary: string; accent: string
}) {
  return (
    <div className="flex items-start gap-4">
      <div
        className="shrink-0 w-12 h-12 rounded-full flex items-center justify-center shadow-sm"
        style={{ backgroundColor: primary, color: accent }}
      >
        <Icon name={field.icon} size={20} />
      </div>
      <div className="min-w-0 flex-1 pt-1">
        <p className="text-sm md:text-base font-black uppercase tracking-[0.06em] mb-1.5 leading-tight" style={{ color: primary }}>
          {field.label}
        </p>
        <p className="text-base md:text-lg text-[#3d3d3d] leading-relaxed">
          {value}
        </p>
      </div>
    </div>
  )
}

// ── Eyebrow tag ────────────────────────────────────────────────────────────
// Per-column treatment:
//   Play Ball  → "PLAY BALL | PLAYER SPOTLIGHT" (magazine pipe pattern)
//   Teacher    → "🍎 TEACHER OF THE MONTH"      (icon + brand label)
//   Mom to Mom → "❤ MOM TO MOM SPOTLIGHT"       (icon + brand label)
//   Other      → "<COLUMN LABEL>"               (just the brand label)
//
// All variants pull color from getColumnBrand(columnSlug) so they read as
// native to the franchise.
export function SpotlightEyebrow({ spotlightType, columnSlug }: { spotlightType: string | null; columnSlug: string | null }) {
  const tpl   = getSpotlightTemplate(spotlightType)
  const brand = getColumnBrand(columnSlug)
  if (!tpl) return null

  const isPlayBall = columnSlug === 'play-ball'
  const BrandIcon  = brand.icon ? BRAND_ICONS[brand.icon] : null

  return (
    <div
      className="inline-flex items-center gap-3 text-white px-5 py-2.5 md:px-6 md:py-3 rounded text-xs md:text-sm font-black uppercase tracking-[0.16em] mb-4 shadow-sm"
      style={{ backgroundColor: brand.primary }}
    >
      {BrandIcon && <BrandIcon className="w-4 h-4 md:w-5 md:h-5" />}
      {isPlayBall ? (
        <>
          Play Ball
          <span className="text-base" style={{ color: brand.accent }}>|</span>
          {tpl.eyebrow}
        </>
      ) : (
        brand.label.toUpperCase()
      )}
    </div>
  )
}

// ── About card ─────────────────────────────────────────────────────────────
// Closing "About [Name]" card with profile photo + bio paragraph. Brand
// accent strip on top so the column identity carries through. Renders
// nothing if both photo + bio are missing.
//
// Caller decides where to drop this in the article flow — typically after
// the body / sponsor outro and before the nominate CTA.
export function SpotlightAboutCard({
  name, photoUrl, bio, columnSlug,
}: {
  name:       string | null
  photoUrl:   string | null
  bio:        string | null
  columnSlug: string | null
}) {
  const hasBio   = bio && bio.trim().length > 0
  const hasPhoto = !!photoUrl
  if (!hasBio && !hasPhoto) return null

  const brand = getColumnBrand(columnSlug)

  return (
    <section className="mt-12 rounded-2xl overflow-hidden border border-border/40 bg-card shadow-sm">
      <div
        className="px-5 py-2 text-[10px] md:text-xs font-black uppercase tracking-widest text-white"
        style={{ backgroundColor: brand.primary }}
      >
        {name ? `About ${name}` : 'About'}
      </div>
      <div className="p-5 md:p-7 flex flex-col sm:flex-row items-center sm:items-start gap-5 md:gap-7">
        {hasPhoto && (
          <div className="relative w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden shrink-0 ring-2 ring-offset-2" style={{ ['--ring' as string]: brand.primary, boxShadow: `0 0 0 2px ${brand.primary}` }}>
            <Image
              src={photoUrl!}
              alt={name ?? 'Profile'}
              fill
              className="object-cover"
              sizes="128px"
              unoptimized
            />
          </div>
        )}
        <div className="flex-1 min-w-0 text-center sm:text-left">
          {name && (
            <h3 className="text-lg md:text-xl font-black text-foreground leading-tight mb-2">
              {name}
            </h3>
          )}
          {hasBio && (
            <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
              {bio}
            </p>
          )}
        </div>
      </div>
    </section>
  )
}
