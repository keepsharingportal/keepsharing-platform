// /admin/directories/onboarding — review queue for the wizard-driven
// onboarding flow. Shows self-signups, in-progress edits, invited
// businesses so the editor can see the full pipeline at a glance.

import type { Metadata } from 'next'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/admin/auth'
import { ExternalLink, Sparkles, Send, UserPlus, Edit, CheckCircle2 } from 'lucide-react'

export const metadata: Metadata = { title: 'Onboarding Queue — Admin' }
export const dynamic = 'force-dynamic'

interface Props {
  searchParams: Promise<{ status?: string }>
}

const STATUSES = [
  { key: 'all',           label: 'All',            color: 'bg-portal-bg text-portal-text border-portal-border' },
  { key: 'self_signup',   label: 'Self-signups',   color: 'bg-amber-50 text-amber-800 border-amber-200', Icon: UserPlus },
  { key: 'invited',       label: 'Invited',        color: 'bg-portal-blue-lt text-portal-blue border-portal-blue/30', Icon: Send },
  { key: 'in_progress',   label: 'In progress',    color: 'bg-purple-50 text-purple-800 border-purple-200', Icon: Edit },
  { key: 'submitted',     label: 'Submitted',      color: 'bg-portal-green-lt text-portal-green border-portal-green/30', Icon: CheckCircle2 },
  { key: 'admin_managed', label: 'Admin-managed',  color: 'bg-portal-bg text-portal-sub border-portal-border', Icon: Sparkles },
] as const

export default async function OnboardingQueuePage({ searchParams }: Props) {
  await requireAdmin()
  const { status } = await searchParams
  const filter = (STATUSES.find(s => s.key === status) ? status : 'all') ?? 'all'

  const sb = createAdminClient()
  let q = sb
    .from('advertiser_accounts')
    .select('id, business_name, slug, contact_email, onboarding_status, onboarding_token, onboarding_token_issued_at, onboarding_token_expires_at, created_at')
    .order('created_at', { ascending: false })
    .limit(200)
  if (filter !== 'all') q = q.eq('onboarding_status', filter)
  const { data: rows } = await q

  const { data: countRows } = await sb
    .from('advertiser_accounts')
    .select('onboarding_status')
    .limit(5000)
  const counts: Record<string, number> = {}
  for (const r of (countRows ?? []) as Array<{ onboarding_status: string | null }>) {
    const k = r.onboarding_status ?? 'admin_managed'
    counts[k] = (counts[k] ?? 0) + 1
  }
  const total = (countRows ?? []).length

  return (
    <div className="flex-1 overflow-y-auto bg-portal-bg">
      <div className="bg-white border-b border-portal-border px-6 py-4">
        <Link href="/admin/directories" className="text-[11px] font-semibold text-portal-sub hover:text-portal-text inline-block mb-1">
          ← Directories
        </Link>
        <h1 className="text-[18px] font-bold text-portal-text inline-flex items-center gap-2">
          <Sparkles size={16} /> Onboarding Queue
        </h1>
        <p className="text-[12px] text-portal-sub mt-1">
          Every advertiser in the wizard pipeline. Click any row to open their wizard or live listing.
        </p>

        <div className="mt-3 flex items-center gap-1.5 flex-wrap">
          {STATUSES.map(s => {
            const count = s.key === 'all' ? total : (counts[s.key] ?? 0)
            const active = filter === s.key
            return (
              <Link
                key={s.key}
                href={`/admin/directories/onboarding?status=${s.key}`}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold rounded border transition-colors ${
                  active ? 'bg-portal-navy text-white border-portal-navy' : s.color + ' hover:opacity-80'
                }`}
              >
                {s.label}
                <span className={`text-[10px] tabular-nums ${active ? 'text-white/80' : 'opacity-70'}`}>{count}</span>
              </Link>
            )
          })}
        </div>
      </div>

      <div className="p-6 max-w-6xl">
        <div className="bg-white border border-portal-border rounded-lg overflow-hidden">
          <table className="w-full text-[12px]">
            <thead className="bg-portal-bg border-b border-portal-border">
              <tr className="text-left">
                <th className="px-3 py-2 text-[10px] font-bold uppercase text-portal-sub">Business</th>
                <th className="px-3 py-2 text-[10px] font-bold uppercase text-portal-sub">Email</th>
                <th className="px-3 py-2 text-[10px] font-bold uppercase text-portal-sub">Status</th>
                <th className="px-3 py-2 text-[10px] font-bold uppercase text-portal-sub">Token</th>
                <th className="px-3 py-2 text-[10px] font-bold uppercase text-portal-sub">Created</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {(rows ?? []).length === 0 && (
                <tr><td colSpan={6} className="px-3 py-12 text-center text-portal-sub">
                  No advertisers match this filter yet.
                </td></tr>
              )}
              {(rows ?? []).map(r => {
                const meta = STATUSES.find(s => s.key === r.onboarding_status) ?? STATUSES[5]
                const isExpired = r.onboarding_token_expires_at
                  ? new Date(r.onboarding_token_expires_at).getTime() < Date.now()
                  : false
                return (
                  <tr key={r.id} className="border-b border-portal-border last:border-b-0 hover:bg-portal-bg">
                    <td className="px-3 py-2">
                      <Link href={`/admin/advertisers/${r.id}/onboarding`} className="font-bold text-portal-text hover:text-portal-blue">
                        {r.business_name}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-portal-sub truncate max-w-[200px]">{r.contact_email ?? '—'}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold uppercase rounded border ${meta.color}`}>
                        {meta.label}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-portal-muted text-[10px]">
                      {r.onboarding_token
                        ? (isExpired ? <span className="text-portal-red">expired</span> : <span className="text-portal-green">active</span>)
                        : '—'}
                    </td>
                    <td className="px-3 py-2 text-portal-muted text-[10px]">
                      {r.created_at ? new Date(r.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <Link href={`/admin/advertisers/${r.id}/onboarding`}
                        className="text-portal-blue hover:underline text-[10px] font-bold mr-3">
                        Open wizard
                      </Link>
                      {r.slug && (
                        <a href={`/admin/go/birthday-party-guide/listings/${r.slug}`} target="_blank" rel="noopener noreferrer"
                          className="text-portal-sub hover:text-portal-blue text-[10px] font-bold inline-flex items-center gap-0.5">
                          Live <ExternalLink size={9} />
                        </a>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
