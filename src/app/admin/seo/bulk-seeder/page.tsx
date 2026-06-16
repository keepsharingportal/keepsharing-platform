// ── /admin/seo/bulk-seeder ───────────────────────────────────────────
//
// Walks every published article missing seo_title + seo_description,
// runs Claude in batches of 5, saves directly + stamps
// seo_ai_seeded_at so editor can find what was AI-generated for review.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireSettingsAccess } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSeoAllowedBrands } from '@/lib/seo/admin-scope'
import { BulkSeederClient } from './BulkSeederClient'
import { ArrowLeft, Sparkles } from 'lucide-react'

export const metadata: Metadata = { title: 'Bulk SEO Seeder — Admin' }
export const dynamic = 'force-dynamic'

interface Props {
  searchParams: Promise<{ brand?: string }>
}

export default async function BulkSeederPage({ searchParams }: Props) {
  const ctx = await requireSettingsAccess()
  const sp = await searchParams
  const allowed = getSeoAllowedBrands(ctx)
  const brandSlug = sp.brand && allowed.find(b => b.slug === sp.brand) ? sp.brand : null

  const sb = createAdminClient()

  // Get the queue size — how many articles still need seeding.
  let q = sb
    .from('guide_articles')
    .select('id', { count: 'exact', head: true })
    .eq('published', true)
    .or('seo_title.is.null,seo_title.eq.')
    .or('seo_description.is.null,seo_description.eq.')
  if (brandSlug) q = q.eq('brand_slug', brandSlug)
  const { count: totalNeedSeeding } = await q

  // Get AI-seeded vs human-edited counts.
  let aiq = sb
    .from('guide_articles')
    .select('id', { count: 'exact', head: true })
    .eq('published', true)
    .not('seo_ai_seeded_at', 'is', null)
  if (brandSlug) aiq = aiq.eq('brand_slug', brandSlug)
  const { count: aiSeededCount } = await aiq

  let hq = sb
    .from('guide_articles')
    .select('id', { count: 'exact', head: true })
    .eq('published', true)
    .not('seo_title', 'is', null)
    .is('seo_ai_seeded_at', null)
  if (brandSlug) hq = hq.eq('brand_slug', brandSlug)
  const { count: humanEditedCount } = await hq

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="bg-white border-b border-portal-border px-6 py-4 shrink-0">
        <Link href="/admin/seo" className="text-[11px] font-semibold text-portal-sub hover:text-portal-text inline-flex items-center gap-1 mb-1">
          <ArrowLeft size={11} /> SEO
        </Link>
        <h1 className="text-[18px] font-bold text-portal-text">
          <Sparkles size={16} className="inline -translate-y-0.5 mr-1" /> Bulk SEO Seeder
        </h1>
        <p className="text-[12px] text-portal-sub mt-1">
          Backfills SEO title + description + focus keyword for every published article that&apos;s missing them.
          Claude reads each article&apos;s body + your brand voice. Runs in batches of 5 to fit Vercel&apos;s window;
          re-run until the queue is empty. AI-seeded rows get a <code>seo_ai_seeded_at</code> stamp so you can
          filter them for review later.
        </p>
      </div>
      <div className="flex-1 overflow-y-auto bg-portal-bg">
        <div className="px-6 py-6 space-y-4">

          {/* Brand chips */}
          {allowed.length > 1 && (
            <div className="flex gap-1.5 flex-wrap">
              <Link
                href="/admin/seo/bulk-seeder"
                className={`px-3 py-1.5 rounded-full text-[12px] font-bold border ${
                  !brandSlug ? 'bg-portal-navy text-white border-portal-navy' : 'bg-white text-portal-text border-portal-border hover:bg-portal-bg'
                }`}
              >All brands</Link>
              {allowed.map(b => (
                <Link
                  key={b.slug}
                  href={`/admin/seo/bulk-seeder?brand=${b.slug}`}
                  className={`px-3 py-1.5 rounded-full text-[12px] font-bold border ${
                    brandSlug === b.slug ? 'bg-portal-navy text-white border-portal-navy' : 'bg-white text-portal-text border-portal-border hover:bg-portal-bg'
                  }`}
                >{b.displayName}</Link>
              ))}
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <Stat label="Need seeding"   value={String(totalNeedSeeding ?? 0)} tone="amber" />
            <Stat label="AI-seeded"      value={String(aiSeededCount ?? 0)}    tone="blue" />
            <Stat label="Human-edited"   value={String(humanEditedCount ?? 0)} tone="green" />
          </div>

          <BulkSeederClient
            brandSlug={brandSlug}
            initialQueueSize={totalNeedSeeding ?? 0}
            initialReseedSize={aiSeededCount ?? 0}
          />

          <div className="bg-white border border-portal-border rounded-lg p-3 text-[12px] leading-relaxed">
            <strong className="text-portal-text">How this works:</strong>
            <ol className="list-decimal pl-5 mt-1.5 space-y-0.5 text-portal-sub">
              <li>Each batch picks 5 articles missing BOTH seo_title and seo_description.</li>
              <li>Claude reads each article&apos;s body + brand voice + audience and writes optimized social copy.</li>
              <li>Results save directly to the article + stamp <code>seo_ai_seeded_at</code>.</li>
              <li>Re-run until the queue empties. Each batch takes ~30-60s.</li>
              <li>Review AI-seeded articles later — anything you edit manually clears the AI stamp.</li>
            </ol>
          </div>

        </div>
      </div>
    </div>
  )
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'amber' | 'blue' | 'green' }) {
  const cls = tone === 'amber' ? 'text-portal-amber'
            : tone === 'blue'  ? 'text-portal-blue'
            : tone === 'green' ? 'text-portal-green'
            :                    'text-portal-text'
  return (
    <div className="bg-white border border-portal-border rounded-lg p-4">
      <div className={`text-[22px] font-black ${cls}`}>{value}</div>
      <div className="text-[11px] font-semibold uppercase tracking-wider text-portal-sub mt-1">{label}</div>
    </div>
  )
}
