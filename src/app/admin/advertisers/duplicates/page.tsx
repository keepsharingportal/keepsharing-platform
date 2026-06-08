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

interface Props {
  searchParams: Promise<{ kind?: string }>
}

export default async function DuplicatesPage({ searchParams }: Props) {
  await requireAdmin()
  const sp = await searchParams
  // Same filter mental model as /admin/advertisers — default to
  // advertiser (paid customers), but let the editor flip to directory
  // or all when she wants to clean those buckets up too.
  const kindFilter = (sp.kind ?? 'advertiser') as 'advertiser' | 'directory_only' | 'all'

  const supabase = createAdminClient()

  // Pull every advertiser. The dedup pass is in-memory + O(n²); plenty
  // fast for the tens-of-hundreds advertisers we're likely to have for
  // years. If this ever balloons, bucket by first token before pairing.
  const { data: rows } = await supabase
    .from('advertiser_accounts')
    .select('id, business_name, slug, contact_email, contact_phone, created_at, kind')
    .order('business_name', { ascending: true })

  type Row = {
    id: string; business_name: string; slug: string;
    contact_email: string | null; contact_phone: string | null;
    created_at:    string;
    kind:          'advertiser' | 'directory_only' | null;
  }
  const all = (rows ?? []) as Row[]

  // Bucket candidates by kind first, run findClusters per bucket.
  // Cross-kind merges (paying customer ↔ directory entry) are almost
  // never what the editor wants — keeps the lists separate.
  function candidatesFor(kind: 'advertiser' | 'directory_only'): DupCandidate[] {
    return all
      .filter(r => (r.kind ?? 'directory_only') === kind)
      .map(r => ({
        id:            r.id,
        business_name: r.business_name,
        slug:          r.slug,
        tokens:        normalize(r.business_name),
      }))
  }
  const advertiserClusters = findClusters(candidatesFor('advertiser'))
  const directoryClusters  = findClusters(candidatesFor('directory_only'))

  // Apply the kind URL filter to pick which clusters surface.
  const clusters =
    kindFilter === 'advertiser'     ? advertiserClusters :
    kindFilter === 'directory_only' ? directoryClusters  :
                                      [...advertiserClusters, ...directoryClusters]

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

        {/* Kind filter — mirrors the chip on /admin/advertisers. Default
            is 'Advertisers' so the editor sees paid-customer dups first;
            she can switch to Directory-only when she's ready to clean
            that bigger pile. Cross-kind merges aren't offered. */}
        <div className="bg-white rounded-2xl border border-gray-200 px-4 py-3 flex items-center gap-2 flex-wrap">
          <span className="text-[10px] uppercase tracking-wider font-bold text-gray-400">View:</span>
          {([
            { k: 'advertiser',     label: 'Advertisers',    count: advertiserClusters.length, tone: 'bg-portal-navy'  },
            { k: 'directory_only', label: 'Directory only', count: directoryClusters.length,  tone: 'bg-gray-500' },
            { k: 'all',            label: 'All',            count: advertiserClusters.length + directoryClusters.length, tone: 'bg-gray-900' },
          ] as const).map(c => {
            const on = kindFilter === c.k
            const href = c.k === 'advertiser' ? '/admin/advertisers/duplicates' : `/admin/advertisers/duplicates?kind=${c.k}`
            return (
              <a key={c.k} href={href}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                  on ? `${c.tone} text-white` : 'text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200'
                }`}>
                {c.label}
                <span className={`text-[10px] ${on ? 'opacity-80' : 'text-gray-400'}`}>{c.count}</span>
              </a>
            )
          })}
        </div>

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
    tone === 'good' ? 'text-portal-green' :
    tone === 'warn' ? 'text-portal-amber'   :
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
