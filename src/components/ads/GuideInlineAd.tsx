import Link from 'next/link'
import { getActiveAds } from '@/lib/get-active-ads'

interface Props {
  guideUrlSlug: string
  position?: number
}

export async function GuideInlineAd({ guideUrlSlug, position = 0 }: Props) {
  const ads = await getActiveAds('guide_inline', guideUrlSlug, 2)
  if (!ads.length) return null
  const ad = ads[position % ads.length]

  return (
    <div className="rounded-2xl border border-secondary/20 bg-secondary/5 p-4 flex gap-4 items-start">
      <div className="flex-1">
        <p className="text-xs font-bold uppercase tracking-wider text-primary mb-1">
          {ad.ad_eyebrow ?? 'Sponsored'}
        </p>
        {ad.ad_headline && (
          <h4 className="font-bold text-foreground mb-1 leading-snug">{ad.ad_headline}</h4>
        )}
        {ad.ad_description && (
          <p className="text-sm text-muted-foreground leading-relaxed mb-2">{ad.ad_description}</p>
        )}
        {ad.ad_cta_label && ad.ad_link && (
          <Link
            href={ad.ad_link}
            className="text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
          >
            {ad.ad_cta_label} →
          </Link>
        )}
      </div>
    </div>
  )
}
