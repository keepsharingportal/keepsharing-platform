// Layer 1 — editorial exclusion.
//
//   node --import ./scripts/test-resolver.mjs --test "src/**/*.test.ts"
//
// The cases below are the real rows Connie drafted on 2026-09-29 plus the ones
// the product rule names as keepers. If a change to the denylist breaks one of
// these, it has broken the rule, not the test.

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { checkPromoDenylist, guardPublish } from './promo-denylist'

const WEEKLY = 'FREQ=WEEKLY;BYDAY=TU'

describe('blocks the named offenders', () => {
  const offenders: Array<[string, Parameters<typeof checkPromoDenylist>[0]]> = [
    ['Taco Tuesday (Little Donkey)', {
      title: 'Taco Tuesday', location_name: 'Little Donkey', recurrence_rule: WEEKLY }],
    ['Taco Tuesday at Baristas & Barristers', {
      title: 'Taco Tuesday Is Back At Baristas & Barristers', location_name: 'Baristas & Barristers', recurrence_rule: WEEKLY }],
    ['Tacos & Tallboys Tuesday (Biscuits)', {
      title: 'Tacos & Tallboys Tuesday', location_name: 'Montgomery Biscuits', recurrence_rule: WEEKLY }],
    ['The Weekly Wedge (Hilltop Public House)', {
      title: 'The Weekly Wedge', location_name: 'Hilltop Public House', recurrence_rule: WEEKLY }],
    ['Trivia Night at Eddy’s (Montgomery Whitewater)', {
      title: 'Trivia Night at Eddy’s', location_name: 'Montgomery Whitewater', recurrence_rule: WEEKLY }],
    ['Lagoon Park Golfaholic League', {
      title: 'Lagoon Park Golfaholic League', location_name: 'Lagoon Park Golf Course', recurrence_rule: WEEKLY }],
    ['Newcomers Club Get Acquainted Coffee', {
      title: 'Newcomers Club Get Acquainted Coffee', location_name: null, recurrence_rule: WEEKLY }],
  ]

  for (const [label, ev] of offenders) {
    test(label, () => {
      const r = checkPromoDenylist(ev)
      assert.equal(r.blocked, true, `expected "${ev.title}" to be blocked`)
      assert.ok(r.reason && r.reason.length > 0, 'a blocked row must carry a reason')
    })
  }
})

describe('keeps what the rule says to keep', () => {
  const keepers: Array<[string, Parameters<typeof checkPromoDenylist>[0]]> = [
    // Named explicitly in the product rule: library kids programs stay even
    // when the title says trivia.
    ['Dino Movie & Trivia at the library', {
      title: 'Dino Movie & Trivia', location_name: 'Autauga-Prattville Public Library', recurrence_rule: null }],
    ['a library trivia NIGHT, recurring', {
      title: 'Trivia Night', location_name: 'Autauga-Prattville Public Library', recurrence_rule: WEEKLY }],
    // One-off family events at restaurants must not match.
    ['storytime at a restaurant', {
      title: 'Storytime with the Author', location_name: 'Little Donkey', recurrence_rule: null }],
    ['kids night at a restaurant', {
      title: 'Kids Night', location_name: 'Little Donkey', recurrence_rule: null }],
    ['fall festival at a brewery', {
      title: 'Fall Festival', location_name: 'Common Bond Brewers', recurrence_rule: null }],
    // The broad keeper categories.
    ['a concert', { title: 'Leanne Morgan: The Time Of Our Lives Tour', location_name: 'Montgomery Performing Arts Centre', recurrence_rule: null }],
    ['a recurring library storytime', { title: 'Preschool Story Time', location_name: 'Autauga-Prattville Public Library', recurrence_rule: WEEKLY }],
    ['a zoo weekly', { title: 'Thrifty Tuesdays', location_name: 'Montgomery Zoo and Mann Wildlife Museum', recurrence_rule: WEEKLY }],
    ['a museum program', { title: 'Mini Makers: Stories in Art', location_name: 'Montgomery Museum of Fine Arts', recurrence_rule: WEEKLY }],
    ['a community sale', { title: 'NewSouth Community Sale', location_name: null, recurrence_rule: null }],
    ['a fair', { title: 'Alabama National Fair', location_name: 'Garrett Coliseum', recurrence_rule: null }],
    ['a church VBS', { title: 'VBS at Christ Methodist Montgomery', location_name: 'Christ Methodist Church', recurrence_rule: WEEKLY }],
    ['a summer camp', { title: '2026 Abrakadoodle Summer Art Camp', location_name: 'Pike Road Arts Center', recurrence_rule: WEEKLY }],
    ['a family game night', { title: 'Family Game Night', location_name: null, recurrence_rule: WEEKLY }],
  ]

  for (const [label, ev] of keepers) {
    test(label, () => {
      const r = checkPromoDenylist(ev)
      assert.equal(r.blocked, false, `expected "${ev.title}" to stay publishable (reason given: ${r.reason})`)
    })
  }
})

describe('needs BOTH a keyword and recurring-or-venue', () => {
  test('a one-off trivia night at a school is an editorial call, not a keyword call', () => {
    const r = checkPromoDenylist({
      title: 'Trivia Night Fundraiser', location_name: 'Pike Road Town Hall', recurrence_rule: null,
    })
    assert.equal(r.blocked, false)
    // The term still matched — we just declined to act on it alone.
    assert.ok(r.term)
  })

  test('the same title at a pub IS blocked, even without a recurrence rule', () => {
    const r = checkPromoDenylist({
      title: 'Trivia Night', location_name: 'Hilltop Public House', recurrence_rule: null,
    })
    assert.equal(r.blocked, true)
    assert.match(r.reason ?? '', /drinking venue/i)
  })

  test('a one-off church wine tasting passes; a weekly one does not', () => {
    const base = { title: 'Wine Tasting Fundraiser', location_name: 'Trinity Church' }
    assert.equal(checkPromoDenylist({ ...base, recurrence_rule: null }).blocked,   false)
    assert.equal(checkPromoDenylist({ ...base, recurrence_rule: WEEKLY }).blocked, true)
  })

  test('a drink promo with no venue word still counts as a venue special', () => {
    const r = checkPromoDenylist({
      title: 'Happy Hour — $5 drafts', location_name: 'The Alley', recurrence_rule: null,
    })
    assert.equal(r.blocked, true)
  })
})

describe('guardPublish', () => {
  test('passes a clean row through', () => {
    const r = guardPublish({ title: 'Pumpkin Patch Opening Day', location_name: 'Aplin Farms' }, 'test')
    assert.equal(r.blocked, false)
  })

  test('an explicit override unblocks, so a guard never becomes a dead end', () => {
    const ev = { title: 'Taco Tuesday', location_name: 'Little Donkey', recurrence_rule: WEEKLY }
    assert.equal(guardPublish(ev, 'test', false).blocked, true)
    assert.equal(guardPublish(ev, 'test', true).blocked,  false)
  })
})

describe('case and punctuation', () => {
  test('matching is case-insensitive', () => {
    assert.equal(checkPromoDenylist({ title: 'TACO TUESDAY', location_name: 'Bar', recurrence_rule: WEEKLY }).blocked, true)
  })

  test('a curly apostrophe does not dodge the list', () => {
    assert.equal(checkPromoDenylist({ title: 'Ladies’ Night', location_name: 'The Tavern', recurrence_rule: WEEKLY }).blocked, true)
  })

  test('empty input is safe', () => {
    assert.equal(checkPromoDenylist({}).blocked, false)
    assert.equal(checkPromoDenylist({ title: null, location_name: null }).blocked, false)
  })
})
