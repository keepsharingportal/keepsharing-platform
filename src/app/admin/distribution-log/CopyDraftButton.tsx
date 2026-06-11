'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

interface DraftShape {
  subjectLine?: string
  preheader?:   string
  body?:        string
  cta_label?:   string
  cta_url?:     string
}

export function CopyDraftButton({ draft }: { draft: DraftShape }) {
  const [copied, setCopied] = useState(false)
  const text = [
    `SUBJECT: ${draft.subjectLine ?? ''}`,
    `PREHEADER: ${draft.preheader ?? ''}`,
    '',
    draft.body ?? '',
    '',
    draft.cta_label && draft.cta_url ? `CTA: ${draft.cta_label} → ${draft.cta_url}` : '',
  ].filter(Boolean).join('\n')

  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* ignore */ }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="text-[11px] font-bold text-portal-blue hover:text-portal-blue-dk inline-flex items-center gap-1.5"
    >
      {copied ? <Check size={11} /> : <Copy size={11} />}
      {copied ? 'Copied to clipboard' : 'Copy draft'}
    </button>
  )
}
