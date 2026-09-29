// Layer 2 — feed ranking.
//
//   node --import ./scripts/test-resolver.mjs --test "src/**/*.test.ts"
//
// The invariant these protect: ranking changes ORDER WITHIN A DAY and nothing
// else. Chronology holds, nothing is dropped, and no amount of keyword
// stuffing lets one event own the first screen.

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import {
  familyScore, sortByFamilyRelevance, capFirstScreenRepeats, dedupeFeed, rankFeed,
  type RankableEvent,
} from './feed-rank'

let seq = 0
function ev(partial: Partial<RankableEvent> & { title: string }): RankableEvent {
  return {
    id:         partial.id ?? `ev-${++seq}`,
    start_date: '2026-10-03',
    ...partial,
  }
}

const WEEKLY = 'FREQ=WEEKLY;BYDAY=TU'
const DAILY  = 'FREQ=DAILY'

describe('familyScore — category base', () => {
  const cases: Array<[string | null, number]> = [
    ['drop-in', 3], ['library', 3], ['camps', 3], ['holiday', 3],
    ['festivals', 2], ['outdoor', 2], ['arts', 2],
    ['music', 1], ['sports', 1], ['faith', 1],
  ]
  for (const [category, base] of cases) {
    test(`${category} → ${base} (+2 one-off)`, () => {
      // A deliberately neutral title so only the category is measured.
      assert.equal(familyScore(ev({ title: 'Zzz', category })), base + 2)
    })
  }

  test('an unknown category scores 0 from category alone', () => {
    assert.equal(familyScore(ev({ title: 'Zzz', category: 'not-a-category' })), 0 + 2)
  })

  test('an uncategorised row still classifies off its title', () => {
    // "Storytime" classifies as library (+3) and boosts on the keyword (+1),
    // so it must beat the same row with no signal at all.
    const storytime = familyScore(ev({ title: 'Storytime', category: null }))
    const nothing   = familyScore(ev({ title: 'Zzz',       category: null }))
    assert.ok(storytime > nothing, `${storytime} should beat ${nothing}`)
  })
})

describe('familyScore — boosts and demotes', () => {
  test('keyword boosts cap at +4', () => {
    // Six boost terms in one title; without the cap this would be +6.
    const stuffed = ev({
      title: 'Family Kids Children Fall Festival Pumpkin Crafts', category: 'festivals',
    })
    // festivals 2 + cap 4 + one-off 2 = 8
    assert.equal(familyScore(stuffed), 8)
  })

  test('the venue contributes to boosts, not just the title', () => {
    const plain = familyScore(ev({ title: 'Billingsley Programming', category: null }))
    const kids  = familyScore(ev({ title: 'Billingsley Children’s Programming', category: null }))
    assert.ok(kids > plain)
  })

  test('demotes floor at -6 and never delete', () => {
    const s = familyScore(ev({
      title: 'Networking League Scavenger Hunt Calendar!', category: null, recurrence_rule: WEEKLY,
    }))
    assert.ok(s >= -6, `score ${s} must not fall below the floor`)
    assert.ok(s < 0, 'a pile of demote terms should still land negative')
  })

  test('a concert is never demoted just for being a concert', () => {
    const concert = familyScore(ev({ title: 'Live Music: The Band', category: 'music' }))
    assert.ok(concert > 0, `a concert scored ${concert}; music gets a mild boost, never a demote`)
  })

  test('the venue placeholder row sinks', () => {
    const placeholder = familyScore(ev({ title: 'BB King’s Blues Club Calendar!', recurrence_rule: WEEKLY }))
    const realEvent   = familyScore(ev({ title: 'Live Acoustic Street Performance', category: 'music', recurrence_rule: WEEKLY }))
    assert.ok(placeholder < realEvent, `${placeholder} should be below ${realEvent}`)
  })

  test('the placeholder still sinks when a venue is attached', () => {
    // Regression: the demote is anchored to end-of-string, and the boost
    // haystack is `title location`. Testing it against the concatenation meant
    // "BB King's Blues Club Calendar! BB Kings Blues Club" never matched, and
    // the real row scored +1 instead of -1. Demotes with an anchor must read
    // the title alone.
    const withVenue = familyScore(ev({
      title: 'BB King’s Blues Club Calendar!',
      location_name: 'BB Kings Blues Club',
      category: 'music',
      recurrence_rule: WEEKLY,
    }))
    assert.ok(withVenue < 0, `scored ${withVenue}; the placeholder must be demoted, not boosted`)
  })

  test('"calendar" only demotes at the end of a title', () => {
    // "Calendar Craft Workshop" is a real event, not a placeholder.
    const mid = familyScore(ev({ title: 'Advent Calendar Craft Workshop', category: 'arts' }))
    assert.ok(mid > 0)
  })
})

describe('familyScore — one-off, featured, clamp', () => {
  test('a one-off beats the same event as a weekly', () => {
    const base = { title: 'Fall Festival', category: 'festivals' as const }
    assert.equal(
      familyScore(ev({ ...base })) - familyScore(ev({ ...base, recurrence_rule: WEEKLY })),
      2,
    )
  })

  test('is_featured adds 2', () => {
    const base = { title: 'Zzz', category: 'music' as const, recurrence_rule: WEEKLY }
    assert.equal(
      familyScore(ev({ ...base, is_featured: true })) - familyScore(ev({ ...base })),
      2,
    )
  })

  test('score is clamped to [-6, 10]', () => {
    const max = familyScore(ev({
      title: 'Family Kids Children Fall Festival Pumpkin Halloween Crafts Storytime',
      category: 'holiday', is_featured: true,
    }))
    assert.ok(max <= 10, `${max} exceeds the ceiling`)

    const min = familyScore(ev({
      title: 'Networking League Scavenger Hunt Calendar!', category: null, recurrence_rule: WEEKLY,
    }))
    assert.ok(min >= -6, `${min} is below the floor`)
  })
})

describe('sortByFamilyRelevance', () => {
  test('chronology is never sacrificed to score', () => {
    const list = [
      ev({ title: 'Storytime', category: 'library', start_date: '2026-10-05' }),
      ev({ title: 'Networking League', category: null, start_date: '2026-10-03' }),
    ]
    const out = sortByFamilyRelevance(list)
    assert.deepEqual(out.map(e => e.start_date), ['2026-10-03', '2026-10-05'])
  })

  test('within a day, higher score leads', () => {
    const out = sortByFamilyRelevance([
      ev({ title: 'Adult Kickball League', category: 'sports', start_time: '08:00:00', recurrence_rule: WEEKLY }),
      ev({ title: 'Fall Festival',         category: 'festivals', start_time: '18:00:00' }),
    ])
    assert.equal(out[0].title, 'Fall Festival', 'the festival should lead despite starting later')
  })

  test('equal scores fall back to start time', () => {
    const out = sortByFamilyRelevance([
      ev({ title: 'B Concert', category: 'music', start_time: '19:00:00' }),
      ev({ title: 'A Concert', category: 'music', start_time: '10:00:00' }),
    ])
    assert.deepEqual(out.map(e => e.start_time), ['10:00:00', '19:00:00'])
  })

  test('untimed events sort after timed ones on the same day', () => {
    const out = sortByFamilyRelevance([
      ev({ title: 'A Concert', category: 'music', start_time: null }),
      ev({ title: 'B Concert', category: 'music', start_time: '19:00:00' }),
    ])
    assert.equal(out[0].title, 'B Concert')
  })

  test('the order is stable — same input, same output', () => {
    const list = [
      ev({ id: 'x', title: 'Same Name', category: 'music', start_time: '10:00:00' }),
      ev({ id: 'y', title: 'Same Name', category: 'music', start_time: '10:00:00' }),
    ]
    assert.deepEqual(
      sortByFamilyRelevance(list).map(e => e.id),
      sortByFamilyRelevance(list).map(e => e.id),
    )
  })

  test('nothing is added or removed', () => {
    const list = Array.from({ length: 20 }, (_, i) => ev({ title: `Event ${i}` }))
    assert.equal(sortByFamilyRelevance(list).length, 20)
  })

  test('the input array is not mutated', () => {
    const list = [
      ev({ title: 'Networking League', category: null }),
      ev({ title: 'Storytime', category: 'library' }),
    ]
    const before = list.map(e => e.title)
    sortByFamilyRelevance(list)
    assert.deepEqual(list.map(e => e.title), before)
  })
})

describe('capFirstScreenRepeats', () => {
  /** n occurrences of one recurring master, on consecutive days. */
  function occurrences(n: number, over: Partial<RankableEvent> & { title: string }): RankableEvent[] {
    return Array.from({ length: n }, (_, i) => ({
      id:         over.id ?? 'master-1',
      start_date: `2026-10-${String(i + 1).padStart(2, '0')}`,
      ...over,
    })) as RankableEvent[]
  }

  /** Enough unrelated one-offs to fill a screen, so a cap is observable.
   *  Without competition the deferred occurrences simply move back up into
   *  the first twelve — the cap exists to stop crowding, not to blank a day. */
  function filler(n: number): RankableEvent[] {
    return Array.from({ length: n }, (_, i) =>
      ev({ id: `filler-${i}`, title: `Community Event ${i}`, start_date: '2026-10-01' }))
  }

  test('a plain weekly appears once in the first screen', () => {
    const out = capFirstScreenRepeats([
      ...occurrences(9, { id: 'w', title: 'Adult Kickball', recurrence_rule: WEEKLY }),
      ...filler(12),
    ])
    assert.equal(out.slice(0, 12).filter(e => e.id === 'w').length, 1)
  })

  test('a family kids weekly at a library gets two', () => {
    const out = capFirstScreenRepeats([
      ...occurrences(9, { id: 'lib', title: 'Preschool Story Time', location_name: 'Autauga-Prattville Public Library', recurrence_rule: WEEKLY }),
      ...filler(12),
    ])
    assert.equal(out.slice(0, 12).filter(e => e.id === 'lib').length, 2)
  })

  test('nature school counts as a family kids weekly', () => {
    const out = capFirstScreenRepeats([
      ...occurrences(9, { id: 'ns', title: 'Montgomery Whitewater Nature School', location_name: 'Montgomery Whitewater', recurrence_rule: WEEKLY }),
      ...filler(12),
    ])
    assert.equal(out.slice(0, 12).filter(e => e.id === 'ns').length, 2)
  })

  test('a daily continuous run appears once up front', () => {
    const out = capFirstScreenRepeats([
      ...occurrences(7, { id: 'hunt', title: 'Downtown Scavenger Hunt', recurrence_rule: DAILY }),
      ...filler(12),
    ])
    assert.equal(out.slice(0, 12).filter(e => e.id === 'hunt').length, 1)
  })

  test('a multi-day span appears once up front', () => {
    const out = capFirstScreenRepeats([
      ...occurrences(5, { id: 'sale', title: 'Sidewalk Sale', end_date: '2026-10-09' }),
      ...filler(12),
    ])
    assert.equal(out.slice(0, 12).filter(e => e.id === 'sale').length, 1)
  })

  test('with nothing else to show, a weekly still fills the day rather than blanking it', () => {
    // The cap defers, it does not delete — so when the weekly is the only
    // thing in the window its later occurrences move straight back up. A
    // near-empty first screen would be a worse calendar, not a better one.
    const out = capFirstScreenRepeats(
      occurrences(9, { id: 'w', title: 'Adult Kickball', recurrence_rule: WEEKLY }),
    )
    assert.equal(out.length, 9)
    assert.equal(out.slice(0, 12).filter(e => e.id === 'w').length, 9)
  })

  test('capped occurrences are DEFERRED, never dropped', () => {
    const list = occurrences(9, { id: 'w', title: 'Adult Kickball', recurrence_rule: WEEKLY })
    const out  = capFirstScreenRepeats(list)
    assert.equal(out.length, list.length, 'nothing may be removed')
    assert.equal(out.filter(e => e.id === 'w').length, 9)
  })

  test('deferred occurrences keep their relative order', () => {
    const list = occurrences(5, { id: 'w', title: 'Adult Kickball', recurrence_rule: WEEKLY })
    const out  = capFirstScreenRepeats(list)
    assert.deepEqual(
      out.map(e => e.start_date),
      ['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05'],
    )
  })

  test('the result is two date-ascending runs, not a scramble', () => {
    // Strict global chronology and a repeat cap can't both hold — deferring
    // Wednesday past a first screen that reaches Friday puts Wednesday after
    // Friday. What must hold is that each run is internally chronological.
    const out = capFirstScreenRepeats(
      [
        ...occurrences(9, { id: 'w', title: 'Adult Kickball', recurrence_rule: WEEKLY }),
        ...filler(12),
      ],
      12,
    )
    const head = out.slice(0, 12).map(e => e.start_date)
    const rest = out.slice(12).map(e => e.start_date)
    assert.deepEqual(head, [...head].sort(), 'first screen must be chronological')
    assert.deepEqual(rest, [...rest].sort(), 'the remainder must be chronological')
  })

  test('one weekly no longer fills a screen that has other events', () => {
    const weekly = occurrences(9, { id: 'w', title: 'Adult Kickball', recurrence_rule: WEEKLY })
    const others = Array.from({ length: 6 }, (_, i) =>
      ev({ id: `o${i}`, title: `Fall Festival ${i}`, category: 'festivals', start_date: `2026-10-0${i + 1}` }))
    const out = rankFeed([...weekly, ...others])
    const distinctIds = new Set(out.slice(0, 12).map(e => e.id))
    assert.ok(distinctIds.size >= 7, `first screen had only ${distinctIds.size} distinct events`)
  })

  test('one-offs are never capped — each is its own event', () => {
    const list = Array.from({ length: 20 }, (_, i) => ev({ id: `one-${i}`, title: `Event ${i}` }))
    const out  = capFirstScreenRepeats(list)
    assert.equal(new Set(out.slice(0, 12).map(e => e.id)).size, 12)
  })
})

describe('dedupeFeed', () => {
  test('collapses the same event arriving from two sources', () => {
    const out = dedupeFeed([
      ev({ id: 'a', title: 'Storytime at the Library', location_name: 'Main Library', start_time: '10:00:00' }),
      ev({ id: 'b', title: 'The Storytime at Library',  location_name: 'Main Library', start_time: '10:00:00' }),
    ])
    assert.equal(out.length, 1, 'filler words should not make these two different events')
  })

  test('keeps two sessions of the same event at different times', () => {
    const out = dedupeFeed([
      ev({ id: 'a', title: 'Storytime', location_name: 'Main Library', start_time: '10:00:00' }),
      ev({ id: 'b', title: 'Storytime', location_name: 'Main Library', start_time: '14:00:00' }),
    ])
    assert.equal(out.length, 2, 'a 10am and a 2pm session are a real choice, not a duplicate')
  })

  test('keeps the same title at two different venues', () => {
    const out = dedupeFeed([
      ev({ id: 'a', title: 'Storytime', location_name: 'Main Library',  start_time: '10:00:00' }),
      ev({ id: 'b', title: 'Storytime', location_name: 'Pike Road Library', start_time: '10:00:00' }),
    ])
    assert.equal(out.length, 2)
  })

  test('keeps the same title on two different days', () => {
    const out = dedupeFeed([
      ev({ id: 'a', title: 'Storytime', start_date: '2026-10-03' }),
      ev({ id: 'b', title: 'Storytime', start_date: '2026-10-10' }),
    ])
    assert.equal(out.length, 2)
  })
})

describe('rankFeed', () => {
  test('an empty feed is fine', () => {
    assert.deepEqual(rankFeed([]), [])
  })

  test('dates stay in order across the whole result', () => {
    const list = [
      ev({ title: 'Networking',      start_date: '2026-10-01', category: null }),
      ev({ title: 'Fall Festival',   start_date: '2026-10-02', category: 'festivals' }),
      ev({ title: 'Storytime',       start_date: '2026-10-01', category: 'library' }),
    ]
    const dates = rankFeed(list).map(e => e.start_date)
    assert.deepEqual(dates, [...dates].sort())
  })

  test('a family one-off leads its day over an adult weekly', () => {
    const out = rankFeed([
      ev({ id: 'league', title: 'Lagoon Park Tennis League', category: 'sports', recurrence_rule: WEEKLY, start_time: '09:00:00' }),
      ev({ id: 'fest',   title: 'Pumpkin Patch Family Day',  category: 'festivals', start_time: '11:00:00' }),
    ])
    assert.equal(out[0].id, 'fest')
  })
})
