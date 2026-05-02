import Link from 'next/link'
import { getActiveAds } from '@/lib/get-active-ads'

export async function CalendarInlinePromotion() {
  const ads = await getActiveAds('calendar_inline_promotion', null, 1)
  if (!ads.length) return null
  const ad = ads[0]

  return (
    <div className="rounded-2xl border border-secondary/20 bg-secondary/5 p-4 flex gap-4 items-center">
      <div className="flex-1">
        <p className="text-xs font-bold uppercase tracking-wider text-primary mb-1">
          {ad.ad_eyebrow ?? 'Partner Promotion'}
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
