// ── /admin/seo/page-metadata/edit?route=… ────────────────────────────
//
// Per-route social sharing + SEO override editor. Reads any existing
// override + lets the editor write OG/Twitter/Pinterest copy +
// noindex. Saves to page_metadata_overrides; buildPageMetadata picks
// it up on next request.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireSettingsAccess } from '@/lib/admin/auth'
import { loadPageMetadataOverride } from '@/lib/seo/page-metadata-overrides'
import { PageMetadataEditorClient } from './PageMetadataEditorClient'
import { ArrowLeft } from 'lucide-react'

export const metadata: Metadata = { title: 'Edit page metadata — SEO — Admin' }
export const dynamic = 'force-dynamic'

interface Props {
  searchParams: Promise<{ route?: string; brand?: string }>
}

export default async function EditPageMetadata({ searchParams }: Props) {
  await requireSettingsAccess()
  const sp = await searchParams
  const route = (sp.route ?? '/').replace(/\/$/, '') || '/'
  const brandSlug = sp.brand ?? null

  const existing = await loadPageMetadataOverride(route, brandSlug)

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="bg-white border-b border-portal-border px-6 py-4 shrink-0">
        <Link href="/admin/seo/page-metadata" className="text-[11px] font-semibold text-portal-sub hover:text-portal-text inline-flex items-center gap-1 mb-1">
          <ArrowLeft size={11} /> All routes
        </Link>
        <h1 className="text-[18px] font-bold text-portal-text">
          <code className="text-[16px]">{route}</code>
        </h1>
        <p className="text-[12px] text-portal-sub mt-1">
          Override the social sharing + SEO metadata for this route. Empty fields inherit the coded
          defaults from <code>buildPageMetadata()</code>.
        </p>
      </div>
      <div className="flex-1 overflow-y-auto bg-portal-bg">
        <div className="px-6 py-6">
          <PageMetadataEditorClient
            route={route}
            brandSlug={brandSlug}
            initial={existing}
          />
        </div>
      </div>
    </div>
  )
}
