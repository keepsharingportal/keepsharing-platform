'use client'

// Onboarding Step — Best For
// section_type='best_for'. Pill-row of who/what this vendor suits.

import { TextField, BulletListBuilder } from './_shared'
import type { SectionStepProps } from './types'

export function BestForStep({ section, onSave }: SectionStepProps) {
  const headline = (section?.headline ?? '') as string
  const bullets  = (section?.bullet_points ?? []) as string[]

  return (
    <div className="space-y-5">
      <header>
        <h2 className="text-[20px] font-bold text-portal-text">Best for</h2>
        <p className="text-[12px] text-portal-sub mt-1">
          Tags describing the parents / kids / situations you serve
          best. Helps the right family self-select.
        </p>
      </header>

      <TextField
        label="Section heading (optional)"
        value={headline}
        onCommit={v => onSave({ headline: v || null })}
        placeholder="Best For"
      />
      <BulletListBuilder
        label="Tags"
        items={bullets}
        onCommit={next => onSave({ bullet_points: next })}
        placeholder="e.g. Ages 2 – 12"
        hint="Short noun phrases work best — 3-6 tags is the sweet spot."
      />
    </div>
  )
}
