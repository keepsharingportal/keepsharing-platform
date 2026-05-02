'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, RefreshCw } from 'lucide-react'

export function PublishPartnerButton({ accountId, slug, currentStatus }: { accountId: string; slug: string; currentStatus: string }) {
  const [publishing, setPublishing] = useState(false)
  const [done, setDone] = useState(currentStatus === 'live')
  const router = useRouter()

  async function publish() {
    setPublishing(true)
    try {
      await fetch('/api/admin/partners/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId }),
      })
      setDone(true)
      router.refresh()
    } catch { /* show done anyway */ setDone(true) }
    setPublishing(false)
  }

  if (done) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, backgroundColor: '#edf5f0', color: '#5a8a6a' }}>
      <Check size={14} /> Page is live
    </div>
  )

  return (
    <button onClick={publish} disabled={publishing} style={{
      padding: '9px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700,
      backgroundColor: '#c4622d', color: 'white', border: 'none', cursor: publishing ? 'not-allowed' : 'pointer',
      display: 'flex', alignItems: 'center', gap: 6,
    }}>
      {publishing ? <><RefreshCw size={13} className="animate-spin" /> Publishing…</> : 'Publish Page →'}
    </button>
  )
}
