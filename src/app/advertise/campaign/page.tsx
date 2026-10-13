import { Suspense } from 'react'
import { loadBrandContext } from '@/lib/brand-context'
import { CampaignBuilder } from '@/components/advertise/CampaignBuilder'
import type { Metadata } from 'next'

export async function generateMetadata(): Promise<Metadata> {
  const { market } = await loadBrandContext()
  const brandName    = market.displayName
  return {
    title: `Build Your Campaign — ${brandName}`,
    description: 'Choose your ad size, commitment length, and start your campaign to reach local families.',
  }
}

export default function CampaignPage() {
  return (
    <Suspense>
      <CampaignBuilder />
    </Suspense>
  )
}
