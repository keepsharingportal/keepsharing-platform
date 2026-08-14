// GuideCategoryBlocks — colorful category nav for the shared guide template.
//
// Same visual treatment as GuideHubCards (family-resource-guide) and
// BirthdayCategoryHubCards: gradient panel, watermark icon top-right, eyebrow,
// label, blurb, count, "Explore →". Replaces the row of grey outline chips the
// shared template used, which capped at 8 and pushed the rest into a sidebar
// filter nobody scrolls to.
//
// The difference from those two: they hand-author a bucket list per guide,
// which works because their categories are a fixed editorial taxonomy. The
// shared template renders whatever categories a guide's CSV happens to
// contain, so identity is resolved per category name here — a curated entry
// where we have one, and a deterministic fallback otherwise, keyed off the
// name so a category keeps the same colour between renders and between pages.

import Link from 'next/link'
import {
  Music, Palette, Trophy, Dumbbell, BookOpen, Users, Waves, Bike,
  Drama, Sparkles, Target, Heart, Baby, GraduationCap, Stethoscope,
  Tent, PartyPopper, School, HandHeart, Shield, ArrowRight,
} from 'lucide-react'

interface Identity { Icon: React.ElementType; gradient: string }

// Curated identities. Keys are matched case-insensitively as substrings, so
// "Dance, Gymnastics & Cheer" hits 'dance' and "Swimming & Scuba" hits 'swim'.
// Order matters — first match wins, so put specific tokens above generic ones.
const CURATED: Array<[string, Identity]> = [
  ['dance',       { Icon: Sparkles,    gradient: 'from-pink-500/85 via-rose-500/75 to-rose-700/70' }],
  ['gymnastic',   { Icon: Sparkles,    gradient: 'from-pink-500/85 via-rose-500/75 to-rose-700/70' }],
  ['martial',     { Icon: Shield,      gradient: 'from-red-600/85 via-red-500/75 to-orange-700/70' }],
  ['tutor',       { Icon: BookOpen,    gradient: 'from-blue-600/85 via-indigo-500/75 to-indigo-700/70' }],
  ['art',         { Icon: Palette,     gradient: 'from-violet-500/85 via-purple-500/75 to-purple-700/70' }],
  ['music',       { Icon: Music,       gradient: 'from-violet-500/85 via-purple-500/75 to-purple-700/70' }],
  ['drama',       { Icon: Drama,       gradient: 'from-fuchsia-500/85 via-pink-500/75 to-pink-700/70' }],
  ['soccer',      { Icon: Trophy,      gradient: 'from-emerald-500/85 via-green-500/75 to-green-700/70' }],
  ['volleyball',  { Icon: Trophy,      gradient: 'from-amber-500/85 via-orange-500/75 to-orange-700/70' }],
  ['tennis',      { Icon: Target,      gradient: 'from-lime-500/85 via-green-500/75 to-emerald-700/70' }],
  ['bowling',     { Icon: Target,      gradient: 'from-slate-500/85 via-slate-600/75 to-slate-800/70' }],
  ['swim',        { Icon: Waves,       gradient: 'from-cyan-500/85 via-sky-500/75 to-blue-700/70' }],
  ['scuba',       { Icon: Waves,       gradient: 'from-cyan-500/85 via-sky-500/75 to-blue-700/70' }],
  ['skat',        { Icon: Bike,        gradient: 'from-indigo-500/85 via-blue-500/75 to-blue-700/70' }],
  ['horse',       { Icon: HandHeart,   gradient: 'from-amber-600/85 via-amber-700/75 to-yellow-800/70' }],
  ['recreation',  { Icon: Users,       gradient: 'from-teal-500/85 via-emerald-500/75 to-emerald-700/70' }],
  ['sport',       { Icon: Dumbbell,    gradient: 'from-teal-500/85 via-emerald-500/75 to-emerald-700/70' }],
  ['camp',        { Icon: Tent,        gradient: 'from-green-600/85 via-emerald-600/75 to-teal-800/70' }],
  ['school',      { Icon: School,      gradient: 'from-blue-600/85 via-blue-500/75 to-indigo-700/70' }],
  ['child',       { Icon: Baby,        gradient: 'from-purple-500/85 via-violet-500/75 to-violet-700/70' }],
  ['health',      { Icon: Stethoscope, gradient: 'from-emerald-500/85 via-teal-500/75 to-teal-700/70' }],
  ['medical',     { Icon: Stethoscope, gradient: 'from-emerald-500/85 via-teal-500/75 to-teal-700/70' }],
  ['special',     { Icon: Heart,       gradient: 'from-rose-500/85 via-pink-500/75 to-purple-700/70' }],
  ['party',       { Icon: PartyPopper, gradient: 'from-orange-500/85 via-amber-500/75 to-amber-700/70' }],
  ['education',   { Icon: GraduationCap, gradient: 'from-blue-600/85 via-indigo-500/75 to-indigo-700/70' }],
]

// Fallback palette for categories with no curated entry ("Miscellaneous", or
// anything a future CSV invents). Picked by a hash of the name rather than by
// list position, so adding a category doesn't recolour its neighbours.
const FALLBACKS: Identity[] = [
  { Icon: Sparkles, gradient: 'from-slate-600/85 via-slate-700/75 to-slate-900/70' },
  { Icon: Users,    gradient: 'from-indigo-500/85 via-indigo-600/75 to-purple-800/70' },
  { Icon: Trophy,   gradient: 'from-amber-500/85 via-orange-600/75 to-red-700/70' },
  { Icon: BookOpen, gradient: 'from-teal-500/85 via-cyan-600/75 to-blue-800/70' },
]

function identityFor(category: string): Identity {
  const key = category.toLowerCase()
  for (const [token, id] of CURATED) if (key.includes(token)) return id
  let hash = 0
  for (let i = 0; i < category.length; i++) hash = (hash * 31 + category.charCodeAt(i)) >>> 0
  return FALLBACKS[hash % FALLBACKS.length]
}

interface Props {
  /** [category, count] pairs, already sorted by the caller. */
  categories:   Array<[string, number]>
  urlSlug:      string
  activeFilter?: string
}

export function GuideCategoryBlocks({ categories, urlSlug, activeFilter }: Props) {
  if (categories.length === 0) return null

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
      {categories.map(([cat, count]) => {
        const { Icon, gradient } = identityFor(cat)
        const active = activeFilter === cat
        return (
          <Link
            key={cat}
            href={`/${urlSlug}?category=${encodeURIComponent(cat)}`}
            className={`group relative overflow-hidden rounded-2xl min-h-[150px] md:min-h-[180px] flex flex-col justify-end hover:shadow-lg transition-shadow ${
              active ? 'ring-4 ring-primary ring-offset-2' : ''
            }`}
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`} />

            <div className="absolute top-3 right-3 md:top-4 md:right-4 opacity-40 group-hover:opacity-60 transition-opacity">
              <Icon className="h-9 w-9 md:h-12 md:w-12 text-white" strokeWidth={1.5} />
            </div>

            <div className="relative p-3.5 md:p-4 z-10">
              {/* Full label, never truncated — "Dance, Gymnastics & ..." in the
                  old chips hid which categories existed at all. */}
              <h3 className="text-base md:text-lg font-black text-white leading-tight mb-2 drop-shadow-sm">
                {cat}
              </h3>
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1 text-xs font-bold text-white group-hover:gap-1.5 transition-all">
                  Explore <ArrowRight className="h-3 w-3" />
                </span>
                <span className="text-[11px] font-bold text-white/90 tabular-nums bg-white/20 rounded-full px-2 py-0.5">
                  {count}
                </span>
              </div>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
