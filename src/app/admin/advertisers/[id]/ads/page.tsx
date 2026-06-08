// /admin/advertisers/[id]/ads — Ad Placements tab. Everything 'what's
// running' in one place: digital ad_placements, print_ad_placements,
// short_links (QR), and the rate-card slots this business could be
// assigned to next.

import type { Metadata } from 'next'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/admin/auth'
import { RATE_CARD } from '@/lib/ads/rate-card'
import { CloneAdButton } from '@/components/admin/CloneAdButton'
import { AdvertiserPrintPlacements, type PrintPlacementSummary } from '@/components/admin/AdvertiserPrintPlacements'
import {
  Eye, MousePointer, RotateCw, Lock, Plus, Megaphone,
} from 'lucide-react'

export const metadata: Metadata = { title: 'Ad Placements — Business — Admin' }
export const dynamic  = 'force-dynamic'

interface Props { params: Promise<{ id: string }> }

function fmtDate(d: string | null): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default async function AdsTab({ params }: Props) {
  await requireAdmin()
  const { id } = await params

  const supabase = createAdminClient()

  // Parallel: digital placements + print placements + QR codes. Each
  // tolerates missing tables (migration not applied yet) by treating
  // an error as 'empty list'.
  const [placementsRes, printRes, qrRes] = await Promise.all([
    supabase
      .from('ad_placements')
      .select('id, placement_type, context_type, context_slug, ad_headline, is_active, archived_at, impression_count, click_count, starts_at, ends_at, rotation_group')
      .eq('advertiser_account_id', id)
      .order('archived_at', { ascending: false, nullsFirst: true })
      .order('is_active',   { ascending: false })
      .order('impression_count', { ascending: false }),
    supabase
      .from('print_ad_placements')
      .select('id, issue_month, design, size, layout, price, expires_month')
      .eq('advertiser_account_id', id)
      .order('issue_month', { ascending: false })
      .limit(24),
    supabase
      .from('short_links')
      .select('id, shortcode, destination, content_type, label, click_count, utm_campaign, is_active, created_at')
      .eq('advertiser_account_id', id)
      .order('click_count', { ascending: false }),
  ])

  type PlacementRow = {
    id: string; placement_type: string; context_type: string | null;
    context_slug: string | null; ad_headline: string | null; is_active: boolean;
    archived_at: string | null; impression_count: number; click_count: number;
    starts_at: string | null; ends_at: string | null; rotation_group: string | null;
  }
  const plRows = (placementsRes.data ?? []) as PlacementRow[]
  const printPlacements: PrintPlacementSummary[] = printRes.error
    ? []
    : (printRes.data ?? []) as PrintPlacementSummary[]
  const printTableMissing = !!printRes.error

  type QrRow = {
    id: string; shortcode: string; destination: string; content_type: string;
    label: string | null; click_count: number; utm_campaign: string | null;
    is_active: boolean; created_at: string;
  }
  const qrCodes = (qrRes.error ? [] : (qrRes.data ?? [])) as QrRow[]

  return (
    <div className="space-y-6">

      {/* ── Print Placements (top — most editor traffic) ──── */}
      <AdvertiserPrintPlacements
        advertiserId={id}
        initial={printPlacements}
        tableMissing={printTableMissing}
      />

      {/* ── Digital Ad Placements ─────────────────────────── */}
      <section className="bg-white rounded-xl ring-1 ring-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between gap-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 inline-flex items-center gap-1.5">
            <Megaphone size={11} /> Digital Placements {plRows.length > 0 && <span className="text-gray-400">({plRows.length})</span>}
          </h2>
          <Link
            href={`/admin/ads/new?advertiser_id=${id}`}
            className="inline-flex items-center gap-1 text-xs font-bold text-white bg-portal-navy hover:bg-portal-navy/90 px-2.5 py-1 rounded-full"
          >
            <Plus size={11} /> New Digital Ad
          </Link>
        </div>
        {plRows.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">
            No digital placements yet. <Link href={`/admin/ads/new?advertiser_id=${id}`} className="text-portal-blue font-bold hover:underline">Assign one →</Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {plRows.map(p => {
              const rate      = RATE_CARD.find(r => r.placementType === p.placement_type)
              const isExpired = !!p.archived_at
              return (
                <div key={p.id} className={`px-5 py-3 flex items-center gap-3 ${isExpired ? 'opacity-60 bg-gray-50/60' : p.is_active ? '' : 'opacity-70'}`}>
                  {p.rotation_group ? (
                    <RotateCw size={12} className="text-sky-500 shrink-0" />
                  ) : (
                    <Lock size={12} className="text-amber-500 shrink-0" />
                  )}
                  <Link href={`/admin/ads/${p.id}/edit`} className="flex-1 min-w-0 hover:opacity-80">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {rate?.label ?? p.placement_type.replace(/_/g, ' ')}
                    </p>
                    <div className="flex items-center gap-3 text-[11px] text-gray-500 mt-0.5">
                      {p.context_slug && <span className="font-medium">{p.context_slug}</span>}
                      {p.ad_headline && <span className="truncate max-w-[16rem]">&quot;{p.ad_headline}&quot;</span>}
                      <span>{fmtDate(p.starts_at)} → {fmtDate(p.ends_at)}</span>
                    </div>
                  </Link>
                  <div className="flex items-center gap-3 text-[11px] text-gray-500 shrink-0">
                    <span className="inline-flex items-center gap-0.5"><Eye size={10} /> {(p.impression_count ?? 0).toLocaleString()}</span>
                    <span className="inline-flex items-center gap-0.5"><MousePointer size={10} /> {(p.click_count ?? 0).toLocaleString()}</span>
                  </div>
                  {isExpired ? (
                    <>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-portal-red-lt text-portal-red ring-1 ring-rose-200 font-bold uppercase tracking-wider shrink-0">
                        Expired
                      </span>
                      <CloneAdButton id={p.id} variant="pill" />
                    </>
                  ) : !p.is_active ? (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 ring-1 ring-gray-200 font-bold shrink-0">
                      Inactive
                    </span>
                  ) : null}
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* ── QR Codes ──────────────────────────────────────── */}
      {qrCodes.length > 0 && (
        <section className="bg-white rounded-xl ring-1 ring-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between gap-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500">
              QR Codes ({qrCodes.length})
            </h2>
            <div className="flex items-center gap-2">
              <Link
                href={`/admin/content/short-links/new?advertiser_id=${id}`}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-white bg-portal-navy hover:bg-portal-navy/90 px-2.5 py-1 rounded-full"
              >
                <Plus size={11} /> New QR Code
              </Link>
              <Link
                href={`/admin/content/short-links?advertiser_id=${id}`}
                className="text-[11px] font-semibold text-gray-500 hover:text-gray-900"
              >
                All
              </Link>
            </div>
          </div>
          <div className="divide-y divide-gray-50">
            {qrCodes.map(q => (
              <div key={q.id} className={`px-5 py-3 flex items-center gap-3 ${q.is_active ? '' : 'opacity-50'}`}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">/go/{q.shortcode}</p>
                  <div className="flex items-center gap-3 text-[11px] text-gray-500 mt-0.5">
                    <span className="capitalize">{q.content_type}</span>
                    {q.label && <span>{q.label}</span>}
                    {q.utm_campaign && <span>campaign={q.utm_campaign}</span>}
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-bold text-gray-700 shrink-0">
                  <MousePointer size={11} /> {q.click_count.toLocaleString()} scans
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Available Slots ───────────────────────────────── */}
      <section className="bg-white rounded-xl ring-1 ring-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500">Available Slots</h2>
          <p className="text-[11px] text-gray-400 mt-0.5">Open positions this business could fill. Click to assign.</p>
        </div>
        <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
          {RATE_CARD.filter(slot => !plRows.some(p => p.placement_type === slot.placementType && p.is_active))
            .slice(0, 16)
            .map(slot => (
              <Link
                key={`${slot.placementType}-${slot.surface}`}
                href={`/admin/ads/new?placement_type=${slot.placementType}&context_slug=${slot.surface}&advertiser_id=${id}`}
                className="flex items-center justify-between px-5 py-2.5 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {slot.locked ? (
                    <Lock size={10} className="text-amber-500 shrink-0" />
                  ) : (
                    <RotateCw size={10} className="text-sky-500 shrink-0" />
                  )}
                  <span className="text-xs font-semibold text-gray-900 truncate">{slot.label}</span>
                </div>
                <span className="text-[11px] text-gray-500 shrink-0">${slot.monthly}/mo</span>
              </Link>
            ))}
        </div>
      </section>
    </div>
  )
}
