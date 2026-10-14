import test from 'node:test'
import assert from 'node:assert/strict'
import { MARKETS } from '@/lib/markets'

// The maintenance page is the ONLY page a reader can reach during a tune-up
// window, and it was one static string carrying River Region's <title>,
// wordmark, tagline and inbox. Every brand served it. A Greater Pensacola
// reader was told, on the one page they could see, that they were on a
// different magazine's site.
//
// proxy.ts runs on the Edge and imports next/server, so the page builder is
// not importable here. These assertions cover the data it derives from —
// which is where a new brand would break it — plus the derivation rules.

test('every brand can name itself on the maintenance page', () => {
  for (const m of MARKETS) {
    assert.ok(m.displayName?.trim(), `${m.slug} has no displayName`)
    assert.ok(m.regionLabel?.trim(), `${m.slug} has no regionLabel`)
  }
})

test('the wordmark split leaves a lead and an accent for every brand', () => {
  // "River Region Parents" → lead "River Region", accent "Parents".
  for (const m of MARKETS) {
    const words = m.displayName.split(' ')
    const accent = words.length > 1 ? words[words.length - 1] : ''
    const lead = words.slice(0, -1).join(' ')
    assert.ok(accent, `${m.slug}: no accent word`)
    assert.ok(lead, `${m.slug}: no lead words — the wordmark would render blank`)
  }
})

test('the tagline reads correctly for both article forms', () => {
  const tagline = (m: typeof MARKETS[number]) =>
    `The Go-To Resource for ${m.regionTakesArticle ? `the ${m.regionLabel}` : m.regionLabel} Families`

  const rrp = MARKETS.find(m => m.slug === 'rrp')!
  const gpp = MARKETS.find(m => m.slug === 'gpp')!
  assert.equal(tagline(rrp), 'The Go-To Resource for the River Region Families')
  assert.equal(tagline(gpp), 'The Go-To Resource for Greater Pensacola Families')
  // "for the Greater Pensacola Families" is the bug regionTakesArticle exists
  // to prevent, so assert it never comes back.
  assert.ok(!tagline(gpp).includes('for the Greater Pensacola'))
})

test('the contact line is a brand\'s own domain or absent — never another brand\'s', () => {
  for (const m of MARKETS) {
    const inbox = m.photoEmail ? `hello@${m.photoEmail.split('@')[1]}` : null
    if (!inbox) continue
    // Whatever address a brand shows must live on that brand's own host.
    const host = m.publicHost.replace(/^www\./, '')
    assert.ok(inbox.endsWith(`@${host}`),
      `${m.slug} would show ${inbox} but its host is ${host}`)
  }
})

test('a brand with no inbox of its own shows none', () => {
  // The rule everywhere: an unmonitored mailbox loses the message silently,
  // and another brand's address under this masthead is worse than none.
  const gpp = MARKETS.find(m => m.slug === 'gpp')!
  const inbox = gpp.photoEmail ? `hello@${gpp.photoEmail.split('@')[1]}` : null
  assert.equal(inbox, null)
})
