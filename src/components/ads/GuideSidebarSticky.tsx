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
    <aside className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wider text-primary px-4 pt-4 pb-0">
        {ad.ad_eyebrow ?? 'Sponsored'}
      </p>
      {ad.ad_image_url && (
        <div className="relative aspect-[4/3] overflow-hidden mt-3">
          <Image
            src={ad.ad_image_url}
            alt={ad.ad_headline ?? 'Sponsored'}
            fill
            style={{ objectFit: 'cover' }}
            unoptimized
            sizes="300px"
          />
        </div>
      )}
      <div className="p-4">
        {ad.ad_headline && (
          <h3 className="font-bold text-foreground mb-2 leading-snug">{ad.ad_headline}</h3>
        )}
        {ad.ad_description && (
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">{ad.ad_description}</p>
        )}
        {ad.ad_cta_label && ad.ad_link && (
          <Link
            href={ad.ad_link}
            className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
          >
            {ad.ad_cta_label} →
          </Link>
        )}
      </div>
    </aside>
  )
}
