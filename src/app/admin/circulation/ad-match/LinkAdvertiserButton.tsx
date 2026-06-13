'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  stopId:        string
  advertiserId:  string
  suggested:     boolean
}

export function LinkAdvertiserButton({ stopId, advertiserId, suggested }: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function link() {
    if (!confirm('Link this stop to this advertiser? The stop\'s ad-tier will be derived from the advertiser\'s active ad placements going forward.')) return
    setBusy(true)
    try {
      const res = await fetch('/api/admin/circulation/stops', {
        method:  'PATCH',
        headers: { 'content-type': 'application/json' },
        body:    JSON.stringify({ id: stopId, advertiser_account_id: advertiserId }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        alert(j.error ?? 'Link failed.')
        return
      }
      router.refresh()
    } finally { setBusy(false) }
  }

  return (
    <button
      type="button"
      onClick={link}
      disabled={busy}
      className={`btn ${suggested ? 'btn-primary' : 'btn-ghost'} btn-xs`}
      style={{ flexShrink: 0 }}
    >
      {busy ? '…' : suggested ? 'Link' : 'Link instead'}
    </button>
  )
}
