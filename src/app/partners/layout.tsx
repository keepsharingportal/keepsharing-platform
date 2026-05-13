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

export default function PartnersLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${fraunces.variable} ${dmSans.variable} bg-background min-h-screen`}>
      <Navigation />
      <div style={{ fontFamily: 'var(--font-dm-sans, sans-serif)', WebkitFontSmoothing: 'antialiased' }}>
        {children}
      </div>
      <PublicFooter />
    </div>
  )
}
