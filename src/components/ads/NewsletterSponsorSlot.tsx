import Link from 'next/link'
import { getActiveAds } from '@/lib/get-active-ads'

export async function NewsletterSponsorSlot() {
  const ads = await getActiveAds('newsletter_sponsor', null, 1)
  if (!ads.length) return null
  const ad = ads[0]

  return (
    <div style={{ borderTop: '1px solid var(--ed-border)', borderBottom: '1px solid var(--ed-border)', padding: 'var(--ed-space-md) 0', margin: 'var(--ed-space-md) 0' }}>
      <p className="ad-eyebrow">{ad.ad_eyebrow ?? 'Brought to You By'}</p>
      {ad.ad_headline && <h4 className="ad-headline">{ad.ad_headline}</h4>}
      {ad.ad_description && <p className="ad-description">{ad.ad_description}</p>}
      {ad.ad_cta_label && ad.ad_link && (
        <Link href={ad.ad_link} className="ad-cta">{ad.ad_cta_label} →</Link>
      )}
    </div>
  )
}
