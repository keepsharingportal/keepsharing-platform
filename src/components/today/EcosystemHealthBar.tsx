// src/components/today/EcosystemHealthBar.tsx
// Compact 6-area ecosystem health strip for the Publisher Command Center.
// Each pill shows one area's health level and links directly to the relevant admin page.
// Hover reveals the one-line status summary via native title tooltip.
// Server component — no interactivity needed.

import Link from 'next/link'
import type { EcosystemHealth, HealthArea, HealthLevel } from '@/lib/queries/health'

// ── Styles per level ──────────────────────────────────────────────────────────

const LEVEL: Record<HealthLevel, {
  dot:     string
  pill:    string
  label:   string
  overall: string
}> = {
  green: {
    dot:     'bg-portal-green-lt0',
    pill:    'bg-portal-green-lt hover:bg-green-100 ring-1 ring-green-200',
    label:   'text-green-700',
    overall: 'text-portal-green',
  },
  amber: {
    dot:     'bg-amber-400',
    pill:    'bg-amber-50 hover:bg-amber-100 ring-1 ring-amber-200',
    label:   'text-amber-700',
    overall: 'text-amber-600',
  },
  red: {
    dot:     'bg-red-500',
    pill:    'bg-red-50 hover:bg-red-100 ring-1 ring-red-200',
    label:   'text-red-700',
    overall: 'text-red-600',
  },
}

// ── Individual health pill ────────────────────────────────────────────────────

function HealthPill({ area }: { area: HealthArea }) {
  const s = LEVEL[area.level]
  return (
    <Link
      href={area.href}
      title={area.summary}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-colors cursor-pointer ${s.pill}`}
    >
      <span className={`w-2 h-2 rounded-full shrink-0 ${s.dot}`} />
      <span className={`text-xs font-semibold whitespace-nowrap ${s.label}`}>{area.label}</span>
    </Link>
  )
}

// ── Overall summary line ──────────────────────────────────────────────────────

function OverallSummary({ health }: { health: EcosystemHealth }) {
  const areas: HealthArea[] = [
    health.editorial, health.community, health.newsletter,
    health.partner, health.social,
    ...(health.familyFavs ? [health.familyFavs] : []),
  ]
  const redCount   = areas.filter(a => a.level === 'red').length
  const amberCount = areas.filter(a => a.level === 'amber').length
  const s = LEVEL[health.overall]

  const text = redCount > 0
    ? `${redCount} area${redCount > 1 ? 's' : ''} need${redCount === 1 ? 's' : ''} immediate attention`
    : amberCount > 0
    ? `${amberCount} area${amberCount > 1 ? 's' : ''} need${amberCount === 1 ? 's' : ''} attention`
    : 'All systems healthy'

  return <span className={`text-xs font-semibold ${s.overall}`}>{text}</span>
}

// ── Main export ───────────────────────────────────────────────────────────────

export function EcosystemHealthBar({ health }: { health: EcosystemHealth }) {
  const areas: HealthArea[] = [
    health.editorial,
    health.community,
    health.newsletter,
    health.partner,
    health.social,
    ...(health.familyFavs ? [health.familyFavs] : []),
  ]

  return (
    <div className="bg-white rounded-lg border border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
          Ecosystem Health
        </span>
        <OverallSummary health={health} />
      </div>
      <div className="flex flex-wrap gap-2">
        {areas.map(area => <HealthPill key={area.label} area={area} />)}
      </div>
    </div>
  )
}
