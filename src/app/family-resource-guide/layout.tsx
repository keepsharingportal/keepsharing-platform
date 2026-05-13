import { Fraunces, DM_Sans } from 'next/font/google'
import { Navigation } from '@/components/Navigation'
import { PublicFooter } from '@/components/PublicFooter'

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

export default function FamilyResourceGuideLayout({ children }: { children: React.ReactNode }) {
  return (
    // fraunces + dmSans variables are scoped here so guide content can use them via CSS vars.
    // fontFamily override is applied only to page content — NOT to Navigation or PublicFooter —
    // so shared chrome always inherits the platform's root font (Geist).
    <div className={`${fraunces.variable} ${dmSans.variable} bg-background min-h-screen`}>
      <Navigation />
      <div style={{ fontFamily: 'var(--font-dm-sans, sans-serif)', WebkitFontSmoothing: 'antialiased' }}>
        {children}
      </div>
      <PublicFooter />
    </div>
  )
}
