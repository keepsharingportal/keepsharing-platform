// /admin/section-sponsors — deprecated, redirects to /admin/ads.
//
// Section sponsors were unified into ad_placements by migration 122.
// They now live in /admin/ads alongside every other booking with
// placement_type='section_sponsor'. The edit page surfaces the
// section-sponsor-specific fields (logo, tagline, accent color)
// only when that placement type is selected.
//
// Existing bookmarks land here and get auto-redirected so no one
// hits a 404 when they go looking for the old page.

import { redirect } from 'next/navigation'

export default function SectionSponsorsRedirect() {
  redirect('/admin/ads')
}
