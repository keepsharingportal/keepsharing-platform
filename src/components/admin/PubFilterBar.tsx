// ── src/components/admin/PubFilterBar.tsx ────────────────────────────────────
// Shared publication filter chip strip.
// Used in intelligence, engagement, and distribution admin dashboards.
// Supports light (default) and dark (navy header) visual variants.
// ─────────────────────────────────────────────────────────────────────────────

import Link from 'next/link'

const PUBS = ['rrp', 'mbp', 'aop', 'esp', 'gpp', 'boom'] as const

interface PubFilterBarProps {
  /** Currently active publication slug, or null for "All" */
  activePub: string | null
  /**
   * Function that returns the href for a given pub selection.
   * Called with null for the "All" option, and with each pub slug.
   * Example: (p) => p ? `/admin/intelligence?pub=${p}` : `/admin/intelligence`
   */
  makeHref: (pub: string | null) => string
  /** Visual context. 'dark' = white text on navy header. 'light' = default gray. */
  variant?: 'light' | 'dark'
  /** Extra className applied to the wrapping div */
  className?: string
}

export function PubFilterBar({
  activePub, makeHref, variant = 'light', className = '',
}: PubFilterBarProps) {
  if (variant === 'dark') {
    return (
      <div className={`flex gap-1.5 flex-wrap ${className}`}>
        <Link
          href={makeHref(null)}
          className={`text-[11px] px-2.5 py-1 rounded-lg font-semibold transition-colors ${
            !activePub
              ? 'bg-white/20 text-white'
              : 'text-white/40 hover:text-white hover:bg-white/10'
          }`}
        >
          All
        </Link>
        {PUBS.map(p => (
          <Link
            key={p}
            href={makeHref(p)}
            className={`text-[11px] px-2.5 py-1 rounded-lg font-semibold uppercase transition-colors ${
              activePub === p
                ? 'bg-white/20 text-white'
                : 'text-white/40 hover:text-white hover:bg-white/10'
            }`}
          >
            {p}
          </Link>
        ))}
      </div>
    )
  }

  return (
    <div className={`flex gap-1 flex-wrap ${className}`}>
      <Link
        href={makeHref(null)}
        className={`text-[11px] px-2.5 py-1.5 rounded-lg font-semibold transition-colors ${
          !activePub
            ? 'bg-gray-900 text-white'
            : 'bg-white border border-portal-border text-portal-sub hover:bg-portal-bg'
        }`}
      >
        All
      </Link>
      {PUBS.map(p => (
        <Link
          key={p}
          href={makeHref(p)}
          className={`text-[11px] px-2.5 py-1.5 rounded-lg font-semibold uppercase transition-colors ${
            activePub === p
              ? 'bg-gray-900 text-white'
              : 'bg-white border border-portal-border text-portal-sub hover:bg-portal-bg'
          }`}
        >
          {p}
        </Link>
      ))}
    </div>
  )
}
