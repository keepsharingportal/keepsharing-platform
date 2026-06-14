'use client'

// Drop-in widget for empty homepage/newsletter sections. Replaces the
// "Empty / No content assigned" dead-end with a single AI button that
// returns ranked ghost-card suggestions. Editor approves → server
// action wires the suggestion into the surface + section.
//
// Why client-side: the AI call is fast enough (~2s) that an
// interstitial spinner is fine, and it avoids burning Claude tokens
// on every full-page render.

import { useState } from 'react'
import { Sparkles, Loader2, Check, X } from 'lucide-react'

export interface Candidate {
  id:              string
  title:           string
  type:            string
  blurb?:          string
  freshness_days?: number
}

interface Suggestion {
  id:         string
  score:      number
  reasoning:  string
}

interface Props {
  publication:  string
  surface:      'homepage' | 'newsletter'
  section:      string
  sectionLabel: string
  /** All approved-but-unrouted items the AI can choose from. */
  candidates:   Candidate[]
  /** How many to ask the AI for. Default 3. */
  targetCount?: number
  /** The 'view' query the server action redirects back to. */
  view?:        string
}

export function AISectionFiller({
  publication, surface, section, sectionLabel, candidates, targetCount = 3, view,
}: Props) {
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])

  async function suggest() {
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/admin/distribution/ai/suggest-lineup', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          publication,
          surface,
          section,
          sectionLabel,
          targetCount,
          candidates: candidates.slice(0, 60), // server caps at 80; pre-trim a bit
        }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) { setError(j.error ?? 'AI suggestion failed.'); return }
      setSuggestions((j.suggestions ?? []) as Suggestion[])
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  if (candidates.length === 0) {
    return (
      <p className="text-muted text-xs" style={{ padding: '8px 4px', fontStyle: 'italic' }}>
        No unrouted candidates available. Approve more items in the queue first.
      </p>
    )
  }

  return (
    <div style={{ borderTop: '1px dashed var(--color-portal-border)', paddingTop: 8, marginTop: 4 }}>
      {suggestions.length === 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={suggest}
            disabled={loading}
            className="btn btn-blue btn-xs"
          >
            {loading ? <><Loader2 size={11} className="animate-spin" /> Asking AI…</> : <><Sparkles size={11} /> Suggest {targetCount} for this section</>}
          </button>
          <span className="text-muted text-xs">{candidates.length} unrouted candidates available</span>
        </div>
      )}
      {error && <div className="alert alert-error" style={{ marginTop: 6, fontSize: 11 }}>{error}</div>}

      {suggestions.length > 0 && (
        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {suggestions.map(s => {
            const c = candidates.find(x => x.id === s.id)
            if (!c) return null
            return (
              <div
                key={s.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
                  background: 'rgba(26, 95, 168, 0.04)',
                  border: '1px dashed var(--color-portal-blue)',
                  borderRadius: 8,
                }}
              >
                <Sparkles size={12} color="var(--color-portal-blue)" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="fw-700 text-sm" style={{ color: 'var(--color-portal-text)' }}>{c.title}</div>
                  <div className="text-muted text-xs">
                    {c.type} · {c.freshness_days != null ? `${c.freshness_days}d old` : 'freshness unknown'} · {Math.round(s.score * 100)}% match
                  </div>
                  {s.reasoning && (
                    <div className="text-muted text-xs" style={{ marginTop: 2, fontStyle: 'italic' }}>{s.reasoning}</div>
                  )}
                </div>
                <form action="/admin/distribution" method="POST" style={{ display: 'flex', gap: 4 }}>
                  {/* The form posts directly to the page so the existing
                      server actions handle it; matches the rest of the page's
                      pattern of progressive-enhancement forms. */}
                  <input type="hidden" name="_action" value="applyAISuggestion" />
                  <input type="hidden" name="id" value={c.id} />
                  <input type="hidden" name="surface" value={surface} />
                  <input type="hidden" name="section" value={section} />
                  <input type="hidden" name="v" value={view ?? surface} />
                  <button
                    type="button"
                    onClick={async () => {
                      const res = await fetch('/api/admin/distribution/apply-suggestion', {
                        method:  'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body:    JSON.stringify({ id: c.id, surface, section }),
                      })
                      if (res.ok) {
                        // Reload to refresh the page with the assignment in place
                        window.location.reload()
                      } else {
                        const j = await res.json().catch(() => ({}))
                        setError(j.error ?? 'Apply failed.')
                      }
                    }}
                    className="btn btn-primary btn-xs"
                    title="Assign this suggestion to the section"
                  >
                    <Check size={10} /> Assign
                  </button>
                  <button
                    type="button"
                    onClick={() => setSuggestions(prev => prev.filter(x => x.id !== s.id))}
                    className="btn btn-ghost btn-xs"
                    title="Reject this suggestion"
                  >
                    <X size={10} />
                  </button>
                </form>
              </div>
            )
          })}
          <button
            type="button"
            onClick={suggest}
            disabled={loading}
            className="text-xs text-portal-sub hover:text-portal-text"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', textAlign: 'left' }}
          >
            ↻ Regenerate suggestions
          </button>
        </div>
      )}
    </div>
  )
}
