// Single source of truth for calendar event categories + tags.
// Used by the admin queue, public calendar filters, and any import scripts.

export interface CategoryDef {
  slug:  string
  label: string
  emoji: string
}

export const EVENT_CATEGORIES: CategoryDef[] = [
  { slug: 'outdoor',     label: 'Outdoor & Nature',     emoji: '🌳' },
  { slug: 'library',     label: 'Library & Learning',   emoji: '📚' },
  { slug: 'arts',        label: 'Arts & Theater',       emoji: '🎭' },
  { slug: 'music',       label: 'Music & Performance',  emoji: '🎶' },
  { slug: 'sports',      label: 'Sports & Active',      emoji: '⚽' },
  { slug: 'festivals',   label: 'Festivals & Fairs',    emoji: '🎡' },
  { slug: 'faith',       label: 'Faith & Community',    emoji: '🤝' },
  { slug: 'camps',       label: 'Camps & Workshops',    emoji: '🏕️' },
  { slug: 'holiday',     label: 'Holiday & Seasonal',   emoji: '🎄' },
  { slug: 'drop-in',     label: 'Family Drop-In',       emoji: '👨‍👩‍👧' },
]

export const EVENT_TAGS: { slug: string; label: string }[] = [
  { slug: 'free',                 label: 'Free' },
  { slug: 'toddler-friendly',     label: 'Toddler-friendly' },
  { slug: 'teen',                 label: 'Teen' },
  { slug: 'special-needs-friendly', label: 'Special-needs friendly' },
  { slug: 'indoor',               label: 'Indoor' },
  { slug: 'date-night',           label: 'Date Night' },
  { slug: 'parents-night-out',    label: 'Parents Night Out' },
]

export function categoryLabel(slug: string | null | undefined): string {
  if (!slug) return ''
  return EVENT_CATEGORIES.find(c => c.slug === slug)?.label ?? slug
}

export function tagLabel(slug: string): string {
  return EVENT_TAGS.find(t => t.slug === slug)?.label ?? slug
}
