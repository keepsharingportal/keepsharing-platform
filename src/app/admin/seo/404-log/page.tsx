// ── /admin/seo/404-log ────────────────────────────────────────────────────
// Brand-scoped to caller's role.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSeoAllowedBrands } from '@/lib/seo/admin-scope'
import { NotFoundActionsClient } from './NotFoundActionsClient'
import { ArrowLeft, AlertTriangle, ArrowRight } from 'lucide-react'

export const metadata: Metadata = { title: '404 monitor — SEO — Admin' }
export const dynamic = 'force-dynamic'

interface NotFoundRow {
  id:              string
  path:            string
  count:           number
  brand_slug:      string | null
  last_referrer:   string | null
  last_seen_at:    string
  first_seen_at:   string
}

export default async function NotFoundLogPage() {
  const ctx = await requireAdmin()
  const sb = createAdminClient()
  const allowedSlugs = getSeoAllowedBrands(ctx).map(m => m.slug)

  // 404 rows with NULL brand_slug are "cross-site" and always visible;
  // brand-scoped rows must intersect the caller's allowed list.
  let q = sb
    .from('not_found_log')
    .select('id, path, count, brand_slug, last_referrer, last_seen_at, first_seen_at')
    .is('resolved_at', null)
    .order('count', { ascending: false })
    .limit(200)
  if (ctx.role !== 'super' && ctx.role !== 'admin') {
    q = q.or(`brand_slug.is.null,brand_slug.in.(${allowedSlugs.join(',')})`)
  }
  const { data } = await q
  const rows = (data ?? []) as NotFoundRow[]

  const totalHits = rows.reduce((s, r) => s + (r.count ?? 0), 0)

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="bg-white border-b border-portal-border px-6 py-4 shrink-0">
        <Link href="/admin/seo" className="text-[11px] font-semibold text-portal-sub hover:text-portal-text inline-flex items-center gap-1 mb-1">
          <ArrowLeft size={11} /> SEO
        </Link>
        <h1 className="text-[18px] font-bold text-portal-text">
          <AlertTriangle size={16} className="inline -translate-y-0.5 mr-1" /> 404 monitor
        </h1>
        <p className="text-[12px] text-portal-sub mt-1">
          Public-facing paths that 404&apos;d. Top of the list = highest-priority redirect candidates.
          Click &quot;Redirect&quot; on any row to open the redirect manager pre-filled.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto bg-portal-bg">
        <div className="px-6 py-6 space-y-4">

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white border border-portal-border rounded-lg p-4">
              <div className="text-[22px] font-black text-portal-text">{rows.length}</div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-portal-sub mt-1">Unique 404s</div>
            </div>
            <div className="bg-white border border-portal-border rounded-lg p-4">
              <div className="text-[22px] font-black text-portal-amber">{totalHits.toLocaleString()}</div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-portal-sub mt-1">Total hits</div>
            </div>
            <Link href="/admin/seo/redirects" className="bg-white border border-portal-border rounded-lg p-4 hover:border-portal-blue/40 transition-colors block">
              <div className="text-[22px] font-black text-portal-blue inline-flex items-center gap-2">
                <ArrowRight size={20} />
              </div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-portal-sub mt-1">Redirect manager</div>
            </Link>
          </div>

          <div className="bg-white border border-portal-border rounded-lg overflow-hidden">
            {rows.length === 0 ? (
              <div className="text-center text-portal-sub text-[13px] py-8">
                No 404s logged yet. (Bots hitting wp-login etc. are filtered before being logged.)
              </div>
            ) : (
              <table className="w-full text-[13px]">
                <thead className="bg-portal-bg">
                  <tr className="text-left">
                    <Th>Path</Th>
                    <Th center>Hits</Th>
                    <Th center>Brand</Th>
                    <Th>Last seen</Th>
                    <Th>Last referrer</Th>
                    <Th center>Action</Th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(r => (
                    <tr key={r.id} className="border-t border-portal-border">
                      <Td><code className="text-[12px]">{r.path}</code></Td>
                      <Td center>{r.count.toLocaleString()}</Td>
                      <Td center>{r.brand_slug ?? <span className="text-portal-sub">—</span>}</Td>
                      <Td>
                        <span className="text-portal-sub text-[11px]">
                          {new Date(r.last_seen_at).toLocaleString()}
                        </span>
                      </Td>
                      <Td>
                        {r.last_referrer
                          ? <span className="text-portal-sub text-[11px] break-all">{r.last_referrer.slice(0, 60)}{r.last_referrer.length > 60 ? '…' : ''}</span>
                          : <span className="text-portal-sub text-[11px] italic">direct</span>}
                      </Td>
                      <Td center>
                        <NotFoundActionsClient
                          id={r.id}
                          path={r.path}
                          brandSlug={r.brand_slug}
                        />
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}

function Th({ children, center }: { children?: React.ReactNode; center?: boolean }) {
  return (
    <th className={`px-3.5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-portal-sub ${center ? 'text-center' : 'text-left'}`}>
      {children}
    </th>
  )
}

function Td({ children, center }: { children?: React.ReactNode; center?: boolean }) {
  return <td className={`px-3.5 py-2 align-middle ${center ? 'text-center' : 'text-left'}`}>{children}</td>
}
