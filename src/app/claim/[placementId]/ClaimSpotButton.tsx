'use client'

import { useState } from 'react'

export function ClaimSpotButton({ placementId, productId }: { placementId: string; productId: string }) {
  const [pending, setPending] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  async function claim() {
    setPending(true); setErr(null)
    try {
      const res = await fetch(`/api/claim/${placementId}/checkout`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ productId }) })
      const json = await res.json() as { ok: boolean; url?: string; error?: string }
      if (!res.ok || !json.ok || !json.url) {
        setErr(json.error ?? 'Checkout failed. Please reach out and we\'ll handle it manually.')
        setPending(false)
        return
      }
      window.location.href = json.url
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Network error.')
      setPending(false)
    }
  }
  return (
    <div>
      <button
        onClick={claim}
        disabled={pending}
        className="w-full sm:w-auto text-base font-bold text-white bg-portal-blue hover:bg-portal-blue-dk px-6 py-3 rounded-md disabled:opacity-50"
      >
        {pending ? 'Sending you to checkout…' : 'Claim this spot'}
      </button>
      {err && <p className="text-xs text-red-700 mt-2">{err}</p>}
    </div>
  )
}
