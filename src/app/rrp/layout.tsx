import { notFound } from 'next/navigation'
import { currentBrandSlug } from '@/lib/current-brand'

// These are River Region Parents' own submission forms — the path says so.
// One deployment serves six brand domains, so /rrp/parent-poll was reachable
// at gpp.keepsharing.com, offering a Greater Pensacola reader a neighborhood
// picker listing Prattville, Wetumpka, Millbrook and Pike Road.
//
// The forms are brand-specific by design, not merely brand-worded, so the
// fix is a 404 elsewhere rather than substituted copy. If a sibling brand
// wants a parent poll, it gets its own route with its own towns.
const OWNING_BRAND = 'rrp'

export default async function RRPLayout({ children }: { children: React.ReactNode }) {
  if (((await currentBrandSlug()) ?? OWNING_BRAND) !== OWNING_BRAND) notFound()
  return <div>{children}</div>
}
