'use client'

// Registers the service worker and offers "Download App" from the top bar.
//
// ── What "Download App" actually does ───────────────────────────────────────
// Installs the web app. There is no store listing yet, so App Store and Play
// badges would link nowhere — a dead badge is worse than no badge, and this
// install is real: own icon, full screen, works with no signal. When the
// native builds ship, the real badges go here beside it.
//
// ── The two platforms behave completely differently ─────────────────────────
// Android/Chrome fires `beforeinstallprompt`, which can be captured and
// replayed from a button. iOS fires nothing and exposes no API at all —
// Safari can only install via Share → Add to Home Screen — so on iPhone the
// button explains that instead of pretending to work.
//
// Hidden entirely once installed, because offering to install an app you are
// already running from the home screen is just confusing.

import { useEffect, useRef, useState } from 'react'
import { Download, Share, X, Check } from 'lucide-react'

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function InstallButton() {
  const [deferred, setDeferred] = useState<InstallPromptEvent | null>(null)
  const [platform, setPlatform] = useState<'none' | 'android' | 'ios'>('none')
  const [showIosHelp, setShowIosHelp] = useState(false)
  const [installed, setInstalled] = useState(false)
  const popRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Scope is tied to this file's path, so the worker can only ever control
    // /grid-tool/* — it cannot touch the magazine sites on this deployment.
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/grid-tool/sw.js', { scope: '/grid-tool/' })
        .catch(() => { /* offline support is a bonus, never a blocker */ })
    }

    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || (window.navigator as unknown as { standalone?: boolean }).standalone === true
    if (isStandalone) { setInstalled(true); return }

    const onPrompt = (e: Event) => {
      e.preventDefault()           // suppress Chrome's own mini-infobar
      setDeferred(e as InstallPromptEvent)
      setPlatform('android')
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', () => setInstalled(true))

    const ua  = navigator.userAgent
    const ios = /iPad|iPhone|iPod/.test(ua)
      || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) // iPadOS reports as Mac
    if (ios) setPlatform('ios')

    return () => window.removeEventListener('beforeinstallprompt', onPrompt)
  }, [])

  // Dismiss the iOS popover on an outside tap.
  useEffect(() => {
    if (!showIosHelp) return
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (!popRef.current?.contains(e.target as Node)) setShowIosHelp(false)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [showIosHelp])

  if (installed || platform === 'none') return null

  return (
    <div className="relative" ref={popRef}>
      <button
        type="button"
        onClick={async () => {
          if (platform === 'ios') { setShowIosHelp(v => !v); return }
          const e = deferred
          if (!e) return
          setDeferred(null)
          await e.prompt()
          const choice = await e.userChoice.catch(() => undefined)
          if (choice?.outcome === 'accepted') setInstalled(true)
        }}
        className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 sm:text-sm"
      >
        <Download className="h-4 w-4" aria-hidden />
        Download App
      </button>

      {showIosHelp && (
        <div className="absolute right-0 top-full z-20 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-semibold text-slate-900">Add it to your home screen</p>
            <button
              type="button" onClick={() => setShowIosHelp(false)}
              className="-mr-1 -mt-1 rounded p-1 text-slate-400 hover:bg-slate-100"
              aria-label="Close"
            ><X className="h-3.5 w-3.5" aria-hidden /></button>
          </div>
          <ol className="mt-2 space-y-1.5 text-xs text-slate-600">
            <li className="flex gap-1.5">
              <Check className="mt-0.5 h-3 w-3 shrink-0 text-slate-400" aria-hidden />
              <span>Tap <Share className="inline h-3.5 w-3.5" aria-hidden /> Share at the bottom of Safari</span>
            </li>
            <li className="flex gap-1.5">
              <Check className="mt-0.5 h-3 w-3 shrink-0 text-slate-400" aria-hidden />
              <span>Choose <strong className="font-semibold text-slate-900">Add to Home Screen</strong></span>
            </li>
          </ol>
          <p className="mt-2 border-t border-slate-100 pt-2 text-[11px] text-slate-500">
            It then opens full screen and works with no signal.
          </p>
        </div>
      )}
    </div>
  )
}
