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
  ArrowRight, Plus, CheckCircle2, Circle, PowerOff,
} from 'lucide-react'
import { SlotToggleButton } from './SlotToggleButton'
import { AdsTabs } from '@/components/admin/AdsTabs'
import { SlotMapVisual } from './SlotMapVisual'

// Slot Map's surfaces are ALSO the context_slug values that section-scoped
// placements use (e.g. surface='school-zone' → context_slug='school-zone').
// For homepage / site / newsletter surfaces there's no per-context split —
// the toggle should disable site-wide (context_slug=null) instead. This
// guard keeps the toggle scope sensible without making the UI complicated.
const SITE_WIDE_SURFACES = new Set(['homepage', 'site', 'newsletter'])
function toggleContextFor(surface: string): string | null {
  return SITE_WIDE_SURFACES.has(surface) ? null : surface
}

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
  const [{ data }, { data: disabledRows }] = await Promise.all([
    supabase
      .from('ad_placements')
      .select('placement_type, context_slug, is_active, impression_count, click_count, starts_at, ends_at, advertiser:advertiser_account_id(business_name)')
      .eq('is_active', true)
      .order('display_priority', { ascending: false }),
    supabase
      .from('ad_slot_settings')
      .select('placement_type, context_slug, disabled')
      .eq('disabled', true)
      .returns<Array<{ placement_type: string; context_slug: string | null; disabled: boolean }>>(),
  ])

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

  // Same shape lookup for the disable rows so SlotCard can check both
  // exact (placement|context) and site-wide (placement|null) matches.
  const disabledMap = new Set<string>()
  for (const row of disabledRows ?? []) {
    disabledMap.add(`${row.placement_type}|${row.context_slug ?? ''}`)
  }
  function isSlotDisabled(placementType: string, contextSlug: string | null): boolean {
    if (disabledMap.has(`${placementType}|`)) return true   // site-wide disable
    if (contextSlug && disabledMap.has(`${placementType}|${contextSlug}`)) return true
    return false
  }

  const bySurface = getRatesBySurface()

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-6 pt-6"><AdsTabs /></div>
      <div className="bg-white border-b border-portal-border px-6 py-4 mt-4 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-portal-text">Ad Map</h1>
          <p className="text-xs text-portal-sub mt-0.5">
            Every ad slot on the site — pricing, status, and who owns it.{' '}
            <Link href="/admin/ads" className="text-portal-blue hover:underline">Raw placements →</Link>
          </p>
        </div>
        <Link
          href="/admin/ads/new"
          className="inline-flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold text-white bg-portal-navy rounded-lg hover:bg-portal-navy/90"
        >
          <Plus size={14} /> New Placement
        </Link>
      </div>

      {/* Summary strip */}
      <div className="bg-white border-b border-portal-border px-6 py-3 flex items-center gap-6 flex-wrap text-sm">
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

      <div className="px-6 py-6 space-y-10 max-w-6xl">
        {SURFACE_ORDER.map(surface => {
          const slots = bySurface.get(surface)
          if (!slots || slots.length === 0) return null

          // Per-slot status keyed by placementType — drives the
          // wireframe overlay colors. Disabled wins; then booked;
          // then sellable (open).
          const slotStatuses: Record<string, 'live' | 'paused' | 'sellable' | 'hidden'> = {}
          for (const slot of slots) {
            const key       = `${slot.placementType}|${slot.surface}`
            const live      = liveMap.get(key) ?? []
            const toggleCtx = toggleContextFor(slot.surface)
            const disabled  = isSlotDisabled(slot.placementType, toggleCtx)
            slotStatuses[slot.placementType] = disabled
              ? 'hidden'
              : live.length > 0
                ? 'live'
                : 'sellable'
          }

          return (
            <section key={surface}>
              <h2 className="text-base font-bold text-portal-text mb-3 inline-flex items-center gap-2">
                <span>{SURFACE_LABELS[surface] ?? surface}</span>
                <span className="text-[11px] font-medium text-portal-muted">
                  {slots.length} {slots.length === 1 ? 'slot' : 'slots'}
                </span>
              </h2>

              {/* Visual wireframe — communicates WHERE each slot lives
                  on the actual page. Falls back to a tiny notice when
                  the surface doesn't have a wireframe registered yet. */}
              <div className="mb-4">
                <SlotMapVisual surface={surface} slotStatuses={slotStatuses} />
              </div>

              {/* Detail cards — pricing + advertiser + impressions
                  + on/off toggle. Same as before. */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {slots.map(slot => {
                  const key = `${slot.placementType}|${slot.surface}`
                  const live = liveMap.get(key) ?? []
                  const toggleCtx = toggleContextFor(slot.surface)
                  const disabled  = isSlotDisabled(slot.placementType, toggleCtx)
                  return (
                    <SlotCard
                      key={`${slot.placementType}-${slot.surface}`}
                      slot={slot}
                      live={live}
                      disabled={disabled}
                      toggleContext={toggleCtx}
                    />
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

function SlotCard({
  slot, live, disabled, toggleContext,
}: {
  slot:          SlotRate
  live:          LiveSlot[]
  disabled:      boolean
  toggleContext: string | null
}) {
  const booked  = live.length > 0
  const totalI  = live.reduce((s, a) => s + a.impression_count, 0)
  const totalC  = live.reduce((s, a) => s + a.click_count, 0)

  // Disabled state wins visually — slot stops rendering on the public
  // site regardless of booking, so the card should read "off" not
  // "booked" or "open".
  const ringClass = disabled
    ? 'bg-portal-red-lt/40 ring-rose-200 opacity-90'
    : booked
      ? 'bg-portal-green-lt/50 ring-emerald-200'
      : 'bg-white ring-gray-200'

  return (
    <div className={`rounded-xl ring-1 p-4 ${ringClass}`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-portal-text leading-snug">{slot.label}</h3>
          <p className="text-[11px] text-portal-sub leading-relaxed mt-0.5">{slot.description}</p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          {slot.locked ? (
            <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-portal-amber-lt text-portal-amber border border-portal-amber/30">
              <Lock size={9} /> Locked
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-sky-100 text-sky-800 border border-portal-blue/30">
              <RotateCw size={9} /> Rotation
            </span>
          )}
          <SlotToggleButton
            placementType={slot.placementType}
            contextSlug={toggleContext}
            isDisabled={disabled}
          />
        </div>
      </div>

      {disabled && (
        <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold text-portal-red">
          <PowerOff size={11} /> Slot is OFF — public site is hiding this spot
        </div>
      )}

      {/* Pricing */}
      <div className="flex items-center gap-3 text-[11px] text-portal-sub mb-3">
        <span className="inline-flex items-center gap-1 font-semibold">
          <DollarSign size={10} /> ${slot.monthly}/mo
        </span>
        <span className="text-portal-muted">·</span>
        <span>${slot.quarterly}/qtr</span>
        <span className="text-portal-muted">·</span>
        <span>${slot.annual}/yr</span>
      </div>

      {/* Status */}
      {booked ? (
        <div className="space-y-1.5">
          {live.map((l, i) => (
            <div key={i} className="flex items-center justify-between gap-2 text-xs">
              <span className="inline-flex items-center gap-1 font-semibold text-portal-green">
                <CheckCircle2 size={11} /> {l.business_name ?? 'Unknown'}
              </span>
              <div className="flex items-center gap-2 text-portal-sub">
                <span className="inline-flex items-center gap-0.5"><Eye size={9} /> {totalI.toLocaleString()}</span>
                <span className="inline-flex items-center gap-0.5"><MousePointer size={9} /> {totalC.toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1 text-xs text-portal-amber font-semibold">
            <Circle size={9} className="fill-amber-400 text-amber-400" /> Open
          </span>
          <Link
            href={`/admin/ads/new?placement_type=${slot.placementType}&context_slug=${slot.surface}`}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-portal-blue hover:underline"
          >
            Assign <ArrowRight size={10} />
          </Link>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: 'emerald' | 'amber' }) {
  const valueClass = accent === 'emerald' ? 'text-portal-green'
    : accent === 'amber' ? 'text-portal-amber'
    : 'text-portal-text'
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider font-bold text-portal-muted">{label}</p>
      <p className={`text-lg font-bold ${valueClass}`}>{value.toLocaleString()}</p>
    </div>
  )
}
