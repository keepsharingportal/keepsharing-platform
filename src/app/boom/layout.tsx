import type { Metadata } from 'next'
import { dmSans, playfair, sourceSerif } from '@/lib/fonts'


export const metadata: Metadata = {
  title: 'River Region Boom — Age Well, Live Fully',
  description: "Montgomery's magazine for those who've earned the best years of their lives.",
}




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
