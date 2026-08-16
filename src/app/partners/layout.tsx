import { Navigation } from '@/components/Navigation'
import { PublicFooter } from '@/components/PublicFooter'
import { dmSans, fraunces } from '@/lib/fonts'




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
