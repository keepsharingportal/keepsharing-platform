import type { Metadata } from 'next'
import { Playfair_Display, Source_Serif_4, DM_Sans } from 'next/font/google'

export const metadata: Metadata = {
  title: 'River Region Boom — Age Well, Live Fully',
  description: "Montgomery's magazine for those who've earned the best years of their lives.",
}

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
})

const sourceSerif = Source_Serif_4({
  subsets: ['latin'],
  variable: '--font-source-serif',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
})

export default function BoomLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`${playfair.variable} ${sourceSerif.variable} ${dmSans.variable}`}
      style={{
        fontFamily: 'var(--font-source-serif), Georgia, "Times New Roman", serif',
        backgroundColor: '#0B1829',
      }}
    >
      {children}
    </div>
  )
}
