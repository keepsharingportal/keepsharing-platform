// ── /admin/social/plan ───────────────────────────────────────────
//
// The AI Social Media Manager hub. Editor lands here Monday morning,
// sees next week's full plan (7 days × 4 slots), reviews and approves.
// One click pushes the whole week to GHL.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireSettingsAccess } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { MARKETS } from '@/lib/markets'
import { nextMonday, mondayOf } from '@/lib/social-strategist/planner'
import { PlanGridClient } from './PlanGridClient'
import { ArrowLeft, Calendar as CalendarIcon, Sparkles, Plus } from 'lucide-react'

export const metadata: Metadata = { title: 'Social plan — Admin' }
export const dynamic = 'force-dynamic'

interface Props {
  searchParams: Promise<{ brand?: string; week?: string }>
}

export default async function SocialPlanPage({ searchParams }: Props) {
  await requireSettingsAccess()
  const sp = await searchParams
  const brand = sp.brand && MARKETS.find(m => m.slug === sp.brand) ? sp.brand : 'rrp'
  const week  = sp.week ?? nextMonday(new Date())

  const sb = createAdminClient()

  const { data: plan } = await sb
    .from('social_plan')
    .select('*')
    .eq('brand_slug', brand)
    .eq('week_start', week)
    .maybeSingle()

  const slots = plan ? (await sb
    .from('social_plan_slot')
    .select('*')
    .eq('plan_id', (plan as { id: string }).id)
    .order('day_of_week', { ascending: true })
    .order('slot', { ascending: true })).data ?? [] : []

  // Quick pool sizes for the empty-state hint
  const [{ count: poolArticles }, { count: poolEvents }, { count: poolQuotes }] = await Promise.all([
    sb.from('guide_articles').select('id', { count: 'exact', head: true }).eq('published', true).eq('brand_slug', brand),
    sb.from('calendar_events').select('id', { count: 'exact', head: true }).gte('start_date', new Date().toISOString()).eq('brand_slug', brand),
    sb.from('quote_bank').select('id', { count: 'exact', head: true }).eq('is_active', true),
  ])

  const weekStart = new Date(week + 'T00:00:00')
  const prevWeek = new Date(weekStart); prevWeek.setDate(prevWeek.getDate() - 7)
  const nextWeekDate = new Date(weekStart); nextWeekDate.setDate(nextWeekDate.getDate() + 7)
  const isThisWeek = week === mondayOf(new Date())
  const isNextWeek = week === nextMonday(new Date())

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="bg-white border-b border-portal-border px-6 py-4 shrink-0 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <Link href="/admin" className="text-[11px] font-semibold text-portal-sub hover:text-portal-text inline-flex items-center gap-1 mb-1">
            <ArrowLeft size={11} /> Admin
          </Link>
          <h1 className="text-[18px] font-bold text-portal-text">
            <CalendarIcon size={16} className="inline -translate-y-0.5 mr-1" /> Social plan
          </h1>
          <p className="text-[12px] text-portal-sub mt-1">
            AI strategist&apos;s weekly plan. Review, edit, then approve to push the whole week to GHL Social Planner.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/social/calendar"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold text-portal-text bg-portal-blue-lt border border-portal-blue rounded-lg hover:opacity-90"
          >
            Calendar view
          </Link>
          <Link
            href="/admin/social/ghl-check"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold text-portal-sub bg-white border border-portal-border-2 rounded-lg hover:bg-portal-bg"
          >
            GHL diagnostic
          </Link>
          <Link
            href={`/admin/social/plan/urgent?brand=${brand}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold text-portal-text bg-portal-amber rounded-lg hover:opacity-90"
          >
            <Plus size={12} /> Add urgent
          </Link>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-portal-bg">
        <div className="px-6 py-6 space-y-4">

          {/* Brand picker */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {MARKETS.map(m => (
              <Link
                key={m.slug}
                href={`/admin/social/plan?brand=${m.slug}&week=${week}`}
                className={`px-3 py-1.5 rounded-full text-[12px] font-bold border ${
                  brand === m.slug ? 'bg-portal-navy text-white border-portal-navy' : 'bg-white text-portal-text border-portal-border hover:bg-portal-bg'
                }`}
              >{m.short}</Link>
            ))}
          </div>

          {/* Week navigator */}
          <div className="flex items-center justify-between bg-white border border-portal-border rounded-lg px-4 py-2">
            <Link href={`/admin/social/plan?brand=${brand}&week=${prevWeek.toISOString().slice(0,10)}`}
              className="text-[12px] font-bold text-portal-sub hover:text-portal-text">
              ← Previous
            </Link>
            <div className="text-center">
              <div className="text-[14px] font-bold text-portal-text">Week of {formatWeek(week)}</div>
              <div className="text-[10px] text-portal-sub uppercase tracking-wider">
                {isThisWeek ? 'this week' : isNextWeek ? 'next week' : ''}
              </div>
            </div>
            <Link href={`/admin/social/plan?brand=${brand}&week=${nextWeekDate.toISOString().slice(0,10)}`}
              className="text-[12px] font-bold text-portal-sub hover:text-portal-text">
              Next →
            </Link>
          </div>

          {plan ? (
            <PlanGridClient
              plan={plan as PlanRow}
              slots={slots as SlotRow[]}
              brand={brand}
              weekStart={week}
            />
          ) : (
            <div className="bg-white border border-portal-border rounded-lg p-6 text-center space-y-3">
              <Sparkles size={28} className="text-portal-blue mx-auto" />
              <div className="text-[14px] font-bold text-portal-text">No plan for this week yet</div>
              <div className="text-[12px] text-portal-sub max-w-md mx-auto">
                The strategist hasn&apos;t run for {brand.toUpperCase()} / week of {formatWeek(week)}. Pool:&nbsp;
                {poolArticles ?? 0} articles, {poolEvents ?? 0} upcoming events, {poolQuotes ?? 0} active quotes.
              </div>
              <PlanGenerateButton brand={brand} week={week} />
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

function PlanGenerateButton({ brand, week }: { brand: string; week: string }) {
  return (
    <form action={`/api/admin/social/strategist/generate`} method="POST" className="inline-block">
      <input type="hidden" name="brand" value={brand} />
      <input type="hidden" name="week_start" value={week} />
      <button
        type="submit"
        className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-bold text-white bg-portal-navy rounded-lg hover:opacity-90"
      >
        <Sparkles size={14} /> Generate plan
      </button>
    </form>
  )
}

function formatWeek(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export interface PlanRow {
  id:           string
  brand_slug:   string
  week_start:   string
  status:       string
  generated_at: string
  approved_at:  string | null
  pushed_at:    string | null
  notes:        string | null
}
export interface SlotRow {
  id:            string
  plan_id:       string
  day_of_week:   number
  slot:          string
  scheduled_for: string
  source_kind:   string
  source_id:     string | null
  custom_caption: string | null
  custom_image:   string | null
  platforms:     string[]
  fb_caption:    string | null
  ig_caption:    string | null
  image_url:     string | null
  tone:          string | null
  status:        string
  ghl_post_id:   string | null
  ghl_error:     string | null
  urgency:       string
}
