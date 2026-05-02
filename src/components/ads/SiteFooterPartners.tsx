import Link from 'next/link'
import { getActiveAds } from '@/lib/get-active-ads'

export async function SiteFooterPartners() {
  const ads = await getActiveAds('site_footer_partners', null, 6)
  if (!ads.length) return null

  return (
    <div className="ad-footer-partners">
      {ads.map(ad => (
        <Link key={ad.id} href={ad.ad_link ?? '#'} className="ad-footer-partner-logo" style={{ textDecoration: 'none' }}>
          <p style={{ fontSize: 'var(--ed-text-caption)', fontWeight: 600, color: 'var(--ed-text-soft)' }}>
            {ad.ad_headline ?? ad.advertiser_name ?? 'Partner'}
          </p>
        </Link>
      ))}
    </div>
  )
}
