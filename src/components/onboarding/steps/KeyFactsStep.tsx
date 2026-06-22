'use client'

// Onboarding Step 4 — Key facts (schema-driven).
// The 3-4 icon-chip facts that surface near the listing's title.
// Fields and their labels come from GuideSchema.headlineFacts so the
// wizard rendering matches what the public page renders. Writes go
// into guide_listings.guide_data JSONB.

import { useState, useEffect } from 'react'
import type { GuideSchema } from '@/lib/guides/schemas'

interface Props {
  schema:  GuideSchema
  listing: { guide_data: Record<string, unknown> | null } | null
  onSave:  (patch: Record<string, unknown>) => void
}

export function KeyFactsStep({ schema, listing, onSave }: Props) {
  const data = (listing?.guide_data ?? {}) as Record<string, string>

  return (
    <div className="space-y-5">
      <header>
        <h2 className="text-[20px] font-bold text-portal-text">Key facts</h2>
        <p className="text-[12px] text-portal-sub mt-1">
          The headline facts parents need at a glance. These render as
          icon chips right under your business name on the listing page.
          Leave blank if a field doesn&apos;t apply to your business.
        </p>
      </header>

      <div className="grid sm:grid-cols-2 gap-4">
        {schema.headlineFacts.map(fact => (
          <FactField
            key={fact.key}
            label={fact.label}
            value={data[fact.key] ?? ''}
            onSave={v => onSave({ [fact.key]: v || null })}
            placeholder={PLACEHOLDERS[fact.key] ?? ''}
          />
        ))}
      </div>

      <div className="bg-portal-bg border border-portal-border rounded p-3 text-[11px] text-portal-sub">
        <strong>Heads up:</strong> the icon chips only show the first 4
        with data filled in. Order is fixed by the guide; on the public
        page, empty facts simply don&apos;t render.
      </div>
    </div>
  )
}

// Sensible placeholders per known fact key. Anything not listed here
// falls back to an empty placeholder — still works, just less guidance.
const PLACEHOLDERS: Record<string, string> = {
  ages:           '2 – 12',
  capacity:       'Up to 20 children',
  price_range:    '$295 – $695',
  party_duration: '2 hours',
  camp_type:      'Day camp · weekly sessions',
  dates:          'June 1 – August 15',
  cost:           '$250 / week',
  grade:          'PreK – 12',
  enrollment:     '450 students',
  tuition:        '$8,500 – $14,200',
  specialty:      'Pediatric dentistry',
  providers:      '3 pediatricians · 2 nurse practitioners',
  insurance:      'BCBS, Aetna, United, self-pay',
  hours:          'M-F 8am – 5pm',
}

function FactField({
  label, value: initial, onSave, placeholder,
}: {
  label:       string
  value:       string
  onSave:      (v: string) => void
  placeholder?: string
}) {
  const [value, setValue] = useState(initial)
  useEffect(() => setValue(initial), [initial])
  return (
    <div>
      <label className="block text-[11px] font-bold text-portal-text mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={e => setValue(e.target.value)}
        onBlur={() => { if (value !== initial) onSave(value) }}
        placeholder={placeholder}
        className="w-full px-2.5 py-2 text-[13px] border border-portal-border-2 rounded bg-white outline-none focus:border-portal-blue"
      />
    </div>
  )
}
