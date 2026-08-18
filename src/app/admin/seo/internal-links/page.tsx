// ── /admin/seo/internal-links ─────────────────────────────────────────────
//
// Editor review queue for the internal-link suggestion engine. Each row:
// source article, anchor text candidate, target article, context
// snippet. Editor accepts (inserts the link into source body) or
// rejects (removes from queue).

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireSettingsAccess } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { ArrowRight, ArrowLeft, Link as LinkIcon } from 'lucide-react'
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
  await requireSettingsAccess()
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
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="bg-white border-b border-portal-border px-6 py-4 shrink-0">
        <Link href="/admin/seo" className="text-[11px] font-semibold text-portal-sub hover:text-portal-text inline-flex items-center gap-1 mb-1">
          <ArrowLeft size={11} /> SEO
        </Link>
        <h1 className="text-[18px] font-bold text-portal-text">
          <LinkIcon size={16} className="inline -translate-y-0.5 mr-1" /> Internal link suggestions
        </h1>
        <p className="text-[12px] text-portal-sub mt-1">
          Auto-found opportunities to link one article to another. The nightly cron auto-applies
          suggestions with score ≥ 90 (focus-keyword match + page-2 GSC boost); everything below
          waits here for editor review. Accept = link inserted into the source body.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto bg-portal-bg">
        <div className="px-6 py-6 space-y-4">

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white border border-portal-border rounded-lg p-4">
              <div className="text-[22px] font-black text-portal-text">{rows.length}</div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-portal-sub mt-1">Pending</div>
            </div>
            <RunPassButton />
            <ApplyAllButton pendingCount={rows.length} />
          </div>

          {rows.length === 0 ? (
            <div className="bg-white border border-portal-border rounded-lg text-center text-portal-sub text-[13px] py-8">
              No suggestions in the queue. The next run will populate them.
            </div>
          ) : (
            <div className="space-y-2.5">
              {rows.map(r => {
                const src = articleById.get(r.source_article_id)
                const tgt = articleById.get(r.target_article_id)
                if (!src || !tgt) return null
                return (
                  <div key={r.id} className="bg-white border border-portal-border rounded-lg p-3.5">
                    <div className="flex items-center gap-2 mb-2 text-[12px]">
                      <Link href={`/admin/go/columns/${src.column_slug}/${src.slug}`} target="_blank" className="text-portal-blue font-bold">
                        {src.title}
                      </Link>
                      <ArrowRight size={12} className="text-portal-sub" />
                      <Link href={`/admin/go/columns/${tgt.column_slug}/${tgt.slug}`} target="_blank" className="text-portal-blue font-bold">
                        {tgt.title}
                      </Link>
                      <span className="text-portal-sub text-[11px] ml-auto">
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
                        <p className={`text-[13px] text-portal-text leading-relaxed ${reason ? 'mb-1.5' : 'mb-2'}`}>
                          <span className="text-portal-sub">…</span>
                          {snippet.replace(new RegExp(`\\b${r.anchor_text}\\b`, 'i'),
                            ` <<ANCHOR>>${r.anchor_text}<</ANCHOR>> `).split(/<<\/?ANCHOR>>/).map((part, i) =>
                              i === 1
                                ? <strong key={i} className="bg-portal-amber-lt px-1 rounded-sm">{part}</strong>
                                : <span key={i}>{part}</span>
                            )}
                          <span className="text-portal-sub">…</span>
                        </p>
                        {reason && (
                          <div className="inline-block bg-portal-green-lt text-portal-green px-2 py-0.5 rounded text-[11px] font-semibold mb-2">
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
    </div>
  )
}
