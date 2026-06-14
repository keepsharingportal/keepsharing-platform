'use client'

// THE panel for phase=nominated and nomination-accepted. Replaces the
// generic Next Action button with a real outreach email composer:
//
//   - Pre-filled per-type stock template (subject + body) from the
//     submission_type_columns config
//   - Variables already substituted ({{nominee_first}},
//     {{nominator_name}}, {{nomination_pitch}}, {{brand_name}}, etc.)
//   - Editor can edit subject + body before sending
//   - Single "Send to nominee" button: composes the actual send via
//     the existing /outreach API, advances phase straight to
//     'outreach-sent' (skips the artificial nomination-accepted
//     intermediate)
//
// What this REPLACES at this phase:
//   - "Accept nomination →" generic next-action button (which only
//     advanced state and didn't send anything)
//   - Channel approvals panel (premature — no draft exists yet)
//   - AI Draft panel (premature — no interview content yet)
//
// Result: at the nominated phase, the editor sees ONE workflow card
// for the ONE thing they actually need to do.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Send, AlertTriangle, CheckCircle2, Mail } from 'lucide-react'

interface Props {
  submissionId:   string
  typeLabel:      string
  nomineeName:    string  // resolved name we'll greet
  nomineeEmail:   string  // editable in case the nominator typoed
  initialSubject: string  // pre-substituted template
  initialBody:    string  // pre-substituted template (HTML)
  /** True at phase=nominated and false at nomination-accepted —
   *  controls confirm copy + button label. */
  isFirstSend:    boolean
}

export function OutreachComposerPanel({
  submissionId, typeLabel, nomineeName, nomineeEmail,
  initialSubject, initialBody, isFirstSend,
}: Props) {
  const router = useRouter()
  const [email,   setEmail]   = useState(nomineeEmail)
  const [subject, setSubject] = useState(initialSubject)
  const [body,    setBody]    = useState(initialBody)
  const [busy,    setBusy]    = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [sent,    setSent]    = useState(false)
  const [expanded, setExpanded] = useState(false)

  async function send() {
    if (!email.trim()) { setError('Add a nominee email before sending.'); return }
    if (!subject.trim()) { setError('Subject can\'t be empty.'); return }
    if (!body.trim()) { setError('Body can\'t be empty.'); return }
    if (!confirm(`Send outreach email to ${nomineeName} <${email}>?`)) return

    setBusy(true); setError(null)
    try {
      const res = await fetch(`/api/admin/community-submissions/${submissionId}/outreach`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          action:        'outreach',
          nominee_email: email.trim(),
          subject:       subject.trim(),
          body_html:     body,
        }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) { setError(j.error ?? 'Send failed.'); return }
      setSent(true)
      setTimeout(() => router.refresh(), 900)
    } finally { setBusy(false) }
  }

  if (sent) {
    return (
      <div className="card" style={{ borderLeft: '3px solid var(--color-portal-green)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <CheckCircle2 size={16} color="var(--color-portal-green)" />
          <div className="fw-700">Email sent to {nomineeName}</div>
        </div>
        <div className="text-muted text-xs" style={{ marginTop: 4 }}>
          Phase advanced to <strong>Outreach sent</strong>. The page will refresh in a moment with the next-step UI.
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Mail size={13} color="var(--color-portal-blue)" /> Outreach to nominee
      </div>
      <div className="text-muted text-xs" style={{ marginBottom: 12 }}>
        Pre-filled {typeLabel} template. Edit anything before sending.
      </div>

      {error && (
        <div className="alert alert-error" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <AlertTriangle size={12} /> {error}
        </div>
      )}

      <div className="fg" style={{ marginBottom: 10 }}>
        <label style={fieldLabel}>To</label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          style={inputStyle}
          placeholder="nominee@example.com"
        />
      </div>

      <div className="fg" style={{ marginBottom: 10 }}>
        <label style={fieldLabel}>Subject</label>
        <input
          type="text"
          value={subject}
          onChange={e => setSubject(e.target.value)}
          style={inputStyle}
        />
      </div>

      {!expanded ? (
        // Compact preview — first 200 chars of body so the editor sees
        // it's pre-filled without an overwhelming wall of HTML
        <div style={{
          background: 'var(--color-portal-bg)',
          border: '1px solid var(--color-portal-border)',
          borderRadius: 6,
          padding: 10,
          fontSize: 12,
          color: 'var(--color-portal-sub)',
          lineHeight: 1.5,
          marginBottom: 10,
          fontFamily: 'system-ui',
        }}>
          {plainPreview(body, 200)}…
          <button
            type="button"
            onClick={() => setExpanded(true)}
            style={{
              display: 'block', marginTop: 6,
              background: 'none', border: 'none', padding: 0, cursor: 'pointer',
              color: 'var(--color-portal-blue)', fontSize: 11, fontWeight: 600,
              textDecoration: 'underline',
            }}
          >
            Expand to edit the body
          </button>
        </div>
      ) : (
        <div className="fg" style={{ marginBottom: 10 }}>
          <label style={fieldLabel}>
            Body (HTML)
            <button
              type="button"
              onClick={() => setExpanded(false)}
              style={{
                marginLeft: 8, fontSize: 10,
                background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                color: 'var(--color-portal-sub)', textDecoration: 'underline',
              }}
            >
              Collapse
            </button>
          </label>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            rows={14}
            style={{ ...inputStyle, fontFamily: 'ui-monospace, monospace', fontSize: 11, lineHeight: 1.5 }}
          />
        </div>
      )}

      <button
        type="button"
        onClick={send}
        disabled={busy}
        style={{
          width: '100%',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          padding: '11px 14px',
          background: 'var(--color-portal-navy)', color: 'white',
          border: 'none', borderRadius: 8,
          fontSize: 13, fontWeight: 700,
          cursor: busy ? 'wait' : 'pointer', opacity: busy ? 0.7 : 1,
          whiteSpace: 'nowrap',
        }}
      >
        {busy
          ? <><Loader2 size={13} className="animate-spin" /><span>Sending…</span></>
          : <><Send size={13} /><span>{isFirstSend ? 'Approve & send email' : 'Send outreach'}</span></>}
      </button>

      <div className="text-muted text-xs" style={{ marginTop: 8, lineHeight: 1.4 }}>
        Sending will advance the phase to <strong>Outreach sent</strong>. When the nominee replies, mark them accepted from the next-action panel.
      </div>
    </div>
  )
}

/** Strip HTML tags + collapse whitespace for a compact preview. */
function plainPreview(html: string, maxLen: number): string {
  const stripped = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  return stripped.length > maxLen ? stripped.slice(0, maxLen) : stripped
}

const fieldLabel: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 700,
  textTransform: 'uppercase', letterSpacing: '.3px',
  color: 'var(--color-portal-sub)', marginBottom: 4,
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
}
