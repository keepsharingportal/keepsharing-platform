import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

// A structural test, not a behavioural one — on purpose.
//
// lib/checkout-origin.ts was already correct and already had a passing
// "forged Origin is not echoed back" test. It did not matter: six other
// checkout routes never called it, and each one carried the line
//
//   const origin = req.headers.get('origin') ?? NEXT_PUBLIC_SITE_URL ?? '…'
//
// which is the open redirect the resolver exists to prevent, plus a fallback
// that returned a Greater Pensacola payer to River Region's site. A unit test
// on the resolver cannot catch a route that doesn't use the resolver, so this
// asserts the shape of the codebase instead of the shape of one function.
//
// If this fails on a route you just added: call checkoutOrigin(req) rather
// than reading the Origin header. If a route genuinely must not (a webhook
// with no browser in the loop), add it to ALLOWED below with a reason.

const ROOT = path.join(import.meta.dirname, '..', 'src', 'app')

/** Routes that build a Stripe redirect without the resolver, and why. */
const ALLOWED: Record<string, string> = {
  // Admin-only: generates a payment link from inside the admin UI, so
  // nextUrl.origin is the admin host the operator is already on, and it is
  // server-derived rather than client-supplied.
  'api/admin/ads/payment-link/route.ts': 'admin-originated, uses req.nextUrl.origin',
}

function walk(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p, out)
    else if (e.name === 'route.ts') out.push(p)
  }
  return out
}

const routes = walk(ROOT).map(abs => ({
  rel:  path.relative(ROOT, abs).split(path.sep).join('/'),
  text: fs.readFileSync(abs, 'utf8'),
}))

// Both spellings. The Stripe API field is snake_case, but our own
// createCheckoutSession wrapper takes successUrl/cancelUrl — and matching only
// snake_case missed /api/advertise/featured-checkout, which had the same
// unvalidated-Origin bug as the six this test was written for.
const checkoutRoutes = routes.filter(r =>
  /success_?[uU]rl|cancel_?[uU]rl/.test(r.text) && !ALLOWED[r.rel])

test('there are checkout routes to check (the walk found something)', () => {
  assert.ok(checkoutRoutes.length >= 6,
    `expected several checkout routes, found ${checkoutRoutes.length}`)
})

test('no checkout route builds a Stripe redirect from the raw Origin header', () => {
  const offenders = checkoutRoutes
    .filter(r => /headers\.get\(\s*['"]origin['"]\s*\)/i.test(r.text))
    .map(r => r.rel)
  assert.deepEqual(offenders, [],
    `these routes read the Origin header directly — use checkoutOrigin(req):\n  ${offenders.join('\n  ')}`)
})

test('no checkout route hardcodes a brand host in a redirect', () => {
  const offenders = checkoutRoutes
    .filter(r => /['"`]https?:\/\/[^'"`\n]*(riverregionparents|riverregion50plus|greaterpensacolaparents|mobilebayparents|auburnopelikaparents|easternshoreparents)\.com/i.test(r.text))
    .map(r => r.rel)
  assert.deepEqual(offenders, [],
    `these routes hardcode a brand host:\n  ${offenders.join('\n  ')}`)
})

test('every checkout route resolves its origin through checkoutOrigin', () => {
  const offenders = checkoutRoutes
    .filter(r => !/checkoutOrigin\s*\(/.test(r.text))
    .map(r => r.rel)
  assert.deepEqual(offenders, [],
    `these routes never call checkoutOrigin(req):\n  ${offenders.join('\n  ')}`)
})
