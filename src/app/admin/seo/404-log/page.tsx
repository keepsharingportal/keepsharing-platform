// ── /admin/seo/404-log ────────────────────────────────────────────────────
//
// Top 404 paths the public site is serving. One-click conversion into a
// redirect (sends the editor to /admin/seo/redirects with the from_path
// pre-filled).

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { NotFoundActionsClient } from './NotFoundActionsClient'

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
  await requireAdmin()
  const sb = createAdminClient()
  const { data } = await sb
    .from('not_found_log')
    .select('id, path, count, brand_slug, last_referrer, last_seen_at, first_seen_at')
    .is('resolved_at', null)
    .order('count', { ascending: false })
    .limit(200)
  const rows = (data ?? []) as NotFoundRow[]

  const totalHits = rows.reduce((s, r) => s + (r.count ?? 0), 0)

  return (
    <div className="portal-app flex flex-col flex-1 min-h-0 bg-portal-bg">
      <div className="page-header">
        <div>
          <h1 className="ph-title">404 monitor</h1>
          <div className="text-muted text-sm">
            Public-facing paths that 404&apos;d. Top of the list = highest-priority redirect candidates. Click
            &quot;Redirect&quot; on any row to open the redirect manager pre-filled.
          </div>
        </div>
      </div>

      <div className="content-body overflow-y-auto">

        <div className="stats-row" style={{ marginBottom: 16 }}>
          <div className="stat-card">
            <div className="stat-num">{rows.length}</div>
            <div className="stat-label">Unique 404s</div>
          </div>
          <div className="stat-card">
            <div className="stat-num has-amber">{totalHits.toLocaleString()}</div>
            <div className="stat-label">Total hits</div>
          </div>
          <Link href="/admin/seo/redirects" className="stat-card" style={{ textDecoration: 'none' }}>
            <div className="stat-num">→</div>
            <div className="stat-label">Redirect manager</div>
          </Link>
        </div>

        <div className="bg-white border border-portal-border rounded-lg overflow-hidden">
          {rows.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--color-portal-sub)', fontSize: 13 }}>
              No 404s logged yet. (Bots hitting wp-login etc. are filtered before being logged.)
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead style={{ background: 'var(--color-portal-bg)' }}>
                <tr style={{ textAlign: 'left' }}>
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
                  <tr key={r.id} style={{ borderTop: '1px solid var(--color-portal-border)' }}>
                    <Td><code style={{ fontSize: 12 }}>{r.path}</code></Td>
                    <Td center>{r.count.toLocaleString()}</Td>
                    <Td center>{r.brand_slug ?? <span className="text-portal-sub">—</span>}</Td>
                    <Td>
                      <span className="text-portal-sub" style={{ fontSize: 11 }}>
                        {new Date(r.last_seen_at).toLocaleString()}
                      </span>
                    </Td>
                    <Td>
                      {r.last_referrer
                        ? <span className="text-portal-sub" style={{ fontSize: 11, wordBreak: 'break-all' }}>{r.last_referrer.slice(0, 60)}{r.last_referrer.length > 60 ? '…' : ''}</span>
                        : <span className="text-portal-sub" style={{ fontSize: 11, fontStyle: 'italic' }}>direct</span>}
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
  )
}

function Th({ children, center }: { children?: React.ReactNode; center?: boolean }) {
  return (
    <th style={{ padding: '10px 14px', fontSize: 11, fontWeight: 700, color: 'var(--color-portal-sub)', textTransform: 'uppercase', letterSpacing: '.3px', textAlign: center ? 'center' : 'left' }}>
      {children}
    </th>
  )
}
function Td({ children, center }: { children: React.ReactNode; center?: boolean }) {
  return <td style={{ padding: '8px 14px', textAlign: center ? 'center' : 'left', verticalAlign: 'middle' }}>{children}</td>
}
