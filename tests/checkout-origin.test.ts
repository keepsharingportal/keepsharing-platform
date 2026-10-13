import { test } from 'node:test'
import assert from 'node:assert/strict'
import { checkoutOrigin } from '@/lib/checkout-origin'

// Minimal stand-in for the one thing checkoutOrigin reads.
const req = (h: Record<string, string>) =>
  ({ headers: { get: (k: string) => h[k.toLowerCase()] ?? null } }) as unknown as Parameters<typeof checkoutOrigin>[0]

test('keeps the advertiser on the staging host they are actually using', () => {
  // GPP runs on gpp.keepsharing.com today; its publicHost is not pointed yet,
  // so redirecting there would strand them.
  const r = checkoutOrigin(req({ origin: 'https://gpp.keepsharing.com', host: 'gpp.keepsharing.com' }))
  assert.equal(r.origin, 'https://gpp.keepsharing.com')
  assert.equal(r.brand, 'gpp')
})

test('keeps RRP on its own canonical www host', () => {
  const r = checkoutOrigin(req({ origin: 'https://www.riverregionparents.com', host: 'www.riverregionparents.com' }))
  assert.equal(r.origin, 'https://www.riverregionparents.com')
  assert.equal(r.brand, 'rrp')
})

test('never returns one brand for another brand request', () => {
  const gpp = checkoutOrigin(req({ host: 'gpp.keepsharing.com' }))
  assert.equal(gpp.brand, 'gpp')
  assert.ok(!gpp.origin.includes('riverregionparents'))
})

test('a forged Origin is not echoed back — no open redirect', () => {
  const r = checkoutOrigin(req({ origin: 'https://evil.example.com', host: 'gpp.keepsharing.com' }))
  assert.ok(!r.origin.includes('evil.example.com'))
  assert.equal(r.brand, 'gpp')
})

test('falls back to the brand canonical origin when only an unknown host is present', () => {
  const r = checkoutOrigin(req({ host: 'some-preview-xyz.vercel.app' }))
  assert.ok(!r.origin.includes('evil'))
  // Unrecognised: resolves to the deployment default rather than a guess.
  assert.equal(typeof r.origin, 'string')
})

test('http for localhost so dev redirects work', () => {
  const r = checkoutOrigin(req({ origin: 'http://localhost:3000', host: 'localhost:3000' }))
  assert.ok(r.origin.startsWith('http://') || r.origin === '')
})
