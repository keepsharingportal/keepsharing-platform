// ── /admin/seo/redirects ──────────────────────────────────────────────────
//
// Editor-managed 301/302/307/308 redirect table. Middleware reads this
// on every request (with 5-min in-memory cache). Adding/editing/
// deleting a redirect from this page invalidates the cache via the
// /api/admin/seo/redirects API.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireSettingsAccess } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { RedirectsClient } from './RedirectsClient'
import { ArrowLeft, Repeat } from 'lucide-react'

export const metadata: Metadata = { title: 'Redirects — SEO — Admin' }
export const dynamic = 'force-dynamic'

interface RedirectRow {
  id:          string
  from_path:   string
  to_path:     string
  status_code: number
  hits:        number
  last_hit_at: string | null
  note:        string | null
  brand_slug:  string | null
  is_active:   boolean
  created_at:  string
}

export default async function RedirectsAdminPage() {
  await requireSettingsAccess()
  const sb = createAdminClient()

  const { data } = await sb
    .from('redirects')
    .select('id, from_path, to_path, status_code, hits, last_hit_at, note, brand_slug, is_active, created_at')
    .order('hits', { ascending: false })
    .limit(500)

  const rows = (data ?? []) as RedirectRow[]

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="bg-white border-b border-portal-border px-6 py-4 shrink-0">
        <Link href="/admin/seo" className="text-[11px] font-semibold text-portal-sub hover:text-portal-text inline-flex items-center gap-1 mb-1">
          <ArrowLeft size={11} /> SEO
        </Link>
        <h1 className="text-[18px] font-bold text-portal-text">
          <Repeat size={16} className="inline -translate-y-0.5 mr-1" /> Redirects
        </h1>
        <p className="text-[12px] text-portal-sub mt-1">
          301/302 redirects served by middleware. When an article moves or a URL renames, add one here so external links keep working.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto bg-portal-bg">
        <div className="px-6 py-6">
          <RedirectsClient initial={rows} />
        </div>
      </div>
    </div>
  )
}
