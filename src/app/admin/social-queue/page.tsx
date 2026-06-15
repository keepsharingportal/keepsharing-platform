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

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="bg-white border-b border-portal-border px-6 py-4 shrink-0">
        <Link href="/admin" className="text-[11px] font-semibold text-portal-sub hover:text-portal-text inline-flex items-center gap-1 mb-1">
          <ArrowLeft size={11} /> Admin
        </Link>
        <h1 className="text-[18px] font-bold text-portal-text">
          <CalendarIcon size={16} className="inline -translate-y-0.5 mr-1" /> Social rotation queue
        </h1>
        <p className="text-[12px] text-portal-sub mt-1">
          Every queued social post — articles, events, guides, school bits, CTAs. Captions are AI-generated;
          you approve before they fire. Dispatch runs every 15 minutes.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto bg-portal-bg">
        <div className="px-6 py-6 space-y-4">

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
