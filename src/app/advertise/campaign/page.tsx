import { Suspense } from 'react'
import { CampaignBuilder } from '@/components/advertise/CampaignBuilder'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Build Your Campaign — River Region Parents',
  description: 'Choose your ad size, commitment length, and start your campaign to reach local families.',
}

export default function CampaignPage() {
  return (
    <Suspense>
      <CampaignBuilder />
    </Suspense>
  )
}
