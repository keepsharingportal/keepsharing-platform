// Wrapper for the Family Resource Guide route — provides Navigation +
// PublicFooter once so the page itself doesn't need to render them.
// We deliberately do NOT override the body font here; the FRG inherits
// the site-wide Geist family set in the root layout so it reads
// consistently with the home page.

import { Navigation } from '@/components/Navigation'
import { guideIsLiveForBrand } from '@/lib/guides/require-live'
import { notFound } from 'next/navigation'
import { PublicFooter } from '@/components/PublicFooter'

export default async function FamilyResourceGuideLayout({ children }: { children: React.ReactNode }) {
  // One gate for the tree — see the Birthday Party Guide layout.
  if (!(await guideIsLiveForBrand('newcomer'))) notFound()
  return (
    <div className="bg-background min-h-screen public-page">
      <Navigation />
      {children}
      <PublicFooter />
    </div>
  )
}
