import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import type { Metadata } from 'next'
import { TIER_LABELS } from '@/lib/proposal-templates'

export const metadata: Metadata = { title: 'Proposals — Admin' }

const STATUS_COLORS: Record<string, string> = {
  draft:    'bg-portal-row-hover text-portal-sub',
  sent:     'bg-portal-blue-lt text-portal-blue',
  viewed:   'bg-portal-amber-lt text-portal-amber',
  accepted: 'bg-portal-green-lt text-portal-green',
  declined: 'bg-portal-red-lt text-portal-red',
  expired:  'bg-portal-bg text-portal-muted',
}

export default async function ProposalsPage() {
  const supabase = await createClient()

  const { data: proposals } = await supabase
    .from('proposals')
    .select('id, token_slug, business_name, contact_first_name, contact_email, recommended_tier, custom_monthly_price, status, sent_at, viewed_count, accepted_at, expires_at, created_at')
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="bg-white border-b border-portal-border px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-portal-text">Proposals</h1>
          <p className="text-sm text-portal-sub mt-0.5">{(proposals ?? []).length} total</p>
        </div>
        <Link href="/admin/proposals/new" className="flex items-center gap-2 px-4 py-2 bg-portal-navy text-white text-sm font-semibold rounded-lg hover:opacity-90 transition-colors">
          + New Proposal
        </Link>
      </div>

      <div className="p-6">
        {(!proposals || proposals.length === 0) ? (
          <div className="bg-white rounded-lg border border-portal-border p-12 text-center">
            <p className="text-portal-sub mb-4">No proposals yet.</p>
            <Link href="/admin/proposals/new" className="px-5 py-2.5 bg-portal-navy text-white text-sm font-semibold rounded-lg hover:opacity-90">
              Create your first proposal
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-portal-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-portal-bg border-b border-portal-border">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-portal-sub uppercase tracking-wider">Business</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-portal-sub uppercase tracking-wider">Tier</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-portal-sub uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-portal-sub uppercase tracking-wider">Views</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-portal-sub uppercase tracking-wider">Created</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-portal-sub uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-portal-border">
                {proposals.map(p => {
                  const isExpired = p.expires_at && new Date(p.expires_at) < new Date() && p.status !== 'accepted'
                  const displayStatus = isExpired && p.status !== 'accepted' ? 'expired' : p.status
                  return (
                    <tr key={p.id} className="hover:bg-portal-bg transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-portal-text">{p.business_name}</div>
                        {p.contact_email && <div className="text-xs text-portal-muted">{p.contact_email}</div>}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-portal-sub">{p.recommended_tier ? TIER_LABELS[p.recommended_tier]?.split(' — ')[0] ?? p.recommended_tier : '—'}</span>
                        {p.custom_monthly_price && <div className="text-xs text-portal-muted">${Number(p.custom_monthly_price).toLocaleString()}/mo</div>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[displayStatus] ?? 'bg-portal-row-hover text-portal-sub'}`}>
                          {displayStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-portal-sub text-xs">{p.viewed_count ?? 0}</td>
                      <td className="px-4 py-3 text-portal-muted text-xs">{new Date(p.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Link href={`/admin/proposals/${p.id}`} className="text-xs text-portal-blue hover:text-portal-blue font-medium">Edit</Link>
                          <Link href={`/proposal/${p.token_slug}`} target="_blank" className="text-xs text-portal-muted hover:text-portal-sub">View ↗</Link>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
