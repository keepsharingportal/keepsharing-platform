// Brand-isolation prober. Each surface is checked from BOTH brands.
//
// Two kinds of check:
//   status  — a direct URL for a GPP item must 200 on GPP and 404 on RRP
//             (and the reverse for an RRP item)
//   absent  — a list/feed must contain the marker on its own brand and not
//             on the other
const BASE = process.argv[2] ?? 'http://localhost:3500'
const GPP = { Cookie: 'rrp_brand_override=gpp' }

async function get(path, headers) {
  const r = await fetch(BASE + path, { headers: headers ?? {}, redirect: 'manual' })
  const body = r.status === 200 ? await r.text() : ''
  return { status: r.status, body }
}

const results = []
function record(surface, detail, pass, note) {
  results.push({ surface, detail, pass, note })
}

// ── direct URLs for the seeded GPP items ────────────────────────────────────
const GPP_URLS = [
  ['article (column route)', '/columns/mom-to-mom/zztest-gpp-mom-to-mom'],
  ['article (feature route)', '/articles/zztest-gpp-feature'],
  ['article print view',      '/articles/zztest-gpp-feature/print'],
  ['event detail',            '/calendar/events/zztest-gpp-event'],
  ['guide listing detail',    '/childcare-guide/listings/zztest-gpp-childcare'],
  ['school bit detail',       '/school-zone/school-bits/zztest-gpp-school-bit'],
]
for (const [name, url] of GPP_URLS) {
  const g = await get(url, GPP)
  const r = await get(url)
  record(name, url, g.status === 200 && r.status === 404, `GPP ${g.status} / RRP ${r.status}`)
}

// ── lists, feeds, metadata: GPP marker must appear only on GPP ─────────────
const MARKER = 'ZZTEST'
const LISTS = [
  ['homepage',               '/'],
  ['articles index',         '/articles'],
  ['column archive',         '/columns/mom-to-mom'],
  ['calendar list',          '/calendar'],
  ['calendar feed API p1',   '/api/calendar/events?when=upcoming&page=1'],
  ['calendar feed API p2',   '/api/calendar/events?when=upcoming&page=2'],
  ['calendar ICS',           '/api/calendar/feed.ics'],
  ['guide hub (childcare)',  '/childcare-guide'],
  ['local guides',           '/local-guides'],
  ['school zone',            '/school-zone'],
  ['school bits browse',     '/school-zone/school-bits'],
  ['family resource guide',  '/family-resource-guide'],
  ['sitemap',                '/sitemap.xml'],
  ['search (zztest)',        '/search?q=zztest'],
  ['business spotlight',     '/business-spotlight'],
  ['best of',                '/best-of'],
  ['mom knows best',         '/mom-knows-best'],
  ['games',                  '/games'],
  ['birthday guide',         '/birthday-party-guide'],
  ['birthday finder',        '/birthday-party-guide/finder'],
  ['newcomer guide',         '/newcomer-guide'],
]
for (const [name, url] of LISTS) {
  const g = await get(url, GPP)
  const r = await get(url)
  const onG = g.body.includes(MARKER)
  const onR = r.body.includes(MARKER)
  // Pass = never leaks to RRP. (Not every list is expected to SHOW it on GPP.)
  record(name, url, !onR, `GPP shows=${onG ? 'y' : 'n'} RRP shows=${onR ? 'y' : 'n'} (${g.status}/${r.status})`)
}

// ── hardcoded River Region identity on GPP ────────────────────────────────
const IDENTITY = [
  ['logo asset',    '/', /rrp-logo|riverregion[^.]*\.(png|jpg|svg)/i],
  ['RRP email',     '/', /hello@riverregionparents\.com/i],
  ['RRP phone',     '/', /334[-.\s)]?328[-.\s]?5189/],
  ['county names',  '/school-zone', /Pike Road|Autauga/],
]
for (const [name, url, re] of IDENTITY) {
  const g = await get(url, GPP)
  const hit = re.test(g.body)
  record('identity: ' + name, url, !hit, hit ? 'FOUND on GPP' : 'clean')
}

// ── report ────────────────────────────────────────────────────────────────
const fail = results.filter(r => !r.pass)
for (const r of results) {
  console.log(`${r.pass ? ' ok  ' : 'FAIL '}${r.surface.padEnd(26)} ${r.detail.padEnd(46)} ${r.note}`)
}
console.log(`\n${results.length - fail.length}/${results.length} passed` + (fail.length ? `  —  ${fail.length} FAILURES` : ''))
