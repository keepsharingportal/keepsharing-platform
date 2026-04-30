import { Fraunces, DM_Sans } from 'next/font/google'
import { PublicHeader } from '@/components/PublicHeader'
import { MobileNav } from '@/components/family-guide/MobileNav'
import { MobileFilterStrip } from '@/components/family-guide/MobileFilterStrip'

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
      <MobileNav />
    </div>
  )
}
