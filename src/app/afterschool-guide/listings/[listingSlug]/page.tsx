import { ListingDetailPage, generateListingMetadata } from '@/components/listings/ListingDetailPage'
import type { Metadata } from 'next'

export const revalidate = 3600

interface Props {
  params: Promise<{ listingSlug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { listingSlug } = await params
  return generateListingMetadata(listingSlug)
}

export default async function AfterSchoolGuideListingPage({ params }: Props) {
  const { listingSlug } = await params
  return <ListingDetailPage urlSlug="afterschool-guide" listingSlug={listingSlug} />
}
