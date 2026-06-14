'use client'

// Inline AI drafting panel. The "Generate draft from nomination +
// interview" button lives here so editors don't have to scroll past
// the entire page to find AI assist. Output flows back into the
// draft editor (ai_draft_content) which the existing editor block
// consumes.

import { useState }  from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, Loader2, AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  submissionId:    string
  hasInterview:    boolean
  hasDraft:        boolean
  articleFormat:   string
  currentDraftLen: number
}

const FORMAT_LABEL: Record<string, string> = {
  'q-and-a':       'Q&A',
  'profile':       'Profile',
  'write-up':      'Write-up',
  'news-brief':    'News brief',
  'photo-caption': 'Photo caption',
  'roundup':       'Roundup',
}

export function AIDraftPanel({ submissionId, hasInterview, hasDraft, articleFormat, currentDraftLen }: Props) {
  const router = useRouter()
  const [busy, setBusy]       = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [lastLen, setLastLen] = useState<number | null>(null)

  async function generate() {
    if (currentDraftLen > 50 && !confirm(
      `An existing draft of ${currentDraftLen} characters will be REPLACED by the AI output. Continue?`
    )) return
    setBusy(true); setError(null); setLastLen(null)
    try {
      const res = await fetch(`/api/admin/community-submissions/${submissionId}/ai-draft`, { method: 'POST' })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) { setError(j.error ?? 'AI draft failed.'); return }
      setLastLen(j.length ?? 0)
      router.refresh()
    } finally { setBusy(false) }
  }

  return (
    <div className="bg-white border border-portal-border rounded-lg overflow-hidden">
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid var(--color-portal-border)',
        background: 'var(--color-portal-bg)',
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <Sparkles size={14} color="var(--color-portal-blue)" />
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-portal-text)' }}>AI draft</span>
      </div>

      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <p className="text-portal-sub" style={{ fontSize: 12, lineHeight: 1.5 }}>
          Drafts a complete article body from the nomination + the nominee&apos;s interview responses,
          formatted as <strong className="text-portal-text">{FORMAT_LABEL[articleFormat] ?? articleFormat}</strong>.
          Brand voice is pulled from the publication&apos;s brand_voice rules.
        </p>

        {!hasInterview && (
          <div className="alert alert-warning" style={{ fontSize: 12 }}>
            No nominee interview on file yet. AI will draft from the nomination alone — usually thinner.
            Send the interview form first for a richer draft.
          </div>
        )}

        {error && (
          <div className="alert alert-error" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <AlertTriangle size={12} /> {error}
          </div>
        )}

        {lastLen !== null && (
          <div className="alert alert-success" style={{ fontSize: 12 }}>
            Draft generated ({lastLen} chars). Scroll down to the AI Draft editor below to review.
          </div>
        )}

        <button
          type="button"
          onClick={generate}
          disabled={busy}
          style={primaryBtn(busy)}
        >
          {busy
            ? <><Loader2 size={14} className="animate-spin" /><span>Drafting…</span></>
            : hasDraft
              ? <><RefreshCw size={14} /><span>Regenerate draft</span></>
              : <><Sparkles size={14} /><span>Generate draft</span></>}
        </button>

        <p className="text-portal-sub" style={{ fontSize: 12, lineHeight: 1.5 }}>
          Editor always reviews + edits. AI never publishes anything on its own.
        </p>
      </div>
    </div>
  )
}

function primaryBtn(busy: boolean): React.CSSProperties {
  return {
    width: '100%',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    padding: '11px 16px',
    background: 'var(--color-portal-navy)',
    color: 'white',
    border: 'none', borderRadius: 8,
    fontSize: 13, fontWeight: 700,
    cursor: busy ? 'wait' : 'pointer',
    opacity: busy ? 0.7 : 1,
    whiteSpace: 'nowrap',
  }
}
