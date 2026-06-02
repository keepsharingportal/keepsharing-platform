// Site-wide breadcrumb trail. Used on detail pages where the reader
// has drilled in from a landing page (event detail, article, guide
// listing, spotlight subject, etc).
//
// Renders a small chevron-separated trail above the page header AND
// emits a JSON-LD BreadcrumbList script so Google's rich results pick
// the trail up automatically — no per-page schema wiring.
//
// Use one Breadcrumbs per page; pass an items array in source order
// (Home → ... → current). The last item renders as plain text (no
// link) since it's "you are here."

import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

export interface BreadcrumbItem {
  label: string
  /** Omit on the current page (last item). */
  href?: string
}

interface Props {
  items: BreadcrumbItem[]
  /** Optional class on the outer wrapper for layout integration. */
  className?: string
}

export function Breadcrumbs({ items, className }: Props) {
  if (items.length === 0) return null

  // BreadcrumbList JSON-LD — see https://schema.org/BreadcrumbList.
  // We always include the first item (Home) and skip the current page
  // from the schema if it doesn't have an href, since Google expects
  // every listed item to be a URL.
  const ld = {
    '@context': 'https://schema.org',
    '@type':    'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type':    'ListItem',
      position:   i + 1,
      name:       it.label,
      ...(it.href ? { item: it.href } : {}),
    })),
  }

  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex items-center gap-1.5 text-sm flex-wrap">
        {items.map((it, i) => {
          const isLast = i === items.length - 1
          return (
            <li key={`${it.label}-${i}`} className="flex items-center gap-1.5 min-w-0">
              {it.href && !isLast ? (
                <Link
                  href={it.href}
                  className="text-muted-foreground hover:text-primary transition-colors font-medium truncate max-w-[14rem]"
                >
                  {it.label}
                </Link>
              ) : (
                <span
                  className={`truncate max-w-[20rem] ${isLast ? 'text-foreground font-semibold' : 'text-muted-foreground'}`}
                  aria-current={isLast ? 'page' : undefined}
                >
                  {it.label}
                </span>
              )}
              {!isLast && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />}
            </li>
          )
        })}
      </ol>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }}
      />
    </nav>
  )
}
