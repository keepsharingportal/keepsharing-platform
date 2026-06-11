// ── /admin/settings/brands ──────────────────────────────────────────────────
// Per-brand voice + format defaults the AI integration reads when drafting.
// All six brands from src/lib/markets.ts are surfaced; voice is filled
// in over time as editorial figures out each brand.

import type { Metadata } from 'next'
import { loadBrands } from '@/lib/brands'
import { BrandsClient } from './BrandsClient'

export const metadata: Metadata = { title: 'Brand Voice — Admin' }
export const dynamic = 'force-dynamic'

export default async function BrandsAdminPage() {
  const brands = await loadBrands()
  return (
    <div className="flex-1 overflow-y-auto bg-portal-bg">
      <div className="bg-white border-b border-portal-border px-6 py-4">
        <h1 className="portal-page-title">Brand Voice</h1>
        <p className="portal-page-subtitle">
          Per-brand AI context. The contributor Q&amp;A drafter, social caption assist, and editorial calendar suggester all read from here so each brand keeps its own voice.
        </p>
      </div>
      <div className="p-6 max-w-4xl">
        <BrandsClient brands={brands} />
      </div>
    </div>
  )
}
