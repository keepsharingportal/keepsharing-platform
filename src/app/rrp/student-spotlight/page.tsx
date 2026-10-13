import { StudentSpotlightForm } from '@/components/rrp/StudentSpotlightForm'
import type { Metadata } from 'next'
import { loadBrandContext } from '@/lib/brand-context'
export async function generateMetadata(): Promise<Metadata> {
  const { market } = await loadBrandContext()
  const brandName    = market.displayName
  return { title: `Student Spotlight — ${brandName}` }
}
export default function StudentSpotlightPage() { return <StudentSpotlightForm /> }
