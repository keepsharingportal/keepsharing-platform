import { AdvertiseLanding } from '@/components/advertise/AdvertiseLanding'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Get More Local Families Choosing Your Business — River Region Parents',
  description: 'We Help Your Future Customers Find You. River Region Parents connects local family businesses with the moms who make buying decisions in Montgomery, Prattville, Pike Road, and the River Region.',
}

export default function AdvertisePage() {
  return <AdvertiseLanding />
}
