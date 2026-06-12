// ── /admin/homepage/hero ──────────────────────────────────────────────────
// Hero-slot manager for fifty-plus brand homepages. Lists each brand's
// three editor-controlled hero slots (slot 1 is the dynamic greeting,
// not managed here). Editors can:
//   - See which articles are currently in each slot
//   - Remove a slot
//   - Click through to the article edit page to swap which article it is
//   - Switch brands via the top-right brand picker
//
// All writes go through /api/admin/hero-slots which is AAL2-gated +
// audit-logged.

import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { Sparkles, ArrowLeft } from 'lucide-react'
import { requireAdmin } from '@/lib/admin/auth'
import { MARKETS } from '@/lib/markets'
import { HeroSlotManagerClient } from './HeroSlotManagerClient'

export const metadata: Metadata = { title: 'Hero Slot Manager — Admin' }
export const dynamic = 'force-dynamic'

interface Props { searchParams: Promise<{ brand?: string }> }

function adminDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

interface SlotRow {
  slot_number: number
  added_at:    string
  article: {
    id:             string
    title:          string
    slug:           string
    hero_image_url: string | null
    column_slug:    string | null
    published:      boolean
    ends_at:        string | null
    brand_slug:     string
  } | null
}

export default async function HeroSlotsAdminPage({ searchParams }: Props) {
  await requireAdmin()
  const sp = await searchParams

  // Default to the first fifty-plus brand. Editors with multi-brand access
  // can switch via the picker.
  const fiftyPlusBrands = MARKETS.filter(m => m.family === 'fifty-plus')
  const brandSlug = sp.brand && fiftyPlusBrands.some(b => b.slug === sp.brand)
    ? sp.brand
    : fiftyPlusBrands[0]?.slug ?? ''

  const sb = adminDb()
  let slots: SlotRow[] = []
  let allBrandsHaveZero = true

  if (brandSlug) {
    const { data } = await sb
      .from('article_hero_slots')
      .select(`
        slot_number, added_at,
        article:guide_articles ( id, title, slug, hero_image_url, column_slug, published, ends_at, brand_slug )
      `)
      .eq('brand_slug', brandSlug)
      .order('slot_number')

    const filled = (data ?? []) as unknown as SlotRow[]
    slots = [2, 3, 4].map(n => filled.find(s => s.slot_number === n) ?? { slot_number: n, added_at: '', article: null })
    allBrandsHaveZero = filled.length === 0
  }

  // Surface stale rows (article unpublished, expired ends_at, missing brand
  // attribution) so the editor can act on them — never silently drop them
  // per the surface-decisions feedback rule.
  const staleIssues: string[] = []
  for (const s of slots) {
    if (!s.article) continue
    if (!s.article.published)                                            staleIssues.push(`Slot ${s.slot_number}: "${s.article.title}" is unpublished — readers won't see it.`)
    if (s.article.ends_at && new Date(s.article.ends_at) < new Date())   staleIssues.push(`Slot ${s.slot_number}: "${s.article.title}" ends_at has passed — consider rotating it out.`)
    if (s.article.brand_slug !== brandSlug)                              staleIssues.push(`Slot ${s.slot_number}: "${s.article.title}" is syndicated from ${s.article.brand_slug.toUpperCase()} — make sure that's intentional.`)
  }

  return (
    <div className="min-h-screen bg-portal-bg">
      <div className="portal-page-header">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="text-portal-sub hover:text-portal-text">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="portal-page-title flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-portal-blue" />
              Hero Slot Manager
            </h1>
            <p className="portal-page-subtitle">
              Articles that rotate in the 50+ homepage hero carousel. Slot 1 is the dynamic greeting (no DB).
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {fiftyPlusBrands.length > 1 && (
            <form method="get" className="flex items-center gap-2">
              <label className="text-xs font-bold text-portal-sub uppercase">Brand</label>
              <select name="brand" defaultValue={brandSlug} className="portal-input portal-btn-sm" onChange={e => e.currentTarget.form?.submit()}>
                {fiftyPlusBrands.map(b => (
                  <option key={b.slug} value={b.slug}>{b.displayName}</option>
                ))}
              </select>
            </form>
          )}
        </div>
      </div>

      <div className="portal-content-body">
        {!brandSlug ? (
          <div className="portal-card p-8 text-center text-portal-sub">
            No fifty-plus brands configured. Add one in <code>src/lib/markets.ts</code> first.
          </div>
        ) : (
          <>
            {staleIssues.length > 0 && (
              <div className="portal-card mb-4 p-4 bg-portal-amber-lt border-portal-amber">
                <h3 className="font-bold text-portal-amber mb-2 text-sm">Heads up — issues to resolve</h3>
                <ul className="text-sm text-portal-text space-y-1 list-disc pl-5">
                  {staleIssues.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>
            )}

            <div className="portal-card p-4 mb-4 bg-portal-blue-lt/40 border-portal-blue/30">
              <p className="text-sm text-portal-text">
                <strong>How it works:</strong> {brandSlug.toUpperCase()} readers see slot 1 (dynamic greeting) + slot 2 + slot 3 + slot 4 rotating through the hero carousel.
                {allBrandsHaveZero && ' No slots filled yet — head to an article edit page to feature one.'}
              </p>
            </div>

            <HeroSlotManagerClient slots={slots} brandSlug={brandSlug} />
          </>
        )}
      </div>
    </div>
  )
}
