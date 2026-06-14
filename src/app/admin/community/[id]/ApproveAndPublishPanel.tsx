'use client'

// One-stop Approval + Publish panel on the canonical submission detail.
// Replaces the bouncing-between-pages dance: channel approvals, request
// changes, and Publish-to-Homepage all live here so the editor never
// has to leave /admin/community/[id].

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Loader2, Send, AlertTriangle, CheckCircle2 } from 'lucide-react'

interface Props {
  submissionId:        string
  initialApproved:     { web: boolean; newsletter: boolean; social: boolean }
  alreadyPromoted:     boolean
  promotedArticleId?:  string | null
  initialChangesNote?: string | null
}

const CHANNELS = [
  { key: 'web',        label: 'Approve for Website',     hint: 'Eligible for the homepage rotation + article archives' },
  { key: 'newsletter', label: 'Approve for Newsletter',  hint: 'Eligible to be drafted into a newsletter issue' },
  { key: 'social',     label: 'Approve for Social',      hint: 'When the article publishes, Meta Suite auto-posts to Facebook' },
] as const

export function ApproveAndPublishPanel({
  submissionId, initialApproved, alreadyPromoted, promotedArticleId, initialChangesNote,
}: Props) {
  const router = useRouter()
  const [approved, setApproved]     = useState(initialApproved)
  const [busy, setBusy]             = useState<string | null>(null)
  const [publishing, setPublishing] = useState(false)
  const [published, setPublished]   = useState(alreadyPromoted)
  const [articleId, setArticleId]   = useState(promotedArticleId ?? null)
  const [error, setError]           = useState<string | null>(null)
  const [changesNote, setChangesNote] = useState(initialChangesNote ?? '')
  const [changesBusy, setChangesBusy] = useState(false)
  const [showChanges, setShowChanges] = useState(false)

  async function toggleChannel(channel: 'web' | 'newsletter' | 'social', next: boolean) {
    setBusy(channel); setError(null)
    try {
      const res = await fetch(`/api/admin/community-submissions/${submissionId}/approve-channel`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ channel, approved: next }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) { setError(j.error ?? 'Approval failed.'); return }
      setApproved(prev => ({ ...prev, [channel]: next }))
    } finally { setBusy(null) }
  }

  async function requestChanges() {
    if (!changesNote.trim()) { setError('Add a note describing what needs to change.'); return }
    setChangesBusy(true); setError(null)
    try {
      const res = await fetch(`/api/admin/community-submissions/${submissionId}/request-changes`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ note: changesNote.trim() }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) { setError(j.error ?? 'Failed to flag changes.'); return }
      setShowChanges(false)
      router.refresh()
    } finally { setChangesBusy(false) }
  }

  async function publish() {
    if (!approved.web) { setError('Approve for Website first.'); return }
    const confirmMsg = approved.social
      ? 'Publish to homepage now? Creates a public article AND auto-posts to Facebook (Social approved).'
      : 'Publish to homepage now? Creates a public article. Social posting is NOT included (Social not approved).'
    if (!confirm(confirmMsg)) return

    setPublishing(true); setError(null)
    try {
      const res = await fetch(`/api/admin/community-submissions/${submissionId}/publish-to-article`, { method: 'POST' })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) { setError(j.error ?? 'Publish failed.'); return }
      setPublished(true)
      setArticleId(j.article_id)
      setTimeout(() => router.refresh(), 800)
    } finally { setPublishing(false) }
  }

  return (
    <div className="bg-white border border-portal-border rounded-lg overflow-hidden">
      <div className="px-5 py-3.5 border-b border-portal-border bg-portal-bg">
        <h2 className="text-xs font-bold text-portal-text uppercase tracking-wide">Approve & publish</h2>
        <p className="text-[11px] text-portal-muted mt-0.5">
          Channel approvals + Publish to Homepage. Same workflow that used to live on the Approval Desk — now here so you don&apos;t leave the page.
        </p>
      </div>

      <div className="p-5 space-y-3">
        {error && (
          <div className="alert alert-error" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <AlertTriangle size={12} /> {error}
          </div>
        )}

        {/* Channel toggles */}
        {CHANNELS.map(ch => (
          <div key={ch.key} className="flex items-start gap-3">
            <button
              type="button"
              onClick={() => toggleChannel(ch.key, !approved[ch.key])}
              disabled={busy === ch.key}
              style={{
                width: 22, height: 22, borderRadius: 6,
                border: `2px solid ${approved[ch.key] ? 'var(--color-portal-green)' : 'var(--color-portal-border-2)'}`,
                background: approved[ch.key] ? 'var(--color-portal-green)' : 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, cursor: busy === ch.key ? 'wait' : 'pointer',
                marginTop: 2,
              }}
              title={approved[ch.key] ? 'Click to un-approve' : 'Click to approve'}
            >
              {busy === ch.key ? <Loader2 size={12} className="animate-spin" color="white" /> :
                approved[ch.key] ? <Check size={14} color="white" strokeWidth={3} /> : null}
            </button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className={`text-sm fw-700 ${approved[ch.key] ? 'text-portal-green' : 'text-portal-text'}`}>
                {ch.label}
              </div>
              <div className="text-[11px] text-portal-muted">{ch.hint}</div>
            </div>
          </div>
        ))}

        {/* Approve All shortcut */}
        {!approved.web && !approved.newsletter && !approved.social && (
          <button
            type="button"
            onClick={() => toggleChannel('web', true).then(() => toggleChannel('newsletter', true)).then(() => toggleChannel('social', true))}
            disabled={!!busy}
            className="w-full py-2 rounded-lg text-xs font-bold text-white bg-portal-navy hover:opacity-90 transition-opacity"
          >
            ✓ Approve all channels
          </button>
        )}

        {/* Request changes */}
        <div className="pt-3 border-t border-portal-border">
          {!showChanges ? (
            <button
              type="button"
              onClick={() => setShowChanges(true)}
              className="w-full text-xs px-3 py-2 rounded-lg border border-portal-amber/30 text-portal-amber hover:bg-portal-amber-lt transition-colors font-medium"
            >
              ↩ Request changes
            </button>
          ) : (
            <div className="space-y-2">
              <textarea
                value={changesNote}
                onChange={e => setChangesNote(e.target.value)}
                rows={3}
                placeholder="Describe what needs to change before this is ready…"
                className="w-full text-xs px-3 py-2 rounded-lg border border-portal-border"
              />
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  type="button"
                  onClick={requestChanges}
                  disabled={changesBusy}
                  className="flex-1 text-xs px-3 py-2 rounded-lg bg-portal-amber text-white font-bold"
                >
                  {changesBusy ? <Loader2 size={11} className="animate-spin inline" /> : 'Send'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowChanges(false)}
                  disabled={changesBusy}
                  className="text-xs px-3 py-2 rounded-lg text-portal-sub"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Publish to Homepage — the bridge */}
        <div className="pt-3 border-t border-portal-border">
          {published && articleId ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--color-portal-green)' }}>
                <CheckCircle2 size={12} /> Published to homepage
              </span>
              <a
                href={`/admin/articles/${articleId}/edit`}
                className="text-xs text-portal-blue hover:underline font-semibold"
              >
                Edit article →
              </a>
            </div>
          ) : !approved.web ? (
            <div style={{ fontSize: 11, color: 'var(--color-portal-muted)', fontStyle: 'italic' }}>
              Approve for Website above to enable Publish to homepage.
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={publish}
                disabled={publishing}
                className="w-full py-2.5 rounded-lg text-sm font-bold text-white bg-portal-navy hover:opacity-90 transition-opacity"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              >
                {publishing ? <><Loader2 size={13} className="animate-spin" /> Publishing…</> : <><Send size={13} /> Publish to homepage</>}
              </button>
              <div style={{ fontSize: 10, color: 'var(--color-portal-muted)', marginTop: 6, lineHeight: 1.4 }}>
                Creates a guide_articles row with the right column_slug. Homepage rotation picks it up immediately.
                {approved.social && ' Auto-posts to Facebook via Meta Suite (Social approved).'}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
