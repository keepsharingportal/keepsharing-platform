// /newcomer-guide is redirected to /family-resource-guide via next.config.ts.
// This file is kept so the route still works if the redirect is ever disabled —
// it now uses the same unified ListingDetailPage as every other guide.

import { ListingDetailPage, generateListingMetadata } from '@/components/listings/ListingDetailPage'
import type { Metadata } from 'next'

export const revalidate = 3600

interface Props { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  return generateListingMetadata(slug)
}

export default async function NewcomerGuideListingPage({ params }: Props) {
  const { slug } = await params
  return <ListingDetailPage urlSlug="family-resource-guide" listingSlug={slug} />
}
