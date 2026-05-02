import Link from 'next/link'
import Image from 'next/image'
import { getActiveAds } from '@/lib/get-active-ads'

export async function CalendarFeaturedEvent() {
  const ads = await getActiveAds('calendar_featured_event', null, 1)
  if (!ads.length) return null
  const ad = ads[0]

  return (
    <div className="rounded-2xl border border-secondary/20 bg-secondary/5 overflow-hidden mb-6">
      {ad.ad_image_url && (
        <div className="relative overflow-hidden" style={{ minHeight: 180 }}>
          <Image
            src={ad.ad_image_url}
            alt={ad.ad_headline ?? 'Sponsor Spotlight'}
            fill
            style={{ objectFit: 'cover' }}
            unoptimized
            sizes="600px"
          />
        </div>
      )}
      <div className="p-6">
        <p className="text-xs font-bold uppercase tracking-wider text-primary mb-2">
          {ad.ad_eyebrow ?? 'Sponsor Spotlight'}
        </p>
        {ad.ad_headline && (
          <h3 className="font-bold text-foreground text-lg mb-2 leading-snug">{ad.ad_headline}</h3>
        )}
        {ad.ad_description && (
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">{ad.ad_description}</p>
        )}
        {ad.ad_cta_label && ad.ad_link && (
          <Link
            href={ad.ad_link}
            className="inline-flex items-center gap-1 px-4 py-2 rounded-full bg-secondary text-white text-sm font-semibold hover:bg-secondary/90 transition-colors"
          >
            {ad.ad_cta_label} →
          </Link>
        )}
      </div>
    </div>
  )
}
