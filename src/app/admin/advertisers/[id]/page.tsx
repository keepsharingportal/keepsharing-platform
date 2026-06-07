// /admin/advertisers/[id] — single advertiser profile.
//
// Everything about one business in one place: contact info, tier, contract
// dates, lifecycle, active ad placements with impressions/clicks, rotation
// pool toggle, and quick-assign to open slots.

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/admin/auth'
import { RATE_CARD } from '@/lib/ads/rate-card'
import { CloneAdButton } from '@/components/admin/CloneAdButton'
import { AdvertiserContactsPanel } from '@/components/admin/AdvertiserContactsPanel'
import { GhlSyncButton } from '@/components/admin/GhlSyncButton'
import { AdvertiserPrintPlacements, type PrintPlacementSummary } from '@/components/admin/AdvertiserPrintPlacements'
import {
  ArrowLeft, Building2, Mail, Phone, Globe, Calendar,
  Eye, MousePointer, DollarSign, RotateCw, Lock, Plus, ExternalLink,
  Star,
} from 'lucide-react'

export const metadata: Metadata = { title: 'Advertiser — Admin' }
export const dynamic  = 'force-dynamic'

const TIER_LABEL: Record<string, string> = {
  'tier-1-found':    'Tier 1 — Found (Quarter)',
  'tier-2-featured': 'Tier 2 — Featured (Third)',
  'tier-3-chosen':   'Tier 3 — Chosen (Half)',
  'tier-4-won':      'Tier 4 — Won (Full Page)',
}
const TIER_BADGE: Record<string, string> = {
  'tier-1-found':    'bg-gray-100 text-gray-700 ring-gray-200',
  'tier-2-featured': 'bg-sky-100 text-sky-800 ring-sky-200',
  'tier-3-chosen':   'bg-violet-100 text-violet-800 ring-violet-200',
  'tier-4-won':      'bg-amber-100 text-amber-800 ring-amber-200',
}
const LIFECYCLE_BADGE: Record<string, string> = {
  'active':      'bg-emerald-100 text-emerald-800 ring-emerald-200',
  'onboarding':  'bg-sky-100 text-sky-800 ring-sky-200',
  'lead':        'bg-gray-100 text-gray-700 ring-gray-200',
  'renewal':     'bg-amber-100 text-amber-800 ring-amber-200',
  'dormant':     'bg-rose-100 text-rose-700 ring-rose-200',
}

interface Props { params: Promise<{ id: string }> }

function fmtDate(d: string | null): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default async function AdvertiserProfilePage({ params }: Props) {
  await requireAdmin()
  const { id } = await params

  const supabase = createAdminClient()

  // Load the account
  const { data: acct, error } = await supabase
    .from('advertiser_accounts')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error || !acct) return notFound()

  const a = acct as Record<string, unknown>
  const name          = String(a.business_name ?? 'Unknown')
  const slug          = String(a.slug ?? '')
  const tier          = String(a.package_tier ?? '')
  const lifecycle     = String(a.lifecycle_stage ?? 'active')
  const contactName   = a.contact_name ? String(a.contact_name) : null
  const contactEmail  = a.contact_email ? String(a.contact_email) : null
  const contactPhone  = a.contact_phone ? String(a.contact_phone) : null
  const businessUrl   = a.business_url ? String(a.business_url) : null
  const contractStart = a.contract_start_date ? String(a.contract_start_date) : null
  const contractEnd   = a.contract_end_date ? String(a.contract_end_date) : null
  const logoUrl       = a.logo_url ? String(a.logo_url) : null
  const opsNotes      = a.ops_notes ? String(a.ops_notes) : null
  const loyaltyTier   = a.loyalty_tier ? String(a.loyalty_tier) : null
  const sponsorGuide  = a.sponsor_guide_slug ? String(a.sponsor_guide_slug) : null

  // Load contacts (migration 128). When the table doesn't exist yet,
  // the catch in the wrapping select falls back gracefully to the
  // inline contact_name/email/phone fields above. Once 128 is applied
  // the backfill creates one row per existing account, so this is
  // non-empty for any account that had a contact previously.
  const contactsRes = await supabase
    .from('advertiser_contacts')
    .select('id, advertiser_account_id, name, email, phone, role, is_primary, notes')
    .eq('advertiser_account_id', id)
    .order('is_primary', { ascending: false })
    .order('name',       { ascending: true })
  const contacts = (contactsRes.error ? [] : contactsRes.data ?? []) as Array<{
    id: string; advertiser_account_id: string; name: string;
    email: string | null; phone: string | null;
    role: 'ad_rep' | 'billing' | 'listing_owner' | 'decision_maker' | 'other';
    is_primary: boolean; notes: string | null
  }>
  const contactsTableMissing = !!contactsRes.error

  // Print bookings (migration 129). Same migration-tolerant pattern as
  // contacts: empty array + 'tableMissing' flag when 129 isn't applied.
  const printRes = await supabase
    .from('print_ad_placements')
    .select('id, issue_month, design, size, layout, price, expires_month')
    .eq('advertiser_account_id', id)
    .order('issue_month', { ascending: false })
    .limit(24)
  const printPlacements: PrintPlacementSummary[] = printRes.error
    ? []
    : (printRes.data ?? []) as PrintPlacementSummary[]
  const printTableMissing = !!printRes.error

  // Load all their ad placements (active + expired). Sort: active first
  // (newest priority), then expired (most-recently-archived first).
  const { data: placements } = await supabase
    .from('ad_placements')
    .select('id, placement_type, context_type, context_slug, ad_headline, is_active, archived_at, impression_count, click_count, starts_at, ends_at, rotation_group')
    .eq('advertiser_account_id', id)
    .order('archived_at', { ascending: false, nullsFirst: true })
    .order('is_active',   { ascending: false })
    .order('impression_count', { ascending: false })

  // Load their QR codes (short_links) so scans roll into the profile.
  // Gracefully handles a partially-migrated DB where the FK column hasn't
  // been added yet (migration 095).
  type QrRow = {
    id: string; shortcode: string; destination: string; content_type: string;
    label: string | null; click_count: number; utm_campaign: string | null;
    is_active: boolean; created_at: string;
  }
  let qrCodes: QrRow[] = []
  const qrRes = await supabase
    .from('short_links')
    .select('id, shortcode, destination, content_type, label, click_count, utm_campaign, is_active, created_at')
    .eq('advertiser_account_id', id)
    .order('click_count', { ascending: false })
  if (!qrRes.error) qrCodes = (qrRes.data ?? []) as QrRow[]

  // Guide Listings — every guide this business appears in. Tied via
  // advertiser_account_id FK from migration 028. Render with the
  // guide_type display_name (join) so the editor sees 'Birthday Party
  // Guide' not 'birthday-parties'.
  type GuideListingRow = {
    id: string; listing_tier: string | null; category: string | null;
    is_published: boolean; listing_year: number | null;
    guide_type_slug: string | null;
    guide_type: { display_name: string } | { display_name: string }[] | null;
  }
  const glRes = await supabase
    .from('guide_listings')
    .select('id, listing_tier, category, is_published, listing_year, guide_type_slug, guide_type:guide_types (display_name)')
    .eq('advertiser_account_id', id)
    .order('is_published', { ascending: false })
    .order('listing_year',  { ascending: false, nullsFirst: false })
  const guideListings = (glRes.error ? [] : (glRes.data ?? [])) as GuideListingRow[]

  // Proposals — links to the advertiser via:
  //   1. advertiser_account_id FK once migration 132 is applied
  //   2. Falls back to business_name (case-insensitive) for any rows
  //      that pre-date the FK or didn't auto-backfill
  // The two-pass approach lets the page render cleanly whether or not
  // 132 has been run. Post-132 the FK path is the source of truth.
  type ProposalRow = {
    id: string; token_slug: string; status: string | null;
    recommended_tier: string | null; custom_monthly_price: number | null;
    sent_at: string | null; viewed_at: string | null; accepted_at: string | null;
    expires_at: string | null; created_at: string;
  }
  const proposalsByName = supabase
    .from('proposals')
    .select('id, token_slug, status, recommended_tier, custom_monthly_price, sent_at, viewed_at, accepted_at, expires_at, created_at')
    .ilike('business_name', name)
    .order('created_at', { ascending: false })
    .limit(10)
  const proposalsByFk = supabase
    .from('proposals')
    .select('id, token_slug, status, recommended_tier, custom_monthly_price, sent_at, viewed_at, accepted_at, expires_at, created_at')
    .eq('advertiser_account_id', id)
    .order('created_at', { ascending: false })
    .limit(10)
  const [fkRes, nameRes] = await Promise.all([proposalsByFk, proposalsByName])
  // FK path returns an error when migration 132 hasn't been applied
  // ('column does not exist'). Swallow that — name match still works.
  const fkRows   = (fkRes.error   ? [] : (fkRes.data   ?? [])) as ProposalRow[]
  const nameRows = (nameRes.error ? [] : (nameRes.data ?? [])) as ProposalRow[]
  const seenIds = new Set(fkRows.map(r => r.id))
  const proposals = [...fkRows, ...nameRows.filter(r => !seenIds.has(r.id))]

  type PlacementRow = {
    id: string; placement_type: string; context_type: string | null;
    context_slug: string | null; ad_headline: string | null; is_active: boolean;
    archived_at: string | null;
    impression_count: number; click_count: number; starts_at: string | null;
    ends_at: string | null; rotation_group: string | null;
  }
  const plRows = (placements ?? []) as PlacementRow[]
  const activePlacements = plRows.filter(p => p.is_active)
  const totalImpressions = plRows.reduce((s, p) => s + (p.impression_count ?? 0), 0)
  const totalClicks      = plRows.reduce((s, p) => s + (p.click_count ?? 0), 0)
  const ctr              = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : '—'
  const inRotationPool   = plRows.some(p => p.rotation_group === 'run-of-site' && p.is_active)
  const totalQrScans     = qrCodes.reduce((s, q) => s + (q.click_count ?? 0), 0)

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <Link href="/admin/advertisers" className="text-xs text-gray-500 hover:text-gray-900 inline-flex items-center gap-1 mb-2">
          <ArrowLeft size={12} /> All Advertisers
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            {logoUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={logoUrl} alt="" className="w-14 h-14 rounded-xl object-cover ring-1 ring-gray-200" />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-gray-100 ring-1 ring-gray-200 flex items-center justify-center">
                <Building2 size={24} className="text-gray-300" />
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold text-gray-900">{name}</h1>
              <div className="flex items-center gap-2 flex-wrap mt-1">
                {tier && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ring-1 ${TIER_BADGE[tier] ?? 'bg-gray-100 text-gray-700 ring-gray-200'}`}>
                    {TIER_LABEL[tier] ?? tier}
                  </span>
                )}
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ring-1 ${LIFECYCLE_BADGE[lifecycle] ?? 'bg-gray-100 text-gray-700 ring-gray-200'}`}>
                  {lifecycle}
                </span>
                {loyaltyTier && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-50 text-amber-800 ring-1 ring-amber-200">
                    <Star size={8} className="inline mr-0.5" />{loyaltyTier}
                  </span>
                )}
                {inRotationPool && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-sky-50 text-sky-700 ring-1 ring-sky-200">
                    <RotateCw size={8} className="inline mr-0.5" /> In Rotation Pool
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {slug && (
              <Link
                href={`/partners/${slug}`}
                target="_blank"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <ExternalLink size={12} /> Public Page
              </Link>
            )}
            <Link
              href={`/admin/ads/new?advertiser_id=${id}`}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold text-white bg-primary rounded-lg hover:bg-primary/90"
            >
              <Plus size={14} /> Assign to Slot
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6 space-y-6">

        {/* Performance strip */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <MetricCard icon={<Eye size={16} />} label="Ad Impressions" value={totalImpressions.toLocaleString()} />
          <MetricCard icon={<MousePointer size={16} />} label="Ad Clicks" value={totalClicks.toLocaleString()} />
          <MetricCard icon={<span className="text-xs font-bold">CTR</span>} label="Click-Through Rate" value={ctr === '—' ? '—' : `${ctr}%`} />
          <MetricCard icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><line x1="14" y1="14" x2="14" y2="17"/><line x1="14" y1="20" x2="14" y2="20"/><line x1="17" y1="14" x2="17" y2="14"/><line x1="17" y1="17" x2="17" y2="17"/><line x1="20" y1="14" x2="20" y2="14"/><line x1="20" y1="17" x2="20" y2="20"/></svg>} label="QR Scans" value={totalQrScans.toLocaleString()} />
          <MetricCard icon={<DollarSign size={16} />} label="Active Placements" value={String(activePlacements.length)} />
        </div>

        {/* Quick link to printable monthly report */}
        <div className="flex justify-end">
          <Link
            href={`/admin/advertisers/${id}/report`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-primary bg-white border border-primary/30 rounded-lg hover:bg-primary/5"
          >
            Generate Monthly Report →
          </Link>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left column: contacts + contract */}
          <div className="space-y-4">
            {/* New Contacts panel (migration 128) handles multi-contact
                + role + primary flag. Falls back to the legacy single-
                contact view when the table isn't created yet. */}
            {contactsTableMissing ? (
              <section className="bg-white rounded-xl ring-1 ring-gray-200 p-5 space-y-3 text-sm">
                <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500">Contact</h2>
                {contactName && <p className="font-bold text-gray-900">{contactName}</p>}
                {contactEmail && (
                  <a href={`mailto:${contactEmail}`} className="flex items-center gap-1.5 text-primary hover:underline">
                    <Mail size={13} /> {contactEmail}
                  </a>
                )}
                {contactPhone && (
                  <p className="flex items-center gap-1.5 text-gray-700"><Phone size={13} /> {contactPhone}</p>
                )}
                <p className="text-[10px] text-amber-700 mt-2">
                  Multi-contact support pending — apply migration 128 (advertiser_contacts) in Supabase.
                </p>
              </section>
            ) : (
              <AdvertiserContactsPanel advertiserId={id} initial={contacts} />
            )}
            {/* Business website stays on its own little card so it's
                always one click away from the header. */}
            {businessUrl && (
              <section className="bg-white rounded-xl ring-1 ring-gray-200 p-5 text-sm">
                <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Website</h2>
                <a href={businessUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-primary hover:underline break-all">
                  <Globe size={13} /> {businessUrl.replace(/^https?:\/\//, '')}
                </a>
              </section>
            )}

            <section className="bg-white rounded-xl ring-1 ring-gray-200 p-5 space-y-3 text-sm">
              <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500">Contract</h2>
              <div className="flex items-center gap-1.5 text-gray-700">
                <Calendar size={13} />
                <span>{fmtDate(contractStart)} → {fmtDate(contractEnd)}</span>
              </div>
              {sponsorGuide && (
                <p className="text-xs text-gray-600">
                  <span className="font-bold">Guide sponsor:</span> {sponsorGuide.replace(/-/g, ' ')}
                </p>
              )}
              {opsNotes && (
                <p className="text-xs text-gray-500 italic mt-2 leading-relaxed">{opsNotes}</p>
              )}
            </section>

            {/* GHL sync — pushes every contact on this advertiser into
                GoHighLevel with role + tier + lifecycle tags. Existing
                GHL workflows fire automatically off those tags. */}
            <section className="bg-white rounded-xl ring-1 ring-gray-200 p-5 space-y-2 text-sm">
              <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500">GoHighLevel</h2>
              <p className="text-[11px] text-gray-500 leading-snug">
                Sync this advertiser&apos;s contacts to GHL with role + tier tags.
                The expired-ad re-engagement cron handles tagging automatically;
                this button is for on-demand pushes after a contact edit.
              </p>
              <GhlSyncButton advertiserId={id} />
            </section>

            {/* Print bookings — every print_ad_placements row tied to
                this business, sorted upcoming-first. Click any row to
                open the monthly Print Layout sheet with that issue
                pre-loaded. Hides itself behind a notice until
                migration 129 is applied. */}
            <AdvertiserPrintPlacements
              advertiserId={id}
              initial={printPlacements}
              tableMissing={printTableMissing}
            />
          </div>

          {/* Right column: active placements */}
          <div className="lg:col-span-2">
            <section className="bg-white rounded-xl ring-1 ring-gray-200 overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Ad Placements ({plRows.length})
                </h2>
                <Link
                  href={`/admin/ads/new?advertiser_id=${id}`}
                  className="text-[11px] font-bold text-primary hover:underline inline-flex items-center gap-1"
                >
                  <Plus size={10} /> Add Placement
                </Link>
              </div>
              {plRows.length === 0 ? (
                <div className="p-8 text-center text-sm text-gray-400">
                  No placements yet. <Link href={`/admin/ads/new?advertiser_id=${id}`} className="text-primary font-bold hover:underline">Assign one →</Link>
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
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-rose-50 text-rose-700 ring-1 ring-rose-200 font-bold uppercase tracking-wider shrink-0">
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

            {/* QR Codes linked to this advertiser */}
            {qrCodes.length > 0 && (
              <section className="bg-white rounded-xl ring-1 ring-gray-200 overflow-hidden mt-4">
                <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between gap-2">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                    QR Codes ({qrCodes.length})
                  </h2>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/admin/content/short-links/new?advertiser_id=${id}`}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-white bg-primary hover:bg-primary/90 px-2.5 py-1 rounded-full"
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

            {/* Guide Listings — every guide this business is listed in.
                Surfaced here so the editor sees the full publishing
                footprint without hopping into the guides admin. */}
            {guideListings.length > 0 && (
              <section className="bg-white rounded-xl ring-1 ring-gray-200 overflow-hidden mt-4">
                <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between gap-2">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                    Guide Listings ({guideListings.length})
                  </h2>
                  <Link
                    href={`/admin/listings?advertiser_id=${id}`}
                    className="text-[11px] font-semibold text-gray-500 hover:text-gray-900"
                  >
                    All
                  </Link>
                </div>
                <div className="divide-y divide-gray-50">
                  {guideListings.slice(0, 8).map(g => {
                    const guide = Array.isArray(g.guide_type) ? g.guide_type[0] : g.guide_type
                    const name  = guide?.display_name ?? g.guide_type_slug ?? '(unknown guide)'
                    return (
                      <div key={g.id} className={`px-5 py-2.5 flex items-center gap-3 ${g.is_published ? '' : 'opacity-60'}`}>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{name}</p>
                          <div className="flex items-center gap-3 text-[11px] text-gray-500 mt-0.5">
                            {g.category   && <span>{g.category}</span>}
                            {g.listing_year && <span>{g.listing_year}</span>}
                            <span className={`uppercase tracking-wider font-bold text-[9px] px-1.5 py-0.5 rounded ${
                              g.listing_tier === 'sponsor'    ? 'bg-amber-100 text-amber-800'   :
                              g.listing_tier === 'premium'    ? 'bg-violet-100 text-violet-800' :
                                                                'bg-gray-100 text-gray-600'
                            }`}>
                              {g.listing_tier ?? 'free'}
                            </span>
                          </div>
                        </div>
                        {!g.is_published && (
                          <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400">Draft</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            {/* Proposals — loose match by business_name (the proposals
                table from migration 022 predates advertiser_accounts FK).
                Surfaced with a label that calls out the looseness so
                the editor knows mismatches are possible. */}
            {proposals.length > 0 && (
              <section className="bg-white rounded-xl ring-1 ring-gray-200 overflow-hidden mt-4">
                <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between gap-2">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                    Proposals ({proposals.length})
                    <span className="ml-2 text-[9px] font-normal text-gray-400 normal-case tracking-normal">
                      matched by business name
                    </span>
                  </h2>
                  <Link
                    href={`/admin/advertisers/proposals?q=${encodeURIComponent(name)}`}
                    className="text-[11px] font-semibold text-gray-500 hover:text-gray-900"
                  >
                    All
                  </Link>
                </div>
                <div className="divide-y divide-gray-50">
                  {proposals.map(p => {
                    const stage = (p.status ?? 'draft').toLowerCase()
                    const stageBadge: Record<string, string> =
                      { draft: 'bg-gray-100 text-gray-700', sent: 'bg-sky-100 text-sky-800', viewed: 'bg-violet-100 text-violet-800', accepted: 'bg-emerald-100 text-emerald-800', declined: 'bg-rose-100 text-rose-800', expired: 'bg-gray-100 text-gray-400' }
                    return (
                      <Link
                        key={p.id}
                        href={`/admin/advertisers/proposals/${p.id}`}
                        className="px-5 py-2.5 flex items-center gap-3 hover:bg-gray-50"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {p.recommended_tier ?? '—'}
                            {p.custom_monthly_price != null && (
                              <span className="ml-2 text-xs font-normal text-gray-500">${p.custom_monthly_price.toLocaleString()}/mo</span>
                            )}
                          </p>
                          <div className="flex items-center gap-3 text-[11px] text-gray-500 mt-0.5">
                            <code className="font-mono">/{p.token_slug}</code>
                            <span>{fmtDate(p.created_at)}</span>
                            {p.viewed_at && <span>Viewed {fmtDate(p.viewed_at)}</span>}
                          </div>
                        </div>
                        <span className={`text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded ${stageBadge[stage] ?? stageBadge.draft}`}>
                          {stage}
                        </span>
                      </Link>
                    )
                  })}
                </div>
              </section>
            )}

            {/* Open slots this advertiser could be assigned to */}
            <section className="bg-white rounded-xl ring-1 ring-gray-200 overflow-hidden mt-4">
              <div className="px-5 py-3 border-b border-gray-100">
                <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Available Slots
                </h2>
                <p className="text-[11px] text-gray-400 mt-0.5">Open positions this advertiser could fill. Click to assign.</p>
              </div>
              <div className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
                {RATE_CARD.filter(slot => {
                  // Hide slots this advertiser already fills
                  return !plRows.some(p => p.placement_type === slot.placementType && p.is_active)
                }).slice(0, 12).map(slot => (
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
        </div>
      </div>
    </div>
  )
}

function MetricCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-white rounded-xl ring-1 ring-gray-200 p-4">
      <div className="text-gray-400 mb-1">{icon}</div>
      <p className="text-[10px] uppercase tracking-wider font-bold text-gray-400">{label}</p>
      <p className="text-xl font-bold text-gray-900">{value}</p>
    </div>
  )
}
