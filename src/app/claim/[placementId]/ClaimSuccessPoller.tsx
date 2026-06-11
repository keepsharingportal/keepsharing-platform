'use client'

import { useEffect, useState } from 'react'

/** After Stripe redirects with ?success=1, the webhook that flips the
 *  placement to "claimed" may be a few seconds behind. Polling the page
 *  every 3 seconds for up to ~30 seconds gives the webhook time to land;
 *  once the row shows claimed_at the server-rendered banner switches to
 *  the stable "spot is taken" state and we stop polling. */
export function ClaimSuccessPoller({ placementId }: { placementId: string }) {
  const [tries, setTries] = useState(0)
  const [confirmed, setConfirmed] = useState(false)

  useEffect(() => {
    if (confirmed || tries >= 10) return
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/claim/${placementId}/status`, { cache: 'no-store' })
        const json = await res.json() as { claimed?: boolean }
        if (json.claimed) {
          setConfirmed(true)
        } else {
          setTries(n => n + 1)
        }
      } catch {
        setTries(n => n + 1)
      }
    }, 3000)
    return () => clearTimeout(t)
  }, [tries, confirmed, placementId])

  if (confirmed) {
    return (
      <p className="text-sm text-portal-green mt-4">
        Spot activated. You&apos;ll get a confirmation email shortly.
      </p>
    )
  }
  if (tries >= 10) {
    return (
      <p className="text-sm text-portal-amber mt-4">
        Taking longer than expected. Your payment is safe — we&apos;ll activate your spot manually within an hour.
        If you don&apos;t hear from us, email <a href="mailto:hello@riverregionparents.com" className="text-portal-blue hover:underline">hello@riverregionparents.com</a>.
      </p>
    )
  }
  return (
    <p className="text-sm text-portal-sub mt-4 inline-flex items-center gap-2">
      <span className="inline-block w-3 h-3 rounded-full bg-portal-amber animate-pulse" />
      Activating your spot…
    </p>
  )
}
