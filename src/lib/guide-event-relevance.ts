export interface CalEventBasic {
  id: string
  slug?: string | null
  title: string
  start_date?: string | null
  start_time?: string | null
  location_name?: string | null
  is_free?: boolean
  cost_text?: string | null
  description?: string | null
}

const GUIDE_KEYWORDS: Record<string, string[]> = {
  'newcomer':       [],
  'private-school': ['school', 'open house', 'campus', 'tour', 'admissions', 'enrollment'],
  'summer-camp':    ['camp', 'summer program', 'overnight'],
  'childcare':      ['preschool', 'daycare', 'toddler', 'early learning', 'pre-k'],
  'healthy-kids':   ['health', 'doctor', 'pediatric', 'wellness', 'screening', 'vaccine', 'fitness', 'dental'],
  'summer-fun':     ['summer', 'outdoor', 'pool', 'splash', 'festival', 'park', 'garden', 'fun'],
  'birthday-party': ['birthday', 'party', 'celebration'],
  'afterschool':    ['art', 'music', 'sports', 'dance', 'class', 'workshop', 'lessons', 'drama', 'theater'],
  'special-needs':  ['inclusive', 'special needs', 'sensory', 'accessible', 'autism', 'adaptive'],
}

export function getEventsRelevantToGuide<T extends CalEventBasic>(
  events: T[],
  guideSlug: string,
  limit = 4,
): T[] {
  if (guideSlug === 'newcomer') return events.slice(0, limit)

  const keywords = GUIDE_KEYWORDS[guideSlug] ?? []
  if (!keywords.length) return events.slice(0, limit)

  const scored = events.map(ev => {
    const text  = `${ev.title} ${ev.description ?? ''} ${ev.location_name ?? ''}`.toLowerCase()
    const score = keywords.reduce((acc, kw) => acc + (text.includes(kw) ? 1 : 0), 0)
    return { ev, score }
  })

  const relevant = scored.filter(s => s.score > 0).sort((a, b) => b.score - a.score)
  // Fall back to any upcoming events if no keyword matches
  const result = relevant.length >= limit ? relevant : [...relevant, ...scored.filter(s => s.score === 0)]
  return result.slice(0, limit).map(s => s.ev)
}
