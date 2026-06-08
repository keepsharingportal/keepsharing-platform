// /admin/advertisers/pipeline — kanban-style view of every advertiser
// account grouped by lifecycle_stage. Editor sees how many businesses
// sit in each pipeline bucket and the projected monthly revenue tied
// to each bucket.

import type { Metadata } from 'next'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/admin/auth'
import { DollarSign, Building2 } from 'lucide-react'

// Tabs trimmed to match /admin/advertisers/page.tsx — Agreements + Ad Proofs
// were mock-only routes and got removed in the contacts/CRM cleanup.
const TABS = ['Active Advertisers', 'Pipeline', 'Duplicates']

// Pipeline stage order — left to right is the sales funnel.
// Editors read top-down so the leftmost column is the entry point.
const PIPELINE_STAGES: Array<{ stage: string; label: string; accent: string }> = [
  { stage: 'lead',              label: 'Lead',              accent: 'bg-portal-row-hover text-portal-text'       },
  { stage: 'consultation',      label: 'Consultation',      accent: 'bg-portal-blue-lt text-portal-blue'         },
  { stage: 'proposal',          label: 'Proposal',          accent: 'bg-portal-blue-lt text-portal-blue'   },
  { stage: 'onboarding',        label: 'Onboarding',        accent: 'bg-portal-amber-lt text-portal-amber'     },
  { stage: 'active',            label: 'Active',            accent: 'bg-portal-green-lt text-portal-green' },
  { stage: 'renewal',           label: 'Renewal',           accent: 'bg-portal-amber-lt text-portal-amber'     },
  { stage: 'dormant',           label: 'Dormant',           accent: 'bg-portal-red-lt text-portal-red'       },
]

export const metadata: Metadata = { title: 'Pipeline — Admin' }
export const dynamic  = 'force-dynamic'

export default async function PipelinePage() {
  await requireAdmin()
  const supabase = createAdminClient()

  // Same data shape the list page reads. Tally placements per advertiser
  // so each column shows recurring revenue, not just headcount.
  const [accountsRes, placementsRes] = await Promise.all([
    supabase
      .from('advertiser_accounts')
      .select('id, business_name, slug, lifecycle_stage, loyalty_tier, package_tier, contract_end_date, contact_name, contact_email')
      .order('business_name', { ascending: true }),
    supabase
      .from('ad_placements')
      .select('advertiser_account_id, is_active, archived_at, price_monthly'),
  ])

  type Account = {
    id: string; business_name: string; slug: string | null;
    lifecycle_stage: string | null; loyalty_tier: string | null;
    package_tier: string | null; contract_end_date: string | null;
    contact_name: string | null; contact_email: string | null
  }
  const accounts = (accountsRes.data ?? []) as Account[]

  const revenueByAdv = new Map<string, number>()
  for (const p of (placementsRes.data ?? []) as Array<{ advertiser_account_id: string | null; is_active: boolean | null; archived_at: string | null; price_monthly: number | null }>) {
    if (!p.advertiser_account_id) continue
    if (!p.is_active || p.archived_at) continue
    revenueByAdv.set(p.advertiser_account_id, (revenueByAdv.get(p.advertiser_account_id) ?? 0) + (p.price_monthly ?? 0))
  }

  // Bucket every advertiser by stage. Stages not in PIPELINE_STAGES
  // (e.g. 'upgrade-ready', 'sponsor-qualified') roll into the closest
  // logical column so the kanban stays honest.
  const STAGE_ALIASES: Record<string, string> = {
    'upgrade-ready':     'active',
    'sponsor-qualified': 'active',
    'reactivation':      'renewal',
    'churned':           'dormant',
    'lost':              'dormant',
  }
  const byStage = new Map<string, Account[]>()
  for (const stage of PIPELINE_STAGES) byStage.set(stage.stage, [])
  for (const a of accounts) {
    const raw = a.lifecycle_stage ?? 'lead'
    const stage = STAGE_ALIASES[raw] ?? raw
    if (byStage.has(stage)) byStage.get(stage)!.push(a)
  }

  // Sort each column by recurring revenue desc so the biggest buyers
  // surface at the top of every bucket.
  for (const col of byStage.values()) {
    col.sort((a, b) => (revenueByAdv.get(b.id) ?? 0) - (revenueByAdv.get(a.id) ?? 0))
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="bg-white border-b border-portal-border px-6 py-4 shrink-0">
        <h1 className="text-xl font-semibold text-portal-text">Pipeline</h1>
        <p className="text-xs text-portal-sub mt-0.5">
          Every advertiser, bucketed by lifecycle stage. Cards sorted by recurring monthly revenue.
        </p>
      </div>

      <div className="bg-white border-b border-portal-border px-6 shrink-0">
        <div className="flex items-center gap-1">
          {TABS.map(tab => (
            <a key={tab}
              href={tab === 'Active Advertisers' ? '/admin/advertisers' :
                    tab === 'Pipeline'           ? '/admin/advertisers/pipeline' :
                                                   '/admin/advertisers/duplicates'}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 ${
                tab === 'Pipeline'
                  ? 'text-portal-blue border-portal-blue'
                  : 'text-portal-sub hover:text-portal-text border-transparent hover:border-portal-border-2'
              }`}>
              {tab}
            </a>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-x-auto bg-portal-bg p-4">
        <div className="flex gap-3 min-w-max">
          {PIPELINE_STAGES.map(col => {
            const members = byStage.get(col.stage) ?? []
            const colRev  = members.reduce((s, a) => s + (revenueByAdv.get(a.id) ?? 0), 0)
            return (
              <section key={col.stage} className="w-72 shrink-0 bg-white rounded-lg border border-portal-border overflow-hidden flex flex-col">
                <header className={`px-3 py-2 ${col.accent} flex items-center justify-between`}>
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-wider">{col.label}</p>
                    <p className="text-[10px] opacity-70 inline-flex items-center gap-1">
                      <Building2 size={9} /> {members.length} · <DollarSign size={9} />{colRev.toLocaleString()} /mo
                    </p>
                  </div>
                </header>
                <div className="flex-1 overflow-y-auto divide-y divide-portal-border max-h-[calc(100vh-220px)]">
                  {members.length === 0 ? (
                    <p className="text-xs text-portal-muted italic p-3">No businesses here.</p>
                  ) : (
                    members.map(a => (
                      <Link key={a.id} href={`/admin/advertisers/${a.id}`}
                        className="block px-3 py-2.5 hover:bg-portal-bg transition-colors">
                        <p className="text-sm font-bold text-portal-text leading-tight truncate">{a.business_name}</p>
                        <div className="flex items-center gap-2 text-[11px] text-portal-sub mt-0.5 flex-wrap">
                          {(revenueByAdv.get(a.id) ?? 0) > 0 && (
                            <span className="font-bold text-portal-text tabular-nums">${(revenueByAdv.get(a.id) ?? 0).toLocaleString()}/mo</span>
                          )}
                          {a.package_tier && <span>{a.package_tier}</span>}
                        </div>
                        {a.contact_name && (
                          <p className="text-[10px] text-portal-sub truncate mt-0.5">{a.contact_name}</p>
                        )}
                      </Link>
                    ))
                  )}
                </div>
              </section>
            )
          })}
        </div>
      </div>
    </div>
  )
}
