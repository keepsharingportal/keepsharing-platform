'use client'

// The publish bridge in a button. Calls POST /api/admin/community-
// submissions/[id]/publish-to-article, which inserts a guide_articles
// row (homepage starts rotating it immediately) and stamps the
// submission with promoted_to_article_id.
//
// Editorial integrity: only enabled when approved_web === true. If
// approved_social is also true, the API auto-queues the Facebook post
// via Meta Suite. The button surfaces both downstream effects in its
// confirm dialog so the editor knows what will happen before clicking.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Send, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react'

interface Props {
  submissionId:    string
  approvedWeb:     boolean
  approvedSocial:  boolean
  alreadyPromoted: boolean
  articleId?:      string | null
}

export function PublishToHomepageButton({
  submissionId, approvedWeb, approvedSocial, alreadyPromoted, articleId,
}: Props) {
  const router = useRouter()
  const [busy, setBusy]     = useState(false)
  const [error, setError]   = useState<string | null>(null)
  const [success, setSuccess] = useState<{ article_id: string; slug: string } | null>(null)

  if (alreadyPromoted && articleId) {
    return (
      <div
        className="mt-3 pt-3 border-t border-gray-50"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--color-portal-green)' }}>
          <CheckCircle2 size={12} /> Published to homepage
        </span>
        <a
          href={`/admin/articles/${articleId}/edit`}
          className="text-xs"
          style={{ color: 'var(--color-portal-blue)' }}
        >
          Edit article →
        </a>
      </div>
    )
  }

  if (!approvedWeb) {
    return (
      <div
        className="mt-3 pt-3 border-t border-gray-50"
        style={{ fontSize: 11, color: 'var(--color-portal-muted)', fontStyle: 'italic' }}
      >
        Approve for Website first to publish to the homepage.
      </div>
    )
  }

  async function publish() {
    const confirmMsg = approvedSocial
      ? 'Publish to homepage now? This creates a public article that will rotate on the homepage AND auto-post to Facebook (because Social was approved).'
      : 'Publish to homepage now? This creates a public article that will rotate on the homepage. Social posting is NOT included (Social not approved).'
    if (!confirm(confirmMsg)) return

    setBusy(true); setError(null)
    try {
      const res = await fetch(`/api/admin/community-submissions/${submissionId}/publish-to-article`, {
        method: 'POST',
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) { setError(j.error ?? 'Publish failed.'); return }
      setSuccess({ article_id: j.article_id, slug: j.slug })
      // Refresh the desk so the row flips to 'published' status.
      setTimeout(() => router.refresh(), 800)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-3 pt-3 border-t border-gray-50">
      {success && (
        <div
          style={{
            background: 'var(--color-portal-green-lt)',
            color: 'var(--color-portal-green)',
            border: '1px solid #86EFAC',
            padding: '8px 10px', borderRadius: 8,
            fontSize: 12, marginBottom: 8,
            display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          <CheckCircle2 size={12} /> Published. Homepage will pick it up on next refresh.
        </div>
      )}
      {error && (
        <div
          style={{
            background: 'var(--color-portal-red-lt)',
            color: 'var(--color-portal-red)',
            border: '1px solid #FCA5A5',
            padding: '8px 10px', borderRadius: 8,
            fontSize: 12, marginBottom: 8,
            display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          <AlertTriangle size={12} /> {error}
        </div>
      )}
      <button
        type="button"
        onClick={publish}
        disabled={busy}
        className="w-full py-2 rounded-lg text-xs font-bold text-white bg-portal-navy hover:opacity-90 transition-colors"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
      >
        {busy ? <><Loader2 size={12} className="animate-spin" /> Publishing…</> : <><Send size={12} /> Publish to homepage</>}
      </button>
      <div style={{ fontSize: 10, color: 'var(--color-portal-muted)', marginTop: 6, lineHeight: 1.4 }}>
        Creates a guide_articles row with the right column_slug. Homepage rotation picks it up immediately.
        {approvedSocial && ' Auto-posts to Facebook via Meta Suite (Social was approved).'}
      </div>
    </div>
  )
}
