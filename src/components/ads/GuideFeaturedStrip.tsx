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
    <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
      {ads.map(ad => (
        <Link
          key={ad.id}
          href={ad.ad_link ?? '#'}
          className="block rounded-2xl border border-border bg-card overflow-hidden hover:shadow-md transition-shadow no-underline"
        >
          {ad.ad_image_url && (
            <div className="relative aspect-video overflow-hidden">
              <Image
                src={ad.ad_image_url}
                alt={ad.ad_headline ?? 'Featured Partner'}
                fill
                style={{ objectFit: 'cover' }}
                unoptimized
                sizes="280px"
              />
            </div>
          )}
          <div className="p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-primary mb-1">
              {ad.ad_eyebrow ?? 'Featured'}
            </p>
            {ad.ad_headline && (
              <p className="font-semibold text-sm text-foreground mb-1">{ad.ad_headline}</p>
            )}
            {ad.ad_cta_label && (
              <p className="text-xs text-primary font-semibold mt-1">{ad.ad_cta_label} →</p>
            )}
          </div>
        </Link>
      ))}
    </div>
  )
}
