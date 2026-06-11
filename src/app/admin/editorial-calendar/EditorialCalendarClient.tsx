'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Sparkles, ChevronDown, ChevronRight, Check, X, FileText, ExternalLink } from 'lucide-react'
import { MARKETS, marketDisplayName } from '@/lib/markets'
import type { SuggestionRow, RunRow } from './page'
import { generateCalendarAction, acceptSuggestionAction, dismissSuggestionAction } from './actions'

interface Props {
  currentBrand:  string
  suggestions:   SuggestionRow[]
  runs:          RunRow[]
}

export function EditorialCalendarClient({ currentBrand, suggestions, runs }: Props) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState<string | null>(null)
  const lastRun = runs[0]

  const pending_ = suggestions.filter(s => s.status === 'pending')
  const acted    = suggestions.filter(s => s.status !== 'pending')

  function generate() {
    setMsg(null)
    start(async () => {
      const out = await generateCalendarAction(currentBrand)
      setMsg(out.ok ? `Generated ${out.count} suggestions.` : `Error: ${out.error}`)
    })
  }

  return (
    <div className="space-y-6">
      <section className="bg-white border border-portal-border rounded-lg p-5">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold uppercase tracking-wider text-portal-sub">Brand:</span>
              <select
                value={currentBrand}
                onChange={e => router.push(`/admin/editorial-calendar?brand=${e.target.value}`)}
                className="text-xs px-2 py-1.5 border border-portal-border rounded-md bg-white"
              >
                {MARKETS.map(m => <option key={m.slug} value={m.slug}>{m.displayName}</option>)}
              </select>
            </div>
            {lastRun && (
              <p className="text-[11px] text-portal-muted mt-2">
                Last run {new Date(lastRun.started_at).toLocaleString()}
                {lastRun.suggestion_count !== null && ` — ${lastRun.suggestion_count} suggestions from ${lastRun.query_count_analyzed} queries`}
                {lastRun.error && <span className="text-red-700"> · error: {lastRun.error}</span>}
              </p>
            )}
          </div>
          <button
            onClick={generate}
            disabled={pending}
            className="text-xs font-bold text-white bg-portal-blue hover:bg-portal-blue-dk px-3 py-1.5 rounded-md disabled:opacity-50 inline-flex items-center gap-1.5"
          >
            <Sparkles size={11} className={pending ? 'animate-pulse' : ''} />
            {pending ? 'Generating…' : 'Generate suggestions for ' + marketDisplayName(currentBrand)}
          </button>
        </div>
        {msg && <p className="mt-2 text-[11px] text-portal-sub">{msg}</p>}
      </section>

      {pending_.length > 0 && (
        <section>
          <h2 className="text-xs font-bold uppercase tracking-wider text-portal-sub mb-3">Pending review ({pending_.length})</h2>
          <ul className="space-y-3">
            {pending_.map(s => <SuggestionCard key={s.id} suggestion={s} />)}
          </ul>
        </section>
      )}

      {acted.length > 0 && (
        <section>
          <h2 className="text-xs font-bold uppercase tracking-wider text-portal-sub mb-3">Already actioned</h2>
          <ul className="space-y-2 text-xs">
            {acted.slice(0, 20).map(s => (
              <li key={s.id} className="border border-portal-border rounded-md p-3 flex items-center gap-2">
                <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${
                  s.status === 'accepted'     ? 'text-portal-green bg-portal-green-lt border border-portal-green/30' :
                  s.status === 'commissioned' ? 'text-portal-blue  bg-portal-blue-lt  border border-portal-blue/30'  :
                                                'text-portal-muted bg-portal-bg       border border-portal-border'
                }`}>{s.status}</span>
                <span className="text-portal-text">{s.working_headline}</span>
                {s.acted_article_id && (
                  <Link href={`/admin/articles/${s.acted_article_id}/edit`} className="ml-auto text-[11px] text-portal-blue hover:underline inline-flex items-center gap-1">
                    Open <ExternalLink size={9} />
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {pending_.length === 0 && acted.length === 0 && (
        <div className="bg-white border border-portal-border rounded-lg p-8 text-center text-xs text-portal-sub">
          No suggestions yet. Hit Generate above.
        </div>
      )}
    </div>
  )
}

function SuggestionCard({ suggestion }: { suggestion: SuggestionRow }) {
  const [expanded, setExpanded] = useState(false)
  const [headline, setHeadline] = useState(suggestion.working_headline)
  const [dismissReason, setDismissReason] = useState('')
  const [showDismiss, setShowDismiss] = useState(false)
  const [pending, start] = useTransition()
  const [err, setErr] = useState<string | null>(null)
  const queries = (suggestion.evidence as { queries?: string[] }).queries ?? []
  const evidenceType = (suggestion.evidence as { type?: string }).type ?? null

  function accept() {
    setErr(null)
    start(async () => {
      const out = await acceptSuggestionAction({ suggestionId: suggestion.id, headline })
      if (!out.ok) setErr(out.error)
    })
  }

  function dismiss() {
    setErr(null)
    start(async () => {
      const out = await dismissSuggestionAction(suggestion.id, dismissReason)
      if (!out.ok) setErr(out.error)
    })
  }

  return (
    <li className="bg-white border border-portal-border rounded-lg overflow-hidden">
      <button onClick={() => setExpanded(e => !e)} className="w-full px-4 py-3 hover:bg-portal-bg flex items-start gap-3 text-left">
        {expanded ? <ChevronDown size={14} className="text-portal-muted shrink-0 mt-0.5" /> : <ChevronRight size={14} className="text-portal-muted shrink-0 mt-0.5" />}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${
              suggestion.priority === 'high'  ? 'text-red-700 bg-red-50 border border-red-200' :
              suggestion.priority === 'low'   ? 'text-portal-muted bg-portal-bg border border-portal-border' :
                                                'text-portal-amber bg-portal-amber-lt border border-portal-amber/30'
            }`}>{suggestion.priority}</span>
            {evidenceType && (
              <span className="text-[10px] font-bold uppercase tracking-wider text-portal-sub bg-portal-bg border border-portal-border px-1.5 py-0.5 rounded-full">
                {evidenceType}
              </span>
            )}
            {suggestion.target_column && (
              <span className="text-[10px] font-bold uppercase tracking-wider text-portal-blue bg-portal-blue-lt border border-portal-blue/30 px-1.5 py-0.5 rounded-full">
                {suggestion.target_column}
              </span>
            )}
          </div>
          <h3 className="text-sm font-bold text-portal-text leading-snug">{suggestion.working_headline}</h3>
          <p className="text-[11px] text-portal-sub mt-1">{suggestion.angle}</p>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-1 space-y-3 border-t border-portal-border bg-portal-bg/40 text-xs">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-portal-sub">Rationale</p>
            <p className="text-portal-text mt-0.5">{suggestion.rationale}</p>
          </div>
          {suggestion.format_suggestion && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-portal-sub">Format</p>
              <p className="text-portal-text mt-0.5">{suggestion.format_suggestion}</p>
            </div>
          )}
          {queries.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-portal-sub">Evidence — search queries driving this</p>
              <ul className="mt-1 space-y-0.5">
                {queries.map((q, i) => (
                  <li key={i} className="text-portal-text font-mono text-[11px]">&quot;{q}&quot;</li>
                ))}
              </ul>
            </div>
          )}

          <div className="pt-2 border-t border-portal-border space-y-2">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-portal-sub mb-1">Working headline (edit before accepting)</label>
              <input
                value={headline}
                onChange={e => setHeadline(e.target.value)}
                className="w-full text-xs px-2 py-1.5 border border-portal-border rounded-md bg-white"
              />
            </div>
            {err && <p className="text-[11px] text-red-700">{err}</p>}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={accept}
                disabled={pending}
                className="text-xs font-bold text-white bg-portal-green hover:bg-portal-green-dk px-3 py-1.5 rounded-md disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                <FileText size={11} /> {pending ? 'Creating…' : 'Accept → create article draft'}
              </button>
              {!showDismiss ? (
                <button onClick={() => setShowDismiss(true)} className="text-xs font-bold text-red-700 hover:text-red-900 inline-flex items-center gap-1">
                  <X size={11} /> Dismiss
                </button>
              ) : (
                <div className="flex items-center gap-2 flex-1">
                  <input
                    value={dismissReason}
                    onChange={e => setDismissReason(e.target.value)}
                    placeholder="Why dismiss? (fed back into next run)"
                    className="flex-1 text-xs px-2 py-1.5 border border-portal-border rounded-md bg-white"
                  />
                  <button onClick={dismiss} disabled={pending} className="text-xs font-bold text-white bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded-md disabled:opacity-50">
                    Dismiss
                  </button>
                  <button onClick={() => setShowDismiss(false)} className="text-xs font-bold text-portal-sub hover:text-portal-text">Cancel</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </li>
  )
}
