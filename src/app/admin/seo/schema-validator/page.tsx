// ── /admin/seo/schema-validator ─────────────────────────────────────────
// Settings-tier only — schema graph validation is infrastructure.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireSettingsAccess } from '@/lib/admin/auth'
import { getSeoAllowedBrands } from '@/lib/seo/admin-scope'
import { SchemaValidatorClient } from './SchemaValidatorClient'
import { ArrowLeft, ShieldCheck } from 'lucide-react'

export const metadata: Metadata = { title: 'Schema validator — SEO — Admin' }
export const dynamic = 'force-dynamic'

export default async function SchemaValidatorPage() {
  const ctx = await requireSettingsAccess()
  const brands = getSeoAllowedBrands(ctx)

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="bg-white border-b border-portal-border px-6 py-4 shrink-0">
        <Link href="/admin/seo" className="text-[11px] font-semibold text-portal-sub hover:text-portal-text inline-flex items-center gap-1 mb-1">
          <ArrowLeft size={11} /> SEO
        </Link>
        <h1 className="text-[18px] font-bold text-portal-text">
          <ShieldCheck size={16} className="inline -translate-y-0.5 mr-1" /> Schema graph validator
        </h1>
        <p className="text-[12px] text-portal-sub mt-1">
          Crawls a sample of the brand&apos;s pages, extracts every JSON-LD block, and verifies the
          Organization / Author / Article @id graph is consistent. Silent schema breakage is the #1
          way publishers lose rich results — this catches it before Google does.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto bg-portal-bg">
        <div className="px-6 py-6">
          <SchemaValidatorClient brands={brands.map(b => ({ slug: b.slug, name: b.displayName }))} />
        </div>
      </div>
    </div>
  )
}
