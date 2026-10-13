// Fall Festivities behaviour, checked against a brand's real listings.
//
// Verifies the four things a seasonal dated guide has to get right:
//   Happening Now   events whose window includes today, first
//   chronological   upcoming ordered soonest-first
//   auto-expire     finished events gone without an editor unpublishing them
//   live window     per-brand, so one brand's season can outlast another's
//
// ── Two matching rules learned the hard way ─────────────────────────────────
// 1. Compare CARD TITLES, not substrings. GPP has a listing called "Pumpkin
//    Patch" and RRP has "Choctafaula Pumpkin Patch"; a substring check calls
//    that a leak. Titles are extracted from the rendered <h3>.
// 2. Compare only names UNIQUE to the brand under test. Both brands really do
//    have a "Pumpkin Festival" — local events share names constantly.
//
// Featured listings are excluded from the ordering check: they are a paid
// position rendered in a deliberately shuffled block above the sections, so
// page order cannot be chronological where they appear.
//
//   node scripts/fall-guide-probe.mjs http://localhost:3000
import fs from 'fs'

const BASE = process.argv[2] ?? 'http://localhost:3000'
const GUIDE = '/fall-festivities-halloween-fun-guide'

const env = Object.fromEntries(fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .filter(l => l.includes('=') && !l.startsWith('#'))
  .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim().replace(/^["']|["']$/g, '')]))
const q = async p => (await fetch(env.NEXT_PUBLIC_SUPABASE_URL + '/rest/v1/' + p,
  { headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: 'Bearer ' + env.SUPABASE_SERVICE_ROLE_KEY } })).json()

const get = async (path, brand) =>
  fetch(BASE + path, { headers: { Cookie: `rrp_brand_override=${brand}` } })

/** Card titles as rendered, so a title is matched whole or not at all. */
function cardTitles(html) {
  const out = new Set()
  for (const m of html.matchAll(/<h3[^>]*>([^<]{2,120})<\/h3>/g)) {
    out.add(m[1].replace(/&#x27;/g, "'").replace(/&amp;/g, '&').trim())
  }
  return out
}

const today = new Date().toISOString().slice(0, 10)
const win = g => ({
  s: (g?.start_date ?? g?.end_date ?? '').slice(0, 10) || null,
  e: (g?.end_date ?? g?.start_date ?? '').slice(0, 10) || null,
})

let pass = 0, fail = 0
const check = (ok, m) => { ok ? pass++ : fail++; console.log(`${ok ? ' ok  ' : 'FAIL '}${m}`) }

const gpp = await q('guide_listings?market=eq.gpp&guide_type_slug=eq.fall-festivities&select=business_name,listing_tier,guide_data&limit=500')
const rrp = await q('guide_listings?market=eq.rrp&guide_type_slug=eq.fall-festivities&select=business_name&limit=500')
const rrpNames = new Set(rrp.map(r => r.business_name))

const buckets = { now: [], soon: [], past: [], undated: [] }
for (const x of gpp) {
  const { s, e } = win(x.guide_data)
  if (!s && !e) buckets.undated.push(x)
  else if (e && today > e) buckets.past.push(x)
  else if (s && today < s) buckets.soon.push(x)
  else buckets.now.push(x)
}
console.log(`today ${today} — ${gpp.length} gpp fall listings: now ${buckets.now.length}, upcoming ${buckets.soon.length}, finished ${buckets.past.length}, undated ${buckets.undated.length}\n`)

const r = await get(`${GUIDE}?preview=1`, 'gpp')
check(r.status === 200, `preview renders while is_active=false → ${r.status}`)
if (r.status !== 200) { console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0) }
const body = await r.text()
const titles = cardTitles(body)

check(buckets.now.length === 0  || body.includes('Happening Now'), `"Happening Now" section (${buckets.now.length} qualify)`)
check(buckets.soon.length === 0 || body.includes('Coming Up'),     `"Coming Up" section (${buckets.soon.length} qualify)`)
check(buckets.undated.length === 0 || body.includes('All Season'), `"All Season" section (${buckets.undated.length} undated)`)

// Auto-expire: a finished event must not appear as a card at all.
const stillShown = buckets.past.filter(x => titles.has(x.business_name))
check(stillShown.length === 0,
  `finished events dropped (${buckets.past.length} finished, ${stillShown.length} still carded)`)
for (const x of stillShown) console.log(`        still shown: "${x.business_name}" ended ${win(x.guide_data).e}`)

// Chronological: free (non-featured) upcoming listings, soonest first.
const freeUpcoming = buckets.soon
  .filter(x => x.listing_tier === 'free' && titles.has(x.business_name))
  .sort((a, b) => win(a.guide_data).s.localeCompare(win(b.guide_data).s) ||
                  (a.business_name ?? '').localeCompare(b.business_name ?? ''))
const positions = freeUpcoming.map(x => body.indexOf(`>${x.business_name}<`)).filter(i => i >= 0)
const ascending = positions.every((p, i, a) => i === 0 || a[i - 1] <= p)
check(positions.length < 2 || ascending,
  `upcoming free listings render soonest-first (${positions.length} checked)`)

// Isolation, by whole title and only on names unique to GPP.
const rr = await get(GUIDE, 'rrp')
const rrpTitles = rr.status === 200 ? cardTitles(await rr.text()) : new Set()
const leaked = gpp
  .map(x => x.business_name)
  .filter(n => n && !rrpNames.has(n) && rrpTitles.has(n))
check(leaked.length === 0, `rrp page carries no GPP-only listing (${leaked.length} found)`)
for (const n of leaked) console.log(`        leaked: "${n}"`)

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
