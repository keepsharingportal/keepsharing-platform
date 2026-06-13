// src/proxy.ts — request-pipeline interceptor (Next.js 16's renamed
// middleware). Two responsibilities:
//
//   1. UTM first-touch attribution (public site).
//      When a visitor arrives with utm_source/utm_medium/utm_campaign in
//      the URL, we capture it once into a long-lived cookie. Subsequent
//      form submissions read this cookie and attribute back to the
//      original campaign. First touch wins.
//
//   2. Admin auth gating (/admin/* and /api/admin/*).
//      Optimistic check only — keeps the Supabase session cookie alive
//      via the @supabase/ssr adapter, and bounces unauthenticated visitors
//      to /admin/login (page) or returns 401 (API). We do NOT look up
//      admin_users here; per the Next.js auth guide, DB checks belong at
//      the page/route layer (deduped with React cache() in
//      src/lib/admin/auth.ts).
//
// Why one file: Next.js 16 supports a single proxy per project. Both
// concerns live here; matchers below decide which paths they apply to.

import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { brandFromHost } from '@/lib/markets'

const FIRST_TOUCH_COOKIE = 'rrp_first_touch'
const COOKIE_MAX_AGE     = 60 * 60 * 24 * 30 // 30 days
const LOGIN_PATH         = '/admin/login'
// Dev override cookie: set rrp_brand_override='boom' (or any brand slug)
// in your browser to preview a different brand from localhost without
// editing /etc/hosts. Ignored in production.
const BRAND_OVERRIDE_COOKIE = 'rrp_brand_override'

/** Resolve the brand for this request. Order:
 *    1. Dev cookie override (localhost / preview only)
 *    2. Host header → brand mapping (production, separate domains)
 *    3. Fallback to RRP (single-domain deploys, dev with no cookie)
 *  The result is set as `x-brand-slug` on the forwarded request so
 *  loadBrandContext() in server components can read it without
 *  re-parsing the host.
 */
function resolveBrand(request: NextRequest): string {
  const host = request.headers.get('host')
  const isLocalish = !!host && (host.startsWith('localhost') || host.startsWith('127.') || host.endsWith('.vercel.app'))
  if (isLocalish) {
    const override = request.cookies.get(BRAND_OVERRIDE_COOKIE)?.value
    if (override) return override
  }
  return brandFromHost(host) ?? 'rrp'
}

export async function proxy(request: NextRequest) {
  const originalPath = request.nextUrl.pathname

  // ── Host-based path rewrites ───────────────────────────────────────────
  // Two custom subdomains route into specific subtrees of the app:
  //   - app.keepsharing.com     → /admin/*  (editorial / CRM backend)
  //   - drivers.keepsharing.com → /distribution/* (driver portal)
  // The rewrite is transparent — URLs stay clean (no /admin prefix
  // visible) and the browser address bar shows what the editor typed.
  // For app.* we prefix every non-skipped path with /admin so
  // app.keepsharing.com/businesses serves /admin/businesses. For
  // drivers.* we just route the root + /login to /distribution/login;
  // everything else passes through (so /distribution/rrp/driver/run
  // still works for the deep-linked URL inside the portal).
  const host = (request.headers.get('host') ?? '').split(':')[0].toLowerCase()
  let path           = originalPath
  let rewriteUrl: URL | null = null

  // Paths the rewriter must NEVER touch — Next internals, API routes,
  // OAuth callback, static favicon. Adding /distribution here lets a
  // driver typing drivers.keepsharing.com/distribution/rrp/driver work
  // even though their subdomain has a special-case root rewrite.
  function isPassThrough(p: string): boolean {
    return p.startsWith('/_next/')
        || p.startsWith('/api/')
        || p.startsWith('/auth/')
        || p === '/favicon.ico'
  }

  if (host === 'app.keepsharing.com' && !isPassThrough(originalPath)) {
    if (originalPath === '/') {
      path       = '/admin'
      rewriteUrl = request.nextUrl.clone(); rewriteUrl.pathname = '/admin'
    } else if (!originalPath.startsWith('/admin')) {
      path       = '/admin' + originalPath
      rewriteUrl = request.nextUrl.clone(); rewriteUrl.pathname = path
    }
  } else if (host === 'drivers.keepsharing.com' && !isPassThrough(originalPath)) {
    // Driver-friendly aliases for what legacy users typed. Everything
    // else (including /distribution/rrp/driver/run deep links) flows
    // through with the existing routing.
    if (originalPath === '/' || originalPath === '/login' || originalPath === '/forgot-password') {
      path       = '/distribution/login'
      rewriteUrl = request.nextUrl.clone(); rewriteUrl.pathname = '/distribution/login'
    }
  }

  // ── Admin auth gating ──────────────────────────────────────────────────
  if (path.startsWith('/admin') || path.startsWith('/api/admin')) {
    return gateAdmin(request, rewriteUrl)
  }

  // ── Public path: if a rewrite is queued, do it now ─────────────────────
  // Skips the brand resolution / UTM tracking below — those exist for
  // the brand-public sites (riverregionparents.com etc), not for
  // drivers.keepsharing.com which is a portal, not a public site.
  if (rewriteUrl) {
    return NextResponse.rewrite(rewriteUrl)
  }

  // ── Maintenance mode check (public site only) ──────────────────────────
  // Skip assets, API routes, and /go/ redirects (QR scans should still
  // redirect even during maintenance so the click counter doesn't miss).
  //
  // Logged-in users (super-admin / admin / staff) bypass the 503 so they
  // can preview the live site while it's dark to the public. We only do
  // the auth check when maintenance is ON, so the session lookup doesn't
  // run on every public request in normal operation.
  if (!path.startsWith('/api/') && !path.startsWith('/go/') && !path.startsWith('/_next/')) {
    const maint = await checkMaintenanceMode()
    if (maint && !(await hasAdminSession(request))) {
      return new NextResponse(MAINTENANCE_HTML, {
        status: 503,
        headers: { 'Content-Type': 'text/html; charset=utf-8', 'Retry-After': '300' },
      })
    }
  }

  // ── Brand resolution (public site) ─────────────────────────────────────
  // Stamp x-brand-slug on the forwarded request so server components can
  // read it via loadBrandContext() without re-parsing the host header.
  // /api/admin routes are excluded above already; public APIs get the
  // header too so they can filter by brand if needed.
  const brandSlug = resolveBrand(request)
  const forwardedHeaders = new Headers(request.headers)
  forwardedHeaders.set('x-brand-slug', brandSlug)

  // ── UTM first-touch attribution (public site) ──────────────────────────
  const response = NextResponse.next({ request: { headers: forwardedHeaders } })

  const url          = request.nextUrl
  const utm_source   = url.searchParams.get('utm_source')
  const utm_medium   = url.searchParams.get('utm_medium')
  const utm_campaign = url.searchParams.get('utm_campaign')

  const hasUtm  = !!(utm_source || utm_medium || utm_campaign)
  const already = request.cookies.has(FIRST_TOUCH_COOKIE)

  if (hasUtm && !already) {
    const referrer = request.headers.get('referer') ?? null
    let referrerHost: string | null = null
    if (referrer) {
      try { referrerHost = new URL(referrer).hostname } catch { /* malformed */ }
    }
    const payload = {
      utm_source:   utm_source   ?? undefined,
      utm_medium:   utm_medium   ?? undefined,
      utm_campaign: utm_campaign ?? undefined,
      referrer:     referrerHost ?? undefined,
      landing_page: url.pathname,
    }
    response.cookies.set(FIRST_TOUCH_COOKIE, encodeURIComponent(JSON.stringify(payload)), {
      maxAge:   COOKIE_MAX_AGE,
      path:     '/',
      sameSite: 'lax',
      httpOnly: false, // client lib reads this for form attribution
    })
  }

  return response
}

// Admin gating: refresh the Supabase auth cookie, then bounce unauthenticated
// requests. Per Next.js 16 guidance this is deliberately optimistic — no DB
// lookups, no admin_users checks. Those happen at the page/route layer.
//
// `rewriteUrl` is set when proxy() decided to rewrite the request based on
// the host (e.g. app.keepsharing.com/businesses → /admin/businesses).
// We honor it on every NextResponse.next() return so the rewrite is
// preserved through the cookie-refresh dance.
async function gateAdmin(request: NextRequest, rewriteUrl: URL | null) {
  const path = rewriteUrl?.pathname ?? request.nextUrl.pathname

  // Forward the pathname so the admin layout can branch its chrome —
  // /admin/login needs to render without the sidebar shell.
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-admin-pathname', path)

  function passThroughResponse(): NextResponse {
    return rewriteUrl
      ? NextResponse.rewrite(rewriteUrl, { request: { headers: requestHeaders } })
      : NextResponse.next({ request: { headers: requestHeaders } })
  }

  // /admin/login and the Supabase auth callback must be reachable without a
  // session, otherwise users can never sign in.
  if (path.startsWith(LOGIN_PATH) || path.startsWith('/auth/')) {
    return passThroughResponse()
  }

  let res = passThroughResponse()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          // Mirror cookie writes onto the outgoing response so refreshed
          // tokens propagate back to the browser. Honors any active host
          // rewrite so app.keepsharing.com/businesses still rewrites to
          // /admin/businesses through the cookie-refresh cycle.
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          )
          res = passThroughResponse()
          cookiesToSet.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    if (path.startsWith('/api/admin')) {
      return new NextResponse(
        JSON.stringify({ error: 'Not authenticated' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } },
      )
    }
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = LOGIN_PATH
    // Use the ORIGINAL (un-rewritten) path so app.keepsharing.com/businesses
    // sends users back to /businesses after login (which then rewrites
    // back to /admin/businesses), preserving the clean URL bar.
    loginUrl.searchParams.set('next', request.nextUrl.pathname + request.nextUrl.search)
    return NextResponse.redirect(loginUrl)
  }

  return res
}

// ── Maintenance bypass for staff ─────────────────────────────────────────
// Previously this allowed ANY signed-in Supabase user through the 503
// (drivers, bloggers, advertisers, anyone who clicked a magic link
// once). Tightened to require an admin_users row.
//
// Cost: one extra `admin_users` lookup per public request when maintenance
// is on. Cached per user_id with a 5-minute TTL so it's effectively one
// query per session per 5min, not one per page. While maintenance is
// off (the normal case) this function isn't called at all.
//
// Why per-user_id cache instead of per-cookie: cookies rotate on token
// refresh; user_id is stable. So a session that refreshes mid-cache
// still gets the cached answer.
const adminUserCache: Map<string, { isAdmin: boolean; expires: number }> = new Map()

async function hasAdminSession(request: NextRequest): Promise<boolean> {
  try {
    const sb = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return request.cookies.getAll() },
          setAll() { /* no-op — we don't refresh tokens here */ },
        },
      },
    )
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return false

    const now = Date.now()
    const hit = adminUserCache.get(user.id)
    if (hit && now < hit.expires) return hit.isAdmin

    // Service-role lookup. Use plain createClient (not createServerClient)
    // because we don't need cookie handling and createServerClient expects
    // an anon-tier key. Two separate queries — by user_id first (the
    // common case for active accounts), then by email as a fallback for
    // pre-provisioned rows that haven't backfilled user_id yet. Avoids
    // the .or() filter which is fragile with mixed operators.
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    )

    let isAdmin = false
    const { data: byId } = await admin
      .from('admin_users')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle()
    if (byId) {
      isAdmin = true
    } else if (user.email) {
      const { data: byEmail } = await admin
        .from('admin_users')
        .select('id')
        .ilike('email', user.email)
        .eq('status', 'active')
        .limit(1)
        .maybeSingle()
      isAdmin = !!byEmail
    }

    adminUserCache.set(user.id, { isAdmin, expires: now + 5 * 60 * 1000 })
    return isAdmin
  } catch {
    return false
  }
}

// ── Maintenance mode ──────────────────────────────────────────────────────
// Checks site_settings for the maintenance_mode flag. Cached in a module-
// level variable with a 30-second TTL so the DB isn't hit on every request.
// When maintenance is on, public pages get a branded 503; admin + API + QR
// redirects stay live.

let maintenanceCache: { on: boolean; expires: number } | null = null

async function checkMaintenanceMode(): Promise<boolean> {
  const now = Date.now()
  if (maintenanceCache && now < maintenanceCache.expires) {
    return maintenanceCache.on
  }
  // First — env-var override. If MAINTENANCE_MODE=true is set in Vercel,
  // force the site offline regardless of what the DB says. Belt-and-
  // suspenders for the "I can't get the DB read to work" case.
  if (process.env.MAINTENANCE_MODE === 'true') {
    maintenanceCache = { on: true, expires: now + 30_000 }
    return true
  }
  try {
    // Service-role read. site_settings has RLS that blocks the anon key,
    // which is why the previous version silently returned false even when
    // the DB had maintenance_mode='true'. Service role bypasses RLS.
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    )
    const { data } = await sb
      .from('site_settings')
      .select('value')
      .eq('key', 'maintenance_mode')
      .maybeSingle()
    const on = data?.value === 'true'
    maintenanceCache = { on, expires: now + 30_000 }
    return on
  } catch {
    maintenanceCache = { on: false, expires: now + 30_000 }
    return false
  }
}

const MAINTENANCE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Be Right Back — River Region Parents</title>
<style>
body{font-family:system-ui,-apple-system,sans-serif;max-width:480px;margin:80px auto;padding:20px;color:#1a2744;background:#faf8f5;text-align:center}
.brand{font-size:18px;font-weight:800;margin-bottom:4px}.brand span{color:#ef6442}
.sub{font-size:10px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#ef6442;margin-bottom:40px}
.icon{width:64px;height:64px;border-radius:50%;background:#fdf0eb;display:flex;align-items:center;justify-content:center;margin:0 auto 24px}
h1{font-size:22px;font-weight:700;margin-bottom:12px}
p{font-size:15px;color:#666;line-height:1.7;margin-bottom:24px}
.pill{display:inline-flex;align-items:center;gap:8px;background:#fff;border-radius:999px;padding:8px 16px;box-shadow:0 1px 3px rgba(0,0,0,0.08);font-size:13px;color:#666}
.dot{width:8px;height:8px;border-radius:50%;background:#f3bf24;animation:pulse 1.5s infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
.footer{margin-top:48px;font-size:11px;color:#aaa}
.footer a{color:#ef6442;text-decoration:none}
</style>
</head>
<body>
<div class="brand">River Region <span>Parents</span></div>
<div class="sub">The Go-To Resource for River Region Families</div>
<div class="icon"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ef6442" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg></div>
<h1>Quick Tune-Up in Progress</h1>
<p>We're making a few improvements to give you a better experience. We'll be back in just a few minutes.</p>
<div class="pill"><span class="dot"></span> Back shortly</div>
<div class="footer">Questions? <a href="mailto:hello@riverregionparents.com">hello@riverregionparents.com</a></div>
</body>
</html>`

// Run on the public site (for UTM capture + maintenance check) AND on the
// admin surface (for auth gating). Static assets and image optimizer URLs
// are excluded; the path-based branch above decides which behavior applies.
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
