// /admin/guides/[slug]/edit
// Per-guide editor — the guide is treated as a digital edition: hero, print
// cover, Issuu flip link, description, CTA, plus read-only summaries of
// connected articles, listings, and the section sponsor.
//
// Schema:
//   guide_types        — display_name, pitch, editorial_intro, short_description, hero_image_url
//   guide_configs      — print_cover_url, issuu_url, homepage_image_url,
//                         primary_cta_label, primary_cta_url, is_active
// Both written via PATCH /api/admin/guides/[slug].

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import { GuideEditClient } from './GuideEditClient'

export const metadata = { title: 'Edit Guide — KeepSharing Admin' }
export const dynamic  = 'force-dynamic'

interface Props { params: Promise<{ slug: string }> }

export default async function GuideEditPage({ params }: Props) {
  const { slug } = await params
  const supabase = createAdminClient()

  // ── Guide identity + editorial fields ─────────────────────────────────────
  // Look up by EITHER slug or url_slug so admins can use the friendly
  // public URL (e.g. /admin/guides/family-resource-guide/edit) instead of
  // the legacy internal slug (e.g. .../newcomer/edit). The PATCH route
  // does the same lookup, so all the writes still resolve correctly.
  const { data: guide } = await supabase
    .from('guide_types')
    .select('slug, url_slug, display_name, short_description, pitch, editorial_intro, hero_image_url, publishes_annually')
    .or(`slug.eq.${slug},url_slug.eq.${slug}`)
    .maybeSingle()

  if (!guide) notFound()

  // ── Config (editable display fields) ──────────────────────────────────────
  // guide_configs is keyed by the internal guide_types.slug, so use that
  // regardless of which slug variant the admin typed.
  const { data: config } = await supabase
    .from('guide_configs')
    .select('*')
    .eq('guide_type_slug', guide.slug)
    .maybeSingle()

  // ── Connected articles ────────────────────────────────────────────────────
  const { data: articles } = await supabase
    .from('guide_articles')
    .select('id, slug, title, published, published_at, column_slug, guide_slug, hero_image_url')
    .in('guide_slug', [guide.slug, guide.url_slug])
    .order('published_at', { ascending: false, nullsFirst: false })
    .limit(50)

  // ── Counts ─────────────────────────────────────────────────────────────────
  const [
    { count: featuredCount },
    { count: standardCount },
    { data: sponsor },
  ] = await Promise.all([
    supabase.from('guide_listings').select('id', { count: 'exact', head: true })
      .eq('guide_type_slug', guide.slug).eq('is_published', true)
      .in('listing_tier', ['featured', 'tier-1-featured-listing', 'tier-2-spotlight', 'tier-3-business-spotlight']),
    supabase.from('guide_listings').select('id', { count: 'exact', head: true })
      .eq('guide_type_slug', guide.slug).eq('is_published', true)
      .not('listing_tier', 'in', '(featured,tier-1-featured-listing,tier-2-spotlight,tier-3-business-spotlight)'),
    supabase.from('ad_placements')
      .select('id, ad_headline, advertiser:advertiser_accounts(business_name, slug)')
      .eq('placement_type', 'section_sponsor').eq('is_active', true)
      .ilike('placement_context', `%${guide.slug}%`)
      .limit(1).maybeSingle(),
  ])

  const publicPath = `/${guide.url_slug ?? guide.slug}`

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-5xl">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <Link href="/admin/guides" className="inline-flex items-center gap-1 text-xs text-portal-blue hover:underline mb-1">
            <ArrowLeft size={11} /> All Guides
          </Link>
          <h1 className="text-xl font-semibold text-gray-900">Edit {guide.display_name}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Identity, images, print cover, Issuu link, CTA. Connected articles + listings appear below for reference.
          </p>
        </div>
        <Link
          href={publicPath}
          target="_blank"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-gray-200 bg-white rounded-lg hover:bg-gray-50 text-gray-700"
        >
          View Public Page <ExternalLink size={11} />
        </Link>
      </div>

      <GuideEditClient
        slug={slug}
        publicPath={publicPath}
        initial={{
          // guide_types fields
          display_name:      guide.display_name      ?? '',
          short_description: guide.short_description ?? '',
          pitch:             guide.pitch             ?? '',
          editorial_intro:   guide.editorial_intro   ?? '',
          hero_image_url:    guide.hero_image_url    ?? '',
          // guide_configs fields
          print_cover_url:    config?.print_cover_url    ?? '',
          issuu_url:          config?.issuu_url          ?? '',
          homepage_image_url: config?.homepage_image_url ?? '',
          primary_cta_label:  config?.primary_cta_label  ?? '',
          primary_cta_url:    config?.primary_cta_url    ?? '',
          is_active:          config?.is_active          ?? true,
          featured_month:     (config as { featured_month?: number | null } | null)?.featured_month ?? null,
        }}
      />

      {/* ── Read-only context ────────────────────────────────────────────── */}
      <section className="grid sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Listings</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{(featuredCount ?? 0) + (standardCount ?? 0)}</p>
          <p className="text-xs text-gray-500">{featuredCount ?? 0} featured · {standardCount ?? 0} standard</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Articles</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{articles?.length ?? 0}</p>
          <p className="text-xs text-gray-500">tagged to this guide</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Section Sponsor</p>
          <p className="text-sm font-bold text-gray-900 mt-1 leading-tight">
            {sponsor
              ? ((sponsor.advertiser as { business_name?: string } | null)?.business_name ?? sponsor.ad_headline ?? 'Sponsor set')
              : <span className="text-gray-400 font-normal">No active sponsor</span>}
          </p>
          <Link href="/admin/advertisers/sponsor-inventory" className="text-xs text-portal-blue hover:underline mt-1 inline-block">Manage sponsors →</Link>
        </div>
      </section>

      {/* ── Connected articles list ──────────────────────────────────────── */}
      <section className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-900">Connected Articles ({articles?.length ?? 0})</h2>
          <Link
            href={`/admin/articles/new?guide_slug=${encodeURIComponent(guide.slug)}`}
            className="text-xs font-semibold text-portal-blue hover:underline"
          >
            + New article
          </Link>
        </div>
        {(!articles || articles.length === 0) ? (
          <div className="px-4 py-8 text-center text-sm text-gray-500">
            No articles tagged to this guide yet.{' '}
            <Link href={`/admin/articles/new?guide_slug=${encodeURIComponent(guide.slug)}`} className="text-portal-blue hover:underline font-semibold">Write one →</Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {articles.map(a => (
              <div key={a.id} className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-gray-50">
                <div className="min-w-0 flex-1">
                  <Link href={`/admin/articles/${a.id}/edit`} className="text-sm font-semibold text-gray-900 hover:text-portal-blue line-clamp-1">
                    {a.title}
                  </Link>
                  <div className="flex flex-wrap items-center gap-2 mt-0.5 text-[11px] text-gray-500">
                    {!a.published && <span className="font-semibold text-portal-amber bg-portal-amber-lt px-1.5 py-0.5 rounded">Draft</span>}
                    {a.column_slug && <span>{a.column_slug}</span>}
                    {a.published_at && <span>{new Date(a.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>}
                  </div>
                </div>
                <Link href={`/admin/articles/${a.id}/edit`} className="text-xs text-portal-blue hover:underline shrink-0">Edit</Link>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Listings shortcut ────────────────────────────────────────────── */}
      <section className="rounded-xl border border-gray-200 bg-white p-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-gray-900">Listings for this guide</p>
          <p className="text-xs text-gray-500 mt-0.5">Edit listings under the advertisers area — they map to guide_listings here.</p>
        </div>
        <Link
          href={`/admin/content/guide-listings-import`}
          className="text-xs font-semibold text-portal-blue hover:underline"
        >
          Bulk import →
        </Link>
      </section>
    </div>
  )
}
