'use client'

// Inline AI drafting panel. The big "Generate draft from nomination
// + interview" button + the "Suggest headline" + "Suggest excerpt"
// helpers live here so editors don't have to scroll past the entire
// page to find AI assist. Output flows back into the draft editor
// (ai_draft_content) which the existing editor block consumes.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, Loader2, AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  submissionId:    string
  hasInterview:    boolean
  hasDraft:        boolean
  articleFormat:   string
  /** What the editor sees today — used to warn before overwriting. */
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
  const [busy, setBusy]   = useState(false)
  const [error, setError] = useState<string | null>(null)
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
    <div className="card">
      <div className="card-title" style={{ marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
        <Sparkles size={13} color="var(--color-portal-blue)" /> AI draft
      </div>
      <div className="text-muted text-xs" style={{ marginBottom: 10 }}>
        Drafts a complete article body using the nomination + the nominee&apos;s interview responses,
        formatted as <strong>{FORMAT_LABEL[articleFormat] ?? articleFormat}</strong>.
        Brand voice is pulled from the publication&apos;s brand_voice rules.
      </div>

      {!hasInterview && (
        <div className="alert alert-warning" style={{ fontSize: 11, marginBottom: 8 }}>
          No nominee interview on file yet. AI will draft from the nomination alone — usually thinner.
          Send the interview form first for a richer draft.
        </div>
      )}

      {error && (
        <div className="alert alert-error" style={{ fontSize: 11, marginBottom: 8 }}>
          <AlertTriangle size={11} style={{ display: 'inline', verticalAlign: -1 }} /> {error}
        </div>
      )}

      {lastLen !== null && (
        <div className="alert alert-success" style={{ fontSize: 11, marginBottom: 8 }}>
          Draft generated ({lastLen} chars). Scroll down to the AI Draft editor below to review.
        </div>
      )}

      <button
        type="button"
        onClick={generate}
        disabled={busy}
        className="btn btn-primary btn-sm"
        style={{ width: '100%', justifyContent: 'center' }}
      >
        {busy
          ? <><Loader2 size={12} className="animate-spin" /> Drafting…</>
          : hasDraft
            ? <><RefreshCw size={12} /> Regenerate draft</>
            : <><Sparkles size={12} /> Generate draft from nomination + interview</>}
      </button>

      <div className="text-muted text-xs" style={{ marginTop: 8, lineHeight: 1.4 }}>
        Editor always reviews + edits. AI never publishes anything on its own.
      </div>
    </div>
  )
}
