'use client'

// AutoTrendingPreview — admin-only window into the auto-fill queue.
//
// The homepage trending bar pins editorial items first, then fills any
// remaining slots (cap 4 total) from the top-viewed pages of the last
// 7 days. The editor previously couldn't see what was queued up — only
// what was currently rendering. This component shows the next ~10
// candidates so they can:
//   1. Preview what'll roll in if they un-pin or remove something.
//   2. Block specific paths from ever auto-filling (one-off campaigns,
//      old advertisers, anything that snuck past the homepage rules).
//
// Both actions hit server actions on the parent page (block / unblock).
// The component stays presentational — no fetch of its own.

import { useTransition } from 'react'
import { Flame, EyeOff, Eye, ExternalLink } from 'lucide-react'

export interface AutoCandidate {
  /** Site path the view was logged for, e.g. /summer-fun-guide. */
  path:         string
  /** Human label resolved via the same logic the homepage uses
   *  (curated landing-page name, article title, or humanized slug). */
  label:        string
  /** Resolved emoji (curated landing pages and articles get an icon,
   *  fallback paths get a flame). */
  emoji:        string | null
  /** Unique-views count over the last 7 days. Drives ordering on the
   *  homepage; shown here so the editor knows why something is high. */
  unique_views: number
}

export interface BlockedPath {
  path:       string
  label:      string | null
  blocked_at: string
}

interface Props {
  candidates:    AutoCandidate[]
  blocked:       BlockedPath[]
  blockAction:   (formData: FormData) => Promise<void>
  unblockAction: (formData: FormData) => Promise<void>
}

export function AutoTrendingPreview({ candidates, blocked, blockAction, unblockAction }: Props) {
  return (
    <div className="space-y-4">
      <AutoSection candidates={candidates} blockAction={blockAction} />
      {blocked.length > 0 && <BlockedSection blocked={blocked} unblockAction={unblockAction} />}
    </div>
  )
}

// ── Section: top auto-trending candidates ──────────────────────────────────

function AutoSection({ candidates, blockAction }: { candidates: AutoCandidate[]; blockAction: Props['blockAction'] }) {
  return (
    <section className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <header className="px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2 mb-1">
          <Flame size={14} className="text-amber-600" />
          <h2 className="text-sm font-bold text-gray-900">Auto-filling — top pages this week</h2>
          <span className="text-[10px] font-bold text-portal-amber bg-portal-amber-lt px-1.5 py-0.5 rounded uppercase tracking-wider">Live preview</span>
        </div>
        <p className="text-xs text-gray-500">
          These pages will fill any empty slots in the bar (after your pinned items). Top of the list rolls in first.
          {' '}Click <strong className="text-gray-700">Block</strong> to keep a path out of the bar permanently.
        </p>
      </header>

      {candidates.length === 0 ? (
        <div className="p-6 text-center text-sm text-gray-400">
          No auto-trending candidates right now. The bar will rely on your pinned items.
        </div>
      ) : (
        <ol className="divide-y divide-gray-50">
          {candidates.map((c, i) => (
            <CandidateRow key={c.path} rank={i + 1} candidate={c} blockAction={blockAction} />
          ))}
        </ol>
      )}
    </section>
  )
}

function CandidateRow({ rank, candidate, blockAction }: { rank: number; candidate: AutoCandidate; blockAction: Props['blockAction'] }) {
  const [isPending, startTransition] = useTransition()

  function onBlock() {
    if (!confirm(`Block "${candidate.label}" from the trending bar? You can unblock it later from this same page.`)) return
    const fd = new FormData()
    fd.set('path',  candidate.path)
    fd.set('label', candidate.label)
    startTransition(() => { void blockAction(fd) })
  }

  return (
    <li className="px-5 py-3 flex items-center gap-3">
      <span className="w-6 text-[11px] font-bold text-gray-400 tabular-nums">#{rank}</span>
      <span className="text-base shrink-0 w-5 text-center" aria-hidden="true">{candidate.emoji ?? '🔥'}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate">{candidate.label}</p>
        <div className="flex items-center gap-3 text-[11px] text-gray-500 mt-0.5">
          <code className="text-[11px] text-gray-500 truncate">{candidate.path}</code>
          <span className="tabular-nums whitespace-nowrap">{candidate.unique_views.toLocaleString()} views / 7d</span>
        </div>
      </div>
      <a
        href={candidate.path}
        target="_blank"
        rel="noreferrer"
        className="text-[11px] font-semibold text-gray-500 hover:text-gray-800 inline-flex items-center gap-1"
        title="Open this path in a new tab to verify it"
      >
        <ExternalLink size={11} /> Open
      </a>
      <button
        type="button"
        onClick={onBlock}
        disabled={isPending}
        className="text-[11px] font-bold text-portal-red hover:text-rose-900 inline-flex items-center gap-1 disabled:opacity-50"
        title="Add this path to the blocklist so it stops auto-filling"
      >
        <EyeOff size={11} /> {isPending ? 'Blocking…' : 'Block'}
      </button>
    </li>
  )
}

// ── Section: blocked paths ─────────────────────────────────────────────────

function BlockedSection({ blocked, unblockAction }: { blocked: BlockedPath[]; unblockAction: Props['unblockAction'] }) {
  return (
    <section className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <header className="px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2 mb-1">
          <EyeOff size={14} className="text-gray-500" />
          <h2 className="text-sm font-bold text-gray-900">Blocked from auto-fill ({blocked.length})</h2>
        </div>
        <p className="text-xs text-gray-500">
          These paths are excluded from the auto-trending pool. Unblock to let them flow back in based on traffic.
        </p>
      </header>
      <ul className="divide-y divide-gray-50">
        {blocked.map(b => (
          <BlockedRow key={b.path} item={b} unblockAction={unblockAction} />
        ))}
      </ul>
    </section>
  )
}

function BlockedRow({ item, unblockAction }: { item: BlockedPath; unblockAction: Props['unblockAction'] }) {
  const [isPending, startTransition] = useTransition()

  function onUnblock() {
    const fd = new FormData()
    fd.set('path', item.path)
    startTransition(() => { void unblockAction(fd) })
  }

  return (
    <li className="px-5 py-3 flex items-center gap-3">
      <span className="text-base shrink-0 w-5 text-center text-gray-300" aria-hidden="true">🚫</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-700 truncate">{item.label ?? item.path}</p>
        <code className="text-[11px] text-gray-500 truncate block">{item.path}</code>
      </div>
      <button
        type="button"
        onClick={onUnblock}
        disabled={isPending}
        className="text-[11px] font-bold text-portal-green hover:text-emerald-900 inline-flex items-center gap-1 disabled:opacity-50"
        title="Remove from the blocklist — this path can fill the bar again"
      >
        <Eye size={11} /> {isPending ? 'Unblocking…' : 'Unblock'}
      </button>
    </li>
  )
}
