// TownsGrid — 5 town cards. Each is a tappable tile with hero photo, vibe
// in one line, population, school district. Links to /family-resource-guide/town/[slug].

import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, MapPin, Users } from 'lucide-react'

interface TownProfile {
  slug:              string
  name:              string
  county:            string | null
  vibe_one_line:     string | null
  hero_image_url:    string | null
  population:        number | null
  school_districts:  string[] | null
}

interface Props {
  towns: TownProfile[]
}

const FALLBACKS: Record<string, string> = {
  montgomery: 'https://images.unsplash.com/photo-1517022812141-23620dba5c23?w=800&q=80&auto=format&fit=crop',
  prattville: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&q=80&auto=format&fit=crop',
  wetumpka:   'https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=800&q=80&auto=format&fit=crop',
  millbrook:  'https://images.unsplash.com/photo-1448375240586-882707db888b?w=800&q=80&auto=format&fit=crop',
  'pike-road':'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&q=80&auto=format&fit=crop',
}

export function TownsGrid({ towns }: Props) {
  return (
    <section id="towns" className="scroll-mt-24">
      <div className="flex items-end justify-between gap-3 mb-5 flex-wrap">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary mb-1">Communities</p>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground" style={{ fontFamily: 'var(--font-fraunces, Georgia, serif)' }}>
            Meet the River Region
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Five towns, one community. Find your fit.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
        {towns.map(t => {
          const src = t.hero_image_url || FALLBACKS[t.slug] || FALLBACKS.montgomery
          return (
            <Link
              key={t.slug}
              href={`/family-resource-guide/town/${t.slug}`}
              className="group flex flex-col rounded-2xl overflow-hidden border border-border/40 bg-card hover:border-primary/30 hover:shadow-md transition-all"
            >
              <div className="relative aspect-[4/3] overflow-hidden">
                <Image
                  src={src}
                  alt={t.name}
                  fill
                  sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 20vw"
                  style={{ objectFit: 'cover' }}
                  className="group-hover:scale-105 transition-transform duration-500"
                  unoptimized
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <p className="text-white font-bold text-base leading-tight" style={{ fontFamily: 'var(--font-fraunces, Georgia, serif)' }}>
                    {t.name}
                  </p>
                  {t.county && (
                    <p className="text-[10px] text-white/80 mt-0.5 inline-flex items-center gap-1">
                      <MapPin className="h-2.5 w-2.5" /> {t.county}
                    </p>
                  )}
                </div>
              </div>
              <div className="p-3 flex flex-col gap-2 flex-1">
                {t.vibe_one_line && (
                  <p className="text-xs text-muted-foreground leading-snug line-clamp-3 flex-1">
                    {t.vibe_one_line}
                  </p>
                )}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/30 mt-auto">
                  {t.population ? (
                    <span className="text-[10px] text-muted-foreground inline-flex items-center gap-1">
                      <Users className="h-2.5 w-2.5" /> {t.population.toLocaleString()}
                    </span>
                  ) : <span />}
                  <span className="text-[10px] font-bold text-primary inline-flex items-center gap-0.5 group-hover:gap-1 transition-all">
                    Explore <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
