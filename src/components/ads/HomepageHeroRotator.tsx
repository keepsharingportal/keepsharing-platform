import Link from 'next/link'
import Image from 'next/image'
import { getActiveAds } from '@/lib/get-active-ads'

export async function HomepageHeroRotator() {
  const ads = await getActiveAds('homepage_hero_rotator', null, 1)
  if (!ads.length) return null
  const ad = ads[0]

  return (
    <Link
      href={ad.ad_link ?? '#'}
      className="block rounded-2xl border border-border overflow-hidden hover:shadow-md transition-shadow"
    >
      {ad.ad_image_url && (
        <div className="relative overflow-hidden" style={{ aspectRatio: '21/9' }}>
          <Image
            src={ad.ad_image_url}
            alt={ad.ad_headline ?? 'Sponsored'}
            fill
            style={{ objectFit: 'cover' }}
            unoptimized
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/70 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <p className="text-xs font-bold uppercase tracking-wider text-white/80 mb-1">
              {ad.ad_eyebrow ?? 'Sponsored'}
            </p>
            {ad.ad_headline && (
              <h3 className="font-bold text-white text-xl leading-snug">{ad.ad_headline}</h3>
            )}
          </div>
        </div>
      )}
    </Link>
  )
}
