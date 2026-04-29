'use client'

import { useState } from 'react'
import { Share2, Check } from 'lucide-react'

export function ShareButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false)

  async function handleShare() {
    const url = window.location.href
    if (navigator.share) {
      try { await navigator.share({ title, url }) } catch {}
      return
    }
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleShare}
      className="flex items-center gap-2 w-full py-2 px-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
    >
      {copied ? <Check size={15} className="text-green-600" /> : <Share2 size={15} />}
      {copied ? 'Link copied!' : 'Share'}
    </button>
  )
}
