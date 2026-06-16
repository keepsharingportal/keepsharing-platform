// ── /admin/social-queue/calendar ──────────────────────────────────────
//
// Calendar view of the social rotation queue. 6-week grid with per-day
// cells; each cell shows the count + platform chips for posts scheduled
// that day. Click a cell → expand the day in a side panel.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireSettingsAccess } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { CalendarClient } from './CalendarClient'
import { ArrowLeft, Calendar as CalendarIcon, List } from 'lucide-react'

export const metadata: Metadata = { title: 'Social calendar — Admin' }
export const dynamic = 'force-dynamic'

interface Props {
  searchParams: Promise<{ month?: string; brand?: string }>
}

export default async function SocialCalendarPage({ searchParams }: Props) {
  await requireSettingsAccess()
  const sp = await searchParams
  const sb = createAdminClient()

  // Determine the month being viewed. ?month=YYYY-MM, defaults to current.
  const now = new Date()
  const requested = sp.month ? new Date(sp.month + '-01T00:00:00Z') : now
  const year  = requested.getUTCFullYear()
  const month = requested.getUTCMonth()

  // Build window: first day of the calendar grid (Sunday before the 1st)
  // to the last day of the grid (Saturday after the last of the month).
  const firstOfMonth = new Date(Date.UTC(year, month, 1))
  const gridStart    = new Date(firstOfMonth)
  gridStart.setUTCDate(firstOfMonth.getUTCDate() - firstOfMonth.getUTCDay())
  const gridEnd      = new Date(gridStart)
  gridEnd.setUTCDate(gridStart.getUTCDate() + 42)  // 6-week grid

  // Pull every queue item in the window.
  let q = sb
    .from('social_queue')
    .select('id, source_kind, source_id, brand_slug, scheduled_for, status, platforms, captions, needs_review, recycle_index')
    .gte('scheduled_for', gridStart.toISOString())
    .lt('scheduled_for', gridEnd.toISOString())
    .order('scheduled_for', { ascending: true })
    .limit(500)
  if (sp.brand) q = q.eq('brand_slug', sp.brand)

  const { data } = await q
  const items = (data ?? []) as Array<{
    id: string; source_kind: string; source_id: string; brand_slug: string | null;
    scheduled_for: string; status: string; platforms: string[];
    captions: Record<string, { caption: string }>;
    needs_review: boolean; recycle_index: number;
  }>

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="bg-white border-b border-portal-border px-6 py-4 shrink-0 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <Link href="/admin" className="text-[11px] font-semibold text-portal-sub hover:text-portal-text inline-flex items-center gap-1 mb-1">
            <ArrowLeft size={11} /> Admin
          </Link>
          <h1 className="text-[18px] font-bold text-portal-text">
            <CalendarIcon size={16} className="inline -translate-y-0.5 mr-1" /> Social calendar
          </h1>
          <p className="text-[12px] text-portal-sub mt-1">
            {firstOfMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })} —
            every scheduled post by day + platform.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <PrevNextLinks year={year} month={month} brand={sp.brand} />
          <Link
            href={`/admin/social-queue${sp.brand ? `?brand=${sp.brand}` : ''}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold text-portal-sub bg-white border border-portal-border-2 rounded-lg hover:bg-portal-bg"
          >
            <List size={12} /> List view
          </Link>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto bg-portal-bg">
        <div className="px-6 py-6">
          <CalendarClient
            gridStartIso={gridStart.toISOString()}
            currentMonth={month}
            currentYear={year}
            items={items}
          />
        </div>
      </div>
    </div>
  )
}

function PrevNextLinks({ year, month, brand }: { year: number; month: number; brand?: string }) {
  const prev = new Date(Date.UTC(year, month - 1, 1))
  const next = new Date(Date.UTC(year, month + 1, 1))
  const fmt = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
  const brandQ = brand ? `&brand=${brand}` : ''
  return (
    <div className="inline-flex border border-portal-border-2 rounded-lg overflow-hidden">
      <Link href={`/admin/social-queue/calendar?month=${fmt(prev)}${brandQ}`} className="px-3 py-1.5 text-[12px] font-semibold text-portal-sub hover:bg-portal-bg">‹ Prev</Link>
      <Link href={`/admin/social-queue/calendar?month=${fmt(new Date())}${brandQ}`} className="px-3 py-1.5 text-[12px] font-semibold text-portal-sub border-l border-portal-border-2 hover:bg-portal-bg">Today</Link>
      <Link href={`/admin/social-queue/calendar?month=${fmt(next)}${brandQ}`} className="px-3 py-1.5 text-[12px] font-semibold text-portal-sub border-l border-portal-border-2 hover:bg-portal-bg">Next ›</Link>
    </div>
  )
}
