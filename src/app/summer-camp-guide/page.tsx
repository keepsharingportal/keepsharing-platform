import { GuideDetailPage, generateGuideDetailMetadata } from '@/components/guides/GuideDetailPage'
import type { Metadata } from 'next'

export const revalidate = 3600

interface Props {
  searchParams: Promise<{ category?: string; preview?: string }>
}

export async function generateMetadata(): Promise<Metadata> {
  return generateGuideDetailMetadata('summer-camp-guide')
}

export default async function SummerCampGuidePage({ searchParams }: Props) {
  const { category, preview } = await searchParams
  return <GuideDetailPage urlSlug="summer-camp-guide" categoryFilter={category} preview={preview === '1'} />
}
