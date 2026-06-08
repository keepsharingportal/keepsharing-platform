import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { TIER_LABELS } from '@/lib/proposal-templates'

interface Props { params: Promise<{ id: string }> }

export default async function ProposalDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: p } = await supabase
    .from('proposals')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (!p) notFound()

  const valueProps = Array.isArray(p.value_props) ? p.value_props as string[] : []

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="bg-white border-b border-portal-border px-6 py-4 flex items-center justify-between">
        <div>
          <Link href="/admin/proposals" className="text-xs text-portal-blue hover:text-portal-blue">← All Proposals</Link>
          <h1 className="text-xl font-semibold text-portal-text mt-1">{p.business_name}</h1>
          <p className="text-sm text-portal-sub">Status: <strong>{p.status}</strong> · {p.viewed_count ?? 0} views · Created {new Date(p.created_at).toLocaleDateString()}</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href={`/proposal/${p.token_slug}`} target="_blank" className="px-4 py-2 text-sm font-semibold border border-portal-border-2 rounded-lg text-portal-text hover:bg-portal-bg">
            View Public Page ↗
          </Link>
        </div>
      </div>

      <div className="p-6 max-w-3xl">
        {/* View tracking */}
        <div className="bg-white rounded-lg border border-portal-border p-5 mb-5">
          <h2 className="text-sm font-semibold text-portal-sub uppercase tracking-wider mb-4">Tracking</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-portal-text">{p.viewed_count ?? 0}</div>
              <div className="text-xs text-portal-muted uppercase tracking-wider">Views</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-semibold text-portal-text">{p.viewed_at ? new Date(p.viewed_at).toLocaleDateString() : '—'}</div>
              <div className="text-xs text-portal-muted uppercase tracking-wider">First viewed</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-semibold text-portal-text">{p.accepted_at ? new Date(p.accepted_at).toLocaleDateString() : '—'}</div>
              <div className="text-xs text-portal-muted uppercase tracking-wider">Accepted</div>
            </div>
          </div>
        </div>

        {/* Proposal summary */}
        <div className="bg-white rounded-lg border border-portal-border p-5 mb-5">
          <h2 className="text-sm font-semibold text-portal-sub uppercase tracking-wider mb-4">Proposal Summary</h2>
          <div className="space-y-3 text-sm">
            <div className="flex gap-3"><span className="text-portal-muted w-32 shrink-0">Business</span><span className="text-portal-text">{p.business_name}</span></div>
            <div className="flex gap-3"><span className="text-portal-muted w-32 shrink-0">Contact</span><span className="text-portal-text">{[p.contact_first_name, p.contact_last_name].filter(Boolean).join(' ') || '—'}</span></div>
            <div className="flex gap-3"><span className="text-portal-muted w-32 shrink-0">Email</span><span className="text-portal-text">{p.contact_email ?? '—'}</span></div>
            <div className="flex gap-3"><span className="text-portal-muted w-32 shrink-0">Tier</span><span className="text-portal-text">{p.recommended_tier ? (TIER_LABELS[p.recommended_tier] ?? p.recommended_tier) : '—'}</span></div>
            <div className="flex gap-3"><span className="text-portal-muted w-32 shrink-0">Price</span><span className="text-portal-text">{p.custom_monthly_price ? `$${Number(p.custom_monthly_price).toLocaleString()}/mo × ${p.contract_length_months ?? 12} months` : '—'}</span></div>
            <div className="flex gap-3"><span className="text-portal-muted w-32 shrink-0">Expires</span><span className="text-portal-text">{p.expires_at ? new Date(p.expires_at).toLocaleDateString() : '—'}</span></div>
          </div>
        </div>

        {/* Value props */}
        {valueProps.length > 0 && (
          <div className="bg-white rounded-lg border border-portal-border p-5 mb-5">
            <h2 className="text-sm font-semibold text-portal-sub uppercase tracking-wider mb-4">Value Props</h2>
            <ol className="space-y-2 text-sm text-portal-text">
              {valueProps.map((v, i) => <li key={i} className="flex gap-2"><span className="text-portal-muted shrink-0">{i + 1}.</span>{v}</li>)}
            </ol>
          </div>
        )}

        {/* Public link */}
        <div className="bg-portal-blue-lt rounded-lg border border-blue-200 p-4">
          <p className="text-xs font-semibold text-portal-blue mb-1">Proposal URL</p>
          <code className="text-sm text-portal-blue break-all">/proposal/{p.token_slug}</code>
          <p className="text-xs text-portal-blue mt-1">Send this URL to {p.business_name} to let them view and accept.</p>
        </div>
      </div>
    </div>
  )
}
