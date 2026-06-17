// ── /admin/social/calendar ────────────────────────────────────────
//
// Unified calendar of every social post Claude has scheduled or
// dispatched. Pulls from social_plan_slot (post-Sprint 10 single
// source of truth) — strategist weekly plans + article auto-posts +
// urgent inserts all flow into the same table, so editors see
// everything in one place without opening GHL.
//
// 6-week month grid. Each day shows count + source-kind chips.
// Click a day → side panel with the full list, captions, and quick
// actions (open in /admin/social/plan, cancel post in GHL, etc).

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireSettingsAccess } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { ArrowLeft, Calendar as CalendarIcon, ExternalLink } from 'lucide-react'
import { MARKETS } from '@/lib/markets'
import { CalendarClient } from './CalendarClient'

export const metadata: Metadata = { title: 'Social calendar — Admin' }
export const dynamic = 'force-dynamic'

interface Props {
  searchParams: Promise<{ month?: string; brand?: string }>
}

export default async function SocialCalendarPage({ searchParams }: Props) {
  await requireSettingsAccess()
  const sp = await searchParams
  const sb = createAdminClient()

  const now = new Date()
  const requested = sp.month ? new Date(sp.month + '-01T00:00:00Z') : now
  const year  = requested.getUTCFullYear()
  const month = requested.getUTCMonth()

  // Calendar grid window (6 weeks: first Sunday-on-or-before the 1st → +42d).
  const firstOfMonth = new Date(Date.UTC(year, month, 1))
  const gridStart    = new Date(firstOfMonth)
  gridStart.setUTCDate(firstOfMonth.getUTCDate() - firstOfMonth.getUTCDay())
  const gridEnd      = new Date(gridStart)
  gridEnd.setUTCDate(gridStart.getUTCDate() + 42)

  // Pull every slot in the window. Join to social_plan to surface the
  // owning plan's brand_slug + status when the slot is part of a strategist
  // run. Direct (article-auto-post) slots have plan_id NULL so we read
  // brand_slug separately on those via source_id lookup.
  let q = sb
    .from('social_plan_slot')
    .select(`
      id, plan_id, day_of_week, slot, scheduled_for, source_kind, source_id,
      platforms, fb_caption, ig_caption, image_url, tone, status,
      ghl_post_id, ghl_error, urgency, custom_caption, custom_image,
      social_plan(brand_slug, status, week_start)
    `)
    .gte('scheduled_for', gridStart.toISOString())
    .lt('scheduled_for', gridEnd.toISOString())
    .order('scheduled_for', { ascending: true })
    .limit(1000)
  const { data: slotsRaw } = await q

  // Direct slots (plan_id NULL) need brand_slug joined from source.
  // For 'article' source_kind, that's guide_articles.brand_slug.
  type RawSlot = Record<string, unknown> & {
    id: string; plan_id: string | null; source_kind: string; source_id: string | null
    scheduled_for: string; platforms: string[]
    fb_caption: string | null; ig_caption: string | null; image_url: string | null
    status: string; urgency: string; ghl_post_id: string | null; ghl_error: string | null
    social_plan: { brand_slug: string; status: string; week_start: string } | { brand_slug: string; status: string; week_start: string }[] | null
  }
  const rawSlots = (slotsRaw ?? []) as RawSlot[]

  const directArticleIds = rawSlots
    .filter(s => !s.plan_id && s.source_kind === 'article' && s.source_id)
    .map(s => s.source_id as string)
  const articleBrandLookup = new Map<string, string>()
  if (directArticleIds.length > 0) {
    const { data: arts } = await sb.from('guide_articles').select('id, brand_slug, title')
      .in('id', directArticleIds)
    for (const a of (arts ?? []) as Array<{ id: string; brand_slug: string | null; title: string }>) {
      articleBrandLookup.set(a.id, a.brand_slug ?? 'rrp')
    }
  }

  // Normalize + optional brand filter
  const slots = rawSlots
    .map(s => {
      const plan = Array.isArray(s.social_plan) ? s.social_plan[0] : s.social_plan
      const brand_slug = plan?.brand_slug
        ?? (s.source_id && articleBrandLookup.get(s.source_id))
        ?? 'rrp'
      return {
        id:            s.id,
        plan_id:       s.plan_id,
        scheduled_for: s.scheduled_for,
        source_kind:   s.source_kind,
        source_id:     s.source_id,
        platforms:     s.platforms,
        fb_caption:    s.fb_caption,
        ig_caption:    s.ig_caption,
        image_url:     s.image_url,
        status:        s.status,
        urgency:       s.urgency,
        ghl_post_id:   s.ghl_post_id,
        ghl_error:     s.ghl_error,
        brand_slug,
      }
    })
    .filter(s => !sp.brand || s.brand_slug === sp.brand)

  // Counts for the brand chips
  const totalsByBrand = new Map<string, number>()
  for (const s of slots) totalsByBrand.set(s.brand_slug, (totalsByBrand.get(s.brand_slug) ?? 0) + 1)

  const prevMonth = month === 0 ? `${year - 1}-12` : `${year}-${String(month).padStart(2, '0')}`
  const nextMonth = month === 11 ? `${year + 1}-01` : `${year}-${String(month + 2).padStart(2, '0')}`

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="bg-white border-b border-portal-border px-6 py-4 shrink-0 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <Link href="/admin/social/plan" className="text-[11px] font-semibold text-portal-sub hover:text-portal-text inline-flex items-center gap-1 mb-1">
            <ArrowLeft size={11} /> Social plan
          </Link>
          <h1 className="text-[18px] font-bold text-portal-text">
            <CalendarIcon size={16} className="inline -translate-y-0.5 mr-1" /> Social calendar
          </h1>
          <p className="text-[12px] text-portal-sub mt-1">
            Every post Claude has scheduled — across all brands, all sources. {slots.length} {slots.length === 1 ? 'post' : 'posts'} in view.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/admin/social/calendar?month=${prevMonth}${sp.brand ? `&brand=${sp.brand}` : ''}`}
            className="px-3 py-1.5 text-[12px] font-semibold text-portal-sub bg-white border border-portal-border-2 rounded hover:bg-portal-bg">←</Link>
          <span className="text-[13px] font-bold text-portal-text">
            {firstOfMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })}
          </span>
          <Link href={`/admin/social/calendar?month=${nextMonth}${sp.brand ? `&brand=${sp.brand}` : ''}`}
            className="px-3 py-1.5 text-[12px] font-semibold text-portal-sub bg-white border border-portal-border-2 rounded hover:bg-portal-bg">→</Link>
          <Link href={`/admin/social/calendar${sp.brand ? `?brand=${sp.brand}` : ''}`}
            className="px-3 py-1.5 text-[12px] font-semibold text-portal-sub bg-white border border-portal-border-2 rounded hover:bg-portal-bg">Today</Link>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-portal-bg">
        <div className="px-6 py-4 space-y-4">

          {/* Brand chips */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <Link
              href={`/admin/social/calendar?month=${year}-${String(month + 1).padStart(2, '0')}`}
              className={`px-3 py-1.5 rounded-full text-[12px] font-bold border ${
                !sp.brand ? 'bg-portal-navy text-white border-portal-navy' : 'bg-white text-portal-text border-portal-border'
              }`}
            >All brands ({slots.length})</Link>
            {MARKETS.map(m => (
              <Link
                key={m.slug}
                href={`/admin/social/calendar?brand=${m.slug}&month=${year}-${String(month + 1).padStart(2, '0')}`}
                className={`px-3 py-1.5 rounded-full text-[12px] font-bold border ${
                  sp.brand === m.slug ? 'bg-portal-navy text-white border-portal-navy' : 'bg-white text-portal-text border-portal-border'
                }`}
              >{m.short} ({totalsByBrand.get(m.slug) ?? 0})</Link>
            ))}
          </div>

          <CalendarClient
            gridStartIso={gridStart.toISOString()}
            currentMonth={month}
            currentYear={year}
            slots={slots}
          />

          <div className="bg-white border border-portal-border rounded-lg p-3 text-[11px] text-portal-sub flex items-center justify-between flex-wrap gap-2">
            <span>
              Posts are scheduled to fire via <strong>GHL Social Planner</strong>. Editing a post here updates GHL automatically.
              Direct-published article auto-posts schedule +1 hour from publish.
            </span>
            <a
              href="https://app.gohighlevel.com/" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-portal-blue hover:underline"
            >
              Open GHL Social Planner <ExternalLink size={10} />
            </a>
          </div>

        </div>
      </div>
    </div>
  )
}
