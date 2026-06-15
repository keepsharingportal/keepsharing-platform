// ── /admin/seo/redirects ──────────────────────────────────────────────────
//
// Editor-managed 301/302/307/308 redirect table. Middleware reads this
// on every request (with 5-min in-memory cache). Adding/editing/
// deleting a redirect from this page invalidates the cache via the
// /api/admin/seo/redirects API.

import type { Metadata } from 'next'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { RedirectsClient } from './RedirectsClient'

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
  await requireAdmin()
  const sb = createAdminClient()

  const { data } = await sb
    .from('redirects')
    .select('id, from_path, to_path, status_code, hits, last_hit_at, note, brand_slug, is_active, created_at')
    .order('hits', { ascending: false })
    .limit(500)

  const rows = (data ?? []) as RedirectRow[]

  return (
    <div className="portal-app flex flex-col flex-1 min-h-0 bg-portal-bg">
      <div className="page-header">
        <div>
          <h1 className="ph-title">Redirects</h1>
          <div className="text-muted text-sm">
            301/302 redirects served by middleware. When an article moves or a URL renames, add one here so external
            links keep working.
          </div>
        </div>
      </div>

      <div className="content-body overflow-y-auto">
        <RedirectsClient initial={rows} />
      </div>
    </div>
  )
}
