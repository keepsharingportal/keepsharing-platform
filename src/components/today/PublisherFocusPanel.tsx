// src/components/today/PublisherFocusPanel.tsx
// Publisher Command Center: top-3 priority actions Jason should take today.
// Derived from OpsSnapshot via deriveFocusActions() — no additional queries.
// Surfaced above everything else so the most important signal is seen first.
// Server component — no interactivity needed.

import Link from 'next/link'
import { Target, ArrowRight, CheckCircle } from 'lucide-react'
import type { FocusAction, HealthLevel } from '@/lib/queries/health'

// ── Styles per urgency ────────────────────────────────────────────────────────

const URGENCY: Record<HealthLevel, {
  border:    string
  badge:     string
  badgeText: string
  number:    string
}> = {
  red: {
    border:    'border-l-portal-red',
    badge:     'bg-portal-red-lt text-portal-red ring-1 ring-portal-red/30',
    badgeText: 'Urgent',
    number:    'text-portal-red',
  },
  amber: {
    border:    'border-l-portal-amber',
    badge:     'bg-portal-amber-lt text-portal-amber ring-1 ring-portal-amber/30',
    badgeText: 'Today',
    number:    'text-portal-amber',
  },
  green: {
    border:    'border-l-portal-green',
    badge:     'bg-portal-green-lt text-portal-green ring-1 ring-portal-green/30',
    badgeText: 'All clear',
    number:    'text-portal-green',
  },
}

// ── All-clear state ───────────────────────────────────────────────────────────

function AllClearPanel({ action }: { action: FocusAction }) {
  return (
    <div className="bg-portal-green-lt border border-portal-green/30 rounded-lg px-4 py-3.5 flex items-center gap-3">
      <CheckCircle size={16} className="text-portal-green shrink-0" />
      <div>
        <p className="text-sm font-semibold text-portal-green">{action.label}</p>
        <p className="text-xs text-portal-green mt-0.5">{action.context}</p>
      </div>
    </div>
  )
}

// ── Individual action card ────────────────────────────────────────────────────

function ActionCard({ action, rank }: { action: FocusAction; rank: number }) {
  const s = URGENCY[action.urgency]
  return (
    <Link href={action.href}>
      <div
        className={`bg-white rounded-lg border border-portal-border border-l-4 ${s.border} px-4 py-3 hover:shadow-md transition-all flex items-start justify-between gap-4 group`}
      >
        <div className="flex items-start gap-3 min-w-0">
          {/* Rank number */}
          <span className={`text-base font-black leading-none mt-0.5 shrink-0 ${s.number}`}>
            {rank}
          </span>

          {/* Label + context */}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-portal-text leading-snug">
                {action.label}
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${s.badge}`}>
                {s.badgeText}
              </span>
            </div>
            <p className="text-xs text-portal-sub mt-0.5 leading-relaxed">
              {action.context}
            </p>
          </div>
        </div>

        {/* Arrow */}
        <ArrowRight
          size={14}
          className="text-portal-border-2 group-hover:text-portal-sub transition-colors mt-0.5 shrink-0"
        />
      </div>
    </Link>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

interface Props {
  actions: FocusAction[]
}

export function PublisherFocusPanel({ actions }: Props) {
  // All-clear: single green action
  if (actions.length === 1 && actions[0].urgency === 'green') {
    return <AllClearPanel action={actions[0]} />
  }

  return (
    <div className="space-y-2">
      {actions.map((action, i) => (
        <ActionCard key={i} action={action} rank={i + 1} />
      ))}
    </div>
  )
}

// ── Section header used in today page ─────────────────────────────────────────

export function FocusHeader() {
  return (
    <div className="flex items-center gap-1.5 mb-2">
      <Target size={13} className="text-portal-text" />
      <span className="text-xs font-bold text-portal-text uppercase tracking-wider">
        Your Focus Today
      </span>
    </div>
  )
}
