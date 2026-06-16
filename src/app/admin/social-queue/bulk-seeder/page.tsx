// ── /admin/social-queue/bulk-seeder ────────────────────────────────
//
// Backfills social copy (social_hook + FB caption + IG caption) for
// every published article that's missing them. Uses the friend-voice
// caption generator + the brand's authoritative voice profile.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireSettingsAccess } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSeoAllowedBrands } from '@/lib/seo/admin-scope'
import { BulkSocialSeederClient } from './BulkSocialSeederClient'
import { ArrowLeft, Share2 } from 'lucide-react'

export const metadata: Metadata = { title: 'Bulk Social Seeder — Admin' }
export const dynamic = 'force-dynamic'

interface Props {
  searchParams: Promise<{ brand?: string }>
}

export default async function BulkSocialSeederPage({ searchParams }: Props) {
  const ctx = await requireSettingsAccess()
  const sp = await searchParams
  const allowed = getSeoAllowedBrands(ctx)
  const brandSlug = sp.brand && allowed.find(b => b.slug === sp.brand) ? sp.brand : null

  const sb = createAdminClient()

  // Queue size — hook-mode articles where social_hook is empty.
  // Per-platform-mode articles are excluded because their hook is
  // intentionally NULL (the FB/IG verbatim text is the source of truth).
  let q = sb
    .from('guide_articles')
    .select('id', { count: 'exact', head: true })
    .eq('published', true)
    .eq('social_mode', 'hook')
    .or('social_hook.is.null,social_hook.eq.')
  if (brandSlug) q = q.eq('brand_slug', brandSlug)
  const { count: needSeed } = await q

  // AI-seeded count (eligible for reseed once 30 min old).
  let rq = sb
    .from('guide_articles')
    .select('id', { count: 'exact', head: true })
    .eq('published', true)
    .eq('social_mode', 'hook')
    .not('social_ai_seeded_at', 'is', null)
  if (brandSlug) rq = rq.eq('brand_slug', brandSlug)
  const { count: aiSeededCount } = await rq

  // Editor-edited count (any social copy set but no AI stamp).
  let eq = sb
    .from('guide_articles')
    .select('id', { count: 'exact', head: true })
    .eq('published', true)
    .or('social_hook.not.is.null,social_fb_caption.not.is.null,social_ig_caption.not.is.null')
    .is('social_ai_seeded_at', null)
  if (brandSlug) eq = eq.eq('brand_slug', brandSlug)
  const { count: humanEditedCount } = await eq

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="bg-white border-b border-portal-border px-6 py-4 shrink-0">
        <Link href="/admin/social-queue" className="text-[11px] font-semibold text-portal-sub hover:text-portal-text inline-flex items-center gap-1 mb-1">
          <ArrowLeft size={11} /> Social queue
        </Link>
        <h1 className="text-[18px] font-bold text-portal-text">
          <Share2 size={16} className="inline -translate-y-0.5 mr-1" /> Bulk Social Seeder
        </h1>
        <p className="text-[12px] text-portal-sub mt-1">
          Backfills <strong>social_hook + Facebook caption + Instagram caption</strong> for every published
          article missing them. Reads the brand&apos;s Social Voice profile (the HYPELOCAL doc you wrote)
          + article body + author + column, and generates in the friend voice. Runs in batches of 5.
        </p>
      </div>
      <div className="flex-1 overflow-y-auto bg-portal-bg">
        <div className="px-6 py-6 space-y-4">

          {allowed.length > 1 && (
            <div className="flex gap-1.5 flex-wrap">
              <Link
                href="/admin/social-queue/bulk-seeder"
                className={`px-3 py-1.5 rounded-full text-[12px] font-bold border ${
                  !brandSlug ? 'bg-portal-navy text-white border-portal-navy' : 'bg-white text-portal-text border-portal-border hover:bg-portal-bg'
                }`}
              >All brands</Link>
              {allowed.map(b => (
                <Link
                  key={b.slug}
                  href={`/admin/social-queue/bulk-seeder?brand=${b.slug}`}
                  className={`px-3 py-1.5 rounded-full text-[12px] font-bold border ${
                    brandSlug === b.slug ? 'bg-portal-navy text-white border-portal-navy' : 'bg-white text-portal-text border-portal-border hover:bg-portal-bg'
                  }`}
                >{b.displayName}</Link>
              ))}
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <Stat label="Need seeding"   value={String(needSeed ?? 0)}        tone="amber" />
            <Stat label="AI-seeded"      value={String(aiSeededCount ?? 0)}   tone="blue" />
            <Stat label="Human-edited"   value={String(humanEditedCount ?? 0)} tone="green" />
          </div>

          <BulkSocialSeederClient
            brandSlug={brandSlug}
            initialQueueSize={needSeed ?? 0}
            initialReseedSize={aiSeededCount ?? 0}
          />

          <div className="bg-white border border-portal-border rounded-lg p-3 text-[12px] leading-relaxed">
            <strong className="text-portal-text">How this works:</strong>
            <ol className="list-decimal pl-5 mt-1.5 space-y-0.5 text-portal-sub">
              <li>Each batch picks 5 articles with no social_hook (Missing mode) or AI-seeded 30+ min ago (Reseed mode).</li>
              <li>Claude reads the article body + brand Social Voice profile + author + column.</li>
              <li>Writes the social hook + FB caption + IG caption in the friend voice.</li>
              <li>Saves directly + stamps <code>social_ai_seeded_at</code> for provenance.</li>
              <li>Editor can still edit any field via the article&apos;s Social Sharing panel — manual edits clear the AI stamp.</li>
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
