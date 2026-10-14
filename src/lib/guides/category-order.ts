// Section and filter-chip order for a guide, per brand.
//
// guide_configs.category_order has existed since migration 065 and nothing
// ever read it, so every guide sorted its sections the same way regardless of
// brand. Greater Pensacola needs a different order from River Region — and
// for Private School, a different *organising principle*: River Region groups
// by affiliation, Greater Pensacola by town. That is a data difference, not a
// code difference, so there is no per-brand branch anywhere below.
//
// ── Shape ───────────────────────────────────────────────────────────────────
//   ["Art", "Dance"]                              plain categories
//   [{ group: "Specific Resources", children: [] }]  a group with sub-sections
//
// A group renders as a heading with its children beneath it. Greater
// Pensacola stores Special Needs children group-prefixed, as
// "Specific Resources - ADD/ADHD", so children are matched on the exact
// stored value; a bare child name also matches, because that is what a
// hand-written config is likely to hold.
//
// Categories present in the data but absent from category_order sort AFTER
// the ordered ones, alphabetically — so importing a listing in a new
// category never makes it disappear.

export type CategoryOrderEntry =
  | string
  | { group: string; children?: string[] }

export interface OrderedGroup {
  /** Heading text. */
  group:      string
  /** Categories beneath it, in order, filtered to those that exist. */
  categories: string[]
}

export interface OrderedSections {
  /** Top-level categories, in order, groups expanded in place. */
  flat:   string[]
  /** Section tree: a string is an ungrouped category, an object is a group. */
  tree:   Array<string | OrderedGroup>
  /** Categories found in the data but not named in category_order. */
  extra:  string[]
}

function asEntries(raw: unknown): CategoryOrderEntry[] {
  if (!Array.isArray(raw)) return []
  return raw.filter((e): e is CategoryOrderEntry =>
    typeof e === 'string' ||
    (!!e && typeof e === 'object' && typeof (e as { group?: unknown }).group === 'string'))
}

/** Does `candidate` from the config match a category present in the data? */
function matchPresent(candidate: string, present: Set<string>, group?: string): string | null {
  if (present.has(candidate)) return candidate
  // A config may name the child bare ("ADD/ADHD") while the data stores it
  // group-prefixed ("Specific Resources - ADD/ADHD"), or the reverse.
  if (group) {
    const prefixed = `${group} - ${candidate}`
    if (present.has(prefixed)) return prefixed
  }
  const dash = candidate.indexOf(' - ')
  if (dash > 0) {
    const bare = candidate.slice(dash + 3)
    if (present.has(bare)) return bare
  }
  return null
}

/**
 * Order the categories that actually occur in a guide's listings.
 *
 * `presentCategories` should include every category a listing is filed
 * under, primary and extra alike — a listing that appears in a section needs
 * that section to exist.
 */
export function orderCategories(
  rawOrder: unknown,
  presentCategories: Iterable<string>,
): OrderedSections {
  const present = new Set([...presentCategories].filter(Boolean))
  const entries = asEntries(rawOrder)

  const tree: Array<string | OrderedGroup> = []
  const flat: string[] = []
  const claimed = new Set<string>()

  for (const entry of entries) {
    if (typeof entry === 'string') {
      const hit = matchPresent(entry, present)
      if (!hit || claimed.has(hit)) continue
      claimed.add(hit); flat.push(hit); tree.push(hit)
      continue
    }
    const children: string[] = []
    for (const child of entry.children ?? []) {
      const hit = matchPresent(child, present, entry.group)
      if (!hit || claimed.has(hit)) continue
      claimed.add(hit); children.push(hit)
    }
    // Hide an empty group rather than render a bare heading.
    if (!children.length) continue
    tree.push({ group: entry.group, categories: children })
    flat.push(...children)
  }

  // Anything the config did not mention, alphabetically, after the rest.
  const extra = [...present].filter(c => !claimed.has(c))
    .sort((a, b) => a.localeCompare(b))
  for (const c of extra) { flat.push(c); tree.push(c) }

  return { flat, tree, extra }
}

/**
 * How a category should read on screen.
 *
 * Greater Pensacola stores Special Needs children as
 * "Specific Resources - Autism Spectrum". Printed under a "Specific
 * Resources" heading that prefix is noise, so it is stripped — the heading
 * already says it. Outside a group the stored value is used as-is.
 */
export function categoryLabel(category: string, group?: string | null): string {
  if (!group) return category
  const prefix = `${group} - `
  return category.startsWith(prefix) ? category.slice(prefix.length) : category
}

/**
 * Every category a listing belongs to: its primary plus extra_categories.
 *
 * extra_categories lets one listing appear under several sections. It must
 * still appear only ONCE in an "All" view, which is why callers key the
 * all-listings set by listing id rather than iterating these pairs.
 */
export function categoriesOf(
  listing: { category?: string | null; extra_categories?: unknown },
): string[] {
  const out: string[] = []
  if (listing.category) out.push(listing.category)
  if (Array.isArray(listing.extra_categories)) {
    for (const c of listing.extra_categories) {
      if (typeof c === 'string' && c && !out.includes(c)) out.push(c)
    }
  }
  return out
}

/**
 * Bucket listings by category, honouring extra_categories, with a de-duped
 * "all" list.
 *
 * A listing filed under three categories appears in three buckets and once
 * in `all` — the thing a naive flatMap gets wrong.
 */
export function bucketByCategory<T extends { id: string; category?: string | null; extra_categories?: unknown }>(
  listings: T[],
  rawOrder: unknown,
): { sections: Array<{ heading: string | null; categories: Array<{ category: string; listings: T[] }> }>; all: T[]; order: OrderedSections } {
  const present = new Set<string>()
  for (const l of listings) for (const c of categoriesOf(l)) present.add(c)

  const order = orderCategories(rawOrder, present)

  const byCategory = new Map<string, T[]>()
  for (const l of listings) {
    for (const c of categoriesOf(l)) {
      const arr = byCategory.get(c) ?? []
      arr.push(l)
      byCategory.set(c, arr)
    }
  }

  const sections: Array<{ heading: string | null; categories: Array<{ category: string; listings: T[] }> }> = []
  for (const node of order.tree) {
    if (typeof node === 'string') {
      sections.push({ heading: null, categories: [{ category: node, listings: byCategory.get(node) ?? [] }] })
    } else {
      sections.push({
        heading: node.group,
        categories: node.categories.map(c => ({ category: c, listings: byCategory.get(c) ?? [] })),
      })
    }
  }

  // De-duped by id: one listing, one entry, however many categories it holds.
  const seen = new Set<string>()
  const all = listings.filter(l => !seen.has(l.id) && seen.add(l.id))

  return { sections, all, order }
}

/**
 * Every category a `category_order` names, flattened.
 *
 * orderCategories() intentionally hides a category with no listings — an
 * empty section is worse than no section. That makes it the wrong tool for
 * resolving a URL slug: a bucket page for a category that happens to be empty
 * today should say "nothing here yet", not 404. Passing this as the "present"
 * set gives the brand's declared categories regardless of current data.
 */
export function declaredCategories(rawOrder: unknown): string[] {
  const out: string[] = []
  for (const entry of asEntries(rawOrder)) {
    if (typeof entry === 'string') {
      if (!out.includes(entry)) out.push(entry)
      continue
    }
    for (const child of entry.children ?? []) {
      if (typeof child !== 'string' || !child) continue
      // Store the form the data uses, so matchPresent lines up either way.
      const prefixed = `${entry.group} - ${child}`
      if (!out.includes(prefixed)) out.push(prefixed)
    }
  }
  return out
}
