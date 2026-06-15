// ── SEO admin scoping helpers ────────────────────────────────────────────
//
// Centralizes how the SEO admin section filters by brand depending on
// the caller's role:
//
//   super / admin → every brand in MARKETS, optional 'all' aggregate
//   publisher     → only the brands in allowedMarkets
//   editor        → only allowedMarkets (typically a single market)
//
// Use these everywhere a brand chip / brand health card / brand
// dropdown appears so publishers never see brands they don't own.

import { MARKETS, type MarketDef } from '@/lib/markets'
import type { AdminContext } from '@/lib/admin/auth'

/** Brands this caller can see in the SEO section. Always returns at
 *  least one — MarketDefs.includes(allowedMarkets[0]) is invariant. */
export function getSeoAllowedBrands(ctx: AdminContext): MarketDef[] {
  if (ctx.role === 'super' || ctx.role === 'admin') return MARKETS.slice()
  return MARKETS.filter(m => ctx.allowedMarkets.includes(m.slug))
}

/** True when the caller is allowed to see EVERY brand — drives the
 *  "All brands" filter chip + cross-brand aggregate widgets. Pubs
 *  with two assignments still get the chip; pubs with one don't. */
export function canSeeAllBrands(ctx: AdminContext): boolean {
  if (ctx.role === 'super' || ctx.role === 'admin') return true
  return getSeoAllowedBrands(ctx).length > 1
}

/** Throws 403 if the caller can't access this brand. Use at the top
 *  of brand-scoped pages like /admin/seo/brand/[slug]. */
export function assertBrandAccess(ctx: AdminContext, brandSlug: string): void {
  if (ctx.role === 'super' || ctx.role === 'admin') return
  if (!ctx.allowedMarkets.includes(brandSlug)) {
    throw new Response(
      JSON.stringify({ error: `No access to brand "${brandSlug}"` }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

/** Normalize a `?brand=<slug>` searchParam → a valid brand slug the
 *  caller can see, or null when they should see all. Drops invalid
 *  values and silently downgrades unauthorized ones to "first allowed". */
export function resolveBrandParam(ctx: AdminContext, raw: string | undefined): string | null {
  const allowed = getSeoAllowedBrands(ctx).map(m => m.slug)
  if (!raw || raw === 'all') {
    return canSeeAllBrands(ctx) ? null : (allowed[0] ?? null)
  }
  return allowed.includes(raw) ? raw : (allowed[0] ?? null)
}
