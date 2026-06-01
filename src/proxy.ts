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

const FIRST_TOUCH_COOKIE = 'rrp_first_touch'
const COOKIE_MAX_AGE     = 60 * 60 * 24 * 30 // 30 days
const LOGIN_PATH         = '/admin/login'

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname

  // ── Admin auth gating ──────────────────────────────────────────────────
  if (path.startsWith('/admin') || path.startsWith('/api/admin')) {
    return gateAdmin(request)
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
    if (maint && !(await hasSupabaseSession(request))) {
      return new NextResponse(MAINTENANCE_HTML, {
        status: 503,
        headers: { 'Content-Type': 'text/html; charset=utf-8', 'Retry-After': '300' },
      })
    }
  }

  // ── UTM first-touch attribution (public site) ──────────────────────────
  const response = NextResponse.next({ request })

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
async function gateAdmin(request: NextRequest) {
  const path = request.nextUrl.pathname

  // Forward the pathname so the admin layout can branch its chrome —
  // /admin/login needs to render without the sidebar shell.
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-admin-pathname', path)

  // /admin/login and the Supabase auth callback must be reachable without a
  // session, otherwise users can never sign in.
  if (path.startsWith(LOGIN_PATH) || path.startsWith('/auth/')) {
    return NextResponse.next({ request: { headers: requestHeaders } })
  }

  let res = NextResponse.next({ request: { headers: requestHeaders } })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          // Mirror cookie writes onto the outgoing response so refreshed
          // tokens propagate back to the browser.
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          )
          res = NextResponse.next({ request: { headers: requestHeaders } })
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
    loginUrl.searchParams.set('next', path + request.nextUrl.search)
    return NextResponse.redirect(loginUrl)
  }

  return res
}

// ── Maintenance bypass for staff ─────────────────────────────────────────
// Cheap, no-DB session check: if the request carries a Supabase auth
// cookie that returns a user, let them through the 503. Same Supabase
// SSR adapter used by gateAdmin — reading cookies, no admin_users
// lookup. Anyone with a working session can preview the site during
// maintenance; the actual /admin gate still requires admin_users
// membership, so this isn't a security loosening.
async function hasSupabaseSession(request: NextRequest): Promise<boolean> {
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
    return !!user
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
  try {
    const sb = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => [], setAll: () => {} } },
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
