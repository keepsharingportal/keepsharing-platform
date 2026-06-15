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
import { loadArticleGsc } from '@/lib/seo/article-gsc'
import { isGscConfigured } from '@/lib/seo/gsc'
import { ArticleGscPanel } from './ArticleGscPanel'
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

  // Live article-level GSC roll-up — top queries, page-2 leverage,
  // CTR. Renders above the editor so the editor sees what's working
  // before deciding what to edit. When GSC isn't configured we skip
  // the panel entirely.
  const articlePath = data.column_slug ? `/columns/${data.column_slug}/${data.slug}` : `/articles/${data.slug}`
  const articleGsc  = isGscConfigured() ? await loadArticleGsc(sb, articlePath, 28) : null

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
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="bg-white border-b border-portal-border px-6 py-4 shrink-0">
        <Link href={`/admin/articles/${data.id}/edit`} className="text-[11px] font-semibold text-portal-sub hover:text-portal-text inline-flex items-center gap-1 mb-1">
          ← Article editor
        </Link>
        <h1 className="text-[18px] font-bold text-portal-text">SEO — {data.title}</h1>
        <p className="text-[12px] text-portal-sub mt-1">
          Tune how this article appears in Google, social previews, and your structured data.
          Run the AI assist for one-click suggestions; the analyzer scores the page in real time.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto bg-portal-bg">
        <div className="px-6 py-6">
        {articleGsc && <ArticleGscPanel gsc={articleGsc} articleId={data.id as string} />}
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
    </div>
  )
}
