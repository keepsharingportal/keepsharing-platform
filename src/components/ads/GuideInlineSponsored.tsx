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
    <div className="ad-inline-recommendation">
      <p className="ad-eyebrow" style={{ marginBottom: 6 }}>{ad.ad_eyebrow ?? 'Recommended'}</p>
      {ad.ad_headline && <h4 className="ad-headline">{ad.ad_headline}</h4>}
      {ad.ad_description && <p className="ad-description">{ad.ad_description}</p>}
      {ad.ad_cta_label && ad.ad_link && (
        <Link href={ad.ad_link} className="ad-cta">{ad.ad_cta_label} →</Link>
      )}
    </div>
  )
}
