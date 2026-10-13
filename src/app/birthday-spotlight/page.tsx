import { BirthdaySpotlightForm } from '@/components/public/BirthdaySpotlightForm'
import type { Metadata } from 'next'
import { loadBrandContext } from '@/lib/brand-context'

export async function generateMetadata(): Promise<Metadata> {
  const { market } = await loadBrandContext()
  const brandName    = market.displayName
  return {
    title: `Birthday Spotlight — ${brandName}`,
    description: `Celebrate your child's birthday in ${brandName} magazine!`,
  }
}

export default function BirthdaySpotlightPage() {
  return <BirthdaySpotlightForm />
}
