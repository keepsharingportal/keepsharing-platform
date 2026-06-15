// ── /admin/articles/[id]/seo ──────────────────────────────────────────────
//
// Per-article SEO editor: title / meta description / focus keyword /
// secondary keywords / canonical override / noindex flag. Live SERP
// preview + content-analyzer score breakdown. AI assist button calls
// Claude for one-click suggestions.

import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/admin/auth'
import { analyzeArticle } from '@/lib/seo/content-analyzer'
import { SeoEditorClient } from './SeoEditorClient'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

interface Props {
  params:       Promise<{ id: string }>
  searchParams: Promise<{ suggestion?: string; from?: string }>
}

export default async function ArticleSeoPage({ params, searchParams }: Props) {
  await requireAdmin()
  const { id } = await params
  const sp     = await searchParams

  const sb = createAdminClient()
  const { data, error } = await sb
    .from('guide_articles')
    .select('id, title, slug, column_slug, excerpt, body, hero_image_url, brand_slug, published_at, seo_title, seo_description, seo_focus_keyword, seo_secondary_keywords, seo_canonical_override, seo_no_index, seo_score, seo_score_breakdown, seo_last_audited_at')
    .eq('id', id)
    .maybeSingle()
  if (error || !data) notFound()

  // Pre-compute the initial score so the editor sees real numbers on
  // first render (don't make them click Re-score first).
  const internalLinks = (data.body as string ?? '').match(/href="(\/[^"]*|https?:\/\/(?:www\.)?riverregionparents\.com[^"]*)"/gi)?.length ?? 0
  const externalLinks = ((data.body as string ?? '').match(/href="https?:\/\/[^"]*"/gi)?.length ?? 0) - internalLinks
  const initialAnalysis = analyzeArticle({
    title:             data.title as string,
    seoTitle:          data.seo_title as string | null,
    excerpt:           data.excerpt as string | null,
    seoDescription:    data.seo_description as string | null,
    focusKeyword:      data.seo_focus_keyword as string | null,
    secondaryKeywords: (data.seo_secondary_keywords as string[] | null) ?? undefined,
    bodyHtml:          (data.body as string) ?? '',
    slug:              (data.slug as string) ?? '',
    heroImageUrl:      data.hero_image_url as string | null,
    internalLinkCount: internalLinks,
    externalLinkCount: Math.max(0, externalLinks),
  })

  return (
    <div className="portal-app flex flex-col flex-1 min-h-0 bg-portal-bg">
      <div className="page-header">
        <div>
          <Link href={`/admin/articles/${data.id}/edit`} className="text-xs text-portal-sub hover:text-portal-text">
            ← Article editor
          </Link>
          <h1 className="ph-title" style={{ marginTop: 6 }}>SEO — {data.title}</h1>
          <div className="text-muted text-sm">
            Tune how this article appears in Google, social previews, and your structured data.
            Run the AI assist for one-click suggestions; the analyzer scores the page in real time.
          </div>
        </div>
      </div>

      <div className="content-body overflow-y-auto">
        <SeoEditorClient
          articleId={data.id as string}
          brandSlug={(data.brand_slug as string | null) ?? 'rrp'}
          fallbackTitle={data.title as string}
          fallbackDescription={data.excerpt as string | null}
          slug={data.slug as string}
          columnSlug={data.column_slug as string | null}
          pendingSuggestion={sp.suggestion ?? null}
          fromAuditId={sp.from ?? null}
          initial={{
            seoTitle:              data.seo_title              as string | null,
            seoDescription:        data.seo_description        as string | null,
            seoFocusKeyword:       data.seo_focus_keyword      as string | null,
            seoSecondaryKeywords:  (data.seo_secondary_keywords as string[] | null) ?? [],
            seoCanonicalOverride:  data.seo_canonical_override as string | null,
            seoNoIndex:            !!data.seo_no_index,
            score:                 initialAnalysis.score,
            breakdown:             initialAnalysis.breakdown,
            grade:                 initialAnalysis.grade,
            lastAuditedAt:         data.seo_last_audited_at as string | null,
          }}
        />
      </div>
    </div>
  )
}
