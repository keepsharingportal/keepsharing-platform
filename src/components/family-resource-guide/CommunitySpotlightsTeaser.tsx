// CommunitySpotlightsTeaser — Family-Resource-Guide block that teases the
// Mom-to-Mom / Teacher / Grands / Play Ball spotlight columns.
//
// Style matches the homepage Community Spotlights card: colored category
// badge per column, soft-tinted card background, round avatar, hover lift.
// Caps at 4 entries (one per rotation column) and ends with a Nominate CTA.
//
// Two layouts:
//   variant="main"    — wide 2-up grid for an 8-col main column (default)
//   variant="sidebar" — single-column stack tuned for a 4-col sidebar

import Link from 'next/link'
import { Users, ArrowRight } from 'lucide-react'
import { columnBadgeStyle, columnTintStyle, columnLabel } from '@/lib/content-taxonomy'
import { getFallback } from '@/lib/image-fallbacks'

export interface SpotlightArticle {
  id:                string
  slug:              string
  title:             string
  hero_image_url:    string | null
  profile_image_url: string | null
  excerpt:           string | null
  column_slug:       string | null
  author_name:       string | null
}

function canonicalRotationKey(slug: string | null): string | null {
  if (!slug) return null
  if (slug === 'teacher-of-the-month')    return 'teacher-of-month'
  if (slug === 'grands-are-the-greatest') return 'grands-greatest'
  return slug
}

interface Props {
  spotlights: SpotlightArticle[]
  variant?:   'main' | 'sidebar'
}

export function CommunitySpotlightsTeaser({ spotlights, variant = 'main' }: Props) {
  const isSidebar = variant === 'sidebar'

  return (
    <section>
      {/* Header — sidebar variant uses a single line, main variant uses the
           homepage-style eyebrow + headline + supporting copy block. */}
      {isSidebar ? (
        <div className="flex items-center gap-2 mb-4">
          <Users className="h-4 w-4 text-secondary" />
          <h3 className="text-base font-bold text-foreground leading-tight">
            The Faces of the River Region
          </h3>
        </div>
      ) : (
        <div className="flex items-end justify-between mb-5 flex-wrap gap-2">
          <div>
            <div className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-primary mb-1.5">
              <Users className="h-3 w-3" />
              Community Spotlights
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-foreground leading-tight">
              The Faces of the River Region
            </h2>
          </div>
          <p className="text-sm text-muted-foreground max-w-xs">
            Teachers, moms, grandparents, and athletes worth celebrating — nominated by you.
          </p>
        </div>
      )}

      {spotlights.length > 0 ? (
        <div className={isSidebar ? 'flex flex-col gap-2.5' : 'grid sm:grid-cols-2 gap-3 md:gap-4'}>
          {spotlights.map(sp => {
            const col       = canonicalRotationKey(sp.column_slug) ?? ''
            const cardTint  = `${columnTintStyle(col)} hover:brightness-95`
            const badgeCls  = columnBadgeStyle(col)
            const labelText = columnLabel(col) !== '—' ? columnLabel(col) : 'Community Spotlight'
            const avatarSrc = sp.profile_image_url || sp.hero_image_url || getFallback(
              col === 'grands-greatest' ? 'person_grandparent'
                : col === 'play-ball'   ? 'person_kid'
                : 'person_woman',
              sp.id,
            )
            const rawCol = sp.column_slug ?? col
            const href   = `/columns/${rawCol}/${sp.slug.replace(new RegExp(`^${rawCol}-`), '')}`
            return (
              <Link
                key={sp.id}
                href={href}
                className={`flex items-center group cursor-pointer rounded-2xl border transition-all ${cardTint} ${
                  isSidebar ? 'gap-3 p-3' : 'gap-4 p-4'
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={avatarSrc}
                  alt={sp.title}
                  className={`rounded-full object-cover group-hover:scale-105 transition-transform border-background shadow-sm shrink-0 ${
                    isSidebar
                      ? 'w-12 h-12 border-2'
                      : 'w-16 h-16 md:w-20 md:h-20 border-2 md:border-4'
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <span className={`inline-block rounded-full text-[10px] font-bold uppercase tracking-wider mb-1 px-2 py-0.5 ${badgeCls}`}>
                    {labelText}
                  </span>
                  <h4 className={`font-bold leading-tight text-foreground line-clamp-2 ${
                    isSidebar ? 'text-sm' : 'text-base md:text-lg'
                  }`}>
                    {sp.title}
                  </h4>
                </div>
              </Link>
            )
          })}
        </div>
      ) : (
        // Empty state — show the four nominate prompts so the block still
        // earns its space when no spotlights have been published yet.
        <div className={isSidebar ? 'flex flex-col gap-2' : 'grid sm:grid-cols-2 gap-3'}>
          {[
            { emoji: '🏆', label: 'Teacher of the Month',     desc: 'Nominate an outstanding River Region educator' },
            { emoji: '⭐', label: 'Student Achievement',       desc: 'Celebrate a student making a difference'       },
            { emoji: '❤️', label: 'Grands are the Greatest',  desc: 'Honor a grandparent who shapes your family'    },
            { emoji: '💬', label: 'Mom to Mom',                desc: 'Share a story from one local mom to another'   },
          ].map(item => (
            <div
              key={item.label}
              className={`flex items-center rounded-2xl bg-muted/30 border border-border/40 ${
                isSidebar ? 'gap-3 p-3' : 'gap-3 p-4'
              }`}
            >
              <span className={isSidebar ? 'text-lg shrink-0' : 'text-2xl shrink-0'}>{item.emoji}</span>
              <div className="min-w-0">
                <p className={`font-semibold text-foreground leading-tight ${isSidebar ? 'text-xs' : 'text-sm'}`}>
                  {item.label}
                </p>
                {!isSidebar && (
                  <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className={isSidebar ? 'mt-4' : 'mt-5 flex justify-center'}>
        <Link
          href="/nominate"
          className={`inline-flex items-center gap-1.5 bg-primary text-primary-foreground rounded-full font-bold hover:bg-primary/90 transition-colors shadow-sm ${
            isSidebar ? 'w-full justify-center px-4 py-2 text-xs' : 'px-6 py-2.5 text-sm'
          }`}
        >
          Nominate Someone <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </section>
  )
}
