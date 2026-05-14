// /summer-fun-guide
// Uses the shared GuideDetailPage component so /summer-fun-guide renders the
// same listing-first layout as every other guide (childcare, private-school,
// summer-camp, healthy-kids, etc.) — no more editorial "Reads to Get You
// Going" between the hero and the directory.

import { GuideDetailPage, generateGuideDetailMetadata } from '@/components/guides/GuideDetailPage'
import type { Metadata } from 'next'

export const revalidate = 3600

interface Props {
  searchParams: Promise<{ category?: string }>
}

export async function generateMetadata(): Promise<Metadata> {
  return generateGuideDetailMetadata('summer-fun-guide')
}

export default async function SummerFunGuidePage({ searchParams }: Props) {
  const { category } = await searchParams
  return <GuideDetailPage urlSlug="summer-fun-guide" categoryFilter={category} />
}
