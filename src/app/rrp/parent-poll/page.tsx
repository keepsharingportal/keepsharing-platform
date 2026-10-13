import { ParentPollForm } from '@/components/rrp/ParentPollForm'
import type { Metadata } from 'next'
import { loadBrandContext } from '@/lib/brand-context'
export async function generateMetadata(): Promise<Metadata> {
  const { market } = await loadBrandContext()
  const brandName    = market.displayName
  return { title: `Parent Poll — ${brandName}` }
}
export default function ParentPollPage() { return <ParentPollForm /> }
