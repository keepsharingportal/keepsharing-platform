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

export default async function SpecialNeedsGuideListingPage({ params }: Props) {
  const { listingSlug } = await params
  return <ListingDetailPage urlSlug="special-needs-guide" listingSlug={listingSlug} />
}
