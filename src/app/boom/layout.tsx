import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { dmSans, playfair, sourceSerif } from '@/lib/fonts'
import { currentBrandSlug } from '@/lib/current-brand'
import { MARKETS } from '@/lib/markets'

// This section is River Region 50+ content (the former "Boom" brand). One
// deployment serves six brand domains, so every /boom/* route was reachable
// on every one of them — a Greater Pensacola reader could land on a page
// masthead-branded "River Region Boom", with Montgomery in the description.
//
// Nothing in the parenting nav links here; the only inbound links are from
// this section itself and the admin. So the brands that may serve it are the
// 50+ family plus River Region Parents, which has hosted the section
// historically. Everyone else gets a 404.
const BOOM_BRANDS = new Set([
  'rrp',
  ...MARKETS.filter(m => m.family === 'fifty-plus').map(m => m.slug),
])

export const metadata: Metadata = {
  title: 'River Region Boom — Age Well, Live Fully',
  description: "Montgomery's magazine for those who've earned the best years of their lives.",
}

export default async function BoomLayout({ children }: { children: React.ReactNode }) {
  const brand = (await currentBrandSlug()) ?? 'rrp'
  if (!BOOM_BRANDS.has(brand)) notFound()

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
