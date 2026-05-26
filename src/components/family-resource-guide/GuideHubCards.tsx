// GuideHubCards — magazine-style grid of cards that funnel visitors from the
// Family Resource Guide hub into the dedicated topical guides
// (Private School Guide, Childcare Guide, etc.).
//
// Why this exists: the main FRG page is for DISCOVERY ("what's available
// to me as a mom?"). The actual listings live on each topical guide page.
// This grid is the bridge — visitor lands on FRG, sees what areas of life
// are covered, clicks the one matching their question, lands on a focused
// guide page.
//
// Pattern matches the homepage Featured Categories — colored gradient bg
// with overlay text, hover lift, "Explore →" affordance.

import Link from 'next/link'
import {
  GraduationCap, Baby, Sparkles, Heart, HandHelping, MapPin,
  ArrowRight, BookOpen,
} from 'lucide-react'

interface GuideCard {
  slug:     string
  href:     string
  label:    string
  eyebrow:  string
  blurb:    string
  Icon:     React.ElementType
  // Tailwind gradient class — each card gets its own tone so the grid reads
  // as a magazine spread, not a uniform wall of coral
  gradient: string
  iconTone: string
}

const GUIDES: GuideCard[] = [
  {
    slug:     'private-school-guide',
    href:     '/private-school-guide',
    label:    'Private Schools',
    eyebrow:  'CHOOSING A SCHOOL',
    blurb:    'Faith-based, magnet, and independent schools across the River Region — tuition, timelines, what makes each one distinct.',
    Icon:     GraduationCap,
    gradient: 'from-blue-600/85 via-blue-700/75 to-blue-900/70',
    iconTone: 'text-blue-100',
  },
  {
    slug:     'childcare-guide',
    href:     '/childcare-guide',
    label:    'Childcare',
    eyebrow:  'DAYCARES & PRESCHOOLS',
    blurb:    'Daycares, preschools, and care options sorted by area, hours, and program style. Real moms\' picks included.',
    Icon:     Baby,
    gradient: 'from-pink-500/85 via-rose-500/75 to-rose-700/70',
    iconTone: 'text-pink-50',
  },
  {
    slug:     'afterschool-guide',
    href:     '/afterschool-guide',
    label:    'After-School',
    eyebrow:  'ENRICHMENT & PROGRAMS',
    blurb:    'Tutoring, sports, arts, STEM clubs, and faith programs — what to sign your kids up for once the bell rings.',
    Icon:     Sparkles,
    gradient: 'from-amber-500/85 via-orange-500/75 to-orange-700/70',
    iconTone: 'text-amber-50',
  },
  {
    slug:     'healthy-kids-guide',
    href:     '/healthy-kids-guide',
    label:    'Healthy Kids',
    eyebrow:  'PEDIATRICS & WELLNESS',
    blurb:    'Pediatricians, dentists, therapists, urgent care — building your child\'s care team in the River Region.',
    Icon:     Heart,
    gradient: 'from-emerald-600/85 via-emerald-700/75 to-teal-800/70',
    iconTone: 'text-emerald-50',
  },
  {
    slug:     'special-needs-guide',
    href:     '/special-needs-guide',
    label:    'Special Needs',
    eyebrow:  'SUPPORT & THERAPIES',
    blurb:    'IEP help, ABA, OT, speech, advocacy groups, and inclusive programs supporting families across the spectrum.',
    Icon:     HandHelping,
    gradient: 'from-purple-600/85 via-purple-700/75 to-indigo-800/70',
    iconTone: 'text-purple-50',
  },
  {
    slug:     'newcomer-guide',
    href:     '/newcomer-guide',
    label:    'New to the Area?',
    eyebrow:  'GETTING STARTED',
    blurb:    'The first-month survival guide — neighborhoods, schools, doctors, where to grocery shop, who to follow on Facebook.',
    Icon:     MapPin,
    gradient: 'from-slate-700/85 via-slate-800/75 to-slate-900/70',
    iconTone: 'text-slate-100',
  },
]

export function GuideHubCards() {
  return (
    <section>
      <div className="flex items-end justify-between mb-5 flex-wrap gap-2">
        <div>
          <div className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-primary mb-1.5">
            <BookOpen className="h-3 w-3" />
            Discover the Guides
          </div>
          <h2 className="text-2xl md:text-3xl font-black text-foreground leading-tight">
            Discover the Area's Best Resources for Your Family
          </h2>
        </div>
        <p className="text-sm text-muted-foreground max-w-xs">
          Jump into a focused guide — schools, childcare, care teams, and more.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
        {GUIDES.map(g => {
          const Icon = g.Icon
          return (
            <Link
              key={g.slug}
              href={g.href}
              className="group relative overflow-hidden rounded-2xl aspect-[4/5] md:aspect-[4/3] flex flex-col justify-end hover:shadow-lg transition-shadow"
            >
              {/* Gradient background — gives each card its own visual tone */}
              <div className={`absolute inset-0 bg-gradient-to-br ${g.gradient}`} />

              {/* Decorative icon overlay — subtle, watermark-style top-right */}
              <div className="absolute top-3 right-3 md:top-4 md:right-4 opacity-40 group-hover:opacity-60 transition-opacity">
                <Icon className={`h-10 w-10 md:h-14 md:w-14 ${g.iconTone}`} strokeWidth={1.5} />
              </div>

              {/* Bottom content overlay */}
              <div className="relative p-4 md:p-5 z-10">
                <p className="text-[9px] md:text-[10px] font-bold uppercase tracking-[0.18em] text-white/85 mb-1.5">
                  {g.eyebrow}
                </p>
                <h3 className="text-lg md:text-xl font-black text-white leading-tight mb-1.5 drop-shadow-sm">
                  {g.label}
                </h3>
                <p className="hidden md:block text-xs text-white/85 leading-snug line-clamp-2 mb-3">
                  {g.blurb}
                </p>
                <span className="inline-flex items-center gap-1 text-xs font-bold text-white group-hover:gap-1.5 transition-all">
                  Explore <ArrowRight className="h-3 w-3" />
                </span>
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
