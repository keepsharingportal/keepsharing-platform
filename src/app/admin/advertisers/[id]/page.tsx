// /admin/advertisers/[id] — Overview tab. Default landing page when
// you open a business in the CRM. Concise: contacts, contract, GHL
// sync, and click-through tiles to the deep-dive tabs. The masthead +
// tab strip live in layout.tsx so they're shared across every tab.

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/admin/auth'
import { AdvertiserContactsPanel } from '@/components/admin/AdvertiserContactsPanel'
import { GhlSyncButton } from '@/components/admin/GhlSyncButton'
import {
  Mail, Phone, Globe, Calendar, Megaphone, BookOpen, FileText, BarChart3, ArrowRight,
} from 'lucide-react'

export const metadata: Metadata = { title: 'Business — Admin' }
export const dynamic  = 'force-dynamic'

interface Props { params: Promise<{ id: string }> }

function fmtDate(d: string | null): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default async function AdvertiserOverviewPage({ params }: Props) {
  await requireAdmin()
  const { id } = await params

  const supabase = createAdminClient()
  const { data: acct, error } = await supabase
    .from('advertiser_accounts')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error || !acct) return notFound()

  const a = acct as Record<string, unknown>
  const businessName  = String(a.business_name ?? '')
  const contactName   = a.contact_name ? String(a.contact_name) : null
  const contactEmail  = a.contact_email ? String(a.contact_email) : null
  const contactPhone  = a.contact_phone ? String(a.contact_phone) : null
  const businessUrl   = a.business_url ? String(a.business_url) : null
  const contractStart = a.contract_start_date ? String(a.contract_start_date) : null
  const contractEnd   = a.contract_end_date ? String(a.contract_end_date) : null
  const opsNotes      = a.ops_notes ? String(a.ops_notes) : null
  const sponsorGuide  = a.sponsor_guide_slug ? String(a.sponsor_guide_slug) : null

  // Contacts (migration 128). Fallback to inline contact_* fields when
  // the table doesn't exist yet so the tab still renders something
  // useful pre-migration.
  const contactsRes = await supabase
    .from('advertiser_contacts')
    .select('id, advertiser_account_id, name, email, phone, role, is_primary, notes')
    .eq('advertiser_account_id', id)
    .order('is_primary', { ascending: false })
    .order('name',       { ascending: true })
  const contacts = (contactsRes.error ? [] : (contactsRes.data ?? [])) as Array<{
    id: string; advertiser_account_id: string; name: string;
    email: string | null; phone: string | null;
    role: 'ad_rep' | 'billing' | 'listing_owner' | 'decision_maker' | 'other';
    is_primary: boolean; notes: string | null
  }>
  const contactsTableMissing = !!contactsRes.error

  // Per-section counts for the Overview's click-through tiles. The
  // layout already computes totals for the tab strip; the tile detail
  // we want here is a tiny preview ('3 ads · 1 expiring'), so we
  // refetch per-tab summaries cheaply.
  const [adsRes, printRes, listingsRes, proposalsFkRes, proposalsNameRes] = await Promise.all([
    supabase.from('ad_placements')
      .select('id, is_active, archived_at')
      .eq('advertiser_account_id', id),
    supabase.from('print_ad_placements')
      .select('id, issue_month, expires_month')
      .eq('advertiser_account_id', id)
      .order('issue_month', { ascending: false })
      .limit(50),
    supabase.from('guide_listings')
      .select('id, is_published')
      .eq('advertiser_account_id', id),
    supabase.from('proposals')
      .select('id, status')
      .eq('advertiser_account_id', id),
    supabase.from('proposals')
      .select('id, status')
      .ilike('business_name', businessName),
  ])
  const adPlacementRows = (adsRes.error ? [] : (adsRes.data ?? [])) as Array<{ is_active: boolean | null; archived_at: string | null }>
  const activeAds  = adPlacementRows.filter(r => r.is_active && !r.archived_at).length
  const printRows  = (printRes.error ? [] : (printRes.data ?? [])) as Array<{ issue_month: string; expires_month: string | null }>
  const todayYm    = new Date().toISOString().slice(0, 7)
  const printActive = printRows.filter(r => r.issue_month >= todayYm).length
  const printPast   = printRows.length - printActive
  const listingRows = (listingsRes.error ? [] : (listingsRes.data ?? [])) as Array<{ is_published: boolean }>
  const listingsPub = listingRows.filter(r => r.is_published).length
  // FK first; fallback to name match for pre-migration-132 environments.
  const proposalRows = (proposalsFkRes.error
    ? (proposalsNameRes.error ? [] : (proposalsNameRes.data ?? []))
    : (proposalsFkRes.data ?? [])) as Array<{ status: string | null }>
  const proposalsOpen = proposalRows.filter(r => (r.status ?? '').toLowerCase() === 'sent' || (r.status ?? '').toLowerCase() === 'viewed').length

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* ── Left column ── contacts + contract + GHL */}
      <div className="space-y-4">
        {contactsTableMissing ? (
          <section className="bg-white rounded-lg border border-portal-border p-5 space-y-3 text-sm">
            <h2 className="text-xs font-bold uppercase tracking-wider text-portal-sub">Contact</h2>
            {contactName && <p className="font-bold text-portal-text">{contactName}</p>}
            {contactEmail && (
              <a href={`mailto:${contactEmail}`} className="flex items-center gap-1.5 text-portal-blue hover:underline">
                <Mail size={13} /> {contactEmail}
              </a>
            )}
            {contactPhone && (
              <p className="flex items-center gap-1.5 text-portal-text"><Phone size={13} /> {contactPhone}</p>
            )}
            <p className="text-[10px] text-portal-amber mt-2">
              Multi-contact support pending — apply migration 128 (advertiser_contacts) in Supabase.
            </p>
          </section>
        ) : (
          <AdvertiserContactsPanel advertiserId={id} initial={contacts} />
        )}

        {businessUrl && (
          <section className="bg-white rounded-lg border border-portal-border p-5 text-sm">
            <h2 className="text-xs font-bold uppercase tracking-wider text-portal-sub mb-2">Website</h2>
            <a href={businessUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-portal-blue hover:underline break-all">
              <Globe size={13} /> {businessUrl.replace(/^https?:\/\//, '')}
            </a>
          </section>
        )}

        <section className="bg-white rounded-lg border border-portal-border p-5 space-y-3 text-sm">
          <h2 className="text-xs font-bold uppercase tracking-wider text-portal-sub">Contract</h2>
          <div className="flex items-center gap-1.5 text-portal-text">
            <Calendar size={13} />
            <span>{fmtDate(contractStart)} → {fmtDate(contractEnd)}</span>
          </div>
          {sponsorGuide && (
            <p className="text-xs text-portal-sub">
              <span className="font-bold">Guide sponsor:</span> {sponsorGuide.replace(/-/g, ' ')}
            </p>
          )}
          {opsNotes && (
            <p className="text-xs text-portal-sub italic mt-2 leading-relaxed">{opsNotes}</p>
          )}
        </section>

        <section className="bg-white rounded-lg border border-portal-border p-5 space-y-2 text-sm">
          <h2 className="text-xs font-bold uppercase tracking-wider text-portal-sub">GoHighLevel</h2>
          <p className="text-[11px] text-portal-sub leading-snug">
            Sync this business&apos;s contacts to GHL with role + tier tags.
          </p>
          <GhlSyncButton advertiserId={id} />
        </section>
      </div>

      {/* ── Right column ── deep-dive tiles */}
      <div className="lg:col-span-2 grid sm:grid-cols-2 gap-4">
        <TileLink
          href={`/admin/advertisers/${id}/ads`}
          icon={<Megaphone size={18} />}
          title="Ad Placements"
          primary={`${activeAds + printActive}`}
          primaryLabel={`active ad${activeAds + printActive === 1 ? '' : 's'}`}
          secondary={[
            activeAds > 0           && `${activeAds} digital`,
            printActive > 0         && `${printActive} print`,
            printPast > 0           && `${printPast} past`,
          ].filter(Boolean) as string[]}
        />
        <TileLink
          href={`/admin/advertisers/${id}/listings`}
          icon={<BookOpen size={18} />}
          title="Guide Listings"
          primary={`${listingsPub}`}
          primaryLabel={`published listing${listingsPub === 1 ? '' : 's'}`}
          secondary={listingRows.length > listingsPub ? [`${listingRows.length - listingsPub} draft`] : []}
        />
        <TileLink
          href={`/admin/advertisers/${id}/analytics`}
          icon={<BarChart3 size={18} />}
          title="Analytics"
          primary="View"
          primaryLabel="performance + monthly report"
          secondary={[]}
        />
        <TileLink
          href={`/admin/advertisers/${id}/proposals`}
          icon={<FileText size={18} />}
          title="Proposals & Agreements"
          primary={`${proposalRows.length}`}
          primaryLabel={`proposal${proposalRows.length === 1 ? '' : 's'}`}
          secondary={proposalsOpen > 0 ? [`${proposalsOpen} open`] : []}
        />
      </div>
    </div>
  )
}

// TileLink — large click-through summary card. Tile titles match the
// tab labels so the editor learns the mental model fast. The primary
// number is the headline; secondaries are small comma-separated
// modifiers below.
function TileLink({ href, icon, title, primary, primaryLabel, secondary }: {
  href:         string
  icon:         React.ReactNode
  title:        string
  primary:      string
  primaryLabel: string
  secondary:    string[]
}) {
  return (
    <Link
      href={href}
      className="group bg-white rounded-lg border border-portal-border p-5 hover:ring-portal-blue hover:shadow-sm transition-all flex flex-col gap-2"
    >
      <div className="flex items-center justify-between">
        <div className="text-portal-muted group-hover:text-portal-blue transition-colors">{icon}</div>
        <ArrowRight size={14} className="text-portal-border-2 group-hover:text-portal-blue transition-colors" />
      </div>
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-portal-sub">{title}</h3>
        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-3xl font-bold text-portal-text tabular-nums">{primary}</span>
          <span className="text-xs text-portal-sub">{primaryLabel}</span>
        </div>
      </div>
      {secondary.length > 0 && (
        <p className="text-[11px] text-portal-sub">{secondary.join(' · ')}</p>
      )}
    </Link>
  )
}
