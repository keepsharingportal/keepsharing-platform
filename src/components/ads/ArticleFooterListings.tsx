import Link from 'next/link'
import { getActiveAds } from '@/lib/get-active-ads'

interface Props {
  articleSlug?: string
}

export async function ArticleFooterListings({ articleSlug }: Props) {
  const ads = await getActiveAds('article_footer_listings', articleSlug ?? null, 3)
  if (!ads.length) return null

  const linkableAds = ads.filter(ad => ad.ad_link)
  if (!linkableAds.length) return null

  return (
    <section className="border-t border-border pt-8 mt-8">
      <p className="text-xs font-bold uppercase tracking-wider text-primary mb-4">
        Mentioned in This Article
      </p>
      <div className="flex flex-col gap-3">
        {linkableAds.map(ad => (
          <Link
            key={ad.id}
            href={ad.ad_link!}
            className="flex items-center gap-4 p-4 border border-border rounded-2xl bg-card hover:shadow-sm transition-shadow no-underline"
          >
            <div className="flex-1">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                {ad.ad_eyebrow ?? 'Partner'}
              </p>
              {ad.ad_headline && (
                <p className="font-semibold text-sm text-foreground">{ad.ad_headline}</p>
              )}
            </div>
            {ad.ad_cta_label && (
              <span className="shrink-0 text-sm font-semibold text-primary">
                {ad.ad_cta_label} →
              </span>
            )}
          </Link>
        ))}
      </div>
    </section>
  )
}
