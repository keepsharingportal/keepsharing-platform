'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

export function CopyHtmlIsland({ html }: { html: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(html)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // Clipboard unavailable — user can still select-all in the textarea.
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-portal-sub uppercase tracking-wider">Newsletter HTML</p>
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-gray-900 text-white rounded-lg hover:bg-gray-700"
        >
          {copied ? <><Check size={12} /> Copied!</> : <><Copy size={12} /> Copy HTML</>}
        </button>
      </div>
      <textarea
        readOnly
        value={html}
        rows={10}
        className="w-full font-mono text-[11px] text-portal-text bg-portal-bg border border-portal-border rounded-lg px-3 py-2 resize-y"
      />
      <p className="text-[11px] text-portal-muted leading-relaxed">
        Paste into Mailchimp / Beehiiv / your newsletter tool as raw HTML.
        Inline styles only — works in every email client.
      </p>
    </div>
  )
}
