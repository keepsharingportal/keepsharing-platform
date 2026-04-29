import { Suspense } from 'react'
import { HelpPage } from '@/components/admin/HelpPage'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Help Center — KeepSharing Admin' }

export default function HelpPageRoute() {
  return (
    <Suspense>
      <HelpPage />
    </Suspense>
  )
}
