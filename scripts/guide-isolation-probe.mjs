// Guide-isolation prober.
//
// Checks the three things that can go wrong once guides are per-brand:
//   1. an inactive guide must not be publicly reachable on that brand
//   2. no brand may render another brand's listings
//   3. no brand may render another brand's editorial copy
//
// Reads rendered HTML, because the failures this catches all looked fine in
// the source: /birthday-party-guide was public on every brand for weeks
// while its config said is_active = false, because its route tree never
// consulted the gate.
//
//   node scripts/guide-isolation-probe.mjs https://gpp.keepsharing.com
//   node scripts/guide-isolation-probe.mjs http://localhost:3000   (uses the
//                                           rrp_brand_override cookie)
import fs from 'fs'

const BASE = process.argv[2] ?? 'http://localhost:3000'
const LOCAL = /localhost|127\.0\.0\.1/.test(BASE)

// Live hosts carry their own brand; locally we steer with the dev cookie.
const BRANDS = LOCAL
  ? [
      { slug: 'rrp', headers: { Cookie: 'rrp_brand_override=rrp' } },
      { slug: 'gpp', headers: { Cookie: 'rrp_brand_override=gpp' } },
    ]
  : [{ slug: BASE.includes('riverregionparents') ? 'rrp' : 'gpp', headers: {} }]

const GUIDE_PATHS = [
  ['afterschool',      '/afterschool-guide'],
  ['birthday-party',   '/birthday-party-guide'],
  ['childcare',        '/childcare-guide'],
  ['healthy-kids',     '/healthy-kids-guide'],
  ['private-school',   '/private-school-guide'],
  ['special-needs',    '/special-needs-guide'],
  ['summer-camp',      '/summer-camp-guide'],
  ['summer-fun',       '/summer-fun-guide'],
  ['newcomer',         '/family-resource-guide'],
  ['fall-festivities', '/fall-festivities-halloween-fun-guide'],
  ['grown-up-time',    '/grown-up-time-guide'],
]

// Wording that belongs to exactly one brand. Finding it on another is a leak.
const OWNED_COPY = {
  rrp: /River Region|Montgomery|Prattville|Pike Road|Autauga|Elmore|Wetumpka|Millbrook/,
  gpp: /Greater Pensacola|Pensacola|Gulf Breeze|Cantonment|Milton, FL|Pace, FL/,
}

function env() {
  if (!fs.existsSync('.env.local')) return {}
  return Object.fromEntries(fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim().replace(/^["']|["']$/g, '')]))
}

async function db(path) {
  const e = env()
  if (!e.NEXT_PUBLIC_SUPABASE_URL || !e.SUPABASE_SERVICE_ROLE_KEY) return null
  const r = await fetch(e.NEXT_PUBLIC_SUPABASE_URL + '/rest/v1/' + path,
    { headers: { apikey: e.SUPABASE_SERVICE_ROLE_KEY, Authorization: 'Bearer ' + e.SUPABASE_SERVICE_ROLE_KEY } })
  return r.ok ? r.json() : null
}

function visible(html) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script(?![^>]*ld\+json)[^>]*>[\s\S]*?<\/script>/gi, '')
}

let pass = 0, fail = 0
const line = (ok, msg) => { ok ? pass++ : fail++; console.log(`${ok ? ' ok  ' : 'FAIL '}${msg}`) }

// Expected visibility comes from the database, so the probe cannot drift
// from the publisher's actual switches.
const configs = await db('guide_configs?select=market,guide_type_slug,is_active')
const activeFor = {}
for (const c of configs ?? []) activeFor[`${c.market}:${c.guide_type_slug}`] = c.is_active !== false

for (const brand of BRANDS) {
  console.log(`\n── ${brand.slug} @ ${BASE} ───────────────────────────────`)
  const foreign = Object.entries(OWNED_COPY).filter(([k]) => k !== brand.slug)

  for (const [slug, path] of GUIDE_PATHS) {
    let r
    try { r = await fetch(BASE + path, { headers: brand.headers, redirect: 'manual' }) }
    catch (e) { line(false, `${path} — request failed: ${String(e).slice(0, 50)}`); continue }

    const expected = activeFor[`${brand.slug}:${slug}`]
    if (expected === undefined) {
      // No config row for this brand: not part of its library.
      line(r.status !== 200, `${path.padEnd(42)} no config for ${brand.slug} → ${r.status} (want non-200)`)
      continue
    }
    if (!expected) {
      line(r.status !== 200, `${path.padEnd(42)} is_active=false → ${r.status} (want non-200)`)
      continue
    }
    if (r.status !== 200) { line(false, `${path.padEnd(42)} is_active=true → ${r.status} (want 200)`); continue }

    // Active and reachable: it must contain none of another brand's words.
    const body = visible(await r.text())
    let clean = true
    for (const [other, re] of foreign) {
      const m = body.match(re)
      if (m) { clean = false; line(false, `${path.padEnd(42)} contains ${other} wording: "${m[0]}"`) }
    }
    if (clean) line(true, `${path.padEnd(42)} live and free of other brands' wording`)
  }
}

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
