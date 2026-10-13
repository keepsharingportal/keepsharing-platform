// Brand-isolation test harness — seeds one GPP item in every brand-scoped
// table, then tears it all down. Everything is prefixed ZZTEST / zztest so
// cleanup is unambiguous.
import fs from 'fs'

const env = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim().replace(/^["']|["']$/g, '')]))
const U = env.NEXT_PUBLIC_SUPABASE_URL, K = env.SUPABASE_SERVICE_ROLE_KEY
const q = (p, o = {}) => fetch(`${U}/rest/v1/${p}`, {
  ...o, headers: { apikey: K, Authorization: `Bearer ${K}`, 'Content-Type': 'application/json', ...(o.headers || {}) },
})
const post = async (t, body) => {
  const r = await q(t, { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(body) })
  const j = await r.json()
  if (!r.ok) { console.log(`  ! ${t}: ${r.status} ${JSON.stringify(j).slice(0, 140)}`); return null }
  return j[0]
}
const yesterday = new Date(Date.now() - 86400000).toISOString()
const soon      = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)

if (process.argv[2] === 'up') {
  // ── advertiser + guide listing ──────────────────────────────────────────
  const adv = await post('advertiser_accounts?on_conflict=slug', {
    business_name: 'ZZTEST Pensacola Childcare', slug: 'zztest-gpp-childcare', market: 'gpp',
    kind: 'directory_only', lifecycle_stage: 'active', is_active: true,
    card_hook: 'Temporary brand-isolation test.', detail_lead: 'Temporary brand-isolation test.',
    city_state_zip: 'Pensacola, FL 32501',
  })
  if (adv) await post('guide_listings', {
    advertiser_account_id: adv.id, guide_type_slug: 'childcare', market: 'gpp', listing_year: 2026,
    listing_tier: 'featured', category: 'Daycare Centers', is_published: true, display_order: 1,
    business_name: 'ZZTEST Pensacola Childcare', card_hook: 'Temporary brand-isolation test.',
    city_state_zip: 'Pensacola, FL 32501',
  })

  // ── articles: one column-routed, one feature-routed ─────────────────────
  await post('guide_articles', {
    title: 'ZZTEST GPP Mom to Mom', slug: 'zztest-gpp-mom-to-mom', column_slug: 'mom-to-mom',
    guide_slug: 'mom-to-mom', brand_slug: 'gpp', author_name: 'ZZTEST Author',
    excerpt: 'Temporary brand-isolation test.', body: '<p>test</p>',
    published: true, published_at: yesterday,
  })
  await post('guide_articles', {
    title: 'ZZTEST GPP Feature', slug: 'zztest-gpp-feature', column_slug: 'feature',
    guide_slug: 'feature', brand_slug: 'gpp', author_name: 'ZZTEST Author',
    excerpt: 'Temporary brand-isolation test.', body: '<p>test</p>',
    published: true, published_at: yesterday,
  })

  // ── event ───────────────────────────────────────────────────────────────
  await post('calendar_events', {
    title: 'ZZTEST GPP Event', slug: 'zztest-gpp-event', market: 'gpp', status: 'published',
    start_date: soon, description: 'Temporary brand-isolation test.',
    location_name: 'Pensacola Test Venue', city: 'Pensacola',
  })

  // ── school + school bit ─────────────────────────────────────────────────
  const sch = await post('schools', {
    name: 'ZZTEST Pensacola Elementary', market: 'gpp', area: 'montgomery',
    is_private: false, status: 'active',
  })
  await post('school_bits', {
    market: 'gpp', school_name: 'ZZTEST Pensacola Elementary', school_id: sch?.id ?? null,
    title: 'ZZTEST GPP school bit', blurb: 'Temporary brand-isolation test.',
    slug: 'zztest-gpp-school-bit', status: 'published', published_at: yesterday,
  })

  // ── magazine issue ──────────────────────────────────────────────────────
  await post('magazine_issues', {
    market: 'gpp', label: 'ZZTEST GPP Issue', issue_month: soon.slice(0, 7) + '-01',
  })

  console.log('seeded GPP test data')
} else {
  const del = async (p) => {
    const r = await q(p, { method: 'DELETE', headers: { Prefer: 'return=representation' } })
    const j = await r.json().catch(() => [])
    return Array.isArray(j) ? j.length : 0
  }
  let n = 0
  n += await del('guide_listings?business_name=like.ZZTEST*')
  n += await del('guide_articles?slug=like.zztest-*')
  n += await del('calendar_events?slug=like.zztest-*')
  n += await del('school_bits?slug=like.zztest-*')
  n += await del('schools?name=like.ZZTEST*')
  n += await del('magazine_issues?label=like.ZZTEST*')
  n += await del('advertiser_accounts?slug=like.zztest-*')
  console.log(`removed ${n} test rows`)
}
