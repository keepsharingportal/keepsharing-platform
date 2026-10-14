import { PublicHeader } from '@/components/PublicHeader'
import { guideTreeIsViewable } from '@/lib/guides/require-live'
import { notFound } from 'next/navigation'
import { loadBrandContext } from '@/lib/brand-context'
import { MobileNav } from '@/components/family-guide/MobileNav'
import { MobileFilterStrip } from '@/components/family-guide/MobileFilterStrip'
import { MobileStickyPromo } from '@/components/family-guide/MobileStickyPromo'
import { NewsletterSignup } from '@/components/newsletter/NewsletterSignup'
import { dmSans, fraunces } from '@/lib/fonts'




export default async function NewcomerGuideLayout({ children }: { children: React.ReactNode }) {
  // This is the 'newcomer' guide's legacy path; /family-resource-guide is its
  // url_slug. Both trees have their own layout, so both need the gate.
  if (!(await guideTreeIsViewable('newcomer'))) notFound()
  const { market } = await loadBrandContext()
  const brandName    = market.displayName
  return (
    <div className={`${fraunces.variable} ${dmSans.variable}`} style={{ fontFamily: 'var(--font-dm-sans, sans-serif)' }}>
      <PublicHeader />
      <MobileFilterStrip />
      {/* Bottom nav padding on mobile */}
      <div style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        {children}
      </div>
      {/* Site footer with compact newsletter signup */}
      <footer style={{ borderTop: '1px solid rgba(0,0,0,0.06)', backgroundColor: 'white', padding: '16px 24px 8px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <p style={{ fontSize: 12, color: '#888', fontStyle: 'italic' }}>{brandName} · Montgomery, AL</p>
            <div style={{ flex: 1, minWidth: 280, maxWidth: 440 }}>
              <NewsletterSignup variant="compact" source="main-footer" cta_label="Subscribe" />
            </div>
          </div>
        </div>
      </footer>
      <MobileStickyPromo />
      <MobileNav />
    </div>
  )
}
