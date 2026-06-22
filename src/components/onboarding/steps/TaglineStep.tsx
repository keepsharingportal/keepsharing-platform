'use client'

// Onboarding Step 2 — Tagline + About.
// card_hook  → one-line tagline used on directory cards + at the top
//              of the listing detail page just under the business name.
// detail_lead → 1-2 paragraph "About" copy shown on the listing detail.

import { useState, useEffect } from 'react'

type Advertiser = Record<string, unknown> & {
  card_hook?:   string | null
  detail_lead?: string | null
}

interface Props {
  advertiser: Advertiser
  onSave:     (patch: Partial<Advertiser>) => void
}

const HOOK_MAX = 140

export function TaglineStep({ advertiser, onSave }: Props) {
  const [hook,  setHook]  = useState(advertiser.card_hook   ?? '')
  const [about, setAbout] = useState(advertiser.detail_lead ?? '')
  useEffect(() => setHook(advertiser.card_hook ?? ''),   [advertiser.card_hook])
  useEffect(() => setAbout(advertiser.detail_lead ?? ''), [advertiser.detail_lead])

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-[20px] font-bold text-portal-text">Tagline & about</h2>
        <p className="text-[12px] text-portal-sub mt-1">
          The tagline is what catches a parent on the directory card.
          The about is what convinces them once they tap through.
        </p>
      </header>

      <div>
        <div className="flex items-baseline justify-between mb-1">
          <label className="text-[11px] font-bold text-portal-text">
            Tagline <span className="text-portal-muted font-normal">(card hook)</span>
          </label>
          <span className={`text-[10px] tabular-nums ${hook.length > HOOK_MAX ? 'text-portal-red' : 'text-portal-muted'}`}>
            {hook.length}/{HOOK_MAX}
          </span>
        </div>
        <p className="text-[10px] text-portal-sub mb-1">
          One sentence. Shows on directory cards and as the lead under your business name.
        </p>
        <input
          type="text"
          value={hook}
          onChange={e => setHook(e.target.value)}
          onBlur={() => { if (hook !== (advertiser.card_hook ?? '')) onSave({ card_hook: hook }) }}
          placeholder="All-inclusive themed birthday parties — we bring the magic."
          className="w-full px-2.5 py-2 text-[13px] border border-portal-border-2 rounded bg-white outline-none focus:border-portal-blue"
        />
      </div>

      <div>
        <label className="block text-[11px] font-bold text-portal-text mb-1">
          About — long-form
        </label>
        <p className="text-[10px] text-portal-sub mb-1">
          1-2 paragraphs. What you do, who you serve, why parents trust you.
          Renders as the &ldquo;About <em>{`<your business>`}</em>&rdquo; section.
        </p>
        <textarea
          rows={7}
          value={about}
          onChange={e => setAbout(e.target.value)}
          onBlur={() => { if (about !== (advertiser.detail_lead ?? '')) onSave({ detail_lead: about }) }}
          placeholder="Tell parents the story of your business — how you got started, what makes you different, what they can expect."
          className="w-full px-2.5 py-2 text-[13px] border border-portal-border-2 rounded bg-white outline-none focus:border-portal-blue resize-vertical"
        />
      </div>
    </div>
  )
}
