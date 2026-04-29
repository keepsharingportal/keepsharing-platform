import { AdvertiseLanding } from '@/components/advertise/AdvertiseLanding'
import { AdBookingPublic } from '@/components/advertise/AdBookingPublic'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Advertise with River Region Parents',
  description: 'Get more local families choosing your business. River Region Parents connects you with the moms who make buying decisions.',
}

export default function AdvertisePage() {
  return (
    <>
      <AdvertiseLanding />
      <AdBookingPublic />
    </>
  )
}
