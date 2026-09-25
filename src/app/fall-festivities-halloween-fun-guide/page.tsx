// /fall-festivities-halloween-fun-guide
//
// A DATED guide, unlike Childcare or Special Needs. It opens 1 Oct and comes
// down the weekend after Halloween — see guide_types.live_from / live_until and
// the guide_configs.is_active master switch. Until then this route 404s.
//
// `?preview=1` renders it anyway, with a banner and noindex, so the guide can
// be proofed and shown to advertisers before go-live.

import { GuideDetailPage, generateGuideDetailMetadata } from '@/components/guides/GuideDetailPage'
import type { Metadata } from 'next'

export const revalidate = 3600

const URL_SLUG = 'fall-festivities-halloween-fun-guide'

interface Props {
  searchParams: Promise<{ category?: string; preview?: string }>
}

export async function generateMetadata(): Promise<Metadata> {
  return generateGuideDetailMetadata(URL_SLUG)
}

export default async function FallFestivitiesGuidePage({ searchParams }: Props) {
  const { category, preview } = await searchParams
  return (
    <GuideDetailPage
      urlSlug={URL_SLUG}
      categoryFilter={category}
      preview={preview === '1' || preview === 'true'}
    />
  )
}
