// /admin/verticals/[slug]/edit
// Identity editor for a vertical. Title, subtitle, description, hero image,
// homepage tile image, CTA, sponsor label, active toggle.

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import { VerticalEditClient } from './VerticalEditClient'

export const metadata = { title: 'Edit Vertical — KeepSharing Admin' }
export const dynamic  = 'force-dynamic'

interface Props { params: Promise<{ slug: string }> }

const PUBLIC_PATH: Record<string, string> = {
  'school-zone':    '/school-zone',
  'mom-knows-best': '/mom-knows-best',
}

const KIND_LABEL: Record<string, string> = {
  topic:     'Topic',
  community: 'Community',
}

export default async function VerticalEditPage({ params }: Props) {
  const { slug } = await params
  const supabase = createAdminClient()

  const { data: vertical } = await supabase
    .from('verticals')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()

  if (!vertical) notFound()

  // Read the active section sponsor (if any) so admin sees status
  const { data: sponsor } = await supabase
    .from('ad_placements')
    .select('id, ad_headline, advertiser:advertiser_accounts(business_name, slug)')
    .eq('placement_type', 'section_sponsor')
    .eq('is_active', true)
    .ilike('placement_context', `%${slug}%`)
    .limit(1)
    .maybeSingle()

  const publicPath = PUBLIC_PATH[slug] ?? `/${slug}`

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-5xl">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <Link href="/admin/verticals" className="inline-flex items-center gap-1 text-xs text-portal-blue hover:underline mb-1">
            <ArrowLeft size={11} /> All Verticals
          </Link>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-semibold text-portal-text">Edit {vertical.display_name}</h1>
            <span className="text-[10px] font-bold uppercase tracking-widest bg-gray-100 text-portal-sub px-1.5 py-0.5 rounded">
              {KIND_LABEL[vertical.kind] ?? vertical.kind}
            </span>
          </div>
          <p className="text-sm text-portal-sub">Identity shown on the public landing page and the homepage tile.</p>
        </div>
        <Link
          href={publicPath}
          target="_blank"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-portal-border bg-white rounded-lg hover:bg-portal-bg text-portal-text"
        >
          View Public Page <ExternalLink size={11} />
        </Link>
      </div>

      <VerticalEditClient
        slug={slug}
        publicPath={publicPath}
        sponsorBusinessName={
          (sponsor?.advertiser as { business_name?: string } | null)?.business_name ?? null
        }
        initial={{
          display_name:       vertical.display_name      ?? '',
          subtitle:           vertical.subtitle          ?? '',
          description:        vertical.description       ?? '',
          hero_image_url:     vertical.hero_image_url    ?? '',
          homepage_image_url: vertical.homepage_image_url ?? '',
          brand_color:        vertical.brand_color       ?? '',
          primary_cta_label:  vertical.primary_cta_label ?? '',
          primary_cta_url:    vertical.primary_cta_url   ?? '',
          sponsor_label:      vertical.sponsor_label     ?? 'Proudly Presented By',
          is_active:          vertical.is_active         ?? true,
        }}
      />
    </div>
  )
}
