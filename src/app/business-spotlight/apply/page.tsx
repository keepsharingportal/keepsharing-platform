// /business-spotlight/apply — the paid intake form.
//
// This was /business-spotlight until the hub took that URL. The form itself
// and its POST to /api/business-spotlight are untouched: it still writes a
// pending_review row into business_spotlights and publishes nothing.

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { BusinessSpotlightForm } from '@/components/public/BusinessSpotlightForm'
import type { Metadata } from 'next'

export async function generateMetadata(): Promise<Metadata> {
  const { buildPageMetadata } = await import('@/lib/seo/metadata')
  return buildPageMetadata({
    title:       'Tell Us Your Story — Business Spotlight',
    description: 'Apply to be featured in a River Region Parents Business Spotlight — a professional article about your business, read by thousands of Montgomery-area families.',
    path:        '/business-spotlight/apply',
    type:        'website',
    keywords:    ['business spotlight', 'Montgomery advertising', 'River Region small business'],
  })
}

export default function BusinessSpotlightApplyPage() {
  return (
    <>
      <Link
        href="/business-spotlight"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-800 mb-6"
      >
        <ArrowLeft size={15} /> Read other spotlights
      </Link>
      <BusinessSpotlightForm />
    </>
  )
}
