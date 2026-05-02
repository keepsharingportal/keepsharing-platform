import { Fraunces, DM_Sans } from 'next/font/google'

const fraunces = Fraunces({ subsets: ['latin'], variable: '--font-fraunces', weight: ['300', '500', '700', '900'], style: ['normal', 'italic'], display: 'swap' })
const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-dm-sans', weight: ['300', '400', '500', '600'], display: 'swap' })

export default function OnboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${fraunces.variable} ${dmSans.variable}`} style={{ fontFamily: 'var(--font-dm-sans, sans-serif)' }}>
      {children}
    </div>
  )
}
