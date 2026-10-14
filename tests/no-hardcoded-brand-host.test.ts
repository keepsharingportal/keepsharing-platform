import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

// One deployment serves six brand domains. Any code that writes a brand host
// into something a reader, advertiser or partner receives — a payment
// redirect, a magic link, an onboarding URL, an email body — has to resolve
// the brand at request time. A literal, or NEXT_PUBLIC_SITE_URL (which holds
// ONE value for all six brands), sends a Greater Pensacola recipient to River
// Region's site.
//
// This test scans for the literals. It is crude on purpose: the class of bug
// is "someone typed riverregionparents.com into a URL", and a scan catches
// that in code nobody thought to write a unit test for. Fourteen separate
// files had it.
//
// ALLOWED documents every deliberate exception with its reason. Adding an
// entry is a decision; leaving one undocumented is the bug.

const SRC = path.join(import.meta.dirname, '..', 'src')

/** file → why a brand literal is correct there. */
const ALLOWED: Record<string, string> = {
  // The brand registry itself. These ARE the hosts.
  'lib/markets.ts':              'the registry of brands and their hosts',
  'lib/brands.ts':               'per-brand chrome defaults, keyed by slug',
  'lib/social/share-article.ts': 'per-brand map of share domains',
  'lib/seo/brand-seo.ts':        'per-brand SEO config, keyed by slug',

  // Source copy that brandifyCopy() rewrites per brand at render time. The
  // literal is the River Region original, not what another brand renders.
  'lib/submissions.ts':          'source copy; brandifyCopy rewrites photoEmail per brand',

  // Deliberately single-brand features.
  'lib/games/draw.ts':           'the weekly prize draw is RRP-only by design (MARKET const)',

  // Documented last-resort fallbacks, reached only when no brand resolves.
  'lib/email/brand-sender.ts':   'the Resend-verified sending domain; see its header',
  'lib/email/brand-recipient.ts': 'the platform inbox of last resort; see its header',
  'lib/circulation/emailQueue.ts': 'documented fallback below a per-brand lookup',
  'components/seo/SerpPreview.tsx': 'last-resort breadcrumb when no brand is passed',

  // An ICS UID namespace. Changing a UID duplicates every subscriber's
  // events — this string must never change, for any brand.
  'app/go/[shortcode]/route.ts': 'ICS UID namespace; changing it duplicates subscriber events',

  // ── Admin-side, reviewed and kept ──────────────────────────────────────
  // Nothing below reaches a reader, an advertiser or a partner.
  'app/admin/ads/[id]/edit/page.tsx':
    'an input placeholder showing the shape of a rep email, not a value sent anywhere',
  'app/admin/articles/[id]/edit/page.tsx':
    'already resolves publicHost from MARKETS; the literal is the last-resort default',
  'app/admin/games/page.tsx':
    'the prize draw is RRP-only by design — same decision as lib/games/draw.ts',
  'app/admin/integrations/search-console/SearchConsoleClient.tsx':
    'initial value of a Search Console property field the admin types over',
  'app/admin/settings/page.tsx':
    'the staff roster — real people\'s work addresses, not brand chrome',
  'components/agreements/AgreementGenerator.tsx':
    'the publisher\'s own contact on the contract; KeepSharing LLC is the counterparty for every brand',
}

const BRAND_HOSTS = /riverregionparents\.com|riverregion50plus\.com|greaterpensacolaparents\.com|mobilebayparents\.com|auburnopelikaparents\.com|easternshoreparents\.com/

function walk(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p, out)
    else if (/\.tsx?$/.test(e.name)) out.push(p)
  }
  return out
}

/**
 * Blank out comments, preserving the line count.
 *
 * A global /\*…*\/ strip collapses lines and every reported line number is
 * then wrong — which sent me reading the wrong line in six files. Blanking in
 * place keeps line N as line N.
 */
function stripComments(s: string): string {
  const out: string[] = []
  let inBlock = false
  for (const raw of s.split(/\r?\n/)) {
    let line = raw
    if (inBlock) {
      const end = line.indexOf('*/')
      if (end < 0) { out.push(''); continue }
      line = ' '.repeat(end + 2) + line.slice(end + 2)
      inBlock = false
    }
    // Strip any complete /* … */ runs on this line, then a trailing //.
    line = line.replace(/\/\*.*?\*\//g, m => ' '.repeat(m.length))
    const open = line.indexOf('/*')
    if (open >= 0) { line = line.slice(0, open); inBlock = true }
    const slash = line.indexOf('//')
    if (slash >= 0) line = line.slice(0, slash)
    out.push(line)
  }
  return out.join('\n')
}

const files = walk(SRC).map(abs => {
  const rel = path.relative(SRC, abs).split(path.sep).join('/')
  return { rel, code: stripComments(fs.readFileSync(abs, 'utf8')) }
})

test('the scan actually reads the source tree', () => {
  assert.ok(files.length > 300, `expected the whole src tree, got ${files.length} files`)
})

test('no brand host is hardcoded outside the documented exceptions', () => {
  const offenders = files
    .filter(f => !ALLOWED[f.rel] && BRAND_HOSTS.test(f.code))
    .map(f => {
      const line = f.code.split('\n').findIndex(l => BRAND_HOSTS.test(l)) + 1
      return `${f.rel}:${line}`
    })
  assert.deepEqual(offenders, [],
    'hardcoded brand host — resolve the brand instead (lib/markets.ts ' +
    `publicOriginForBrand, or lib/checkout-origin.ts for payments):\n  ${offenders.join('\n  ')}`)
})

test('every ALLOWED entry still exists and still needs the exception', () => {
  // A stale exception is how a real offender sneaks back in under cover of a
  // path that no longer has the literal.
  const stale = Object.keys(ALLOWED).filter(rel => {
    const f = files.find(x => x.rel === rel)
    return !f || !BRAND_HOSTS.test(f.code)
  })
  assert.deepEqual(stale, [],
    `these exceptions are no longer needed — delete them from ALLOWED:\n  ${stale.join('\n  ')}`)
})
