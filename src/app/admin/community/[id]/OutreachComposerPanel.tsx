'use client'

// Right-column panel at phase=nominated and nomination-accepted.
// Compact summary of the pre-filled outreach email — the editor sees
// the TO, SUBJECT, and a plain-text preview (no HTML markup) at a
// glance. "Edit email" opens a full-screen WYSIWYG modal.
//
// Two equal-weight buttons:
//   - Approve & send email  (navy, primary)
//   - Reject nomination     (red, destructive)
//
// Same dimensions, same typography — only the background color
// differs. Mirrors the design vocabulary on the Ads & Sponsors page.

import { useState }       from 'react'
import { useRouter }      from 'next/navigation'
import { CheckCircle2, Mail, Edit3, Loader2 } from 'lucide-react'
import { EmailComposerModal } from './EmailComposerModal'
import { RejectModal }        from './RejectModal'

interface Props {
  submissionId:   string
  typeLabel:      string
  nomineeName:    string
  nomineeEmail:   string
  initialSubject: string
  initialBody:    string  // pre-substituted HTML template
  isFirstSend:    boolean
}

export function OutreachComposerPanel({
  submissionId, typeLabel, nomineeName, nomineeEmail,
  initialSubject, initialBody, isFirstSend,
}: Props) {
  const router = useRouter()

  // Local editable copies — start from the pre-substituted templates,
  // get overwritten when the editor saves changes in the modal.
  const [to,       setTo]      = useState(nomineeEmail)
  const [subject,  setSubject] = useState(initialSubject)
  const [bodyHtml, setBody]    = useState(initialBody)

  const [composerOpen, setComposerOpen] = useState(false)
  const [rejectOpen,   setRejectOpen]   = useState(false)

  // Direct-send path: editor doesn't open the modal, just clicks
  // Approve & send email with the pre-filled template. Same backend
  // call as the modal's onSend handler.
  const [sending, setSending] = useState(false)
  const [sent,    setSent]    = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  async function sendOutreach(payload: { to: string; subject: string; bodyHtml: string }) {
    const res = await fetch(`/api/admin/community-submissions/${submissionId}/outreach`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        action:        'outreach',
        nominee_email: payload.to,
        subject:       payload.subject,
        body_html:     payload.bodyHtml,
      }),
    })
    const j = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(j.error ?? 'Send failed.')

    // Persist edits locally too in case the page doesn't refresh fast
    // enough — the success state reads them.
    setTo(payload.to); setSubject(payload.subject); setBody(payload.bodyHtml)
    setComposerOpen(false)
    setSent(true)
    setTimeout(() => router.refresh(), 900)
  }

  async function handleSendDirect() {
    setSending(true); setError(null)
    try {
      await sendOutreach({ to, subject, bodyHtml })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Send failed.')
    } finally {
      setSending(false)
    }
  }

  async function handleReject(reason: string) {
    const res = await fetch(`/api/admin/community-submissions/${submissionId}/reject`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ reason }),
    })
    const j = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(j.error ?? 'Reject failed.')
    setRejectOpen(false)
    router.refresh()
  }

  if (sent) {
    return (
      <div className="bg-white border border-portal-border rounded-lg p-4">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <CheckCircle2 size={16} color="var(--color-portal-green)" />
          <div className="fw-700" style={{ color: 'var(--color-portal-text)' }}>Email sent to {nomineeName}</div>
        </div>
        <div className="text-sm" style={{ color: 'var(--color-portal-sub)', lineHeight: 1.5 }}>
          Phase advanced to <strong>Outreach sent</strong>. The page is refreshing.
        </div>
      </div>
    )
  }

  // Plain-text preview of the body for the summary card — strips tags
  // so the editor never sees raw HTML markup.
  const bodyPreview = bodyHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()

  return (
    <>
      <div className="bg-white border border-portal-border rounded-lg overflow-hidden">

        {/* Header */}
        <div style={{
          padding: '12px 16px',
          borderBottom: '1px solid var(--color-portal-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'var(--color-portal-bg)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Mail size={14} color="var(--color-portal-blue)" />
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-portal-text)' }}>
              Outreach to nominee
            </span>
          </div>
          <button
            type="button"
            onClick={() => setComposerOpen(true)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              background: 'none', border: 'none', padding: 0,
              fontSize: 12, fontWeight: 600,
              color: 'var(--color-portal-blue)',
              cursor: 'pointer',
            }}
          >
            <Edit3 size={11} /> Edit email
          </button>
        </div>

        {/* Summary fields */}
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <SummaryRow label="To"      value={to} />
          <SummaryRow label="Subject" value={subject} />
          <div>
            <SummaryLabel>Preview</SummaryLabel>
            <div style={{
              marginTop: 4,
              fontSize: 13,
              color: 'var(--color-portal-text)',
              lineHeight: 1.5,
              maxHeight: 80,
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 4,
              WebkitBoxOrient: 'vertical',
            }}>
              {bodyPreview || <span style={{ color: 'var(--color-portal-muted)', fontStyle: 'italic' }}>(empty)</span>}
            </div>
          </div>

          <div style={{ fontSize: 12, color: 'var(--color-portal-sub)', lineHeight: 1.5 }}>
            Pre-filled {typeLabel} template. Click <strong>Edit email</strong> to customize before sending.
          </div>

          {error && (
            <div className="alert alert-error" style={{ fontSize: 12 }}>
              {error}
            </div>
          )}

          {/* ── Two equal-weight buttons: navy primary + red destructive */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
            <button
              type="button"
              onClick={handleSendDirect}
              disabled={sending}
              style={primaryBtn(sending)}
            >
              {sending
                ? <><Loader2 size={14} className="animate-spin" /><span>Sending…</span></>
                : <span>{isFirstSend ? 'Approve & send email' : 'Send outreach'}</span>}
            </button>
            <button
              type="button"
              onClick={() => setRejectOpen(true)}
              disabled={sending}
              style={destructiveBtn(sending)}
            >
              Reject nomination
            </button>
          </div>
        </div>
      </div>

      {/* ── Modals ───────────────────────────────────────────────── */}
      <EmailComposerModal
        open={composerOpen}
        onClose={() => setComposerOpen(false)}
        title="Outreach to nominee"
        sendLabel={isFirstSend ? 'Approve & send email' : 'Send outreach'}
        initialTo={to}
        initialSubject={subject}
        initialBodyHtml={bodyHtml}
        onSend={sendOutreach}
      />
      <RejectModal
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        nomineeName={nomineeName}
        onConfirm={handleReject}
      />
    </>
  )
}

// ── Subcomponents ────────────────────────────────────────────────────────────

function SummaryLabel({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      display: 'block',
      fontSize: 10, fontWeight: 700,
      textTransform: 'uppercase', letterSpacing: '.5px',
      color: 'var(--color-portal-sub)',
    }}>
      {children}
    </span>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <SummaryLabel>{label}</SummaryLabel>
      <div style={{
        marginTop: 3,
        fontSize: 13,
        color: 'var(--color-portal-text)',
        fontWeight: 500,
        wordBreak: 'break-word',
      }}>
        {value || <span style={{ color: 'var(--color-portal-muted)', fontStyle: 'italic' }}>(empty)</span>}
      </div>
    </div>
  )
}

// Shared button styles — same height, same font, same padding, same
// border-radius. Background is the only thing that differs.
function primaryBtn(busy: boolean): React.CSSProperties {
  return {
    width: '100%',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    padding: '11px 16px',
    background: 'var(--color-portal-navy)',
    color: 'white',
    border: 'none',
    borderRadius: 8,
    fontSize: 13, fontWeight: 700,
    cursor: busy ? 'wait' : 'pointer',
    opacity: busy ? 0.7 : 1,
    whiteSpace: 'nowrap',
  }
}

function destructiveBtn(busy: boolean): React.CSSProperties {
  return {
    width: '100%',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    padding: '11px 16px',
    background: 'var(--color-portal-red)',
    color: 'white',
    border: 'none',
    borderRadius: 8,
    fontSize: 13, fontWeight: 700,
    cursor: busy ? 'wait' : 'pointer',
    opacity: busy ? 0.5 : 1,
    whiteSpace: 'nowrap',
  }
}
