import test from 'node:test'
import assert from 'node:assert/strict'
import { declaredCategories, orderCategories } from '@/lib/guides/category-order'
import { bucketsFromCategoryOrder } from '@/lib/guides/buckets-from-order'

// Why this exists: orderCategories() hides a category with no listings, which
// is right for rendering a hub and wrong for resolving a URL. Greater
// Pensacola's hub cards are derived from category_order, so their slugs come
// from GPP's own category names — and the category landing page resolved those
// slugs against the hand-authored River Region table, found nothing, and
// 404'd. Every card on the hub was a dead link.
//
// declaredCategories() is the "present" set that makes a slug lookup resolve
// a bucket that is merely empty, instead of one that doesn't exist.

const GPP_ORDER = [
  'Cakes & Treats',
  'Entertainment to You',
  'Places to Party',
  'Rental Entertainment / Party Supplies',
]

test('declaredCategories returns a flat order for plain entries', () => {
  assert.deepEqual(declaredCategories(GPP_ORDER), GPP_ORDER)
})

test('declaredCategories prefixes grouped children the way the data stores them', () => {
  const order = [
    { group: 'Specific Resources', children: ['ADD/ADHD', 'Autism'] },
    'Therapy - Speech',
  ]
  assert.deepEqual(declaredCategories(order), [
    'Specific Resources - ADD/ADHD',
    'Specific Resources - Autism',
    'Therapy - Speech',
  ])
})

test('declaredCategories tolerates junk rather than throwing', () => {
  assert.deepEqual(declaredCategories(null), [])
  assert.deepEqual(declaredCategories('not an array'), [])
  assert.deepEqual(declaredCategories([1, null, { nope: true }]), [])
  assert.deepEqual(declaredCategories([{ group: 'G' }]), [])
})

test('declaredCategories de-dupes', () => {
  assert.deepEqual(declaredCategories(['A', 'A', 'B']), ['A', 'B'])
})

test('a slug lookup resolves an EMPTY category — the bug this fixes', () => {
  // No listings anywhere. Rendering cards should show none...
  assert.equal(bucketsFromCategoryOrder(GPP_ORDER, []).length, 0)
  // ...but a slug lookup must still find all four, or the links 404.
  const forLookup = bucketsFromCategoryOrder(GPP_ORDER, declaredCategories(GPP_ORDER))
  assert.equal(forLookup.length, 4)
  assert.deepEqual(forLookup.map(b => b.label), GPP_ORDER)
})

test('hub card slugs and lookup slugs are the same strings', () => {
  // The whole failure was two code paths deriving slugs differently. If these
  // ever diverge, the hub links break again.
  const withCounts = bucketsFromCategoryOrder(
    GPP_ORDER, Object.keys({ 'Cakes & Treats': 3, 'Places to Party': 1 }))
  const forLookup = bucketsFromCategoryOrder(GPP_ORDER, declaredCategories(GPP_ORDER))
  for (const card of withCounts) {
    assert.ok(forLookup.some(b => b.slug === card.slug),
      `hub card slug "${card.slug}" does not resolve in the lookup set`)
  }
})

test('derived buckets invent no blurb', () => {
  // A generated blurb is confident-sounding copy nobody wrote.
  for (const b of bucketsFromCategoryOrder(GPP_ORDER, declaredCategories(GPP_ORDER))) {
    assert.equal(b.blurb, '')
  }
})

test('orderCategories still hides an empty category (unchanged)', () => {
  const { flat } = orderCategories(GPP_ORDER, ['Places to Party'])
  assert.deepEqual(flat, ['Places to Party'])
})
