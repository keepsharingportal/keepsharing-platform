// ── /admin/analytics ────────────────────────────────────────────────────────
// Index of first-party analytics surfaces. Plausible covers the marketing-
// style stats (referrers, country, device, top external links) — these
// reports lean into joins Plausible can't do natively: which articles
// are getting read, which pages drive listing taps, etc.

import type { Metadata } from 'next'
import Link from 'next/link'
import { BarChart3, FileText, Newspaper, ChevronRight, ExternalLink } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/admin'

export const metadata: Metadata = { title: 'Analytics — Admin' }
export const dynamic = 'force-dynamic'

interface TileProps {
  href:        string
  icon:        React.ElementType
  title:       string
  description: string
  stat?:       { label: string; value: string | number }
}

function Tile({ href, icon: Icon, title, description, stat }: TileProps) {
  return (
    <Link
      href={href}
      className="block bg-white border border-portal-border rounded-lg p-5 hover:shadow-md hover:border-portal-blue/40 transition-all group"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="w-10 h-10 rounded-lg bg-portal-blue-lt flex items-center justify-center text-portal-blue">
          <Icon size={18} />
        </div>
        <ChevronRight size={16} className="text-portal-border-2 group-hover:text-portal-blue transition-colors" />
      </div>
      <h2 className="text-sm font-bold text-portal-text mb-1">{title}</h2>
      <p className="text-xs text-portal-sub leading-snug">{description}</p>
      {stat && (
        <p className="mt-3 pt-3 border-t border-portal-border text-[11px] text-portal-muted">
          <span className="font-bold text-portal-text">{typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}</span>
          {' '}{stat.label}
        </p>
      )}
    </Link>
  )
}

const PLAUSIBLE_DOMAIN = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN

export default async function AnalyticsIndexPage() {
  const supabase = createAdminClient()

  // Quick stats for the header — last 30 days, since most reports default
  // there. Catch errors so a missing migration on one source doesn't
  // empty the whole page.
  const since30 = new Date(); since30.setUTCDate(since30.getUTCDate() - 29)
  const sinceIso = since30.toISOString()

  const [pageViews30, articleViews30] = await Promise.all([
    supabase.from('page_views').select('id', { count: 'exact', head: true }).gte('viewed_at', sinceIso),
    supabase.from('article_views').select('id', { count: 'exact', head: true }).gte('viewed_at', sinceIso),
  ])

  return (
    <div className="flex-1 overflow-y-auto bg-portal-bg">
      <div className="bg-white border-b border-portal-border px-6 py-4">
        <h1 className="portal-page-title">Analytics</h1>
        <p className="portal-page-subtitle">First-party reporting on the public site. Plausible covers marketing stats; these reports go deeper into our own data.</p>
      </div>

      <div className="p-6 max-w-5xl">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Tile
            href="/admin/analytics/pages"
            icon={BarChart3}
            title="Top pages"
            description="Most-visited pages site-wide. Filterable by date range — see what readers are clicking the most this week, month, or quarter."
            stat={{ label: 'page views · last 30 days', value: pageViews30.count ?? 0 }}
          />
          <Tile
            href="/admin/analytics/articles"
            icon={Newspaper}
            title="Top articles"
            description="Most-viewed published articles by section + column. Drives editorial decisions: what stories to commission more of."
            stat={{ label: 'article views · last 30 days', value: articleViews30.count ?? 0 }}
          />
          <Tile
            href="/admin/school-news/schools/report"
            icon={FileText}
            title="School engagement"
            description="Per-school reader opens + clicks. Tells you which communities are most engaged and where outreach is needed."
          />
        </div>

        {/* Plausible embed / link-out */}
        <section className="mt-8">
          <div className="bg-white border border-portal-border rounded-lg p-5">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <h2 className="text-sm font-bold text-portal-text">Plausible (marketing analytics)</h2>
                <p className="text-xs text-portal-sub mt-1 leading-relaxed">
                  Where readers came from, country/device breakdown, top external links, conversion funnels.
                  Lives at plausible.io — the script is loaded site-wide.
                </p>
              </div>
              {PLAUSIBLE_DOMAIN && (
                <a
                  href={`https://plausible.io/${encodeURIComponent(PLAUSIBLE_DOMAIN)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 bg-portal-blue text-white rounded-lg hover:bg-portal-blue/90 shrink-0"
                >
                  Open Plausible <ExternalLink size={11} />
                </a>
              )}
            </div>
            {!PLAUSIBLE_DOMAIN && (
              <p className="text-[11px] text-portal-amber bg-portal-amber-lt border border-portal-amber/30 rounded-lg px-2.5 py-1.5 inline-flex items-center gap-1">
                Set <code className="font-mono">NEXT_PUBLIC_PLAUSIBLE_DOMAIN</code> in env to enable the Plausible link-out.
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
