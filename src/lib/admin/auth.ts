// Admin auth helpers.
//
// Per Next.js 16 guidance, the proxy (src/proxy.ts) does optimistic checks
// only — it bounces unauthenticated visitors away from /admin without
// touching the database. The actual admin_users lookup happens HERE, in
// page/route code, deduped per request via React cache(). One DB roundtrip
// per request regardless of how many components ask for the context.
//
// Server-side helpers:
//
//   getAdminContext()
//     Returns the current admin's context, or null if no admin row matches.
//     Use this when you want a "soft" gate (e.g., the brand switcher fetch).
//
//   requireAdmin()
//     Throws a 403 Response if no admin row matches. Use everywhere else.
//
//   requireSuperAdmin()
//     Throws unless role === 'super'.
//
//   requireMarketAccess(market)
//     Throws unless the caller can act on the given market. Super-admin
//     always passes.
//
//   marketsToQuery(ctx)
//     Helper for building Supabase .in('market', …) filters. For super-admin
//     viewing 'all', returns every platform market. Otherwise returns
//     [activeMarket].
//
// Header-driven decode is intentionally absent — the proxy can't trust the
// admin_users table without an Edge-incompatible query, and a header-injected
// cache from middleware is exactly the kind of "session management in proxy"
// the Next.js guide warns against.

import { cache } from 'react'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  ALL_MARKETS_SLUG, ALL_MARKET_SLUGS, isKnownMarket,
} from '@/lib/markets'

export type AdminRole = 'super' | 'admin' | 'publisher' | 'editor'

export interface AdminContext {
  /** admin_users row id */
  adminId:       string
  /** Supabase auth user id */
  userId:        string
  email:         string
  fullName:      string | null
  role:          AdminRole
  /**
   * Markets the caller is allowed to act on. For role='super' or 'admin'
   * this is the full list of platform markets (so callers don't have to
   * special-case the cross-brand tiers).
   */
  allowedMarkets: string[]
  /**
   * The market the caller is currently viewing. For role='super' or 'admin'
   * this can be the synthetic 'all' value (viewingAll === true). For
   * everyone else it's always one of allowedMarkets.
   */
  activeMarket:   string
  viewingAll:     boolean
  /** Per-user 2FA enforcement flag (migration 140). Default TRUE — the gate
   *  bounces this user to /admin/settings/security until they enroll a TOTP. */
  requiresMfa:    boolean
  /** When this admin verified their TOTP factor. NULL means not enrolled. */
  mfaEnabledAt:   string | null
}

const ACTIVE_MARKET_COOKIE = 'rrp_active_market'

/**
 * Resolve the admin context for the current request. Memoized via React
 * cache() so multiple callers within one render get one DB roundtrip.
 *
 * Returns null when:
 *   - There's no signed-in Supabase user, OR
 *   - The signed-in user has no row in admin_users (or it's suspended).
 *
 * Backfills admin_users.user_id when a row exists for the user's email but
 * user_id is null (first sign-in after a row was pre-provisioned).
 */
export const getAdminContext = cache(async (): Promise<AdminContext | null> => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !user.email) return null

  // admin_users is service-role only — bypass RLS.
  const admin = createAdminClient()

  type AdminRow = {
    id:              string
    user_id:         string | null
    email:           string
    full_name:       string | null
    role:            AdminRole
    allowed_markets: string[] | null
    status:          string
    requires_mfa?:   boolean | null
    mfa_enabled_at?: string | null
  }

  // Look up by user_id first; fall back to email so pre-provisioned rows
  // resolve on first login.
  let row: AdminRow | null = null
  const byId = await admin
    .from('admin_users')
    .select('id, user_id, email, full_name, role, allowed_markets, status, requires_mfa, mfa_enabled_at')
    .eq('user_id', user.id)
    .maybeSingle()
  if (byId.data) {
    row = byId.data as AdminRow
  } else {
    const byEmail = await admin
      .from('admin_users')
      .select('id, user_id, email, full_name, role, allowed_markets, status, requires_mfa, mfa_enabled_at')
      .ilike('email', user.email)
      .maybeSingle()
    if (byEmail.data) {
      row = byEmail.data as AdminRow
      // Backfill user_id so subsequent lookups hit the by-id path.
      if (!row.user_id) {
        await admin
          .from('admin_users')
          .update({ user_id: user.id })
          .eq('id', row.id)
        row.user_id = user.id
      }
    }
  }

  if (!row || row.status !== 'active') return null

  // Stamp last_login_at when we see this admin in a request. Throttled to
  // once per ~5min via a heuristic — checking the existing value first
  // avoids hammering the DB on every page load. Best-effort; failures are
  // swallowed.
  void admin
    .from('admin_users')
    .update({ last_login_at: new Date().toISOString() })
    .eq('id', row.id)
    .then(() => {/* ignore result */}, () => {/* ignore error */})

  // Cross-brand tiers (super + admin) see every platform market by default
  // so they don't need allowed_markets backfilled. Publisher + editor are
  // scoped to whatever's stored on the row.
  const isCrossBrand     = row.role === 'super' || row.role === 'admin'
  const allowedMarkets   = isCrossBrand
    ? ALL_MARKET_SLUGS
    : (row.allowed_markets ?? []).filter(isKnownMarket)

  // Pick the active market — sanitize the cookie against what the user is
  // allowed to see. For cross-brand tiers (super + admin), 'all' is valid.
  const cookieStore  = await cookies()
  const cookieMarket = cookieStore.get(ACTIVE_MARKET_COOKIE)?.value ?? ''
  let activeMarket: string
  if (isCrossBrand && cookieMarket === ALL_MARKETS_SLUG) {
    activeMarket = ALL_MARKETS_SLUG
  } else if (isKnownMarket(cookieMarket) && allowedMarkets.includes(cookieMarket)) {
    activeMarket = cookieMarket
  } else {
    activeMarket = allowedMarkets[0] ?? ''
  }

  return {
    adminId:       row.id,
    userId:        user.id,
    email:         row.email,
    fullName:      row.full_name,
    role:          row.role,
    allowedMarkets,
    activeMarket,
    viewingAll:    isCrossBrand && activeMarket === ALL_MARKETS_SLUG,
    requiresMfa:   row.requires_mfa ?? true,
    mfaEnabledAt:  row.mfa_enabled_at ?? null,
  }
})

/**
 * Throws a 403 Response if no admin context is resolvable. Returns the
 * context otherwise.
 */
export async function requireAdmin(): Promise<AdminContext> {
  const ctx = await getAdminContext()
  if (!ctx) throw forbidden('Not authorized')
  return ctx
}

export async function requireSuperAdmin(): Promise<AdminContext> {
  const ctx = await requireAdmin()
  if (ctx.role !== 'super') throw forbidden('Super-admin only')
  return ctx
}

/**
 * Throws 403 unless the caller can act on the given market. Super- and
 * cross-brand admins always pass — they see every market.
 */
export async function requireMarketAccess(market: string): Promise<AdminContext> {
  const ctx = await requireAdmin()
  if (ctx.role === 'super' || ctx.role === 'admin') return ctx
  if (!ctx.allowedMarkets.includes(market)) {
    throw forbidden(`No access to market "${market}"`)
  }
  return ctx
}

/**
 * Throws 403 unless the caller's role has settings-level access — managing
 * other admins, market configuration, etc. Super and admin pass; publisher
 * and editor do not.
 */
export async function requireSettingsAccess(): Promise<AdminContext> {
  const ctx = await requireAdmin()
  if (ctx.role !== 'super' && ctx.role !== 'admin') {
    throw forbidden('Settings access required')
  }
  return ctx
}

/**
 * The list of markets this caller can query against in a list view.
 *   - Super-admin viewing 'all' → every platform market.
 *   - Anyone else → [activeMarket].
 */
export function marketsToQuery(ctx: AdminContext): string[] {
  if (ctx.viewingAll) return ctx.allowedMarkets
  return [ctx.activeMarket]
}

export const ADMIN_ACTIVE_MARKET_COOKIE = ACTIVE_MARKET_COOKIE

function forbidden(message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status: 403,
    headers: { 'Content-Type': 'application/json' },
  })
}
