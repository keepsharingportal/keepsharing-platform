import { AdvertiseLanding } from '@/components/advertise/AdvertiseLanding'
import { SpotPicker } from '@/components/advertise/SpotPicker'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Advertise with River Region Parents',
  description: 'Get more local families choosing your business. River Region Parents connects you with the moms who make buying decisions.',
}

export default function AdvertisePage() {
  return (
    <>
      <AdvertiseLanding />
      <SpotPicker />
    </>
  )
}
