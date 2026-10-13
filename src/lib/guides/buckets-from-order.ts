// Birthday-guide buckets derived from a brand's category_order.
//
// ── Why ─────────────────────────────────────────────────────────────────────
// BIRTHDAY_CATEGORY_BUCKETS is a hand-authored table: each bucket carries an
// icon, a gradient, a blurb and an SEO title, and maps to the CSV category
// names River Region's listings use ('Cakes/Finger Foods', 'Entertainment',
// 'Equipment/Games Rentals'). Greater Pensacola's listings use different
// names entirely ('Cakes & Treats', 'Entertainment to You', 'Places to
// Party', 'Rental Entertainment / Party Supplies'), so on Greater Pensacola
// every bucket matched nothing while still printing River Region's labels.
//
// The spec for this is "driven purely by category + category_order, no
// per-brand code branches". So: when a brand declares category_order, the
// buckets ARE that list — label and category taken from the data, a neutral
// icon, and no invented blurb or SEO title. When it declares none, the
// hand-authored table stands, which is why River Region is unchanged.
//
// Deliberately NOT invented here: per-bucket blurbs, metaTitles and icons.
// Those are editorial choices about a brand's market, and guessing them
// produces confident-sounding copy nobody wrote. An absent blurb is omitted
// by the cards rather than rendered as an empty line.

import { PartyPopper } from 'lucide-react'
import { orderCategories, categoryLabel } from '@/lib/guides/category-order'

/** The subset of CategoryBucket this module can honestly produce. */
export interface DerivedBucket {
  slug:       string
  label:      string
  eyebrow:    string
  /** Empty string means "no blurb" — cards must omit rather than print it. */
  blurb:      string
  Icon:       React.ElementType
  gradient:   string
  iconTone:   string
  categories: string[]
}

/** URL segment for a category name. */
export function categorySlug(category: string): string {
  return category
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// One neutral palette, cycled, so a derived hub still looks deliberate
// rather than monochrome.
const PALETTE = [
  { gradient: 'from-pink-500/85 via-rose-500/75 to-rose-700/70',     iconTone: 'text-pink-50' },
  { gradient: 'from-blue-600/85 via-blue-700/75 to-blue-900/70',     iconTone: 'text-blue-100' },
  { gradient: 'from-amber-500/85 via-orange-500/75 to-orange-700/70', iconTone: 'text-amber-50' },
  { gradient: 'from-emerald-500/85 via-green-600/75 to-green-800/70', iconTone: 'text-emerald-50' },
  { gradient: 'from-violet-500/85 via-purple-600/75 to-purple-800/70', iconTone: 'text-violet-50' },
]

/**
 * Buckets for a brand that declares category_order.
 *
 * `presentCategories` are the categories its listings actually use, so a
 * configured-but-empty category does not become an empty card. Groups are
 * flattened: the birthday hub has no sub-section layer, and a group heading
 * with nothing under it is worse than none.
 */
export function bucketsFromCategoryOrder(
  rawOrder: unknown,
  presentCategories: Iterable<string>,
): DerivedBucket[] {
  const { tree } = orderCategories(rawOrder, presentCategories)
  const out: DerivedBucket[] = []

  const push = (category: string, group?: string) => {
    const label = categoryLabel(category, group)
    const tone = PALETTE[out.length % PALETTE.length]
    out.push({
      slug:       categorySlug(label),
      label,
      eyebrow:    group ?? '',
      blurb:      '',
      Icon:       PartyPopper,
      gradient:   tone.gradient,
      iconTone:   tone.iconTone,
      categories: [category],
    })
  }

  for (const node of tree) {
    if (typeof node === 'string') push(node)
    else for (const child of node.categories) push(child, node.group)
  }
  return out
}
