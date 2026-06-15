// ── /admin/seo/internal-links ─────────────────────────────────────────────
//
// Editor review queue for the internal-link suggestion engine. Each row:
// source article, anchor text candidate, target article, context
// snippet. Editor accepts (inserts the link into source body) or
// rejects (removes from queue).

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { ArrowRight } from 'lucide-react'
import { LinkActionsClient } from './LinkActionsClient'
import { RunPassButton } from './RunPassButton'
import { ApplyAllButton } from './ApplyAllButton'

export const metadata: Metadata = { title: 'Internal Links — SEO — Admin' }
export const dynamic = 'force-dynamic'

interface SugRow {
  id:                string
  source_article_id: string
  target_article_id: string
  anchor_text:       string
  context_snippet:   string | null
  match_score:       number
  status:            'pending' | 'accepted' | 'rejected' | 'applied'
  created_at:        string
}

export default async function InternalLinksPage() {
  await requireAdmin()
  const sb = createAdminClient()

  // Load pending suggestions + the article metadata both sides
  // reference, in a single round trip per concern.
  const { data: sugs } = await sb
    .from('internal_link_suggestions')
    .select('id, source_article_id, target_article_id, anchor_text, context_snippet, match_score, status, created_at')
    .eq('status', 'pending')
    .order('match_score', { ascending: false })
    .order('created_at',  { ascending: false })
    .limit(200)

  const rows = (sugs ?? []) as SugRow[]
  const articleIds = Array.from(new Set(rows.flatMap(r => [r.source_article_id, r.target_article_id])))
  const { data: articles } = articleIds.length === 0
    ? { data: [] }
    : await sb
        .from('guide_articles')
        .select('id, title, slug, column_slug')
        .in('id', articleIds)
  const articleById = new Map<string, { title: string; slug: string; column_slug: string | null }>(
    (articles ?? []).map(a => [a.id as string, { title: a.title as string, slug: a.slug as string, column_slug: a.column_slug as string | null }])
  )

  return (
    <div className="portal-app flex flex-col flex-1 min-h-0 bg-portal-bg">
      <div className="page-header">
        <div>
          <h1 className="ph-title">Internal link suggestions</h1>
          <div className="text-muted text-sm">
            Auto-found opportunities to link one article to another. Accept = link inserted into the source body.
            Run nightly via the cron; trigger a manual run from below.
          </div>
        </div>
      </div>

      <div className="content-body overflow-y-auto">

        <div className="stats-row" style={{ marginBottom: 16 }}>
          <div className="stat-card">
            <div className="stat-num">{rows.length}</div>
            <div className="stat-label">Pending</div>
          </div>
          <RunPassButton />
          <ApplyAllButton pendingCount={rows.length} />
        </div>

        {rows.length === 0 ? (
          <div className="bg-white border border-portal-border rounded-lg" style={{ padding: 24, textAlign: 'center', color: 'var(--color-portal-sub)', fontSize: 13 }}>
            No suggestions in the queue. The next run will populate them.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {rows.map(r => {
              const src = articleById.get(r.source_article_id)
              const tgt = articleById.get(r.target_article_id)
              if (!src || !tgt) return null
              return (
                <div key={r.id} className="bg-white border border-portal-border rounded-lg" style={{ padding: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontSize: 12 }}>
                    <Link href={`/columns/${src.column_slug}/${src.slug}`} target="_blank" className="text-portal-blue fw-700" style={{ textDecoration: 'none' }}>
                      {src.title}
                    </Link>
                    <ArrowRight size={12} style={{ color: 'var(--color-portal-sub)' }} />
                    <Link href={`/columns/${tgt.column_slug}/${tgt.slug}`} target="_blank" className="text-portal-blue fw-700" style={{ textDecoration: 'none' }}>
                      {tgt.title}
                    </Link>
                    <span className="text-portal-sub" style={{ marginLeft: 'auto', fontSize: 11 }}>
                      Score {r.match_score}
                    </span>
                  </div>

                  {(() => {
                    if (!r.context_snippet) return null
                    // v2 suggestions append a "[reason]" line — split it
                    // off so we can render the GSC justification as its
                    // own pill instead of inline grey text.
                    const reasonMatch = r.context_snippet.match(/\n\n\[(.+)\]\s*$/)
                    const reason   = reasonMatch?.[1] ?? null
                    const snippet  = reason ? r.context_snippet.replace(/\n\n\[.+\]\s*$/, '') : r.context_snippet
                    return (
                      <>
                        <p className="text-portal-text" style={{ fontSize: 13, lineHeight: 1.55, marginBottom: reason ? 6 : 8 }}>
                          <span className="text-portal-sub">…</span>
                          {snippet.replace(new RegExp(`\\b${r.anchor_text}\\b`, 'i'),
                            ` <<ANCHOR>>${r.anchor_text}<</ANCHOR>> `).split(/<<\/?ANCHOR>>/).map((part, i) =>
                              i === 1
                                ? <strong key={i} style={{ background: 'var(--color-portal-amber-lt)', padding: '0 3px', borderRadius: 3 }}>{part}</strong>
                                : <span key={i}>{part}</span>
                            )}
                          <span className="text-portal-sub">…</span>
                        </p>
                        {reason && (
                          <div style={{
                            display: 'inline-block',
                            background: 'var(--color-portal-green-lt, #ecfdf5)',
                            color: 'var(--color-portal-green)',
                            padding: '3px 8px',
                            borderRadius: 4,
                            fontSize: 11,
                            fontWeight: 600,
                            marginBottom: 8,
                          }}>
                            ▲ {reason}
                          </div>
                        )}
                      </>
                    )
                  })()}

                  <LinkActionsClient
                    id={r.id}
                    sourceId={r.source_article_id}
                    targetId={r.target_article_id}
                    anchorText={r.anchor_text}
                    targetPath={`/columns/${tgt.column_slug}/${tgt.slug}`}
                  />
                </div>
              )
            })}
          </div>
        )}

      </div>
    </div>
  )
}
