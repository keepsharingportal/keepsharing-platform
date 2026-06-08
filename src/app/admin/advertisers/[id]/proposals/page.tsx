// /admin/advertisers/[id]/proposals — Proposals & Agreements tab.
// All proposals for this business (FK-linked once migration 132 is
// applied; name-match fallback before then). Agreements is a stub
// section pointing to the future concept — currently agreements are
// tracked indirectly via contract_end_date + GHL flags.

import type { Metadata } from 'next'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/admin/auth'
import { FileText, ArrowRight, Plus, FileCheck2 } from 'lucide-react'

export const metadata: Metadata = { title: 'Proposals — Business — Admin' }
export const dynamic  = 'force-dynamic'

interface Props { params: Promise<{ id: string }> }

function fmtDate(d: string | null): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

type ProposalRow = {
  id: string; token_slug: string; status: string | null;
  recommended_tier: string | null; custom_monthly_price: number | null;
  sent_at: string | null; viewed_at: string | null; accepted_at: string | null;
  expires_at: string | null; created_at: string;
}

export default async function ProposalsTab({ params }: Props) {
  await requireAdmin()
  const { id } = await params

  const supabase = createAdminClient()
  const { data: acct } = await supabase
    .from('advertiser_accounts')
    .select('business_name, contract_start_date, contract_end_date')
    .eq('id', id)
    .maybeSingle()
  const name             = String(acct?.business_name ?? '')
  const contractStart    = acct?.contract_start_date ?? null
  const contractEnd      = acct?.contract_end_date ?? null

  // FK-first proposals query with name-match fallback (migration 132
  // tolerance). Dedupe by id when both queries succeed.
  const [fkRes, nameRes] = await Promise.all([
    supabase.from('proposals')
      .select('id, token_slug, status, recommended_tier, custom_monthly_price, sent_at, viewed_at, accepted_at, expires_at, created_at')
      .eq('advertiser_account_id', id)
      .order('created_at', { ascending: false }),
    supabase.from('proposals')
      .select('id, token_slug, status, recommended_tier, custom_monthly_price, sent_at, viewed_at, accepted_at, expires_at, created_at')
      .ilike('business_name', name)
      .order('created_at', { ascending: false }),
  ])
  const fkRows   = (fkRes.error   ? [] : (fkRes.data   ?? [])) as ProposalRow[]
  const nameRows = (nameRes.error ? [] : (nameRes.data ?? [])) as ProposalRow[]
  const seenIds  = new Set(fkRows.map(r => r.id))
  const proposals = [...fkRows, ...nameRows.filter(r => !seenIds.has(r.id))]

  const stageBadge: Record<string, string> = {
    draft:    'bg-gray-100 text-gray-700',
    sent:     'bg-sky-100 text-sky-800',
    viewed:   'bg-violet-100 text-violet-800',
    accepted: 'bg-emerald-100 text-emerald-800',
    declined: 'bg-rose-100 text-rose-800',
    expired:  'bg-gray-100 text-gray-400',
  }

  return (
    <div className="space-y-6">

      {/* ── Proposals ─────────────────────────────────── */}
      <section className="bg-white rounded-2xl ring-1 ring-gray-200 overflow-hidden">
        <header className="px-5 py-3 border-b border-gray-100 flex items-center justify-between gap-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 inline-flex items-center gap-1.5">
            <FileText size={12} /> Proposals {proposals.length > 0 && <span className="text-gray-400">({proposals.length})</span>}
          </h2>
          <Link
            href={`/admin/advertisers/proposals/new?advertiser_id=${id}`}
            className="inline-flex items-center gap-1 text-xs font-bold text-white bg-portal-navy hover:bg-portal-navy/90 px-2.5 py-1 rounded-full"
          >
            <Plus size={11} /> New Proposal
          </Link>
        </header>
        {proposals.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">
            No proposals yet. <Link href={`/admin/advertisers/proposals/new?advertiser_id=${id}`} className="text-portal-blue font-bold hover:underline">Draft one →</Link>
          </div>
        ) : (
          <ul className="divide-y divide-gray-50">
            {proposals.map(p => {
              const stage = (p.status ?? 'draft').toLowerCase()
              return (
                <li key={p.id}>
                  <Link
                    href={`/admin/advertisers/proposals/${p.id}`}
                    className="px-5 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors"
                  >
                    <FileText size={14} className="text-gray-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {p.recommended_tier ?? 'Untitled proposal'}
                        {p.custom_monthly_price != null && (
                          <span className="ml-2 text-xs font-normal text-gray-500">${p.custom_monthly_price.toLocaleString()}/mo</span>
                        )}
                      </p>
                      <div className="flex items-center gap-3 text-[11px] text-gray-500 mt-0.5 flex-wrap">
                        <code className="font-mono">/{p.token_slug}</code>
                        <span>Created {fmtDate(p.created_at)}</span>
                        {p.sent_at     && <span>Sent {fmtDate(p.sent_at)}</span>}
                        {p.viewed_at   && <span>Viewed {fmtDate(p.viewed_at)}</span>}
                        {p.accepted_at && <span className="text-emerald-700 font-semibold">Accepted {fmtDate(p.accepted_at)}</span>}
                      </div>
                    </div>
                    <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${stageBadge[stage] ?? stageBadge.draft}`}>
                      {stage}
                    </span>
                    <ArrowRight size={12} className="text-gray-300 shrink-0" />
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {/* ── Agreements (stub) ─────────────────────────── */}
      <section className="bg-white rounded-2xl ring-1 ring-gray-200 overflow-hidden">
        <header className="px-5 py-3 border-b border-gray-100 flex items-center justify-between gap-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 inline-flex items-center gap-1.5">
            <FileCheck2 size={12} /> Agreements
            <span className="ml-2 text-[9px] font-normal text-gray-400 normal-case tracking-normal">
              currently tracked via contract dates + GHL flags
            </span>
          </h2>
        </header>
        <div className="p-5 space-y-2 text-sm text-gray-700">
          <p>
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Contract window: </span>
            {fmtDate(contractStart)} → {fmtDate(contractEnd)}
          </p>
          <p className="text-xs text-gray-500 leading-relaxed">
            Dedicated agreement records (PDF uploads, signed-on dates, e-sign tracking) aren&apos;t modeled yet. Today, agreements are reflected by the contract dates above plus the <code className="px-1 bg-gray-100 rounded text-[10px]">ghl_agreement_uploaded</code> flag on the lifecycle pipeline.
          </p>
        </div>
      </section>
    </div>
  )
}
