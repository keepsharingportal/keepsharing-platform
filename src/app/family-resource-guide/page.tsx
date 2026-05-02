import { GuideDetailPage, generateGuideDetailMetadata } from '@/components/guides/GuideDetailPage'
import type { Metadata } from 'next'

export const revalidate = 3600

interface Props {
  searchParams: Promise<{ category?: string }>
}

export async function generateMetadata(): Promise<Metadata> {
  return generateGuideDetailMetadata('family-resource-guide')
}

export default async function FamilyResourceGuidePage({ searchParams }: Props) {
  const { category } = await searchParams
  return <GuideDetailPage urlSlug="family-resource-guide" categoryFilter={category} />
}
