'use client'

// The right-column action panel. Always shows the editor's CURRENT
// next-action for the phase, plus a way to back-step (Mark as Needs
// Changes, Archive) and quick-jump shortcuts (e.g. when the nominee
// declined or accepted outside the system).

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Loader2, AlertTriangle, Archive } from 'lucide-react'
import { PHASES, type Phase } from '@/lib/submissions/phases'

interface Props {
  submissionId: string
  currentPhase: Phase
  needsOutreach: boolean
  hasInterview: boolean
  hasDraft:     boolean
}

export function NextActionPanel({ submissionId, currentPhase, needsOutreach, hasInterview, hasDraft }: Props) {
  const router = useRouter()
  const [busy,  setBusy]  = useState(false)
  const [error, setError] = useState<string | null>(null)
  const config = PHASES[currentPhase]

  async function advance(nextPhase: Phase, requireConfirm?: string) {
    if (requireConfirm && !confirm(requireConfirm)) return
    setBusy(true); setError(null)
    try {
      const res = await fetch(`/api/admin/community-submissions/${submissionId}/set-phase`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ phase: nextPhase }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) { setError(j.error ?? 'Phase update failed.'); return }
      router.refresh()
    } finally { setBusy(false) }
  }

  // Some next-actions trigger side-effects (sending email, generating
  // the interview token). Route those through the outreach API instead
  // of the plain set-phase endpoint so the email actually fires and
  // the phase advance happens atomically server-side.
  async function callOutreach(action: 'outreach' | 'send-interview') {
    setBusy(true); setError(null)
    try {
      const res = await fetch(`/api/admin/community-submissions/${submissionId}/outreach`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) { setError(j.error ?? 'Send failed.'); return }
      router.refresh()
    } finally { setBusy(false) }
  }

  async function handlePrimary(nextPhase: Phase, label: string) {
    // Outreach side-effect routing
    if (currentPhase === 'nomination-accepted' && nextPhase === 'outreach-sent') {
      if (!confirm(`Send the outreach email to the nominee?\n\nThey'll get a message explaining they were nominated for ${label.toLowerCase()} and asking if they'd like to participate.`)) return
      await callOutreach('outreach'); return
    }
    if (currentPhase === 'nominee-accepted' && nextPhase === 'interview-sent') {
      if (!confirm('Send the interview form link to the nominee?\n\nThey\'ll get an email with a per-type questionnaire + photo upload. The form auto-fills the submission when they submit.')) return
      await callOutreach('send-interview'); return
    }
    // Publish-to-homepage confirmation
    if (currentPhase === 'scheduled' && nextPhase === 'published') {
      if (!confirm('Publish to homepage now? Creates a public guide_articles row + (if approved) fires Meta Suite auto-post.')) return
    }
    // Plain phase advance
    await advance(nextPhase)
  }

  // The "skip to publish" path for types that don't need outreach
  // (school-news, birthday, parent-picks): once nominated, the editor
  // can go straight to drafting.
  const showSkipToDrafting = !needsOutreach && currentPhase === 'nominated'

  return (
    <div className="card">
      <div className="card-title" style={{ marginBottom: 6 }}>Next action</div>

      {error && (
        <div className="alert alert-error" style={{ fontSize: 11, marginBottom: 8 }}>
          <AlertTriangle size={11} style={{ display: 'inline', verticalAlign: -1 }} /> {error}
        </div>
      )}

      {config.nextAction && (
        <button
          type="button"
          disabled={busy}
          onClick={() => handlePrimary(config.nextAction!.nextPhase, config.nextAction!.label)}
          className="btn btn-primary btn-sm"
          style={{ width: '100%', justifyContent: 'center' }}
        >
          {busy ? <><Loader2 size={12} className="animate-spin" /> Working…</> : <>{config.nextAction.label} <ArrowRight size={12} /></>}
        </button>
      )}

      {!config.nextAction && (
        <div className="text-muted text-xs" style={{ marginBottom: 8, fontStyle: 'italic' }}>
          {currentPhase === 'in-pool'
            ? 'Open the Pending Pool to schedule for a month.'
            : currentPhase === 'published'
              ? 'Article is live. Nothing more to do here.'
              : 'No editor action — waiting on external state.'}
        </div>
      )}

      {/* Quick context-aware shortcuts */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>

        {showSkipToDrafting && (
          <button
            type="button" disabled={busy}
            onClick={() => advance('draft-in-progress', 'This type doesn\'t need outreach. Jump straight to drafting?')}
            className="btn btn-ghost btn-sm"
            style={{ width: '100%', justifyContent: 'center' }}
          >
            Skip outreach → start drafting
          </button>
        )}

        {currentPhase === 'outreach-sent' && (
          <button
            type="button" disabled={busy}
            onClick={() => advance('nominee-declined', 'Mark nominee as declined? (You won\'t be able to send the interview after this.)')}
            className="btn btn-ghost btn-sm"
            style={{ width: '100%', justifyContent: 'center', color: 'var(--color-portal-red)' }}
          >
            Nominee declined
          </button>
        )}

        {currentPhase === 'interview-sent' && hasInterview && (
          <div className="alert alert-info" style={{ fontSize: 11, marginTop: 4 }}>
            Nominee already submitted the interview form. Click the main action above to move forward.
          </div>
        )}

        {currentPhase === 'draft-ready' && !hasDraft && (
          <div className="alert alert-warning" style={{ fontSize: 11, marginTop: 4 }}>
            No draft body yet. Write or AI-draft the article first.
          </div>
        )}

        {/* Archive escape hatch — always available unless already archived/published */}
        {currentPhase !== 'archived' && currentPhase !== 'published' && (
          <button
            type="button" disabled={busy}
            onClick={() => advance('archived', 'Archive this submission? It will stop appearing in the active queue.')}
            className="btn btn-ghost btn-sm"
            style={{ width: '100%', justifyContent: 'center', marginTop: 4, color: 'var(--color-portal-sub)' }}
          >
            <Archive size={11} /> Archive
          </button>
        )}
      </div>
    </div>
  )
}
