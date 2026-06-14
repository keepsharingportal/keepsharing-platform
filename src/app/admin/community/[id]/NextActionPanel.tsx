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
          // Explicit flex row + nowrap so the label + icon stay on one
          // line. The portal-app .btn class flexes but icons were
          // wrapping to their own line in narrow right-column widths.
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            whiteSpace: 'nowrap',
            padding: '10px 14px',
            background: 'var(--color-portal-navy)',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 700,
            cursor: busy ? 'wait' : 'pointer',
            opacity: busy ? 0.7 : 1,
          }}
        >
          {busy
            ? <><Loader2 size={13} className="animate-spin" /><span>Working…</span></>
            : <><span>{config.nextAction.label}</span><ArrowRight size={13} /></>}
        </button>
      )}

      {!config.nextAction && (
        <div className="alert alert-info" style={{ fontSize: 12, marginBottom: 4 }}>
          {currentPhase === 'in-pool'
            ? <>This article is in the monthly pool. Schedule + publish from <a href="/admin/pending" style={{ color: 'var(--color-portal-blue)', fontWeight: 600 }}>Pending Pool →</a></>
            : currentPhase === 'published'
              ? 'Article is live on the homepage.'
              : currentPhase === 'archived'
                ? 'Archived. No further action.'
                : 'No editor action — waiting on external state (nominee response, etc).'}
        </div>
      )}

      {/* Secondary actions — single small text link row at the bottom,
          NOT giant equal-weight buttons. The primary CTA above is
          where 95% of the editor's clicks should go. */}
      <div style={{
        display: 'flex',
        gap: 12,
        marginTop: 10,
        paddingTop: 10,
        borderTop: '1px solid var(--color-portal-border)',
        fontSize: 11,
        flexWrap: 'wrap',
      }}>
        {showSkipToDrafting && (
          <button
            type="button" disabled={busy}
            onClick={() => advance('draft-in-progress', 'This type doesn\'t need outreach. Jump straight to drafting?')}
            style={secondaryLink}
          >
            Skip outreach
          </button>
        )}

        {currentPhase === 'outreach-sent' && (
          <button
            type="button" disabled={busy}
            onClick={() => advance('nominee-declined', 'Mark nominee as declined? (You won\'t be able to send the interview after this.)')}
            style={{ ...secondaryLink, color: 'var(--color-portal-red)' }}
          >
            Nominee declined
          </button>
        )}

        {/* Archive escape hatch — always available unless already archived/published */}
        {currentPhase !== 'archived' && currentPhase !== 'published' && (
          <button
            type="button" disabled={busy}
            onClick={() => advance('archived', 'Archive this submission? It will stop appearing in the active queue.')}
            style={{ ...secondaryLink, marginLeft: 'auto' }}
          >
            <Archive size={10} style={{ display: 'inline', verticalAlign: -1, marginRight: 3 }} /> Archive
          </button>
        )}
      </div>

      {/* Phase-conditional hints — small italic notes, not full alert boxes */}
      {currentPhase === 'interview-sent' && hasInterview && (
        <div className="text-muted text-xs" style={{ marginTop: 8, fontStyle: 'italic' }}>
          ℹ︎ Nominee already submitted the interview. Click the main action above to move forward.
        </div>
      )}
      {currentPhase === 'draft-ready' && !hasDraft && (
        <div className="text-muted text-xs" style={{ marginTop: 8, fontStyle: 'italic' }}>
          ℹ︎ No draft body yet. Use AI draft below or write manually first.
        </div>
      )}

    </div>
  )
}

const secondaryLink: React.CSSProperties = {
  background: 'none',
  border: 'none',
  padding: 0,
  cursor: 'pointer',
  fontSize: 11,
  color: 'var(--color-portal-sub)',
  fontWeight: 500,
  textDecoration: 'underline',
  textUnderlineOffset: 2,
  whiteSpace: 'nowrap',
}
