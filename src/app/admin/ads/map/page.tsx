// /admin/ads/map — Unified visual map of every ad slot on the site.
//
// One page where staff can see what's booked, what's open, and what each
// slot costs — organized by page, with pricing from the rate card and
// live occupancy from ad_placements. Replaces the guesswork of "which
// placement type do I pick in the raw form" with a visual grid that
// reads like a media kit.

import type { Metadata } from 'next'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/admin/auth'
import {
  RATE_CARD, SURFACE_ORDER, SURFACE_LABELS,
  getRatesBySurface, type SlotRate,
} from '@/lib/ads/rate-card'
import {
  Lock, RotateCw, DollarSign, Eye, MousePointer,
  ArrowRight, Plus, CheckCircle2, Circle,
} from 'lucide-react'

export const metadata: Metadata = { title: 'Ad Map — Admin' }
export const dynamic  = 'force-dynamic'

type LiveSlot = {
  placement_type:   string
  context_slug:     string | null
  is_active:        boolean
  business_name:    string | null
  impression_count: number
  click_count:      number
  starts_at:        string | null
  ends_at:          string | null
}

export default async function AdMapPage() {
  await requireAdmin()

  const supabase = createAdminClient()
  const { data } = await supabase
    .from('ad_placements')
    .select('placement_type, context_slug, is_active, impression_count, click_count, starts_at, ends_at, advertiser:advertiser_account_id(business_name)')
    .eq('is_active', true)
    .order('display_priority', { ascending: false })

  // Build a lookup: "placement_type|context_slug" → array of live slots
  const liveMap = new Map<string, LiveSlot[]>()
  for (const row of (data ?? []) as unknown[]) {
    const r = row as Record<string, unknown>
    const adv = r.advertiser as { business_name: string } | null
    const key = `${r.placement_type}|${r.context_slug ?? ''}`
    const arr = liveMap.get(key) ?? []
    arr.push({
      placement_type:   r.placement_type as string,
      context_slug:     r.context_slug as string | null,
      is_active:        true,
      business_name:    adv?.business_name ?? null,
      impression_count: typeof r.impression_count === 'number' ? r.impression_count : 0,
      click_count:      typeof r.click_count === 'number' ? r.click_count : 0,
      starts_at:        r.starts_at as string | null,
      ends_at:          r.ends_at as string | null,
    })
    liveMap.set(key, arr)
  }

  const bySurface = getRatesBySurface()

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Ad Map</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Every ad slot on the site — pricing, status, and who owns it.{' '}
            <Link href="/admin/ads" className="text-primary hover:underline">Raw placements →</Link>
          </p>
        </div>
        <Link
          href="/admin/ads/new"
          className="inline-flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold text-white bg-primary rounded-lg hover:bg-primary/90"
        >
          <Plus size={14} /> New Placement
        </Link>
      </div>

      {/* Summary strip */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-6 flex-wrap text-sm">
        <Stat label="Total Slots" value={RATE_CARD.length} />
        <Stat
          label="Booked"
          value={new Set([...liveMap.values()].flat().map(s => s.placement_type)).size}
          accent="emerald"
        />
        <Stat
          label="Open"
          value={RATE_CARD.length - new Set([...liveMap.values()].flat().map(s => s.placement_type)).size}
          accent="amber"
        />
        <Stat
          label="Total Impressions"
          value={[...liveMap.values()].flat().reduce((s, a) => s + a.impression_count, 0)}
        />
        <Stat
          label="Total Clicks"
          value={[...liveMap.values()].flat().reduce((s, a) => s + a.click_count, 0)}
        />
      </div>

      <div className="px-6 py-6 space-y-8 max-w-6xl">
        {SURFACE_ORDER.map(surface => {
          const slots = bySurface.get(surface)
          if (!slots || slots.length === 0) return null
          return (
            <section key={surface}>
              <h2 className="text-sm font-bold text-gray-900 mb-3 inline-flex items-center gap-2">
                <span>{SURFACE_LABELS[surface] ?? surface}</span>
              </h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {slots.map(slot => {
                  const key = `${slot.placementType}|${slot.surface}`
                  const live = liveMap.get(key) ?? []
                  return (
                    <SlotCard key={`${slot.placementType}-${slot.surface}`} slot={slot} live={live} />
                  )
                })}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}

function SlotCard({ slot, live }: { slot: SlotRate; live: LiveSlot[] }) {
  const booked  = live.length > 0
  const totalI  = live.reduce((s, a) => s + a.impression_count, 0)
  const totalC  = live.reduce((s, a) => s + a.click_count, 0)

  return (
    <div className={`rounded-xl ring-1 p-4 ${
      booked ? 'bg-emerald-50/50 ring-emerald-200' : 'bg-white ring-gray-200'
    }`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-gray-900 leading-snug">{slot.label}</h3>
          <p className="text-[11px] text-gray-500 leading-relaxed mt-0.5">{slot.description}</p>
        </div>
        {slot.locked ? (
          <span className="shrink-0 inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 ring-1 ring-amber-200">
            <Lock size={9} /> Locked
          </span>
        ) : (
          <span className="shrink-0 inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-sky-100 text-sky-800 ring-1 ring-sky-200">
            <RotateCw size={9} /> Rotation
          </span>
        )}
      </div>

      {/* Pricing */}
      <div className="flex items-center gap-3 text-[11px] text-gray-600 mb-3">
        <span className="inline-flex items-center gap-1 font-semibold">
          <DollarSign size={10} /> ${slot.monthly}/mo
        </span>
        <span className="text-gray-400">·</span>
        <span>${slot.quarterly}/qtr</span>
        <span className="text-gray-400">·</span>
        <span>${slot.annual}/yr</span>
      </div>

      {/* Status */}
      {booked ? (
        <div className="space-y-1.5">
          {live.map((l, i) => (
            <div key={i} className="flex items-center justify-between gap-2 text-xs">
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-800">
                <CheckCircle2 size={11} /> {l.business_name ?? 'Unknown'}
              </span>
              <div className="flex items-center gap-2 text-gray-500">
                <span className="inline-flex items-center gap-0.5"><Eye size={9} /> {totalI.toLocaleString()}</span>
                <span className="inline-flex items-center gap-0.5"><MousePointer size={9} /> {totalC.toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1 text-xs text-amber-700 font-semibold">
            <Circle size={9} className="fill-amber-400 text-amber-400" /> Open
          </span>
          <Link
            href={`/admin/ads/new?placement_type=${slot.placementType}&context_slug=${slot.surface}`}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline"
          >
            Assign <ArrowRight size={10} />
          </Link>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: 'emerald' | 'amber' }) {
  const valueClass = accent === 'emerald' ? 'text-emerald-700'
    : accent === 'amber' ? 'text-amber-700'
    : 'text-gray-900'
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider font-bold text-gray-400">{label}</p>
      <p className={`text-lg font-bold ${valueClass}`}>{value.toLocaleString()}</p>
    </div>
  )
}
