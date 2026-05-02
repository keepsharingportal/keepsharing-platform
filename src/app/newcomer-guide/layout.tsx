import { Fraunces, DM_Sans } from 'next/font/google'
import { PublicHeader } from '@/components/PublicHeader'
import { MobileNav } from '@/components/family-guide/MobileNav'
import { MobileFilterStrip } from '@/components/family-guide/MobileFilterStrip'
import { MobileStickyPromo } from '@/components/family-guide/MobileStickyPromo'
import { NewsletterSignup } from '@/components/newsletter/NewsletterSignup'

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  weight: ['300', '500', '700', '900'],
  style: ['normal', 'italic'],
  display: 'swap',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  weight: ['300', '400', '500', '600'],
  display: 'swap',
})

export default function NewcomerGuideLayout({ children }: { children: React.ReactNode }) {
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
            <p style={{ fontSize: 12, color: '#888', fontStyle: 'italic' }}>River Region Parents · Montgomery, AL</p>
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
