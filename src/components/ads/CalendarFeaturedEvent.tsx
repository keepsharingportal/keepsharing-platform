import Link from 'next/link'
import Image from 'next/image'
import { getActiveAds } from '@/lib/get-active-ads'

export async function CalendarFeaturedEvent() {
  const ads = await getActiveAds('calendar_featured_event', null, 1)
  if (!ads.length) return null
  const ad = ads[0]

  return (
    <div className="ad-calendar-featured" style={{ marginBottom: 'var(--ed-space-xl)' }}>
      {ad.ad_image_url && (
        <div style={{ position: 'relative', overflow: 'hidden', minHeight: 180 }}>
          <Image src={ad.ad_image_url} alt={ad.ad_headline ?? 'Sponsor Spotlight'} fill style={{ objectFit: 'cover' }} unoptimized sizes="600px" />
        </div>
      )}
      <div style={{ padding: 'var(--ed-space-lg)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <p className="ad-eyebrow">{ad.ad_eyebrow ?? 'Sponsor Spotlight'}</p>
        {ad.ad_headline && <h3 className="ad-headline">{ad.ad_headline}</h3>}
        {ad.ad_description && <p className="ad-description">{ad.ad_description}</p>}
        {ad.ad_cta_label && ad.ad_link && (
          <Link href={ad.ad_link} className="ad-cta" style={{ marginTop: 'var(--ed-space-sm)' }}>
            {ad.ad_cta_label} →
          </Link>
        )}
      </div>
    </div>
  )
}
