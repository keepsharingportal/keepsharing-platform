// MoreInSeries — sidebar card showing the 3 most recent articles from
// the same column (excluding the current). Drives reader retention on
// spotlight columns: a reader who lands on "Mom to Mom: Phyllis Palmer"
// sees thumbnails of the last 3 Mom to Mom features and clicks through.

import Image from 'next/image'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { getColumnBrand } from '@/lib/articles/column-brand'
import { articleHref } from '@/lib/articles/slug'

export interface SeriesItem {
  id:             string
  title:          string
  slug:           string
  column_slug:    string | null
  hero_image_url: string | null
  date_label:     string
}

interface Props {
  items:      SeriesItem[]
  columnSlug: string | null
  /** Used in the "View All" link at the bottom — e.g. "View All Grands Stories". */
  columnDisplay?: string | null
}

export function MoreInSeries({ items, columnSlug, columnDisplay }: Props) {
  if (items.length === 0 || !columnSlug) return null

  const brand    = getColumnBrand(columnSlug)
  const isSoft   = brand.style === 'soft'
  const bgColor  = isSoft ? (brand.softBg     ?? brand.primary + '0e') : '#ffffff'
  const borderColor = isSoft ? (brand.softBorder ?? brand.primary + '22') : 'rgba(0,0,0,0.08)'
  const labelColor  = brand.primary

  return (
    <div
      className="rounded-2xl overflow-hidden border shadow-sm"
      style={{ backgroundColor: bgColor, borderColor }}
    >
      <div className="px-4 py-3 border-b" style={{ borderBottomColor: borderColor }}>
        <p className="text-[10px] md:text-xs font-black uppercase tracking-widest" style={{ color: labelColor }}>
          More in This Series
        </p>
      </div>
      <ul className="divide-y" style={{ ['--div-color' as string]: borderColor }}>
        {items.map(it => (
          <li key={it.id} className="border-t first:border-t-0" style={{ borderTopColor: borderColor }}>
            <Link
              href={articleHref({ slug: it.slug, title: it.title, column_slug: it.column_slug })}
              className="flex items-center gap-3 p-3 md:p-4 hover:bg-black/5 transition-colors group"
            >
              {it.hero_image_url && (
                <div className="relative w-14 h-14 md:w-16 md:h-16 rounded-lg overflow-hidden bg-muted shrink-0 ring-1 ring-black/5">
                  <Image
                    src={it.hero_image_url}
                    alt={it.title}
                    fill
                    className="object-cover"
                    sizes="64px"
                    unoptimized
                  />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm leading-snug text-foreground line-clamp-2 group-hover:opacity-80">
                  {it.title}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{it.date_label}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
      <Link
        href={`/columns/${columnSlug}`}
        className="flex items-center justify-center gap-1.5 px-4 py-3 text-xs md:text-sm font-bold uppercase tracking-wider border-t hover:bg-black/5 transition-colors"
        style={{ color: brand.primary, borderTopColor: borderColor }}
      >
        View All {columnDisplay ?? brand.label} Stories
        <ChevronRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  )
}
