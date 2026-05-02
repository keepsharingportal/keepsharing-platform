import { GuideDetailPage, generateGuideDetailMetadata } from '@/components/guides/GuideDetailPage'
import type { Metadata } from 'next'

export const revalidate = 3600

interface Props {
  searchParams: Promise<{ category?: string }>
}

export async function generateMetadata(): Promise<Metadata> {
  return generateGuideDetailMetadata('private-school-guide')
}

export default async function PrivateSchoolGuidePage({ searchParams }: Props) {
  const { category } = await searchParams
  return <GuideDetailPage urlSlug="private-school-guide" categoryFilter={category} />
}
