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
    <div className="flex items-center gap-3 py-2 border-b border-border mb-6">
      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
        {ad.ad_eyebrow ?? 'Presented by'}
      </span>
      {ad.ad_headline && ad.ad_link ? (
        <Link
          href={ad.ad_link}
          className="text-sm font-semibold text-foreground hover:text-primary transition-colors"
        >
          {ad.ad_headline}
        </Link>
      ) : ad.ad_headline ? (
        <span className="text-sm font-semibold text-foreground">{ad.ad_headline}</span>
      ) : null}
    </div>
  )
}
