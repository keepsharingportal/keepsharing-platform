'use client'

// SlotMapVisual — wraps PageLayoutPreview with click-to-act behavior
// for the /admin/ads/map page.
//
// PageLayoutPreview is a pure visual — given a surface and a
// slug→status map, it draws the page wireframe with color-coded slot
// boxes. This wrapper adds the editor's primary actions on click:
//   - Open slot → new placement form pre-filled with that slot
//   - Live slot → All Bookings list filtered to that slot
//   - Hidden slot → All Bookings (so the editor can re-enable)
//
// Stays client-side because PageLayoutPreview is a pure component but
// we need useRouter for the navigation.

import { useRouter } from 'next/navigation'
import { PageLayoutPreview } from '@/components/admin/PageLayoutPreview'

interface Props {
  surface:      string
  slotStatuses: Record<string, 'live' | 'paused' | 'sellable' | 'hidden'>
}

export function SlotMapVisual({ surface, slotStatuses }: Props) {
  const router = useRouter()

  function onSlotClick(slug: string) {
    const status = slotStatuses[slug]
    if (status === 'sellable') {
      // Empty slot → drop the editor straight into the new-booking form
      // pre-filled with this placement_type + context.
      router.push(`/admin/ads/new?placement_type=${encodeURIComponent(slug)}&context_slug=${encodeURIComponent(surface)}`)
    } else {
      // Live, paused, or hidden → take the editor to the bookings list
      // filtered to this placement so they can edit or toggle. The
      // filter is wired via query string; All Bookings reads it on mount.
      router.push(`/admin/ads?placement_type=${encodeURIComponent(slug)}`)
    }
  }

  return (
    <PageLayoutPreview
      surface={surface}
      slotStatuses={slotStatuses}
      onSlotClick={onSlotClick}
    />
  )
}
