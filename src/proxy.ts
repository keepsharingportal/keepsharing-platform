import { NextResponse, type NextRequest } from 'next/server'

// ── First-touch attribution ──────────────────────────────────────────────
// When a visitor arrives with utm_source/utm_medium/utm_campaign in the
// URL, we capture it once into a long-lived cookie. Subsequent form
// submissions (partner offers, listing inquiries, newsletter signups)
// read this cookie and attribute back to the original campaign.
//
// Cookie is JSON-encoded so the client lib can decode it directly.
// Setting it from middleware (not the page) means the very first POST
// to a form already has the data, even before the page has a chance
// to render. We DON'T overwrite it if it's already set — first touch wins.

const FIRST_TOUCH_COOKIE = 'rrp_first_touch'
const COOKIE_MAX_AGE     = 60 * 60 * 24 * 30 // 30 days

export async function proxy(request: NextRequest) {
  const response = NextResponse.next({ request })

  // Only consider UTM-bearing visits; skip prefetch/asset traffic.
  const url           = request.nextUrl
  const utm_source    = url.searchParams.get('utm_source')
  const utm_medium    = url.searchParams.get('utm_medium')
  const utm_campaign  = url.searchParams.get('utm_campaign')

  const hasUtm = !!(utm_source || utm_medium || utm_campaign)
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
      httpOnly: false,   // client lib reads this for form attribution
    })
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/).*)'],
}
