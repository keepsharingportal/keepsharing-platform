'use client'

// Small client banner shown above the wizard on the public token URL.
// First-time visitors see a welcome; returning visitors see the
// "your changes save automatically" reminder.

import { Sparkles, RefreshCw } from 'lucide-react'

export function PublicSendLinkBanner({ status }: { status: string | null }) {
  if (status === 'submitted') {
    return (
      <div className="bg-portal-green-lt border border-portal-green/30 rounded-lg p-3 text-[12px] text-portal-green">
        <strong>Listing submitted.</strong> You can still edit anything here — changes auto-save and your live listing reflects them right away.
      </div>
    )
  }
  if (status === 'in_progress') {
    return (
      <div className="bg-portal-blue-lt border border-portal-blue/30 rounded-lg p-3 text-[12px] text-portal-text inline-flex items-center gap-2">
        <RefreshCw size={12} className="text-portal-blue" />
        Welcome back — picking up where you left off. Changes save as you go.
      </div>
    )
  }
  return (
    <div className="bg-portal-blue-lt border border-portal-blue/30 rounded-lg p-3 text-[12px] text-portal-text inline-flex items-center gap-2">
      <Sparkles size={12} className="text-portal-blue" />
      Welcome! Fill out each step at your pace — your changes save automatically and you can leave & return any time using this same link.
    </div>
  )
}
