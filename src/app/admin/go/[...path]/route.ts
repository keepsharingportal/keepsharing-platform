// GET /admin/go/<public path>  →  302 to https://<active brand host>/<public path>
//
// One indirection for every "view live" link in the admin.
//
// The problem it solves: the admin runs on app.keepsharing.com, which hosts
// every brand and serves none of the public routes — /afterschool-guide there
// 307s to /admin/login and then 404s. So a relative href in an admin screen can
// never reach a reader-facing page, whichever brand is selected: choosing a
// brand changes what content you see, not how a browser resolves a relative URL.
//
// Why a redirect rather than absolutising each link: there were 37 of them
// across 32 files, in a mix of server and client components. Absolutising each
// one means plumbing the active brand into every client component that has a
// link, and the next person to add a link has to know to do it too. This way
// the link stays a plain relative href — <a href="/admin/go/afterschool-guide">
// — and the brand is resolved here, server-side, from the same cookie the
// switcher writes. Adding the next brand domain needs no changes at all.
//
// It sits under /admin deliberately, so it inherits admin auth: this is an
// editor tool, not a public open-redirect.

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { publicUrl, isKnownMarket, ALL_MARKETS_SLUG } from '@/lib/markets'

export const runtime = 'nodejs'

const ACTIVE_MARKET_COOKIE = 'rrp_active_market'
// Only one brand's site is live today; the rest come online as they convert.
// Used when the editor is in the all-brands view, where there is no single
// right answer, rather than dumping them on a 404.
const DEFAULT_BRAND = 'rrp'

interface RouteParams { params: Promise<{ path: string[] }> }

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { path } = await params
  const segments = (path ?? []).filter(Boolean)
  if (segments.length === 0) return NextResponse.redirect(new URL('/admin', req.url))

  // Rebuild the public path, preserving any query string the link carried.
  const target = '/' + segments.map(encodeURIComponent).join('/').replace(/%2F/g, '/')
  const search = req.nextUrl.search ?? ''

  // ?brand= wins when the caller knows which brand owns the content (a
  // syndicated article, say); otherwise the switcher's current selection.
  const explicit = req.nextUrl.searchParams.get('brand')
  const cookieBrand = (await cookies()).get(ACTIVE_MARKET_COOKIE)?.value ?? ''
  const brand =
    (explicit && isKnownMarket(explicit) && explicit) ||
    (isKnownMarket(cookieBrand) && cookieBrand !== ALL_MARKETS_SLUG ? cookieBrand : DEFAULT_BRAND)

  // Drop our own ?brand= from what we forward on.
  const forwarded = new URLSearchParams(search)
  forwarded.delete('brand')
  const qs = forwarded.toString()

  const destination = publicUrl(`${target}${qs ? `?${qs}` : ''}`, brand)

  // Never 301 — the right destination changes with the switcher, and a
  // permanent redirect would get cached against the wrong brand.
  return NextResponse.redirect(destination, 302)
}
