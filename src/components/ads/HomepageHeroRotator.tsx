import Link from 'next/link'
import Image from 'next/image'
import { getActiveAds } from '@/lib/get-active-ads'

export async function HomepageHeroRotator() {
  const ads = await getActiveAds('homepage_hero_rotator', null, 1)
  if (!ads.length) return null
  const ad = ads[0]

  return (
    <Link href={ad.ad_link ?? '#'} style={{ textDecoration: 'none', display: 'block', borderRadius: 'var(--ed-radius-md)', overflow: 'hidden', border: '1px solid var(--ed-border)' }}>
      {ad.ad_image_url && (
        <div style={{ position: 'relative', aspectRatio: '21/9', overflow: 'hidden' }}>
          <Image src={ad.ad_image_url} alt={ad.ad_headline ?? 'Sponsored'} fill style={{ objectFit: 'cover' }} unoptimized sizes="100vw" />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(31,27,22,0.7) 0%, transparent 60%)' }} />
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 'var(--ed-space-lg)' }}>
            <p className="ad-eyebrow" style={{ color: 'rgba(255,255,255,0.8)', marginBottom: 4 }}>{ad.ad_eyebrow ?? 'Sponsored'}</p>
            {ad.ad_headline && <h3 className="ad-headline" style={{ color: '#fff', marginBottom: 0 }}>{ad.ad_headline}</h3>}
          </div>
        </div>
      )}
    </Link>
  )
}
