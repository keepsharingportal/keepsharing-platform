import { test } from 'node:test'
import assert from 'node:assert/strict'
import { brandifyCopy, theRegion, townPhrase } from '@/lib/brandify'
import { MARKETS } from '@/lib/markets'

const rrp = MARKETS.find(m => m.slug === 'rrp')!
const gpp = MARKETS.find(m => m.slug === 'gpp')!
const esp = MARKETS.find(m => m.slug === 'esp')!

test('RRP is the identity transform — the live site cannot move', () => {
  for (const s of [
    'Real River Region moms writing about real River Region life.',
    'Families across the River Region trust River Region Parents.',
    'Include a school event photo if available. Email to photos@riverregionparents.com with the school name.',
  ]) assert.equal(brandifyCopy(s, rrp), s)
})

test('rewrites the brand name and the region', () => {
  assert.equal(
    brandifyCopy('River Region Parents serves River Region families.', gpp),
    'Greater Pensacola Parents serves Greater Pensacola families.',
  )
})

test('keeps the article only where the label needs one', () => {
  assert.equal(brandifyCopy('families across the River Region.', gpp), 'families across Greater Pensacola.')
  assert.equal(brandifyCopy('families across the River Region.', esp), 'families across the Eastern Shore.')
})

test('treats "the River Region community" as adjectival, keeping "the"', () => {
  assert.equal(brandifyCopy('voted on by the River Region community', gpp),
    'voted on by the Greater Pensacola community')
})

test('drops the photo sentence for a brand with no photo inbox', () => {
  const out = brandifyCopy(
    'Include a school event photo if available. Email to photos@riverregionparents.com with the school name.', gpp)
  assert.equal(out, 'Include a school event photo if available.')
  assert.ok(!out.includes('riverregionparents'))
})

test('theRegion and townPhrase per brand', () => {
  assert.equal(theRegion(rrp), 'the River Region')
  assert.equal(theRegion(gpp), 'Greater Pensacola')
  assert.equal(theRegion(gpp, true), 'Greater Pensacola')
  assert.equal(theRegion(rrp, true), 'The River Region')
  assert.equal(townPhrase(gpp), 'Pensacola, Gulf Breeze, Pace and Milton')
})

test('no brand leaks another brand name through any field', () => {
  const sample = 'River Region Parents · the River Region · photos@riverregionparents.com'
  for (const m of MARKETS.filter(m => m.slug !== 'rrp' && m.slug !== 'rr50plus')) {
    const out = brandifyCopy(sample, m)
    assert.ok(!/River Region/.test(out), `${m.slug}: ${out}`)
  }
})
