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

  // Counts for the tiles
  const [
    { data: guides },
    listingsCount,
    onboardingCount,
    featuredCount,
  ] = await Promise.all([
    sb.from('guide_types').select('slug, display_name, url_slug').order('display_order'),
    sb.from('guide_listings').select('id', { count: 'exact', head: true }).eq('is_published', true),
    sb.from('advertiser_accounts').select('id', { count: 'exact', head: true })
      .in('onboarding_status', ['self_signup', 'invited', 'in_progress']),
    sb.from('guide_listings').select('id', { count: 'exact', head: true })
      .in('listing_tier', ['featured', 'tier-1-featured-listing', 'tier-2-spotlight', 'tier-3-business-spotlight']),
  ])

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
