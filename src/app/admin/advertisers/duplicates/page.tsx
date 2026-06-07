// /admin/advertisers/duplicates — surfaces likely-duplicate advertisers.
//
// Reads every advertiser_accounts row, normalizes business names, groups
// likely-duplicate clusters (see /lib/advertisers/dedup), and renders each
// cluster as a panel with one-click merge. The editor picks which row is
// the survivor; everything else collapses into it.

import type { Metadata } from 'next'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/admin/auth'
import { ArrowLeft, AlertTriangle, CheckCircle2, Users } from 'lucide-react'
import { normalize, findClusters, type DupCandidate } from '@/lib/advertisers/dedup'
import { DupClusterPanel } from './DupClusterPanel'

export const metadata: Metadata = { title: 'Duplicate Advertisers — Admin' }
export const dynamic  = 'force-dynamic'

export default async function DuplicatesPage() {
  await requireAdmin()
  const supabase = createAdminClient()

  // Pull every advertiser. The dedup pass is in-memory + O(n²); plenty
  // fast for the tens-of-hundreds advertisers we're likely to have for
  // years. If this ever balloons, bucket by first token before pairing.
  const { data: rows } = await supabase
    .from('advertiser_accounts')
    .select('id, business_name, slug, contact_email, contact_phone, created_at')
    .order('business_name', { ascending: true })

  type Row = {
    id: string; business_name: string; slug: string;
    contact_email: string | null; contact_phone: string | null;
    created_at:    string
  }
  const all = (rows ?? []) as Row[]

  // Build the candidate list with normalized tokens once.
  const candidates: DupCandidate[] = all.map(r => ({
    id:            r.id,
    business_name: r.business_name,
    slug:          r.slug,
    tokens:        normalize(r.business_name),
  }))
  const clusters = findClusters(candidates)

  // Per-cluster: load related counts so the editor can see what's at
  // stake before merging. One round-trip per related table for all
  // cluster ids at once — cheap.
  const allClusterIds = clusters.flatMap(c => c.members.map(m => m.id))
  const counts = await loadCounts(supabase, allClusterIds)

  // Decorate cluster members with contact + counts for the UI.
  const decorated = clusters.map(cluster => ({
    key: cluster.key,
    members: cluster.members.map(m => {
      const row = all.find(r => r.id === m.id)!
      return {
        id:            m.id,
        business_name: m.business_name,
        slug:          m.slug,
        contact_email: row.contact_email,
        contact_phone: row.contact_phone,
        created_at:    row.created_at,
        adPlacements:  counts.adPlacements[m.id]  ?? 0,
        contacts:      counts.contacts[m.id]      ?? 0,
        shortLinks:    counts.shortLinks[m.id]    ?? 0,
      }
    }),
  }))

  const totalDuplicates = clusters.reduce((s, c) => s + c.members.length - 1, 0)

  return (
    <div className="flex-1 overflow-y-auto p-6 pb-16">
      <div className="max-w-5xl mx-auto space-y-6">

        <header className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <Link
              href="/admin/advertisers"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 mb-2"
            >
              <ArrowLeft size={12} /> Back to Advertisers
            </Link>
            <h1 className="text-xl font-bold text-gray-900">Duplicate Advertisers</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Likely duplicates surfaced by fuzzy-matching business names.
              Pick the row to keep, merge the rest, every related ad placement / contact / link follows.
            </p>
          </div>
        </header>

        {/* Summary tiles — quick read on the scope. */}
        <div className="grid grid-cols-3 gap-3">
          <SummaryTile
            label="Total advertisers"
            value={all.length}
            icon={Users}
            tone="neutral"
          />
          <SummaryTile
            label="Likely-dup clusters"
            value={clusters.length}
            icon={AlertTriangle}
            tone={clusters.length > 0 ? 'warn' : 'good'}
          />
          <SummaryTile
            label="Rows that will be merged away"
            value={totalDuplicates}
            icon={CheckCircle2}
            tone={totalDuplicates > 0 ? 'warn' : 'good'}
          />
        </div>

        {clusters.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
            <CheckCircle2 size={28} className="mx-auto mb-3 text-emerald-500" />
            <p className="text-sm font-semibold text-gray-900">No duplicate clusters found</p>
            <p className="text-xs text-gray-500 mt-1">
              Fuzzy match scanned every business name; nothing crossed the similarity threshold.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {decorated.map(cluster => (
              <DupClusterPanel key={cluster.key} cluster={cluster} />
            ))}
          </div>
        )}

      </div>
    </div>
  )
}

// ── Helpers ─────────────────────────────────────────────────────────────────

async function loadCounts(
  supabase: ReturnType<typeof createAdminClient>,
  ids: string[],
): Promise<{ adPlacements: Record<string, number>; contacts: Record<string, number>; shortLinks: Record<string, number> }> {
  if (ids.length === 0) return { adPlacements: {}, contacts: {}, shortLinks: {} }
  // Three counts in parallel. select(id) + length is good enough for
  // count display; we don't need exact totals beyond visual signal.
  const [ad, ct, sl] = await Promise.all([
    supabase.from('ad_placements').select('advertiser_account_id').in('advertiser_account_id', ids),
    supabase.from('advertiser_contacts').select('advertiser_account_id').in('advertiser_account_id', ids),
    supabase.from('short_links').select('advertiser_account_id').in('advertiser_account_id', ids),
  ])
  return {
    adPlacements: tally((ad.data ?? []) as Array<{ advertiser_account_id: string }>),
    contacts:     tally((ct.data ?? []) as Array<{ advertiser_account_id: string }>),
    shortLinks:   tally((sl.data ?? []) as Array<{ advertiser_account_id: string }>),
  }
}
function tally(rows: Array<{ advertiser_account_id: string }>): Record<string, number> {
  const out: Record<string, number> = {}
  for (const r of rows) out[r.advertiser_account_id] = (out[r.advertiser_account_id] ?? 0) + 1
  return out
}

function SummaryTile({ label, value, icon: Icon, tone }: {
  label: string; value: number;
  icon:  React.ComponentType<{ size?: number; className?: string }>;
  tone:  'good' | 'warn' | 'neutral'
}) {
  const accent =
    tone === 'good' ? 'text-emerald-700' :
    tone === 'warn' ? 'text-amber-700'   :
                      'text-gray-900'
  return (
    <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3">
      <div className="flex items-center gap-2 mb-1">
        <Icon size={12} className="text-gray-400" />
        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{label}</span>
      </div>
      <p className={`text-2xl font-black tabular-nums leading-none ${accent}`}>{value.toLocaleString()}</p>
    </div>
  )
}
