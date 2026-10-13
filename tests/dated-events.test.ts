import { test } from 'node:test'
import assert from 'node:assert/strict'
import { dateStatus, isExpired, compareByDate, partitionByDate, datedWindow } from '@/lib/guides/dated-events'
import { guideIsLive } from '@/lib/guides/live'

const gd = (start?: string, end?: string) => ({
  guide_data: { ...(start ? { start_date: start } : {}), ...(end ? { end_date: end } : {}) },
})
const TODAY = '2026-10-20'

test('happening now means today is inside the window, inclusive', () => {
  assert.equal(dateStatus(gd('2026-10-18', '2026-10-25').guide_data, TODAY), 'happening-now')
  assert.equal(dateStatus(gd('2026-10-20', '2026-10-20').guide_data, TODAY), 'happening-now')
  assert.equal(dateStatus(gd('2026-10-20', '2026-10-31').guide_data, TODAY), 'happening-now')
  assert.equal(dateStatus(gd('2026-10-01', '2026-10-20').guide_data, TODAY), 'happening-now')
})

test('upcoming and past', () => {
  assert.equal(dateStatus(gd('2026-10-30', '2026-10-31').guide_data, TODAY), 'upcoming')
  assert.equal(dateStatus(gd('2026-10-01', '2026-10-05').guide_data, TODAY), 'past')
})

test('a single date works with only start or only end — the importer sets one', () => {
  assert.equal(dateStatus(gd('2026-10-30').guide_data, TODAY), 'upcoming')
  assert.equal(dateStatus(gd(undefined, '2026-10-05').guide_data, TODAY), 'past')
  assert.deepEqual(datedWindow(gd('2026-10-30').guide_data), { start: '2026-10-30', end: '2026-10-30' })
})

test('undated listings are kept, not hidden — "Weekends through October" is real', () => {
  assert.equal(dateStatus({}, TODAY), 'undated')
  assert.equal(isExpired({}, TODAY), false)
})

test('auto-expire only drops finished events', () => {
  assert.equal(isExpired(gd('2026-10-01', '2026-10-05').guide_data, TODAY), true)
  assert.equal(isExpired(gd('2026-10-18', '2026-10-25').guide_data, TODAY), false)
})

test('chronological sort, soonest first, undated last, ties by name', () => {
  const rows = [
    { ...gd('2026-10-31'), business_name: 'Zeta Farm' },
    { guide_data: {},      business_name: 'Weekends Place' },
    { ...gd('2026-10-22'), business_name: 'Beta Patch' },
    { ...gd('2026-10-31'), business_name: 'Alpha Maze' },
  ]
  assert.deepEqual([...rows].sort(compareByDate).map(r => r.business_name),
    ['Beta Patch', 'Alpha Maze', 'Zeta Farm', 'Weekends Place'])
})

test('partition splits a seasonal hub the way it should read', () => {
  const rows = [
    { ...gd('2026-10-18', '2026-10-25'), business_name: 'On Now' },
    { ...gd('2026-10-30'),               business_name: 'Later' },
    { ...gd('2026-10-01', '2026-10-05'), business_name: 'Finished' },
    { guide_data: {},                    business_name: 'Undated' },
  ]
  const p = partitionByDate(rows, TODAY)
  assert.deepEqual(p.happeningNow.map(r => r.business_name), ['On Now'])
  assert.deepEqual(p.upcoming.map(r => r.business_name),     ['Later'])
  assert.deepEqual(p.undated.map(r => r.business_name),      ['Undated'])
  assert.deepEqual(p.expired.map(r => r.business_name),      ['Finished'])
})

test('tolerates a full timestamp, which the admin editor may write', () => {
  assert.equal(dateStatus({ start_date: '2026-10-30T00:00:00Z' }, TODAY), 'upcoming')
})

// ── per-market live window (migration 234) ─────────────────────────────────
test("a brand's own window overrides the global catalog window", () => {
  const catalog = { live_from: '2026-10-01', live_until: '2026-11-08' }
  // Nov 20: closed on the catalog window, open on GPP's extended one.
  assert.equal(guideIsLive(catalog, { is_active: true }, { todayIso: '2026-11-20' }), false)
  assert.equal(guideIsLive(catalog, { is_active: true, live_until: '2026-12-01' }, { todayIso: '2026-11-20' }), true)
  assert.equal(guideIsLive(catalog, { is_active: true, live_until: '2026-12-01' }, { todayIso: '2026-12-02' }), false)
})

test('is_active=false closes a guide whatever the dates say', () => {
  assert.equal(guideIsLive({ live_from: '2026-10-01', live_until: '2026-12-01' },
    { is_active: false, live_until: '2026-12-01' }, { todayIso: '2026-10-20' }), false)
})

test('a null window on the brand falls back to the catalog, so RRP is unchanged', () => {
  const catalog = { live_from: '2026-10-01', live_until: '2026-11-08' }
  assert.equal(guideIsLive(catalog, { is_active: true }, { todayIso: '2026-10-20' }), true)
  assert.equal(guideIsLive(catalog, { is_active: true }, { todayIso: '2026-11-09' }), false)
})

test('a brand with no config row does not get the guide (requireConfig)', () => {
  const evergreen = {}
  // Before: a missing row fell through to the date window and the guide was
  // live, so adding grown-up-time for one brand opened an empty copy of it
  // on every other brand.
  assert.equal(guideIsLive(evergreen, null, { requireConfig: true }), false)
  assert.equal(guideIsLive(evergreen, undefined, { requireConfig: true }), false)
  assert.equal(guideIsLive(evergreen, { is_active: true }, { requireConfig: true }), true)
})

test('without requireConfig a missing row still shows, for a pre-232 database', () => {
  assert.equal(guideIsLive({}, null), true)
})
