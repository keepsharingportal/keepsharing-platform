// Featured-listing detail pages for the Fall Festivities & Halloween Fun Guide.
// Gated on the same window as the hub: before 1 Oct these 404 rather than
// sitting reachable by direct URL while the guide itself is dark. `?preview=1`
// opens them for review, noindexed.

import { ListingDetailPage, generateListingMetadata } from '@/components/listings/ListingDetailPage'
import type { Metadata } from 'next'

export const revalidate = 3600

const URL_SLUG = 'fall-festivities-halloween-fun-guide'

interface Props {
  params:       Promise<{ listingSlug: string }>
  searchParams: Promise<{ preview?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { listingSlug } = await params
  return generateListingMetadata(listingSlug, URL_SLUG)
}

export default async function FallFestivitiesListingPage({ params, searchParams }: Props) {
  const { listingSlug } = await params
  const { preview } = await searchParams
  return (
    <ListingDetailPage
      urlSlug={URL_SLUG}
      listingSlug={listingSlug}
      preview={preview === '1' || preview === 'true'}
    />
  )
}
