'use client'

// Onboarding Step — What's Included (features_bullets)
// section_type='features_bullets'. Bullet list of what's included in
// every booking / package / visit.

import { TextField, BulletListBuilder } from './_shared'
import type { SectionStepProps } from './types'

export function WhatsIncludedStep({ section, onSave }: SectionStepProps) {
  const headline = (section?.headline ?? '') as string
  const bullets  = (section?.bullet_points ?? []) as string[]

  return (
    <div className="space-y-5">
      <header>
        <h2 className="text-[20px] font-bold text-portal-text">What&apos;s included</h2>
        <p className="text-[12px] text-portal-sub mt-1">
          Bullet list of what comes with every booking, package, or
          visit. Short concrete items beat long marketing prose.
        </p>
      </header>

      <TextField
        label="Section heading (optional)"
        value={headline}
        onCommit={v => onSave({ headline: v || null })}
        placeholder="What's Included in Every Party"
      />
      <BulletListBuilder
        label="Items included"
        items={bullets}
        onCommit={next => onSave({ bullet_points: next })}
        placeholder="e.g. Trained party host for the full event"
      />
    </div>
  )
}
