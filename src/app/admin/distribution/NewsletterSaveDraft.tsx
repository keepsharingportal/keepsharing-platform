'use client'

// Save the assembled newsletter as a recoverable draft. The Newsletter
// tab can have hours of editorial work in it — picked items, refined
// subject, exported HTML. Without this, closing the tab loses it all.
//
// Today's flow: editor saves a draft, copies the HTML into their ESP,
// then comes back and marks the draft "sent" (status='sent') for the
// audit trail.
//
// Tomorrow (when GHL v3 wires up): the same draft becomes the payload.
// status='scheduled' triggers a worker that POSTs body_html + subject
// to GHL. No new save-step required of the editor.

import { useState } from 'react'
import { Bookmark, Loader2, Check, Mail } from 'lucide-react'

interface Props {
  publication:     string
  issueLabelHint:  string  // e.g. "RRP — Week of Jun 16"
  itemIds:         string[]
  subjectLine:     string  // editor-selected subject (or first templated)
  bodyHtml:        string
  bodyPlainText:   string
  bodyMobile:      string
}

export function NewsletterSaveDraft({
  publication, issueLabelHint, itemIds, subjectLine, bodyHtml, bodyPlainText, bodyMobile,
}: Props) {
  const [open, setOpen]       = useState(false)
  const [busy, setBusy]       = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [issueLabel, setIssueLabel] = useState(issueLabelHint)
  const [subject,    setSubject]    = useState(subjectLine)
  const [notes,      setNotes]      = useState('')

  async function save() {
    if (!issueLabel.trim()) { setError('Give the issue a label.'); return }
    setBusy(true); setError(null); setSuccess(null)
    try {
      const res = await fetch('/api/admin/distribution/newsletter-drafts', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          publication,
          issue_label:     issueLabel.trim(),
          subject_line:    subject || null,
          body_html:       bodyHtml,
          body_plain_text: bodyPlainText,
          body_mobile:     bodyMobile,
          item_ids:        itemIds,
          notes:           notes || null,
        }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) { setError(j.error ?? 'Save failed.'); return }
      setSuccess(`Saved as "${issueLabel}". Find it under Newsletter drafts.`)
      setTimeout(() => setOpen(false), 1800)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally { setBusy(false) }
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn btn-primary btn-sm" disabled={itemIds.length === 0}>
        <Bookmark size={11} /> Save as draft
      </button>
    )
  }

  return (
    <div className="card" style={{ marginTop: 10, border: '1px solid var(--color-portal-blue)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <Bookmark size={12} color="var(--color-portal-blue)" />
        <span className="fw-700 text-sm" style={{ color: 'var(--color-portal-blue)' }}>Save newsletter draft</span>
      </div>

      <div className="fg">
        <label>Issue label</label>
        <input value={issueLabel} onChange={e => setIssueLabel(e.target.value)} placeholder="e.g. RRP — Week of Jun 16" />
      </div>

      <div className="fg">
        <label>Subject line</label>
        <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="(can edit later)" />
      </div>

      <div className="fg">
        <label>Notes (optional)</label>
        <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Anything to remember about this issue?" />
      </div>

      <div className="text-muted text-xs" style={{ marginBottom: 10 }}>
        Saves {itemIds.length} item{itemIds.length === 1 ? '' : 's'} + the assembled HTML/plain text/mobile export.
        Once GHL v3 push wires up, this becomes the send payload — no re-work.
      </div>

      {error   && <div className="alert alert-error text-xs">{error}</div>}
      {success && <div className="alert alert-success text-xs"><Check size={10} style={{ display: 'inline', verticalAlign: -1 }} /> {success}</div>}

      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" onClick={save} disabled={busy} className="btn btn-primary btn-sm">
          {busy ? <><Loader2 size={11} className="animate-spin" /> Saving…</> : <><Mail size={11} /> Save draft</>}
        </button>
        <button type="button" onClick={() => setOpen(false)} disabled={busy} className="btn btn-ghost btn-sm">
          Cancel
        </button>
      </div>
    </div>
  )
}
