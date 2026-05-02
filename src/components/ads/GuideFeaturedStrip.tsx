import Link from 'next/link'
import Image from 'next/image'
import { getActiveAds } from '@/lib/get-active-ads'

interface Props {
  guideUrlSlug: string
}

export async function GuideFeaturedStrip({ guideUrlSlug }: Props) {
  const ads = await getActiveAds('guide_featured_strip', guideUrlSlug, 3)
  if (!ads.length) return null

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 'var(--ed-space-md)' }}>
      {ads.map(ad => (
        <Link key={ad.id} href={ad.ad_link ?? '#'} style={{ textDecoration: 'none', color: 'inherit', display: 'block', borderRadius: 'var(--ed-radius-md)', overflow: 'hidden', border: '1px solid var(--ed-border)', backgroundColor: 'var(--ed-bg)' }}>
          {ad.ad_image_url && (
            <div style={{ position: 'relative', aspectRatio: '16/9', overflow: 'hidden' }}>
              <Image src={ad.ad_image_url} alt={ad.ad_headline ?? 'Featured Partner'} fill style={{ objectFit: 'cover' }} unoptimized sizes="280px" />
            </div>
          )}
          <div style={{ padding: 'var(--ed-space-md)' }}>
            <p className="ad-eyebrow">{ad.ad_eyebrow ?? 'Featured'}</p>
            {ad.ad_headline && <p className="ad-headline" style={{ fontSize: 'var(--ed-text-small)' }}>{ad.ad_headline}</p>}
            {ad.ad_cta_label && <p className="ad-cta" style={{ marginTop: 4 }}>{ad.ad_cta_label} →</p>}
          </div>
        </Link>
      ))}
    </div>
  )
}
