// CommunitySpotlightsCrossPromo — three-card strip rendered at the
// bottom of every community spotlight article. Shows the most recent
// article from each of the OTHER three spotlight columns, so a reader
// finishing a Grands feature gets directed to the latest Play Ball /
// Teacher / Mom feature in the same column-branded look.
//
// Replaces the generic "← More in <Column>" back link that was sitting
// alone at the bottom of community spotlights. The back link still has
// its place for non-spotlight columns; this component only renders for
// the four spotlights (Play Ball, Teacher of the Month, Grands Are The
// Greatest, Mom to Mom) and only when there are other-spotlight rows
// to show.

import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight } from 'lucide-react'
import { columnBadgeStyle, columnLabel } from '@/lib/content-taxonomy'
import { articleHref } from '@/lib/articles/slug'
import { getFallback } from '@/lib/image-fallbacks'

export interface SpotlightCrossPromoItem {
  id:             string
  title:          string
  slug:           string | null
  hero_image_url: string | null
  column_slug:    string | null
  author_name?:   string | null
}

interface Props {
  items: SpotlightCrossPromoItem[]
}

export function CommunitySpotlightsCrossPromo({ items }: Props) {
  if (!items || items.length === 0) return null

  return (
    <section className="mt-12 pt-8 border-t border-border/40">
      <header className="mb-5 flex items-end justify-between flex-wrap gap-2">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">
            More Community Spotlights
          </p>
          <h2 className="font-serif text-2xl font-bold text-foreground leading-tight">
            Meet the families behind every column
          </h2>
        </div>
      </header>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map(item => {
          const href = articleHref({
            slug:        item.slug ?? '',
            title:       item.title,
            column_slug: item.column_slug,
          })
          const cardImage = item.hero_image_url
            || getFallback(
                 item.column_slug === 'grands-greatest'  ? 'person_grandparent'
                 : item.column_slug === 'play-ball'     ? 'person_kid'
                 : 'person_woman',
                 item.id,
               )
          const badgeCls = columnBadgeStyle(item.column_slug ?? '')
          const label    = item.column_slug ? columnLabel(item.column_slug) : 'Community Spotlight'
          return (
            <Link
              key={item.id}
              href={href}
              className="group block rounded-2xl overflow-hidden bg-card ring-1 ring-border/50 hover:ring-foreground/30 hover:shadow-md transition-all"
            >
              <div className="relative w-full aspect-[16/9] bg-muted overflow-hidden">
                <Image
                  src={cardImage}
                  alt={item.title}
                  fill
                  style={{ objectFit: 'cover', objectPosition: 'center top' }}
                  className="group-hover:scale-105 transition-transform duration-500"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 380px"
                  unoptimized
                />
              </div>
              <div className="p-4">
                <span className={`inline-block rounded-full text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 mb-2 ${badgeCls}`}>
                  {label}
                </span>
                <h3 className="font-bold text-base leading-snug text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                  {item.title}
                </h3>
                <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-primary group-hover:gap-2 transition-all">
                  Read story <ArrowRight className="h-3 w-3" />
                </span>
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
