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
    <div style={{ borderRadius: 'var(--ed-radius-md)', border: '1px solid var(--ed-accent-soft)', backgroundColor: 'var(--ed-bg-elevated)', padding: 'var(--ed-space-md)', display: 'flex', gap: 'var(--ed-space-md)', alignItems: 'flex-start' }}>
      <div style={{ flex: 1 }}>
        <p className="ad-eyebrow" style={{ marginBottom: 4 }}>{ad.ad_eyebrow ?? 'Sponsored'}</p>
        {ad.ad_headline && <h4 className="ad-headline" style={{ marginBottom: ad.ad_description ? 'var(--ed-space-xs)' : 0 }}>{ad.ad_headline}</h4>}
        {ad.ad_description && <p className="ad-description">{ad.ad_description}</p>}
        {ad.ad_cta_label && ad.ad_link && (
          <Link href={ad.ad_link} className="ad-cta">{ad.ad_cta_label} →</Link>
        )}
      </div>
    </div>
  )
}
