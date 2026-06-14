'use client'

// Newsletter subject line AI helper. Replaces the templated
// `suggestSubjects()` (rule-based, brand-blind) with brand-voice-aware
// Claude output. The templated suggestions are still rendered initially
// (fast, free) — clicking 'Regenerate with AI' swaps them for Claude
// versions tuned to what's actually in the issue.

import { useState } from 'react'
import { Sparkles, Copy, Check, Loader2 } from 'lucide-react'

interface LineupItem { title: string; type: string; blurb?: string }

interface Props {
  publication:    string
  items:          LineupItem[]
  /** Initial template-based suggestions to show before AI is invoked. */
  initialSubjects: string[]
}

export function AINewsletterSubjects({ publication, items, initialSubjects }: Props) {
  const [subjects, setSubjects] = useState<string[]>(initialSubjects)
  const [aiGenerated, setAiGenerated] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [copied,  setCopied]  = useState<number | null>(null)

  async function regenerate() {
    if (items.length === 0) return
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/admin/distribution/ai/newsletter-subjects', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ publication, items }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) { setError(j.error ?? 'AI failed.'); return }
      setSubjects((j.subjects ?? []) as string[])
      setAiGenerated(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally { setLoading(false) }
  }

  function copy(text: string, idx: number) {
    navigator.clipboard.writeText(text).catch(() => {})
    setCopied(idx)
    setTimeout(() => setCopied(null), 1500)
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div className="text-xs fw-700" style={{ color: 'var(--color-portal-sub)', textTransform: 'uppercase', letterSpacing: '.5px' }}>
          Subject line ideas
          {aiGenerated && (
            <span className="badge badge-blue" style={{ marginLeft: 8, textTransform: 'none', letterSpacing: 'normal' }}>
              <Sparkles size={9} style={{ display: 'inline', verticalAlign: -1 }} /> AI-generated
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={regenerate}
          disabled={loading || items.length === 0}
          className="btn btn-blue btn-xs"
          title="Brand-voice-aware subject lines from Claude"
        >
          {loading ? <><Loader2 size={11} className="animate-spin" /> Generating…</> : <><Sparkles size={11} /> Regenerate with AI</>}
        </button>
      </div>
      {error && <div className="alert alert-error" style={{ marginBottom: 6, fontSize: 11 }}>{error}</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {subjects.map((s, idx) => (
          <div
            key={`${idx}-${s}`}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '7px 10px',
              background: 'white',
              border: '1px solid var(--color-portal-border)',
              borderRadius: 6,
            }}
          >
            <div className="text-sm" style={{ flex: 1, minWidth: 0, color: 'var(--color-portal-text)' }}>{s}</div>
            <span className="text-muted text-xs" style={{ fontFamily: 'ui-monospace,monospace' }}>{s.length}c</span>
            <button
              type="button"
              onClick={() => copy(s, idx)}
              className="btn btn-ghost btn-xs"
              title="Copy to clipboard"
            >
              {copied === idx ? <><Check size={10} /> Copied</> : <><Copy size={10} /></>}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
