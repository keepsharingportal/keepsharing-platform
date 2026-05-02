import Link from 'next/link'
import { getActiveAds } from '@/lib/get-active-ads'

export async function CalendarInlinePromotion() {
  const ads = await getActiveAds('calendar_inline_promotion', null, 1)
  if (!ads.length) return null
  const ad = ads[0]

  return (
    <div style={{ borderRadius: 'var(--ed-radius-md)', border: '1px solid var(--ed-accent-soft)', backgroundColor: 'var(--ed-bg-elevated)', padding: 'var(--ed-space-md)', display: 'flex', gap: 'var(--ed-space-md)', alignItems: 'center' }}>
      <div style={{ flex: 1 }}>
        <p className="ad-eyebrow" style={{ marginBottom: 4 }}>{ad.ad_eyebrow ?? 'Partner Promotion'}</p>
        {ad.ad_headline && <h4 className="ad-headline" style={{ marginBottom: ad.ad_description ? 4 : 0 }}>{ad.ad_headline}</h4>}
        {ad.ad_description && <p className="ad-description" style={{ marginBottom: 6 }}>{ad.ad_description}</p>}
        {ad.ad_cta_label && ad.ad_link && (
          <Link href={ad.ad_link} className="ad-cta">{ad.ad_cta_label} →</Link>
        )}
      </div>
    </div>
  )
}
