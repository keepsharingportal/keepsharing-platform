'use client'

// SlotToggleButton — site-wide on/off switch for a single ad slot,
// rendered inside each SlotCard on the Slot Map. Flips the
// ad_slot_settings table via POST /api/admin/ads/slot-toggle; on
// success, router.refresh() reloads the page so the SlotCard re-renders
// with the new state.
//
// "Disabled" = the public site stops rendering that placement_type for
// the given context, regardless of bookings. Layouts collapse around it
// just like they do when no booking exists.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Power, PowerOff, RefreshCw } from 'lucide-react'

interface Props {
  placementType: string
  contextSlug:   string | null
  isDisabled:    boolean
}

export function SlotToggleButton({ placementType, contextSlug, isDisabled }: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [, startTransition] = useTransition()
  const [err, setErr] = useState<string | null>(null)

  async function toggle() {
    setBusy(true)
    setErr(null)
    try {
      const next = !isDisabled
      const res = await fetch('/api/admin/ads/slot-toggle', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ placementType, contextSlug, disabled: next }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setErr(j?.error ?? `HTTP ${res.status}`)
        return
      }
      startTransition(() => router.refresh())
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold ring-1 transition disabled:opacity-50 ${
          isDisabled
            ? 'bg-portal-red-lt text-portal-red border-portal-red/30 hover:bg-portal-red-lt'
            : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50'
        }`}
        title={isDisabled
          ? 'Slot is OFF — click to turn back on'
          : 'Click to turn this slot OFF site-wide'}
      >
        {busy ? <RefreshCw size={11} className="animate-spin" /> : isDisabled ? <PowerOff size={11} /> : <Power size={11} />}
        {isDisabled ? 'OFF' : 'On'}
      </button>
      {err && <span className="text-[10px] text-rose-600">{err}</span>}
    </div>
  )
}
