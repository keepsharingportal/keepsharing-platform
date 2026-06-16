// ── /admin/campaigns — Themed campaign list ──────────────────────────

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { listCampaigns } from '@/lib/campaigns'
import { getSeoAllowedBrands } from '@/lib/seo/admin-scope'
import { Plus, ArrowRight, Calendar as CalendarIcon, Layers } from 'lucide-react'

export const metadata: Metadata = { title: 'Campaigns — Admin' }
export const dynamic = 'force-dynamic'

interface Props {
  searchParams: Promise<{ brand?: string; status?: string }>
}

export default async function CampaignsListPage({ searchParams }: Props) {
  const ctx = await requireAdmin()
  const sp = await searchParams
  const allowed = getSeoAllowedBrands(ctx)
  const allowedSlugs = allowed.map(m => m.slug)
  const brandSlug = sp.brand && allowedSlugs.includes(sp.brand) ? sp.brand : null

  const sb = createAdminClient()
  const all = await listCampaigns(sb, brandSlug)
  // Filter to allowed brands when no specific brand is selected.
  const campaigns = brandSlug ? all : all.filter(c => allowedSlugs.includes(c.brandSlug))

  const status = sp.status ?? 'all'
  const filtered = status === 'all' ? campaigns : campaigns.filter(c => c.status === status)

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="bg-white border-b border-portal-border px-6 py-4 shrink-0 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-[18px] font-bold text-portal-text">
            <Layers size={16} className="inline -translate-y-0.5 mr-1" /> Themed Campaigns
          </h1>
          <p className="text-[12px] text-portal-sub mt-1">
            Coordinated editorial + marketing pushes around a monthly theme. Each campaign carries an AI-generated
            brief, linked articles, sponsor list, and an optional public landing page.
          </p>
        </div>
        <Link
          href="/admin/campaigns/new"
          className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold text-white bg-portal-navy rounded-lg hover:opacity-90"
        >
          <Plus size={14} /> New campaign
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto bg-portal-bg">
        <div className="px-6 py-6 space-y-4">

          {/* Filters */}
          <div className="flex gap-1.5 flex-wrap">
            {[{ k: 'all', l: 'All' }, { k: 'planning', l: 'Planning' }, { k: 'active', l: 'Active' }, { k: 'published', l: 'Published' }, { k: 'archived', l: 'Archived' }].map(s => (
              <Link
                key={s.k}
                href={`/admin/campaigns?status=${s.k}${brandSlug ? `&brand=${brandSlug}` : ''}`}
                className={`px-3 py-1.5 rounded-full text-[12px] font-bold border ${
                  status === s.k ? 'bg-portal-navy text-white border-portal-navy' : 'bg-white text-portal-text border-portal-border hover:bg-portal-bg'
                }`}
              >{s.l}</Link>
            ))}
          </div>

          {/* List */}
          {filtered.length === 0 ? (
            <div className="bg-white border border-portal-border rounded-lg p-6 text-center text-portal-sub text-[13px]">
              No campaigns in <strong>{status}</strong>. <Link href="/admin/campaigns/new" className="text-portal-blue font-bold">Create one</Link>.
            </div>
          ) : (
            <div className="space-y-2.5">
              {filtered.map(c => (
                <Link
                  key={c.id}
                  href={`/admin/campaigns/${c.id}`}
                  className="bg-white border border-portal-border rounded-lg p-4 hover:border-portal-blue/40 transition-colors block"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 rounded bg-portal-bg shrink-0 flex flex-col items-center justify-center text-portal-text">
                      <CalendarIcon size={16} className="text-portal-sub mb-0.5" />
                      <span className="text-[11px] font-bold uppercase">{new Date(c.month + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' })}</span>
                      <span className="text-[10px] text-portal-sub">{new Date(c.month + 'T00:00:00Z').toLocaleDateString('en-US', { year: 'numeric', timeZone: 'UTC' })}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <code className="text-[10px] text-portal-sub">{c.brandSlug}</code>
                        <StatusPill status={c.status} />
                      </div>
                      <div className="text-[15px] font-bold text-portal-text">{c.themeTitle}</div>
                      {c.heroTagline && <div className="text-[12px] text-portal-sub mt-0.5">{c.heroTagline}</div>}
                      {c.targetKeywords.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {c.targetKeywords.slice(0, 4).map(k => (
                            <span key={k} className="text-[10px] px-1.5 py-0.5 bg-portal-bg text-portal-sub rounded">{k}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <ArrowRight size={14} className="text-portal-sub mt-1 shrink-0" />
                  </div>
                </Link>
              ))}
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

function StatusPill({ status }: { status: string }) {
  const cls = status === 'active'    ? 'bg-portal-green-lt text-portal-green'
            : status === 'published' ? 'bg-portal-blue-lt text-portal-blue'
            : status === 'archived'  ? 'bg-portal-bg text-portal-sub'
            :                          'bg-portal-amber-lt text-portal-amber'
  return <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${cls}`}>{status}</span>
}
