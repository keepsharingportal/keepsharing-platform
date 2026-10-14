// Isolation checked with each brand's REAL content, not seeded markers.
// Stronger than the ZZTEST probe: it proves the live corpus is separated,
// not just that one synthetic row is.
//
//   node scripts/real-content-isolation-probe.mjs http://localhost:3000
//   node scripts/real-content-isolation-probe.mjs https://www.riverregionparents.com https://gpp.keepsharing.com
//
// ── One base URL or two ─────────────────────────────────────────────────────
// With ONE base, the brand is switched with the rrp_brand_override cookie.
// That only works on a deployment that serves every brand from one host,
// i.e. localhost.
//
// Against a real brand domain the cookie is ignored — the proxy resolves the
// brand from the Host header, as it should — so both columns were really the
// same brand and all four direct-URL checks reported a failure that was not
// one. Four false failures is worse than no probe: it teaches you to discount
// the output, which is exactly how the earlier surface sweep passed while
// three routes leaked.
//
// So: pass BOTH brand origins to check a live deployment, and the brand comes
// from the host with no cookie at all.
import fs from 'fs'
const RRP_BASE = process.argv[2] ?? 'http://localhost:4822'
const GPP_BASE = process.argv[3] ?? null
/** True when each brand has its own origin, so the host decides the brand. */
const PER_HOST = Boolean(GPP_BASE)
const baseFor = brand => (PER_HOST && brand === 'gpp' ? GPP_BASE : RRP_BASE)
const env = Object.fromEntries(fs.readFileSync('.env.local','utf8').split(/\r?\n/)
  .filter(l => l.includes('=') && !l.startsWith('#'))
  .map(l => [l.slice(0,l.indexOf('=')).trim(), l.slice(l.indexOf('=')+1).trim().replace(/^["']|["']$/g,'')]))
const q = async p => {
  const r = await fetch(env.NEXT_PUBLIC_SUPABASE_URL + '/rest/v1/' + p,
    { headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: 'Bearer ' + env.SUPABASE_SERVICE_ROLE_KEY } })
  return r.ok ? r.json() : []
}
const get = async (path, brand) => {
  // No cookie in per-host mode: sending one would be harmless but misleading,
  // because it implies the cookie is what selected the brand.
  const headers = PER_HOST ? {} : { Cookie: `rrp_brand_override=${brand}` }
  const r = await fetch(baseFor(brand) + path, { headers, redirect: 'manual' })
  return { status: r.status, body: r.status === 200 ? await r.text() : '' }
}
console.log(PER_HOST
  ? `brand from Host: rrp=${RRP_BASE}  gpp=${GPP_BASE}`
  : `brand from cookie on ${RRP_BASE} (single-host mode)`)

let pass = 0, fail = 0
const line = (ok, m) => { ok ? pass++ : fail++; console.log(`${ok ? ' ok  ' : 'FAIL '}${m}`) }

// One real article and event from each brand.
const [gppArt] = await q('guide_articles?brand_slug=eq.gpp&published=eq.true&select=slug,column_slug,title&limit=1')
const [rrpArt] = await q('guide_articles?brand_slug=eq.rrp&published=eq.true&select=slug,column_slug,title&limit=1')
const [gppEvt] = await q('calendar_events?market=eq.gpp&status=eq.published&select=slug,title&limit=1')
const [rrpEvt] = await q('calendar_events?market=eq.rrp&status=eq.published&select=slug,title&limit=1')

for (const [label, row, mk] of [
  ['article', gppArt, a => `/columns/${a.column_slug}/${a.slug}`],
  ['event',   gppEvt, e => `/calendar/events/${e.slug}`],
]) {
  if (!row?.slug) { console.log(`     (no gpp ${label} to test)`); continue }
  const url = mk(row)
  const g = await get(url, 'gpp'), r = await get(url, 'rrp')
  line(g.status === 200 && r.status !== 200,
    `gpp ${label} ${url.slice(0, 54).padEnd(54)} gpp=${g.status} rrp=${r.status} (want 200/non-200)`)
}
for (const [label, row, mk] of [
  ['article', rrpArt, a => `/columns/${a.column_slug}/${a.slug}`],
  ['event',   rrpEvt, e => `/calendar/events/${e.slug}`],
]) {
  if (!row?.slug) { console.log(`     (no rrp ${label} to test)`); continue }
  const url = mk(row)
  const g = await get(url, 'gpp'), r = await get(url, 'rrp')
  line(r.status === 200 && g.status !== 200,
    `rrp ${label} ${url.slice(0, 54).padEnd(54)} rrp=${r.status} gpp=${g.status} (want 200/non-200)`)
}

// Lists must not carry the other brand's titles.
for (const [path, brand, otherTitle, otherLabel] of [
  ['/calendar', 'gpp', rrpEvt?.title, 'an rrp event'],
  ['/calendar', 'rrp', gppEvt?.title, 'a gpp event'],
  ['/articles', 'gpp', rrpArt?.title, 'an rrp article'],
  ['/articles', 'rrp', gppArt?.title, 'a gpp article'],
]) {
  if (!otherTitle) continue
  const { status, body } = await get(path, brand)
  const leaked = status === 200 && body.includes(otherTitle)
  line(!leaked, `${brand} ${path.padEnd(10)} does not list ${otherLabel} ("${String(otherTitle).slice(0, 34)}")`)
}
console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
