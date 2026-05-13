import Link from 'next/link'
import { getActiveAds } from '@/lib/get-active-ads'

export async function SiteFooterPartners() {
  const ads = await getActiveAds('site_footer_partners', null, 6)
  const linkableAds = ads.filter(a => a.ad_link)
  if (!linkableAds.length) return null

  return (
    <div className="flex flex-wrap gap-4 items-center">
      {linkableAds.map(ad => (
        <Link
          key={ad.id}
          href={ad.ad_link!}
          className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          {ad.ad_headline ?? (ad as unknown as { advertiser_name?: string }).advertiser_name ?? 'Partner'}
        </Link>
      ))}
    </div>
  )
}
