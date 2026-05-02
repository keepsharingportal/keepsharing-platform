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
    <aside className="ad-inline-recommendation">
      <p className="ad-eyebrow">{ad.ad_eyebrow ?? 'Recommended'}</p>
      {ad.ad_headline && <h4 className="ad-headline">{ad.ad_headline}</h4>}
      {ad.ad_description && <p className="ad-description">{ad.ad_description}</p>}
      {ad.ad_cta_label && ad.ad_link && (
        <Link href={ad.ad_link} className="ad-cta">{ad.ad_cta_label} →</Link>
      )}
    </aside>
  )
}
