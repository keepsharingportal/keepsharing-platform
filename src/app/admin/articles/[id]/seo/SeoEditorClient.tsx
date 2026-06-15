'use client'

// Client editor for /admin/articles/[id]/seo. Two columns:
//   - Left: the form (SEO title / description / focus keyword / etc.)
//     + the live Google SERP preview + the analyzer score breakdown
//   - Right: AI assist controls + recent-audit metadata
//
// Save triggers /api/admin/seo/save which writes overrides + reruns the
// analyzer + returns the new score; AI assist triggers /api/admin/seo/assist
// which returns suggestions (editor reviews + clicks Apply).

import { useState }   from 'react'
import { Sparkles, RotateCw, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react'
import type { FactorResult } from '@/lib/seo/content-analyzer'
import { SerpPreview } from '@/components/seo/SerpPreview'

interface Props {
  articleId:            string
  brandSlug:            string
  fallbackTitle:        string
  fallbackDescription:  string | null
  slug:                 string
  columnSlug:           string | null
  /** When arrived from a weekly-audit "Open in editor" link, the audit's
   *  recommendation text rides along so the editor can show a pending banner. */
  pendingSuggestion?:   string | null
  fromAuditId?:         string | null
  initial: {
    seoTitle:             string | null
    seoDescription:       string | null
    seoFocusKeyword:      string | null
    seoSecondaryKeywords: string[]
    seoCanonicalOverride: string | null
    seoNoIndex:           boolean
    score:                number
    breakdown:            FactorResult[]
    grade:                'excellent' | 'good' | 'needs-work' | 'poor'
    lastAuditedAt:        string | null
  }
}

export function SeoEditorClient(props: Props) {
  const { articleId, brandSlug, fallbackTitle, fallbackDescription, slug, columnSlug, initial, pendingSuggestion, fromAuditId } = props
  const [suggestionDismissed, setSuggestionDismissed] = useState(false)

  const [seoTitle,         setSeoTitle]         = useState(initial.seoTitle ?? '')
  const [seoDescription,   setSeoDescription]   = useState(initial.seoDescription ?? '')
  const [focusKeyword,     setFocusKeyword]     = useState(initial.seoFocusKeyword ?? '')
  const [secondaryRaw,     setSecondaryRaw]     = useState(initial.seoSecondaryKeywords.join(', '))
  const [canonicalOverride,setCanonicalOverride]= useState(initial.seoCanonicalOverride ?? '')
  const [noIndex,          setNoIndex]          = useState(initial.seoNoIndex)

  const [score,     setScore]     = useState(initial.score)
  const [breakdown, setBreakdown] = useState<FactorResult[]>(initial.breakdown)
  const [grade,     setGrade]     = useState(initial.grade)
  const [lastAudit, setLastAudit] = useState(initial.lastAuditedAt)

  const [saving,    setSaving]    = useState(false)
  const [assisting, setAssisting] = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const [savedToast,setSavedToast]= useState(false)

  // The values that flow into the SERP preview default to the fallback
  // chain that the live site uses: seo_title || title; seo_description ||
  // excerpt. So the editor sees what Google will actually see.
  const effectiveTitle = seoTitle.trim() || fallbackTitle
  const effectiveDesc  = seoDescription.trim() || fallbackDescription || ''

  async function save() {
    setSaving(true); setError(null)
    try {
      const res = await fetch('/api/admin/seo/save', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          articleId,
          seoTitle:             seoTitle.trim() || null,
          seoDescription:       seoDescription.trim() || null,
          seoFocusKeyword:      focusKeyword.trim() || null,
          seoSecondaryKeywords: secondaryRaw.split(',').map(s => s.trim()).filter(Boolean),
          seoCanonicalOverride: canonicalOverride.trim() || null,
          seoNoIndex:           noIndex,
        }),
      })
      const j = await res.json()
      if (!res.ok) { setError(j.error ?? 'Save failed.'); return }
      setScore(j.score); setBreakdown(j.breakdown); setGrade(j.grade)
      setLastAudit(new Date().toISOString())
      setSavedToast(true); setTimeout(() => setSavedToast(false), 1800)
    } finally { setSaving(false) }
  }

  async function runAssist() {
    setAssisting(true); setError(null)
    try {
      const res = await fetch('/api/admin/seo/assist', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ articleId }),
      })
      const j = await res.json()
      if (!res.ok) { setError(j.error ?? 'AI assist failed.'); return }
      // Pre-fill, but DON'T auto-save. Editor reviews + clicks Save.
      setSeoTitle(j.seoTitle ?? '')
      setSeoDescription(j.seoDescription ?? '')
      setFocusKeyword(j.focusKeyword ?? '')
      setSecondaryRaw((j.secondaryKeywords as string[] | undefined ?? []).join(', '))
    } finally { setAssisting(false) }
  }

  async function rescore() {
    setSaving(true); setError(null)
    try {
      const res = await fetch('/api/admin/seo/score', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ articleId }),
      })
      const j = await res.json()
      if (!res.ok) { setError(j.error ?? 'Re-score failed.'); return }
      setScore(j.score); setBreakdown(j.breakdown); setGrade(j.grade)
      setLastAudit(new Date().toISOString())
    } finally { setSaving(false) }
  }

  const articlePath = columnSlug ? `/columns/${columnSlug}/${slug}` : `/articles/${slug}`

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 320px', gap: 16, alignItems: 'flex-start' }}>

      {/* ── LEFT COLUMN ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Audit-driven suggestion banner: shown when the editor arrived
            via "Open in editor" from a weekly audit report. Reading the
            suggestion is the action — the editor still applies edits by
            hand, just like every other field on this page. */}
        {pendingSuggestion && !suggestionDismissed && (
          <div
            className="bg-white border border-portal-border rounded-lg"
            style={{ padding: 14, borderLeft: '4px solid var(--color-portal-blue)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Sparkles size={14} color="var(--color-portal-blue)" />
                <span className="fw-700 text-portal-text" style={{ fontSize: 13 }}>
                  Pending action from weekly audit
                </span>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {fromAuditId && (
                  <a
                    href={`/admin/seo/audit-reports/${fromAuditId}`}
                    className="text-portal-sub hover:text-portal-text"
                    style={{ fontSize: 11 }}
                  >
                    View full report
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setSuggestionDismissed(true)}
                  className="text-portal-sub hover:text-portal-text"
                  style={{ fontSize: 11, background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  Dismiss
                </button>
              </div>
            </div>
            <p className="text-portal-text" style={{ fontSize: 13, lineHeight: 1.5, margin: 0 }}>
              {pendingSuggestion}
            </p>
            <p className="text-portal-sub" style={{ fontSize: 11, marginTop: 8, lineHeight: 1.45 }}>
              Apply the change manually in the fields below, then click Save.
              Click Dismiss to ignore this recommendation.
            </p>
          </div>
        )}

        {/* SERP preview */}
        <SerpPreview
          title={effectiveTitle}
          description={effectiveDesc}
          urlPath={canonicalOverride.trim() || articlePath}
        />

        {/* Score card */}
        <div className="bg-white border border-portal-border rounded-lg overflow-hidden">
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-portal-border)', background: 'var(--color-portal-bg)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div className="fw-700 text-portal-text" style={{ fontSize: 13 }}>SEO score</div>
            <button
              type="button"
              onClick={rescore}
              disabled={saving}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--color-portal-blue)', fontWeight: 600 }}
            >
              <RotateCw size={11} /> Re-score
            </button>
          </div>
          <div style={{ padding: 16 }}>
            <ScoreHeader score={score} grade={grade} lastAudit={lastAudit} />
            <div style={{ height: 1, background: 'var(--color-portal-border)', margin: '14px 0' }} />
            <Breakdown breakdown={breakdown} />
          </div>
        </div>

        {/* Editor form */}
        <div className="bg-white border border-portal-border rounded-lg overflow-hidden">
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-portal-border)', background: 'var(--color-portal-bg)' }}>
            <div className="fw-700 text-portal-text" style={{ fontSize: 13 }}>SEO fields</div>
            <div className="text-portal-sub" style={{ fontSize: 12, marginTop: 2 }}>
              Leave blank to inherit the article&apos;s title / excerpt.
            </div>
          </div>
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>

            <Field
              label="SEO title"
              hint={`${seoTitle.length} chars (aim for 50-60). Falls back to: "${fallbackTitle}"`}
              hintTone={seoTitle.length > 0 && (seoTitle.length < 30 || seoTitle.length > 65) ? 'warn' : 'normal'}
            >
              <input
                type="text"
                value={seoTitle}
                onChange={e => setSeoTitle(e.target.value)}
                placeholder={fallbackTitle}
                style={inputStyle}
              />
            </Field>

            <Field
              label="Meta description"
              hint={`${seoDescription.length} chars (aim for 110-160). Falls back to the article excerpt.`}
              hintTone={seoDescription.length > 0 && (seoDescription.length < 110 || seoDescription.length > 160) ? 'warn' : 'normal'}
            >
              <textarea
                value={seoDescription}
                onChange={e => setSeoDescription(e.target.value)}
                rows={3}
                placeholder={fallbackDescription ?? ''}
                style={{ ...inputStyle, resize: 'vertical', minHeight: 70 }}
              />
            </Field>

            <Field label="Focus keyword" hint="The primary 2-5 word phrase this article targets.">
              <input
                type="text"
                value={focusKeyword}
                onChange={e => setFocusKeyword(e.target.value)}
                placeholder="e.g. Montgomery summer camps"
                style={inputStyle}
              />
            </Field>

            <Field label="Secondary keywords" hint="Comma-separated. LSI / related phrases.">
              <input
                type="text"
                value={secondaryRaw}
                onChange={e => setSecondaryRaw(e.target.value)}
                placeholder="day camps, kids camp, week-long camps"
                style={inputStyle}
              />
            </Field>

            <details style={{ borderTop: '1px solid var(--color-portal-border)', paddingTop: 10 }}>
              <summary style={{ cursor: 'pointer', fontSize: 12, fontWeight: 600, color: 'var(--color-portal-sub)' }}>Advanced</summary>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
                <Field label="Canonical URL override" hint="Only set if you want this article's canonical to point elsewhere (e.g. preferred version of a syndicated piece).">
                  <input
                    type="url"
                    value={canonicalOverride}
                    onChange={e => setCanonicalOverride(e.target.value)}
                    placeholder="https://…"
                    style={inputStyle}
                  />
                </Field>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--color-portal-text)' }}>
                  <input type="checkbox" checked={noIndex} onChange={e => setNoIndex(e.target.checked)} />
                  No-index this article (hide from search engines)
                </label>
              </div>
            </details>

            {error && (
              <div className="alert alert-error" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <AlertTriangle size={12} /> {error}
              </div>
            )}

            <button
              type="button"
              onClick={save}
              disabled={saving}
              style={primaryBtn(saving)}
            >
              {saving
                ? <><Loader2 size={14} className="animate-spin" /><span>Saving…</span></>
                : <span>Save SEO + re-score</span>}
            </button>

            {savedToast && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-portal-green)', fontSize: 12, fontWeight: 600 }}>
                <CheckCircle2 size={14} /> Saved.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── RIGHT COLUMN ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* AI assist */}
        <div className="bg-white border border-portal-border rounded-lg overflow-hidden">
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-portal-border)', background: 'var(--color-portal-bg)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Sparkles size={14} color="var(--color-portal-blue)" />
            <span className="fw-700 text-portal-text" style={{ fontSize: 13 }}>AI SEO assist</span>
          </div>
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p className="text-portal-sub" style={{ fontSize: 12, lineHeight: 1.5 }}>
              Claude reads the article body + your brand&apos;s area-served + topic list and suggests an SEO title, meta description, and focus keyword. Review before saving.
            </p>
            <button
              type="button"
              onClick={runAssist}
              disabled={assisting}
              style={secondaryBtn(assisting)}
            >
              {assisting
                ? <><Loader2 size={13} className="animate-spin" /><span>Thinking…</span></>
                : <><Sparkles size={13} /><span>Suggest SEO fields</span></>}
            </button>
            <p className="text-portal-sub" style={{ fontSize: 11, lineHeight: 1.4 }}>
              Brand: <strong>{brandSlug}</strong>
            </p>
          </div>
        </div>

        {/* Quick stats */}
        <div className="bg-white border border-portal-border rounded-lg overflow-hidden">
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-portal-border)', background: 'var(--color-portal-bg)' }}>
            <div className="fw-700 text-portal-text" style={{ fontSize: 13 }}>Audit history</div>
          </div>
          <div style={{ padding: 16, fontSize: 12, color: 'var(--color-portal-sub)', lineHeight: 1.5 }}>
            {lastAudit ? (
              <>Last audited <strong>{new Date(lastAudit).toLocaleString()}</strong></>
            ) : (
              <em>Not audited yet. Save to run the first audit.</em>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Subcomponents ───────────────────────────────────────────────────────────

function ScoreHeader({ score, grade, lastAudit }: { score: number; grade: string; lastAudit: string | null }) {
  const color = score >= 85 ? 'var(--color-portal-green)'
              : score >= 70 ? 'var(--color-portal-blue)'
              : score >= 50 ? 'var(--color-portal-amber)'
              :               'var(--color-portal-red)'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <div style={{
        width: 64, height: 64, borderRadius: '50%',
        background: color, color: 'white',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 22, fontWeight: 900,
        flexShrink: 0,
      }}>
        {score}
      </div>
      <div style={{ flex: 1 }}>
        <div className="fw-700 text-portal-text" style={{ fontSize: 16, textTransform: 'capitalize' }}>{grade.replace('-', ' ')}</div>
        <div className="text-portal-sub" style={{ fontSize: 12, marginTop: 2 }}>
          {lastAudit ? `Re-audit any time.` : 'Score before publish.'}
        </div>
      </div>
    </div>
  )
}

function Breakdown({ breakdown }: { breakdown: FactorResult[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {breakdown.map(f => {
        const toneBg = f.status === 'pass' ? '#dcfce7'
                     : f.status === 'partial' ? '#fef3c7'
                     :                          '#fee2e2'
        const toneFg = f.status === 'pass' ? '#16a34a'
                     : f.status === 'partial' ? '#b45309'
                     :                          '#dc2626'
        return (
          <div key={f.key} style={{ display: 'flex', gap: 10, padding: 8, borderRadius: 6, background: 'var(--color-portal-bg)' }}>
            <div style={{ width: 6, borderRadius: 3, background: toneFg, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ fontWeight: 600, fontSize: 12, color: 'var(--color-portal-text)' }}>{f.label}</span>
                <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: toneBg, color: toneFg }}>
                  {f.score}/{f.max}
                </span>
              </div>
              <p style={{ fontSize: 11, color: 'var(--color-portal-sub)', marginTop: 2, lineHeight: 1.4 }}>{f.notes}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function Field({ label, hint, hintTone = 'normal', children }: { label: string; hint?: string; hintTone?: 'normal' | 'warn'; children: React.ReactNode }) {
  return (
    <div>
      <label style={{
        display: 'block', fontSize: 11, fontWeight: 700,
        textTransform: 'uppercase', letterSpacing: '.3px',
        color: 'var(--color-portal-sub)', marginBottom: 4,
      }}>{label}</label>
      {children}
      {hint && (
        <p style={{
          fontSize: 11, marginTop: 4,
          color: hintTone === 'warn' ? 'var(--color-portal-amber)' : 'var(--color-portal-sub)',
        }}>{hint}</p>
      )}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  border: '1.5px solid var(--color-portal-border)',
  borderRadius: 6,
  fontSize: 13,
  fontFamily: 'inherit',
  background: 'white',
  outline: 'none',
  color: 'var(--color-portal-text)',
}

function primaryBtn(busy: boolean): React.CSSProperties {
  return {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    padding: '10px 14px',
    background: 'var(--color-portal-navy)', color: 'white',
    border: 'none', borderRadius: 8,
    fontSize: 13, fontWeight: 700,
    cursor: busy ? 'wait' : 'pointer',
    opacity: busy ? 0.7 : 1,
    whiteSpace: 'nowrap',
  }
}

function secondaryBtn(busy: boolean): React.CSSProperties {
  return {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    padding: '10px 14px',
    background: 'white', color: 'var(--color-portal-navy)',
    border: '1.5px solid var(--color-portal-navy)',
    borderRadius: 8,
    fontSize: 13, fontWeight: 700,
    cursor: busy ? 'wait' : 'pointer',
    opacity: busy ? 0.7 : 1,
    whiteSpace: 'nowrap',
  }
}
