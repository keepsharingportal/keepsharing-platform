import { test } from 'node:test'
import assert from 'node:assert/strict'
import { orderCategories, bucketByCategory, categoriesOf } from '@/lib/guides/category-order'

test('orders to the config and puts unlisted categories last, alphabetically', () => {
  const r = orderCategories(
    ['Cakes & Treats', 'Entertainment to You', 'Places to Party'],
    ['Places to Party', 'Zoo Parties', 'Cakes & Treats', 'Art Studios'],
  )
  assert.deepEqual(r.flat, ['Cakes & Treats', 'Places to Party', 'Art Studios', 'Zoo Parties'])
  assert.deepEqual(r.extra, ['Art Studios', 'Zoo Parties'])
})

test('omits configured categories with no listings', () => {
  const r = orderCategories(['Art', 'Dance', 'Equestrian'], ['Dance'])
  assert.deepEqual(r.flat, ['Dance'])
})

test('matches group children stored group-prefixed, as GPP stores them', () => {
  const r = orderCategories(
    [{ group: 'Specific Resources', children: ['Specific Resources - ADD/ADHD', 'Specific Resources - Dyslexia'] }],
    ['Specific Resources - Dyslexia', 'Specific Resources - ADD/ADHD'],
  )
  assert.deepEqual(r.tree, [{
    group: 'Specific Resources',
    categories: ['Specific Resources - ADD/ADHD', 'Specific Resources - Dyslexia'],
  }])
})

test('also matches a bare child name against group-prefixed data', () => {
  const r = orderCategories(
    [{ group: 'Specific Resources', children: ['ADD/ADHD'] }],
    ['Specific Resources - ADD/ADHD'],
  )
  assert.deepEqual(r.tree, [{ group: 'Specific Resources', categories: ['Specific Resources - ADD/ADHD'] }])
})

test('hides a group whose children are all empty — no bare heading', () => {
  const r = orderCategories(
    ['Therapy', { group: 'Specific Resources', children: ['ADD/ADHD'] }],
    ['Therapy'],
  )
  assert.deepEqual(r.tree, ['Therapy'])
})

test('no config means alphabetical, so RRP behaviour is unchanged', () => {
  const r = orderCategories(null, ['Music', 'Art', 'Dance'])
  assert.deepEqual(r.flat, ['Art', 'Dance', 'Music'])
})

test('extra_categories put a listing in every section but once in All', () => {
  const listings = [
    { id: 'a', category: 'Places to Party', extra_categories: ['Cakes & Treats'] },
    { id: 'b', category: 'Cakes & Treats', extra_categories: null },
  ]
  const { sections, all } = bucketByCategory(listings, ['Cakes & Treats', 'Places to Party'])
  const cakes = sections.flatMap(s => s.categories).find(c => c.category === 'Cakes & Treats')!
  const party = sections.flatMap(s => s.categories).find(c => c.category === 'Places to Party')!
  assert.deepEqual(cakes.listings.map(l => l.id), ['a', 'b'])
  assert.deepEqual(party.listings.map(l => l.id), ['a'])
  assert.deepEqual(all.map(l => l.id), ['a', 'b'])
})

test('categoriesOf ignores blanks and de-dupes', () => {
  assert.deepEqual(categoriesOf({ category: 'Art', extra_categories: ['Art', '', 'Dance'] }), ['Art', 'Dance'])
  assert.deepEqual(categoriesOf({ category: null, extra_categories: null }), [])
})

// ── buckets derived from category_order ────────────────────────────────────
import { bucketsFromCategoryOrder, categorySlug } from '@/lib/guides/buckets-from-order'

test('derived buckets follow the brand order and use its own category names', () => {
  const b = bucketsFromCategoryOrder(
    ['Cakes & Treats', 'Entertainment to You', 'Places to Party', 'Rental Entertainment / Party Supplies'],
    ['Places to Party', 'Cakes & Treats', 'Entertainment to You', 'Rental Entertainment / Party Supplies'],
  )
  assert.deepEqual(b.map(x => x.label), [
    'Cakes & Treats', 'Entertainment to You', 'Places to Party', 'Rental Entertainment / Party Supplies',
  ])
  assert.deepEqual(b.map(x => x.categories[0]), [
    'Cakes & Treats', 'Entertainment to You', 'Places to Party', 'Rental Entertainment / Party Supplies',
  ])
})

test('derived buckets omit configured categories with no listings', () => {
  const b = bucketsFromCategoryOrder(['Cakes & Treats', 'Places to Party'], ['Cakes & Treats'])
  assert.deepEqual(b.map(x => x.label), ['Cakes & Treats'])
})

test('derived buckets invent no blurb — cards must omit it', () => {
  const b = bucketsFromCategoryOrder(['Cakes & Treats'], ['Cakes & Treats'])
  assert.equal(b[0].blurb, '')
})

test('group children flatten, labelled without the redundant prefix', () => {
  const b = bucketsFromCategoryOrder(
    [{ group: 'Specific Resources', children: ['Specific Resources - Dyslexia'] }],
    ['Specific Resources - Dyslexia'],
  )
  assert.equal(b[0].label, 'Dyslexia')
  assert.equal(b[0].eyebrow, 'Specific Resources')
  assert.deepEqual(b[0].categories, ['Specific Resources - Dyslexia'])
})

test('slugs are url-safe and de-ampersanded', () => {
  assert.equal(categorySlug('Cakes & Treats'), 'cakes-and-treats')
  assert.equal(categorySlug('Rental Entertainment / Party Supplies'), 'rental-entertainment-party-supplies')
})
