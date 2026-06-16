// ── /admin/social-queue ──────────────────────────────────────────────
//
// The social rotation engine's editor surface. Shows every queued post
// across all content types + platforms. Editor can:
//   - Approve (clears needs_review so dispatch fires)
//   - Pause/resume individual items
//   - Edit per-platform captions
//   - Reschedule
//   - Reject (won't fire)

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireSettingsAccess } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { ArrowLeft, Calendar as CalendarIcon, AlertTriangle } from 'lucide-react'
import { SocialQueueClient } from './SocialQueueClient'

export const metadata: Metadata = { title: 'Social queue — Admin' }
export const dynamic = 'force-dynamic'

interface Props {
  searchParams: Promise<{ status?: string; brand?: string }>
}

export default async function SocialQueuePage({ searchParams }: Props) {
  await requireSettingsAccess()
  const sp = await searchParams
  const sb = createAdminClient()

  const status = sp.status ?? 'pending'

  let q = sb
    .from('social_queue')
    .select('*')
    .order('scheduled_for', { ascending: true })
    .limit(200)
  if (status !== 'all') q = q.eq('status', status)
  if (sp.brand)        q = q.eq('brand_slug', sp.brand)

  const { data } = await q
  const rows = (data ?? []) as Array<{
    id:            string
    source_kind:   string
    source_id:     string
    brand_slug:    string | null
    scheduled_for: string
    status:        string
    captions:      Record<string, { caption: string; image_url?: string; hashtags?: string[] }>
    platforms:     string[]
    needs_review:  boolean
    recycle_index: number
    created_at:    string
  }>

  // Status counts for the chip bar
  const { data: counts } = await sb
    .from('social_queue')
    .select('status')
  const tally: Record<string, number> = {}
  for (const r of (counts ?? []) as Array<{ status: string }>) {
    tally[r.status] = (tally[r.status] ?? 0) + 1
  }

  // Meta integration diagnostic — pulled once on render so editors
  // see at a glance whether posts can actually fire.
  const { data: pages } = await sb
    .from('facebook_pages')
    .select('brand_slug, page_name, is_active, ig_business_account_id')
    .order('brand_slug')
  const pageRows = (pages ?? []) as Array<{
    brand_slug: string | null; page_name: string | null; is_active: boolean | null; ig_business_account_id: string | null;
  }>

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="bg-white border-b border-portal-border px-6 py-4 shrink-0 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <Link href="/admin" className="text-[11px] font-semibold text-portal-sub hover:text-portal-text inline-flex items-center gap-1 mb-1">
            <ArrowLeft size={11} /> Admin
          </Link>
          <h1 className="text-[18px] font-bold text-portal-text">
            <CalendarIcon size={16} className="inline -translate-y-0.5 mr-1" /> Social rotation queue
          </h1>
          <p className="text-[12px] text-portal-sub mt-1">
            Every queued social post. Captions are AI-generated in the friend voice; you approve before they fire.
            Dispatch runs every 15 minutes.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/social-queue/calendar"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold text-portal-sub bg-white border border-portal-border-2 rounded-lg hover:bg-portal-bg"
          >
            <CalendarIcon size={12} /> Calendar view
          </Link>
          <Link
            href="/admin/integrations/meta-suite"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold text-portal-sub bg-white border border-portal-border-2 rounded-lg hover:bg-portal-bg"
          >
            Meta integration
          </Link>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-portal-bg">
        <div className="px-6 py-6 space-y-4">

          {/* Meta integration diagnostic — only shows when there's a
              concrete connection problem so it doesn't shout at editors
              when everything is fine. */}
          {(() => {
            const issues: string[] = []
            if (pageRows.length === 0) {
              issues.push('No Facebook Pages connected at all. Posts cannot fire.')
            } else {
              const active = pageRows.filter(p => p.is_active)
              if (active.length === 0) issues.push('Facebook Pages exist but none are marked active.')
              const noIg = active.filter(p => !p.ig_business_account_id)
              if (noIg.length > 0) {
                issues.push(`${noIg.length} Page${noIg.length === 1 ? '' : 's'} have no Instagram Business account linked — IG posts will fail for: ${noIg.map(p => p.brand_slug ?? '?').join(', ')}.`)
              }
            }
            if (issues.length === 0) {
              return (
                <div className="bg-portal-green-lt text-portal-text rounded-lg p-3 text-[12px] inline-flex items-center gap-2" style={{ borderLeft: '3px solid var(--color-portal-green)' }}>
                  ● Meta connected — {pageRows.filter(p => p.is_active).length} active Page{pageRows.filter(p => p.is_active).length === 1 ? '' : 's'}, {pageRows.filter(p => p.is_active && p.ig_business_account_id).length} with IG.
                </div>
              )
            }
            return (
              <div className="bg-portal-red-lt text-portal-text rounded-lg p-3 text-[12px]" style={{ borderLeft: '3px solid var(--color-portal-red)' }}>
                <strong className="text-portal-red">Meta integration issues — posts may not fire:</strong>
                <ul className="list-disc pl-5 mt-1">
                  {issues.map((i, j) => <li key={j}>{i}</li>)}
                </ul>
                <Link href="/admin/integrations/meta-suite" className="text-portal-blue font-bold mt-1 inline-block">
                  Open Meta integration →
                </Link>
              </div>
            )
          })()}

          <div className="grid grid-cols-7 gap-2">
            {['pending','ready','dispatching','completed','failed','rejected','paused'].map(s => (
              <Link
                key={s}
                href={`/admin/social-queue?status=${s}`}
                className={`bg-white border border-portal-border rounded-lg p-3 text-center ${status === s ? 'border-portal-navy ring-2 ring-portal-navy/20' : 'hover:border-portal-blue/40'}`}
              >
                <div className="text-[20px] font-black text-portal-text">{tally[s] ?? 0}</div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-portal-sub mt-0.5">{s}</div>
              </Link>
            ))}
          </div>

          {rows.length === 0 ? (
            <div className="bg-white border border-portal-border rounded-lg p-6 text-center text-portal-sub text-[13px]">
              No queue items in <strong>{status}</strong> right now.
            </div>
          ) : (
            <SocialQueueClient initial={rows} />
          )}

          <div className="bg-portal-amber-lt border border-portal-amber rounded-lg p-3 text-[12px] text-portal-text" style={{ borderLeft: '3px solid var(--color-portal-amber)' }}>
            <AlertTriangle size={12} className="inline mr-1 text-portal-amber" />
            Dispatcher runs via cron <code>*/15 * * * *</code>. Items must have <code>status=ready</code> and
            <code> needs_review=false</code> (Approve) before they actually fire.
          </div>
        </div>
      </div>
    </div>
  )
}
