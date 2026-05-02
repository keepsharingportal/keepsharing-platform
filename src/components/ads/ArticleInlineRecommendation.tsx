import Link from 'next/link'
import { getActiveAds } from '@/lib/get-active-ads'

interface Props {
  articleSlug?: string
}

export async function ArticleInlineRecommendation({ articleSlug }: Props) {
  const ads = await getActiveAds('article_inline_recommendation', articleSlug ?? null, 1)
  if (!ads.length) return null
  const ad = ads[0]

  return (
    <aside className="my-6 rounded-2xl border border-border bg-muted/50 p-5">
      <p className="text-xs font-bold uppercase tracking-wider text-primary mb-2">
        {ad.ad_eyebrow ?? 'Recommended'}
      </p>
      {ad.ad_headline && (
        <h4 className="font-bold text-foreground mb-1 leading-snug">{ad.ad_headline}</h4>
      )}
      {ad.ad_description && (
        <p className="text-sm text-muted-foreground leading-relaxed mb-3">{ad.ad_description}</p>
      )}
      {ad.ad_cta_label && ad.ad_link && (
        <Link
          href={ad.ad_link}
          className="text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
        >
          {ad.ad_cta_label} →
        </Link>
      )}
    </aside>
  )
}
