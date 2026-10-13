import { AdvertiseLanding } from '@/components/advertise/AdvertiseLanding'
import { theRegion, townPhrase } from '@/lib/brandify'
import { loadBrandContext } from '@/lib/brand-context'
import type { Metadata } from 'next'

export async function generateMetadata(): Promise<Metadata> {
  const { market } = await loadBrandContext()
  const brandName    = market.displayName
  const regionPhrase = theRegion(market)
  return {
    title: `Get More Local Families Choosing Your Business — ${brandName}`,
    description: `We Help Your Future Customers Find You. ${brandName} connects local family businesses with the moms who make buying decisions in ${townPhrase(market)}.`,
  }
}

export default function AdvertisePage() {
  return <AdvertiseLanding />
}
