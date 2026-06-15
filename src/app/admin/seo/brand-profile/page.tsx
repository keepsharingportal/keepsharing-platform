// ── /admin/seo/brand-profile ─────────────────────────────────────────────
//
// Per-brand strategic SEO brief editor. Loads the existing
// brand_seo_profiles row (or empty defaults) and renders a tabbed
// editor: Pillars / Sub-areas / Personas / Calendar / Assets / Voice /
// Negative. "Generate first draft" runs Claude to seed everything;
// editor reviews + saves.

import type { Metadata } from 'next'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { loadBrandProfile } from '@/lib/seo/brand-profile'
import { MARKETS } from '@/lib/markets'
import { BrandProfileClient } from './BrandProfileClient'

export const metadata: Metadata = { title: 'Brand SEO Profile — Admin' }
export const dynamic = 'force-dynamic'

interface Props {
  searchParams: Promise<{ brand?: string }>
}

export default async function BrandProfilePage({ searchParams }: Props) {
  await requireAdmin()
  const { brand } = await searchParams
  const brandSlug = brand && MARKETS.find(m => m.slug === brand) ? brand : 'rrp'

  const sb = createAdminClient()
  const profile = await loadBrandProfile(sb, brandSlug)

  return (
    <div className="portal-app flex flex-col flex-1 min-h-0 bg-portal-bg">
      <div className="page-header">
        <div>
          <h1 className="ph-title">Brand SEO Profile</h1>
          <div className="text-muted text-sm">
            The strategic brief Claude reads for the weekly audit, AI SEO assist, and internal linking.
            Tune what you know about the market; Claude can seed a first draft to start from.
          </div>
        </div>
      </div>

      <div className="content-body overflow-y-auto">
        <BrandProfileClient
          brandSlug={brandSlug}
          allBrands={MARKETS.map(m => ({ slug: m.slug, name: m.displayName, short: m.short ?? m.slug.toUpperCase() }))}
          initial={profile}
        />
      </div>
    </div>
  )
}
