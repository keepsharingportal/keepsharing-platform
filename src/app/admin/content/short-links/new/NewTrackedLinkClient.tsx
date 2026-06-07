'use client'

// Thin client wrapper around AddPanel. Owns the post-save / post-cancel
// routing: both navigate back to /admin/content/short-links so the
// editor lands where the new (or aborted) row should show up.

import { useRouter } from 'next/navigation'
import { AddPanel } from '../ShortLinksClient'
import type { AdvertiserOption } from '../page'

export function NewTrackedLinkClient({ advertisers }: { advertisers: AdvertiserOption[] }) {
  const router = useRouter()
  const back = () => router.push('/admin/content/short-links')
  return (
    <AddPanel
      advertisers={advertisers}
      onCancel={back}
      onCreated={back}
    />
  )
}
