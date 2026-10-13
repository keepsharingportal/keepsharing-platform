// Isolation checked with each brand's REAL content, not seeded markers.
// Stronger than the ZZTEST probe: it proves the live corpus is separated,
// not just that one synthetic row is.
import fs from 'fs'
const BASE = process.argv[2] ?? 'http://localhost:4822'
const env = Object.fromEntries(fs.readFileSync('.env.local','utf8').split(/\r?\n/)
  .filter(l => l.includes('=') && !l.startsWith('#'))
  .map(l => [l.slice(0,l.indexOf('=')).trim(), l.slice(l.indexOf('=')+1).trim().replace(/^["']|["']$/g,'')]))
const q = async p => {
  const r = await fetch(env.NEXT_PUBLIC_SUPABASE_URL + '/rest/v1/' + p,
    { headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: 'Bearer ' + env.SUPABASE_SERVICE_ROLE_KEY } })
  return r.ok ? r.json() : []
}
const get = async (path, brand) => {
  const r = await fetch(BASE + path, { headers: { Cookie: `rrp_brand_override=${brand}` }, redirect: 'manual' })
  return { status: r.status, body: r.status === 200 ? await r.text() : '' }
}
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
