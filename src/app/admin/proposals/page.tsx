import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import type { Metadata } from 'next'
import { TIER_LABELS } from '@/lib/proposal-templates'

export const metadata: Metadata = { title: 'Proposals — Admin' }

const STATUS_COLORS: Record<string, string> = {
  draft:    'bg-gray-100 text-gray-600',
  sent:     'bg-blue-50 text-blue-600',
  viewed:   'bg-amber-50 text-amber-600',
  accepted: 'bg-green-50 text-green-700',
  declined: 'bg-red-50 text-red-600',
  expired:  'bg-gray-50 text-gray-400',
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
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Proposals</h1>
          <p className="text-sm text-gray-500 mt-0.5">{(proposals ?? []).length} total</p>
        </div>
        <Link href="/admin/proposals/new" className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors">
          + New Proposal
        </Link>
      </div>

      <div className="p-6">
        {(!proposals || proposals.length === 0) ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <p className="text-gray-500 mb-4">No proposals yet.</p>
            <Link href="/admin/proposals/new" className="px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700">
              Create your first proposal
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Business</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tier</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Views</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Created</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {proposals.map(p => {
                  const isExpired = p.expires_at && new Date(p.expires_at) < new Date() && p.status !== 'accepted'
                  const displayStatus = isExpired && p.status !== 'accepted' ? 'expired' : p.status
                  return (
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-900">{p.business_name}</div>
                        {p.contact_email && <div className="text-xs text-gray-400">{p.contact_email}</div>}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-gray-600">{p.recommended_tier ? TIER_LABELS[p.recommended_tier]?.split(' — ')[0] ?? p.recommended_tier : '—'}</span>
                        {p.custom_monthly_price && <div className="text-xs text-gray-400">${Number(p.custom_monthly_price).toLocaleString()}/mo</div>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[displayStatus] ?? 'bg-gray-100 text-gray-600'}`}>
                          {displayStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs">{p.viewed_count ?? 0}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{new Date(p.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Link href={`/admin/proposals/${p.id}`} className="text-xs text-blue-600 hover:text-blue-800 font-medium">Edit</Link>
                          <Link href={`/proposal/${p.token_slug}`} target="_blank" className="text-xs text-gray-400 hover:text-gray-600">View ↗</Link>
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
