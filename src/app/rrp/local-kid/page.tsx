import { LocalKidForm } from '@/components/rrp/LocalKidForm'
import type { Metadata } from 'next'
import { loadBrandContext } from '@/lib/brand-context'
export async function generateMetadata(): Promise<Metadata> {
  const { market } = await loadBrandContext()
  const brandName    = market.displayName
  return { title: `Local Kid Doing Cool Things — ${brandName}` }
}
export default function LocalKidPage() { return <LocalKidForm /> }
