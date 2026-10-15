'use client'

// Registers the grid tool's service worker and offers to install it.
//
// ── Why this is worth having ────────────────────────────────────────────────
// Installed, the tool opens from the home screen with its own icon, no
// browser chrome, and works with no signal — which is most of what someone
// means by "can it be an app", for none of the cost, review risk or upkeep of
// an actual store listing.
//
// ── The two platforms behave completely differently ─────────────────────────
// Android/Chrome fires `beforeinstallprompt`, which can be captured and
// replayed from a button. iOS fires nothing and has no API: Safari can only
// install via Share → Add to Home Screen, so the honest thing is to say so
// rather than show a button that cannot work.

import { useEffect, useState } from 'react'
import { Download, Share, X } from 'lucide-react'

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISS_KEY = 'ks-grid-tool-install-dismissed'

export function PwaSetup() {
  const [deferred, setDeferred] = useState<InstallPromptEvent | null>(null)
  const [iosHint, setIosHint]   = useState(false)
  const [dismissed, setDismissed] = useState(true) // assume dismissed until storage is read

  useEffect(() => {
    // Scope is tied to the file's path, so this worker can only ever control
    // /grid-tool/* — see the header in public/grid-tool/sw.js.
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/grid-tool/sw.js', { scope: '/grid-tool/' })
        .catch(() => { /* offline support is a bonus, never a blocker */ })
    }

    try {
      setDismissed(localStorage.getItem(DISMISS_KEY) === '1')
    } catch { setDismissed(false) }

    const onPrompt = (e: Event) => {
      e.preventDefault()          // stop Chrome's own mini-infobar
      setDeferred(e as InstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)

    // iOS: no install API at all, so detect Safari-on-iOS and explain the
    // manual route instead. `standalone` is true once it is already
    // installed, in which case there is nothing to suggest.
    const ua  = navigator.userAgent
    const ios = /iPad|iPhone|iPod/.test(ua)
             || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) // iPadOS
    const installed = window.matchMedia('(display-mode: standalone)').matches
                   || (window.navigator as unknown as { standalone?: boolean }).standalone === true
    if (ios && !installed) setIosHint(true)

    return () => window.removeEventListener('beforeinstallprompt', onPrompt)
  }, [])

  const hide = () => {
    setDismissed(true)
    try { localStorage.setItem(DISMISS_KEY, '1') } catch { /* ignore */ }
  }

  if (dismissed || (!deferred && !iosHint)) return null

  return (
    <div className="mb-6 flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 print:hidden">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-900">Keep it on your home screen</p>
        {deferred ? (
          <p className="mt-1 text-sm text-slate-600">
            Install it and it opens like an app, full screen, and works without a signal.
          </p>
        ) : (
          <p className="mt-1 flex flex-wrap items-center gap-1 text-sm text-slate-600">
            Tap <Share className="inline h-4 w-4" aria-hidden /> Share, then
            <strong className="font-semibold text-slate-900">Add to Home Screen</strong> — it will
            open full screen and work without a signal.
          </p>
        )}
        {deferred && (
          <button
            type="button"
            onClick={async () => {
              const e = deferred
              setDeferred(null)
              await e.prompt()
              await e.userChoice.catch(() => undefined)
              hide()
            }}
            className="mt-3 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            <Download className="h-4 w-4" aria-hidden /> Install
          </button>
        )}
      </div>
      <button
        type="button" onClick={hide}
        className="shrink-0 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
    </div>
  )
}
