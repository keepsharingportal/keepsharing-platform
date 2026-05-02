import Link from 'next/link'
import { getActiveAds } from '@/lib/get-active-ads'

interface Props {
  articleSlug?: string
}

export async function ArticleFooterListings({ articleSlug }: Props) {
  const ads = await getActiveAds('article_footer_listings', articleSlug ?? null, 3)
  if (!ads.length) return null

  return (
    <section style={{ borderTop: '1px solid var(--ed-border)', paddingTop: 'var(--ed-space-xl)', marginTop: 'var(--ed-space-xl)' }}>
      <p className="ed-eyebrow" style={{ marginBottom: 'var(--ed-space-md)' }}>Mentioned in This Article</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ed-space-sm)' }}>
        {ads.map(ad => (
          <Link key={ad.id} href={ad.ad_link ?? '#'} style={{ textDecoration: 'none', display: 'flex', gap: 'var(--ed-space-md)', padding: 'var(--ed-space-md)', border: '1px solid var(--ed-border)', borderRadius: 'var(--ed-radius-md)', alignItems: 'center' }}>
            <div>
              <p className="ad-eyebrow" style={{ marginBottom: 2 }}>{ad.ad_eyebrow ?? 'Partner'}</p>
              {ad.ad_headline && <p style={{ fontFamily: 'var(--ed-font-serif)', fontWeight: 600, fontSize: 'var(--ed-text-small)', color: 'var(--ed-text)' }}>{ad.ad_headline}</p>}
            </div>
            {ad.ad_cta_label && <span className="ad-cta" style={{ marginLeft: 'auto', flexShrink: 0 }}>{ad.ad_cta_label} →</span>}
          </Link>
        ))}
      </div>
    </section>
  )
}
