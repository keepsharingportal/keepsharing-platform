// Distribution regions — physical-distribution groupings.
//
// Within a region, ONE set of routes + stops feeds N publications (different
// copy counts per pub at each stop). River Region routes serve RRP and Boom
// together because both magazines come off the same truck.
//
// The `market` column on circulation_* tables holds the region's primary
// publication slug (e.g. 'rrp' for the River Region). Whichever pub the
// admin's brand-switcher is on, we resolve to that primary so they see the
// same data. The carried pubs are used only for display + per-pub totals.

import { MARKETS } from '@/lib/markets'

export interface CirculationRegion {
  slug:       string   // canonical region key, also the value stored in circulation_*.market
  name:       string   // display name ("River Region")
  city:       string   // primary city
  /** Publication slugs that share this region's routes. Order = display order. */
  publications: string[]
}

export const CIRCULATION_REGIONS: CirculationRegion[] = [
  // 'boom' kept as a publication alias so legacy data + URLs still resolve to the
  // River Region. New brand identity is 'rr50plus' (migration 169).
  { slug: 'rrp',  name: 'River Region',  city: 'Montgomery', publications: ['rrp', 'rr50plus', 'boom'] },
  { slug: 'aop',  name: 'Auburn-Opelika', city: 'Auburn',    publications: ['aop']         },
  { slug: 'mbp',  name: 'Mobile Bay',     city: 'Mobile',    publications: ['mbp']         },
  { slug: 'esp',  name: 'Eastern Shore',  city: 'Daphne',    publications: ['esp']         },
  { slug: 'gpp',  name: 'Pensacola',      city: 'Pensacola', publications: ['gpp']         },
]

/** Find the region whose primary slug or carried publications include this market. */
export function regionForMarket(market: string): CirculationRegion {
  const fromSlug = CIRCULATION_REGIONS.find(r => r.slug === market)
  if (fromSlug) return fromSlug
  const fromCarried = CIRCULATION_REGIONS.find(r => r.publications.includes(market))
  if (fromCarried) return fromCarried
  // Unknown — synthesize a one-pub region so the UI still labels something.
  return { slug: market, name: market.toUpperCase(), city: '', publications: [market] }
}

/** Short uppercase publication labels in a region — "RRP + BOOM". */
export function publicationLabelsForRegion(region: CirculationRegion): string {
  return region.publications
    .map(p => MARKETS.find(m => m.slug === p)?.short ?? p.toUpperCase())
    .join(' + ')
}
