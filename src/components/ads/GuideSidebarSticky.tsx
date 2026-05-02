import Link from 'next/link'
import Image from 'next/image'
import { getActiveAds } from '@/lib/get-active-ads'

interface Props {
  guideUrlSlug: string
}

export async function GuideSidebarSticky({ guideUrlSlug }: Props) {
  const ads = await getActiveAds('guide_sidebar_sticky', guideUrlSlug, 1)
  if (!ads.length) return null
  const ad = ads[0]

  return (
    <aside className="ad-sidebar-sticky">
      <p className="ad-eyebrow">{ad.ad_eyebrow ?? 'Sponsored'}</p>
      {ad.ad_image_url && (
        <div style={{ position: 'relative', aspectRatio: '4/3', borderRadius: 'var(--ed-radius-sm)', overflow: 'hidden', marginBottom: 'var(--ed-space-md)' }}>
          <Image src={ad.ad_image_url} alt={ad.ad_headline ?? 'Sponsored'} fill style={{ objectFit: 'cover' }} unoptimized sizes="300px" />
        </div>
      )}
      {ad.ad_headline && <h3 className="ad-headline">{ad.ad_headline}</h3>}
      {ad.ad_description && <p className="ad-description">{ad.ad_description}</p>}
      {ad.ad_cta_label && ad.ad_link && (
        <Link href={ad.ad_link} className="ad-cta">{ad.ad_cta_label} →</Link>
      )}
    </aside>
  )
}
