// BestOfMasthead — magazine-style lockup used by the Best Of section on
// the FRG home AND by the dedicated /best-of landing page so the brand
// reads identically on both surfaces. Three-line stamp:
//   1. tracked "The" eyebrow
//   2. huge serif "BEST of" wordmark
//   3. italic "for River Region [Families]" with coral last word
// Optional right-aligned action slot for "View All Lists" or similar.

import Link from 'next/link'
import type { ReactNode } from 'react'
import { ArrowRight } from 'lucide-react'

interface Props {
  /** Subtitle shown under the wordmark. */
  subtitle?: string
  /** Right-aligned action (link/button). When omitted, no action rail
   *  is rendered. */
  action?:   ReactNode
  /** Render the wordmark even larger — for standalone landing pages
   *  where the masthead is the focal element, not part of a feed. */
  size?:     'default' | 'large'
}

export function BestOfMasthead({ subtitle, action, size = 'default' }: Props) {
  const wordmarkCls = size === 'large'
    ? 'text-6xl sm:text-7xl md:text-8xl'
    : 'text-5xl sm:text-6xl md:text-7xl'
  const ofCls = size === 'large'
    ? 'text-4xl sm:text-5xl md:text-6xl'
    : 'text-3xl sm:text-4xl md:text-5xl'

  return (
    <div className="mb-6 flex items-end justify-between gap-4 flex-wrap border-b border-border/50 pb-5">
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-muted-foreground mb-1">
          The
        </p>
        <h2 className={`font-serif font-black leading-[0.9] tracking-tight text-foreground ${wordmarkCls} mb-1`}>
          BEST <span className={`font-light italic text-muted-foreground align-baseline ${ofCls}`}>of</span>
        </h2>
        <p className="text-base md:text-lg font-bold tracking-wide italic mt-0.5">
          <span className="text-foreground">for River Region </span>
          <span className="text-primary not-italic">Families</span>
        </p>
        {subtitle && (
          <p className="text-sm text-muted-foreground mt-3 max-w-md">
            {subtitle}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

// Convenience: the default "View All Lists" action used on the FRG home
export function ViewAllListsAction() {
  return (
    <Link
      href="/best-of"
      className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
    >
      View All Lists <ArrowRight className="h-4 w-4" />
    </Link>
  )
}
