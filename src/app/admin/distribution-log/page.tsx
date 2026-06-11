// /admin/distribution-log — log of every fan-out an article triggered
// (newsletter drafts, social posts, future channels).

import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { Send, ExternalLink, AlertCircle, CheckCircle2 } from 'lucide-react'
import { CopyDraftButton } from './CopyDraftButton'

export const metadata: Metadata = { title: 'Distribution Log — Admin' }
export const dynamic = 'force-dynamic'

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

interface LogRow {
  id:           string
  article_id:   string
  brand_slug:   string
  channel:      string
  status:       string
  detail:       null | { draft?: { subjectLine?: string; preheader?: string; body?: string; cta_label?: string; cta_url?: string; hero_image_url?: string | null }; error?: string }
  external_id:  string | null
  triggered_by: string | null
  occurred_at:  string
}

interface ArticleRef { id: string; title: string; slug: string; brand_slug: string }

export default async function DistributionLogPage() {
  const sb = supabaseAdmin()
  let migrated = true
  let rows: LogRow[] = []
  const articlesById: Map<string, ArticleRef> = new Map()
  try {
    const probe = await sb.from('article_distribution_log').select('id').limit(1)
    if (probe.error && /relation .* does not exist/i.test(probe.error.message)) {
      migrated = false
    } else if (!probe.error) {
      const { data } = await sb
        .from('article_distribution_log')
        .select('*')
        .order('occurred_at', { ascending: false })
        .limit(100)
      rows = (data ?? []) as LogRow[]
      if (rows.length > 0) {
        const ids = Array.from(new Set(rows.map(r => r.article_id)))
        const { data: artData } = await sb.from('guide_articles').select('id, title, slug, brand_slug').in('id', ids)
        for (const a of (artData ?? []) as ArticleRef[]) articlesById.set(a.id, a)
      }
    }
  } catch { /* ignore */ }

  return (
    <div className="flex-1 overflow-y-auto bg-portal-bg">
      <div className="bg-white border-b border-portal-border px-6 py-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Send size={16} className="text-portal-blue" />
          <h1 className="portal-page-title">Distribution Log</h1>
        </div>
        <p className="portal-page-subtitle">
          Newsletter drafts + social posts + future channels. Drafts are ready to copy into GHL.
        </p>
      </div>

      <div className="p-6 max-w-5xl">
        {!migrated && (
          <div className="bg-portal-amber-lt border border-portal-amber/30 rounded-lg p-4 text-portal-text text-xs">
            <strong>Migration 165 pending.</strong> Apply <code className="bg-white px-1 py-0.5 rounded border border-portal-border">supabase/migrations/165_article_distribution.sql</code> to enable the log.
          </div>
        )}

        {migrated && rows.length === 0 && (
          <div className="bg-white border border-portal-border rounded-lg p-8 text-center text-sm text-portal-muted">
            No distribution events yet. Toggle &quot;Queue GHL newsletter draft on publish&quot; in the article editor to populate this log.
          </div>
        )}

        {migrated && rows.length > 0 && (
          <ul className="space-y-3">
            {rows.map(r => {
              const article = articlesById.get(r.article_id)
              const draft = r.detail?.draft
              const error = r.detail?.error
              return (
                <li key={r.id} className="bg-white border border-portal-border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full inline-flex items-center gap-1 ${
                      r.status === 'success'
                        ? 'text-portal-green bg-portal-green-lt border border-portal-green/30'
                        : r.status === 'failed'
                          ? 'text-red-700 bg-red-50 border border-red-200'
                          : 'text-portal-amber bg-portal-amber-lt border border-portal-amber/30'
                    }`}>
                      {r.status === 'success' ? <CheckCircle2 size={9} /> :
                       r.status === 'failed'   ? <AlertCircle size={9} /> :
                                                  <Send size={9} />}
                      {r.channel} · {r.status}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-portal-sub bg-portal-bg border border-portal-border px-1.5 py-0.5 rounded-full">{r.brand_slug}</span>
                    <span className="text-[11px] text-portal-muted">{new Date(r.occurred_at).toLocaleString()}</span>
                    {article && (
                      <Link href={`/admin/articles/${article.id}/edit`} className="ml-auto text-[11px] text-portal-blue hover:underline inline-flex items-center gap-1">
                        {article.title} <ExternalLink size={9} />
                      </Link>
                    )}
                  </div>

                  {error && (
                    <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded p-2">{error}</p>
                  )}

                  {draft && (
                    <div className="space-y-3 text-xs">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-portal-muted">Subject</p>
                        <p className="text-portal-text font-bold mt-0.5">{draft.subjectLine}</p>
                      </div>
                      {draft.preheader && (
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-portal-muted">Preheader</p>
                          <p className="text-portal-sub mt-0.5">{draft.preheader}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-portal-muted">Body</p>
                        <p className="text-portal-text mt-0.5 whitespace-pre-wrap leading-snug">{draft.body}</p>
                      </div>
                      {draft.cta_label && draft.cta_url && (
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-portal-muted">CTA</p>
                          <p className="text-portal-text mt-0.5">
                            <span className="font-bold">{draft.cta_label}</span> →{' '}
                            <a href={draft.cta_url} target="_blank" rel="noreferrer" className="text-portal-blue hover:underline break-all">{draft.cta_url}</a>
                          </p>
                        </div>
                      )}
                      <div className="pt-2 border-t border-portal-border">
                        <CopyDraftButton draft={draft} />
                      </div>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
