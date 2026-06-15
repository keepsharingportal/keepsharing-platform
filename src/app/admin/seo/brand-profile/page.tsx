// ── /admin/seo/brand-profile ─────────────────────────────────────────────
// Brand-scoped to caller's role: publishers only see brands they own.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { loadBrandProfile } from '@/lib/seo/brand-profile'
import { getSeoAllowedBrands, resolveBrandParam } from '@/lib/seo/admin-scope'
import { BrandProfileClient } from './BrandProfileClient'
import { ArrowLeft, Settings2 } from 'lucide-react'

export const metadata: Metadata = { title: 'Brand SEO Profile — Admin' }
export const dynamic = 'force-dynamic'

interface Props {
  searchParams: Promise<{ brand?: string }>
}

export default async function BrandProfilePage({ searchParams }: Props) {
  const ctx = await requireAdmin()
  const { brand } = await searchParams
  const allowed = getSeoAllowedBrands(ctx)
  const brandSlug = resolveBrandParam(ctx, brand) ?? allowed[0]?.slug ?? 'rrp'

  const sb = createAdminClient()
  const profile = await loadBrandProfile(sb, brandSlug)

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="bg-white border-b border-portal-border px-6 py-4 shrink-0">
        <Link href="/admin/seo" className="text-[11px] font-semibold text-portal-sub hover:text-portal-text inline-flex items-center gap-1 mb-1">
          <ArrowLeft size={11} /> SEO
        </Link>
        <h1 className="text-[18px] font-bold text-portal-text">
          <Settings2 size={16} className="inline -translate-y-0.5 mr-1" /> Brand SEO Profile
        </h1>
        <p className="text-[12px] text-portal-sub mt-1">
          The strategic brief Claude reads for the weekly audit, AI SEO assist, and internal linking.
          Tune what you know about the market; Claude can seed a first draft to start from.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto bg-portal-bg">
        <div className="px-6 py-6">
          <BrandProfileClient
            brandSlug={brandSlug}
            allBrands={allowed.map(m => ({ slug: m.slug, name: m.displayName, short: m.short ?? m.slug.toUpperCase() }))}
            initial={profile}
          />
        </div>
      </div>
    </div>
  )
}
