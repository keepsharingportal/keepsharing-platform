// /admin/directories — one place for everything directory-related.
// Tiles link to:
//   - Each guide's listings editor (existing /admin/guides/[slug]/listings)
//   - The unified onboarding queue (above)
//   - CSV import + merge tool
//   - Pricing / featured-tier signup analytics (coming next)

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { ArrowLeft, BookOpen, Upload, Sparkles, Star, ArrowRight, Tag } from 'lucide-react'

export const metadata: Metadata = { title: 'Directories — Admin' }
export const dynamic = 'force-dynamic'

export default async function DirectoriesHubPage() {
  await requireAdmin()
  const sb = createAdminClient()

  // Counts for the tiles + analytics
  const sevenDaysAgo  = new Date(Date.now() - 7  * 86_400_000).toISOString()
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000).toISOString()

  const [
    { data: guides },
    listingsCount,
    onboardingCount,
    featuredCount,
    signups7d,
    signups30d,
    statusBreakdown,
  ] = await Promise.all([
    sb.from('guide_types').select('slug, display_name, url_slug').order('display_order'),
    sb.from('guide_listings').select('id', { count: 'exact', head: true }).eq('is_published', true),
    sb.from('advertiser_accounts').select('id', { count: 'exact', head: true })
      .in('onboarding_status', ['self_signup', 'invited', 'in_progress']),
    sb.from('guide_listings').select('id', { count: 'exact', head: true })
      .in('listing_tier', ['featured', 'tier-1-featured-listing', 'tier-2-spotlight', 'tier-3-business-spotlight']),
    // New signups (advertiser_accounts created in window)
    sb.from('advertiser_accounts').select('id', { count: 'exact', head: true })
      .gte('created_at', sevenDaysAgo),
    sb.from('advertiser_accounts').select('id', { count: 'exact', head: true })
      .gte('created_at', thirtyDaysAgo),
    // Status breakdown — funnel from signup → published
    sb.from('advertiser_accounts').select('onboarding_status').limit(5000),
  ])

  // Conversion funnel — count each stage
  type StatusRow = { onboarding_status: string | null }
  const statusCounts: Record<string, number> = {}
  for (const r of (statusBreakdown.data ?? []) as StatusRow[]) {
    const k = r.onboarding_status ?? 'admin_managed'
    statusCounts[k] = (statusCounts[k] ?? 0) + 1
  }
  const totalSignups   = Object.values(statusCounts).reduce((a, b) => a + b, 0)
  const submittedCount = statusCounts['submitted'] ?? 0
  const inProgressN    = statusCounts['in_progress'] ?? 0
  const completionPct  = totalSignups > 0
    ? Math.round(((submittedCount + (statusCounts['admin_managed'] ?? 0)) / totalSignups) * 100)
    : 0

  return (
    <div className="flex-1 overflow-y-auto bg-portal-bg">
      <div className="bg-white border-b border-portal-border px-6 py-4">
        <Link href="/admin" className="text-[11px] font-semibold text-portal-sub hover:text-portal-text inline-flex items-center gap-1 mb-1">
          <ArrowLeft size={11} /> Admin
        </Link>
        <h1 className="text-[18px] font-bold text-portal-text inline-flex items-center gap-2">
          <BookOpen size={16} /> Directories
        </h1>
        <p className="text-[12px] text-portal-sub mt-1">
          All things directories — every published guide, the listings inside them, the businesses that own them, and the tools for onboarding new ones.
        </p>
      </div>

      <div className="p-6 max-w-5xl space-y-5">

        {/* Analytics strip — signups, funnel, featured count */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <Metric label="Signups · 7d"  value={signups7d.count ?? 0}  tone="bg-portal-blue-lt text-portal-blue" />
          <Metric label="Signups · 30d" value={signups30d.count ?? 0} tone="bg-portal-blue-lt text-portal-blue" />
          <Metric label="In progress"   value={inProgressN}            tone="bg-purple-50 text-purple-800" />
          <Metric label="Submitted"     value={submittedCount}         tone="bg-portal-green-lt text-portal-green" />
          <Metric label="Completion %"  value={`${completionPct}%`}    tone="bg-amber-50 text-amber-800" />
        </div>

        {/* Top action tiles */}
        <div className="grid sm:grid-cols-3 gap-3">
          <ActionTile
            href="/admin/directories/onboarding"
            icon={Sparkles}
            title="Onboarding Queue"
            count={onboardingCount.count ?? 0}
            hint="Self-signups, invited businesses, in-progress edits."
          />
          <ActionTile
            href="/admin/content/guide-listings-import"
            icon={Upload}
            title="Bulk CSV Import"
            count={null}
            hint="Insert or merge listings from CSV. Editable column mapping + advertiser backfill."
          />
          <ActionTile
            href="/admin/advertisers"
            icon={Star}
            title="Featured Partners"
            count={featuredCount.count ?? 0}
            hint="Every advertiser at a featured tier across any guide."
          />
        </div>

        {/* Per-guide tile grid */}
        <div>
          <h2 className="text-[12px] font-bold uppercase tracking-widest text-portal-muted mb-2">Guides</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {(guides ?? []).map(g => (
              <Link
                key={g.slug}
                href={`/admin/guides/${g.url_slug}/listings`}
                className="bg-white border border-portal-border rounded-lg p-4 hover:border-portal-blue/40 transition-colors block relative"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-9 h-9 rounded-lg bg-portal-bg text-portal-navy flex items-center justify-center">
                    <BookOpen size={16} />
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-[14px] font-bold text-portal-text mb-1">
                  {g.display_name} <ArrowRight size={12} className="text-portal-sub" />
                </div>
                <p className="text-[11px] text-portal-sub leading-relaxed">
                  Edit listings, categories, and the public guide page.
                </p>
              </Link>
            ))}
          </div>
        </div>

        {/* Footer info */}
        <div className="bg-white border border-portal-border rounded-lg p-4 mt-4">
          <div className="text-[12px] font-bold text-portal-text mb-1 inline-flex items-center gap-1.5">
            <Tag size={12} className="text-portal-blue" /> Sponsorship funnel
          </div>
          <p className="text-[11px] text-portal-sub leading-relaxed">
            Direct businesses to <code>/advertise/get-listed</code> (paid featured tier via Stripe Checkout) or{' '}
            <code>/advertise/get-started</code> (free directory listing). Both flows email a wizard link
            after signup so the business can fill out their listing without admin help.
          </p>
        </div>

        <div className="text-[10px] text-portal-muted">
          {listingsCount.count ?? 0} published listings across {(guides ?? []).length} guides.
        </div>
      </div>
    </div>
  )
}

function Metric({ label, value, tone }: { label: string; value: string | number; tone: string }) {
  return (
    <div className={`rounded-lg p-3 border border-portal-border bg-white`}>
      <div className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest mb-1 ${tone}`}>
        {label}
      </div>
      <div className="text-[22px] font-black text-portal-text tabular-nums leading-none mt-1">{value}</div>
    </div>
  )
}

function ActionTile({ href, icon: Icon, title, count, hint }: {
  href: string
  icon: React.ElementType
  title: string
  count: number | null
  hint: string
}) {
  return (
    <Link href={href}
      className="bg-white border border-portal-border rounded-lg p-4 hover:border-portal-blue/40 transition-colors block">
      <div className="flex items-center justify-between mb-2">
        <div className="w-9 h-9 rounded-lg bg-portal-bg text-portal-navy flex items-center justify-center">
          <Icon size={16} />
        </div>
        {count != null && <span className="text-[20px] font-black text-portal-text">{count}</span>}
      </div>
      <div className="flex items-center gap-1.5 text-[14px] font-bold text-portal-text mb-1">
        {title} <ArrowRight size={12} className="text-portal-sub" />
      </div>
      <p className="text-[11px] text-portal-sub leading-relaxed">{hint}</p>
    </Link>
  )
}
