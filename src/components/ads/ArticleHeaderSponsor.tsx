import Link from 'next/link'
import { getActiveAds } from '@/lib/get-active-ads'

interface Props {
  articleSlug?: string
}

export async function ArticleHeaderSponsor({ articleSlug }: Props) {
  const ads = await getActiveAds('article_header_sponsor', articleSlug ?? null, 1)
  if (!ads.length) return null
  const ad = ads[0]

  return (
    <div className="ad-article-header">
      <p className="ad-eyebrow">{ad.ad_eyebrow ?? 'Presented by'}</p>
      {ad.ad_headline && ad.ad_link
        ? <Link href={ad.ad_link} className="ad-headline" style={{ fontSize: 'var(--ed-text-small)', textDecoration: 'none' }}>{ad.ad_headline}</Link>
        : ad.ad_headline && <span className="ad-headline" style={{ fontSize: 'var(--ed-text-small)' }}>{ad.ad_headline}</span>
      }
    </div>
  )
}
