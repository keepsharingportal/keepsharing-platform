'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, Check, X, Loader2, ChevronDown } from 'lucide-react'
import { SPONSOR_CATEGORIES, categoryLabel } from '@/lib/sponsors/categories'

export interface SponsorRow {
  id:             string
  business_name:  string
  business_url:   string | null
  ops_notes:      string | null
  package_tier:   string | null
  lifecycle_stage: string | null
}

interface Suggestion {
  slug:       string | null
  confidence: number
  reasoning:  string
}

interface Props { sponsors: SponsorRow[] }

const CONFIDENCE_HIGH = 0.75   // green chip + safe for "approve all confident"
const CONFIDENCE_MED  = 0.50   // amber chip — review individually

export function SponsorCategorizeClient({ sponsors }: Props) {
  const router = useRouter()

  // Local working copy. `selectedSlug` is what gets PATCHed when the editor
  // hits Approve; it starts as the AI suggestion (if any) and the editor
  // can override via the dropdown.
  type RowState = {
    suggestion: Suggestion | null
    selectedSlug: string
    saved:      boolean
    skipped:    boolean
    saving:     boolean
  }
  const [state, setState] = useState<Record<string, RowState>>(() =>
    Object.fromEntries(sponsors.map(s => [s.id, {
      suggestion: null, selectedSlug: '', saved: false, skipped: false, saving: false,
    }]))
  )
  const [busyAll, setBusyAll]   = useState(false)
  const [err,     setErr]       = useState<string | null>(null)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)

  function patchRow(id: string, p: Partial<RowState>) {
    setState(prev => ({ ...prev, [id]: { ...prev[id], ...p } }))
  }

  // ── Suggest for all unsuggested rows ──────────────────────────────────
  async function suggestAll() {
    const targets = sponsors.filter(s => {
      const st = state[s.id]
      return !st.suggestion && !st.saved && !st.skipped
    })
    if (targets.length === 0) return
    setBusyAll(true); setErr(null)
    setProgress({ done: 0, total: targets.length })
    try {
      // Batch in groups of 25 (server caps each call at 25 too — we just
      // pre-batch so the UI can show progress).
      const BATCH = 25
      for (let i = 0; i < targets.length; i += BATCH) {
        const slice = targets.slice(i, i + BATCH)
        const res = await fetch('/api/admin/distribution/sponsor-categorize', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ ids: slice.map(s => s.id) }),
        })
        const j = await res.json().catch(() => ({}))
        if (!res.ok) {
          setErr(j.error ?? 'AI suggestion failed.')
          break
        }
        const suggestions = (j.suggestions ?? []) as Array<{ id: string; slug: string | null; confidence: number; reasoning: string }>
        setState(prev => {
          const next = { ...prev }
          for (const s of suggestions) {
            next[s.id] = {
              ...next[s.id],
              suggestion: { slug: s.slug, confidence: s.confidence, reasoning: s.reasoning },
              selectedSlug: s.slug ?? next[s.id].selectedSlug,
            }
          }
          return next
        })
        setProgress({ done: Math.min(i + BATCH, targets.length), total: targets.length })
      }
    } finally {
      setBusyAll(false)
      setProgress(null)
    }
  }

  // ── Approve one row ────────────────────────────────────────────────────
  async function approve(id: string) {
    const slug = state[id].selectedSlug
    if (!slug) return
    patchRow(id, { saving: true })
    try {
      const res = await fetch('/api/admin/distribution/sponsor-categorize', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ id, slug }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) { setErr(j.error ?? 'Save failed.'); patchRow(id, { saving: false }); return }
      patchRow(id, { saved: true, saving: false })
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
      patchRow(id, { saving: false })
    }
  }

  // ── Approve every confident suggestion at once ────────────────────────
  async function approveAllConfident() {
    const confident = sponsors.filter(s => {
      const st = state[s.id]
      return st.suggestion && (st.suggestion.confidence ?? 0) >= CONFIDENCE_HIGH && st.selectedSlug && !st.saved && !st.skipped
    })
    if (confident.length === 0) return
    if (!confirm(`Approve ${confident.length} high-confidence categorization${confident.length === 1 ? '' : 's'}?`)) return
    setBusyAll(true)
    try {
      for (const s of confident) await approve(s.id)
      router.refresh()
    } finally { setBusyAll(false) }
  }

  function skip(id: string) {
    patchRow(id, { skipped: true })
  }

  // ── Summary numbers ────────────────────────────────────────────────────
  const stats = sponsors.reduce((acc, s) => {
    const st = state[s.id]
    if (st.saved)   acc.saved   += 1
    else if (st.skipped) acc.skipped += 1
    else if (st.suggestion) {
      acc.suggested += 1
      if ((st.suggestion.confidence ?? 0) >= CONFIDENCE_HIGH) acc.high += 1
      else if ((st.suggestion.confidence ?? 0) >= CONFIDENCE_MED) acc.med += 1
    } else acc.unsuggested += 1
    return acc
  }, { saved: 0, skipped: 0, suggested: 0, unsuggested: 0, high: 0, med: 0 })

  return (
    <>
      {err && <div className="alert alert-error mb-3">{err}</div>}

      <div className="stats-row" style={{ marginBottom: 14 }}>
        <div className="stat-card">
          <div className="stat-num">{sponsors.length - stats.saved - stats.skipped}</div>
          <div className="stat-label">Remaining</div>
        </div>
        <div className="stat-card">
          <div className="stat-num has-amber">{stats.high}</div>
          <div className="stat-label">High-confidence suggestions</div>
        </div>
        <div className="stat-card">
          <div className="stat-num">{stats.saved}</div>
          <div className="stat-label">Saved this session</div>
        </div>
        <div className="stat-card">
          <div className="stat-num has-amber">{stats.unsuggested}</div>
          <div className="stat-label">Awaiting AI suggestion</div>
        </div>
      </div>

      {/* Action bar */}
      <div className="card" style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <button
          type="button" onClick={suggestAll}
          disabled={busyAll || stats.unsuggested === 0}
          className="btn btn-primary btn-sm"
        >
          {busyAll && progress
            ? <><Loader2 size={12} className="animate-spin" /> Suggesting {progress.done}/{progress.total}…</>
            : <><Sparkles size={12} /> Suggest with AI ({stats.unsuggested})</>}
        </button>
        <button
          type="button" onClick={approveAllConfident}
          disabled={busyAll || stats.high === 0}
          className="btn btn-green btn-sm"
        >
          <Check size={12} /> Approve all high-confidence ({stats.high})
        </button>
        <div className="text-muted text-xs" style={{ marginLeft: 'auto' }}>
          High-confidence ≥{Math.round(CONFIDENCE_HIGH * 100)}% &middot; Review medium individually &middot; Low + null require manual select
        </div>
      </div>

      {/* Sponsor rows */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Sponsor</th>
              <th style={{ width: 320 }}>Suggested category</th>
              <th>Editor selection</th>
              <th style={{ width: 160, textAlign: 'right' }} />
            </tr>
          </thead>
          <tbody>
            {sponsors.map(s => {
              const st = state[s.id]
              if (st.skipped) return null
              const conf = st.suggestion?.confidence ?? 0
              const confBadge = conf >= CONFIDENCE_HIGH ? 'badge-green'
                              : conf >= CONFIDENCE_MED  ? 'badge-amber'
                                                        : 'badge-gray'
              return (
                <tr key={s.id} style={{ opacity: st.saved ? 0.55 : 1 }}>
                  <td>
                    <div className="fw-700">{s.business_name}</div>
                    <div className="text-muted text-xs">
                      {s.package_tier ?? 'no tier'} · {s.lifecycle_stage ?? 'no stage'}
                    </div>
                    {s.business_url && <div className="text-muted text-xs" style={{ maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.business_url}</div>}
                  </td>
                  <td>
                    {!st.suggestion && (
                      <span className="text-muted text-xs">— not yet suggested —</span>
                    )}
                    {st.suggestion && !st.suggestion.slug && (
                      <>
                        <span className="badge badge-red" style={{ marginBottom: 4 }}>Couldn&apos;t determine</span>
                        <div className="text-muted text-xs" style={{ marginTop: 4 }}>{st.suggestion.reasoning}</div>
                      </>
                    )}
                    {st.suggestion?.slug && (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <span className="fw-600 text-sm">{categoryLabel(st.suggestion.slug)}</span>
                          <span className={`badge ${confBadge}`}>{Math.round(conf * 100)}%</span>
                        </div>
                        {st.suggestion.reasoning && (
                          <div className="text-muted text-xs" style={{ marginTop: 4 }}>{st.suggestion.reasoning}</div>
                        )}
                      </>
                    )}
                  </td>
                  <td>
                    <div style={{ position: 'relative' }}>
                      <select
                        value={st.selectedSlug}
                        onChange={e => patchRow(s.id, { selectedSlug: e.target.value })}
                        disabled={st.saved || st.saving}
                        style={{
                          width: '100%',
                          padding: '6px 26px 6px 10px',
                          border: '1.5px solid var(--color-portal-border)',
                          borderRadius: 6,
                          fontSize: 12,
                          background: 'white',
                          appearance: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        <option value="">— select category —</option>
                        {SPONSOR_CATEGORIES.map(c => (
                          <option key={c.slug} value={c.slug}>{c.label}</option>
                        ))}
                      </select>
                      <ChevronDown size={12} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--color-portal-sub)' }} />
                    </div>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {st.saved ? (
                      <span className="badge badge-green"><Check size={9} style={{ display: 'inline', verticalAlign: -1 }} /> Saved</span>
                    ) : (
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4 }}>
                        <button
                          type="button"
                          onClick={() => approve(s.id)}
                          disabled={!st.selectedSlug || st.saving}
                          className="btn btn-primary btn-xs"
                        >
                          {st.saving ? <Loader2 size={10} className="animate-spin" /> : <><Check size={10} /> Approve</>}
                        </button>
                        <button
                          type="button"
                          onClick={() => skip(s.id)}
                          disabled={st.saving}
                          className="btn btn-ghost btn-xs"
                          title="Skip for now"
                        >
                          <X size={10} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p className="text-muted text-xs" style={{ marginTop: 10, textAlign: 'center' }}>
        Skipped rows reappear next time you open this page. Saved rows write
        to <code>advertiser_accounts.sponsor_category_slug</code> immediately
        and stop blocking the sponsor-alignment matcher on Content Deployment.
      </p>
    </>
  )
}
