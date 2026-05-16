// FRGHero — full-bleed photo hero for the Family Resource Guide.
// Single primary CTA (no "I'm new here" duality) + search affordance.
// Stats counter mirrors the Summer Fun pattern — instant trust signal.

import Image from 'next/image'
import Link from 'next/link'
import { Search, BookOpen, MapPin, Star } from 'lucide-react'

interface Props {
  /** Editable from /admin/guides/family-resource-guide/edit */
  heroImageUrl?: string | null
  eyebrow?:      string
  title:         string
  subtitle:      string
  listingsCount: number
  townsCount:    number
  bestOfCount:   number
}

export function FRGHero({
  heroImageUrl,
  eyebrow = 'OFFICIAL RIVER REGION GUIDE',
  title,
  subtitle,
  listingsCount,
  townsCount,
  bestOfCount,
}: Props) {
  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-0">
        {heroImageUrl ? (
          <>
            <Image
              src={heroImageUrl}
              alt={title}
              fill
              sizes="100vw"
              style={{ objectFit: 'cover', objectPosition: 'center 40%' }}
              priority
              unoptimized
            />
            <div className="absolute inset-0 bg-gradient-to-br from-black/72 via-black/55 to-black/40" />
          </>
        ) : (
          // No hero set yet — render the site's brand gradient instead of
          // a generic stock photo that doesn't match the theme.
          <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/85 to-secondary/80" />
        )}
      </div>

      <div className="relative container py-16 md:py-24">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 bg-white/15 text-white text-[10px] font-bold uppercase tracking-[0.2em] px-3 py-1.5 rounded-full mb-5 backdrop-blur-sm">
            <Star className="h-3 w-3 fill-amber-300 text-amber-300" />
            {eyebrow}
          </div>

          <h1 className="text-4xl md:text-6xl font-black text-white leading-tight mb-4">
            {title}
          </h1>

          <p className="text-base md:text-xl text-white/90 leading-relaxed max-w-2xl mb-7">
            {subtitle}
          </p>

          <div className="flex flex-col sm:flex-row gap-2.5 mb-6">
            <Link
              href="#directory"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-white text-gray-900 rounded-full text-sm font-bold hover:bg-white/90 transition-colors shadow-sm"
            >
              Find a Service →
            </Link>
            <Link
              href="#best-of"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-white/15 backdrop-blur-sm border border-white/30 text-white rounded-full text-sm font-semibold hover:bg-white/25 transition-colors"
            >
              <Star className="h-3.5 w-3.5" /> Best of the Region
            </Link>
            <Link
              href="#directory"
              className="inline-flex items-center gap-2 px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 text-white/80 rounded-full text-sm hover:bg-white/20 hover:text-white transition-colors min-w-0"
            >
              <Search className="h-4 w-4 shrink-0" />
              <span className="text-xs">Search the guide...</span>
            </Link>
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-white/85">
            <span className="inline-flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5" />
              <strong className="text-white">{listingsCount.toLocaleString()}</strong> listings
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              <strong className="text-white">{townsCount}</strong> towns
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Star className="h-3.5 w-3.5" />
              <strong className="text-white">{bestOfCount}</strong> curated lists
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
