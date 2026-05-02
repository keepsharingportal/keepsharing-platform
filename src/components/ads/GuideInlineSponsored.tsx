import Link from 'next/link'
import { getActiveAds } from '@/lib/get-active-ads'

interface Props {
  guideUrlSlug: string
}

export async function GuideInlineSponsored({ guideUrlSlug }: Props) {
  const ads = await getActiveAds('guide_inline_sponsored', guideUrlSlug, 1)
  if (!ads.length) return null
  const ad = ads[0]

  return (
    <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
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
          className="inline-flex items-center gap-1 px-4 py-1.5 rounded-full bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          {ad.ad_cta_label} →
        </Link>
      )}
    </div>
  )
}
