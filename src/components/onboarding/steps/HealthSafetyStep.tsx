'use client'

// Onboarding Step — Health & Safety
// section_type='health_safety'. body_content + bullet_points
// (certifications, allergy protocols, insurance, etc.).

import { TextField, TextareaField, BulletListBuilder } from './_shared'
import type { SectionStepProps } from './types'

export function HealthSafetyStep({ section, onSave }: SectionStepProps) {
  const headline = (section?.headline ?? '') as string
  const body     = (section?.body_content ?? '') as string
  const bullets  = (section?.bullet_points ?? []) as string[]

  return (
    <div className="space-y-5">
      <header>
        <h2 className="text-[20px] font-bold text-portal-text">Health & safety</h2>
        <p className="text-[12px] text-portal-sub mt-1">
          The things parents look for when entrusting you with their
          kids — certifications, allergy protocols, insurance, cleaning
          procedures.
        </p>
      </header>

      <TextField
        label="Section heading (optional)"
        value={headline}
        onCommit={v => onSave({ headline: v || null })}
        placeholder="Health & Safety"
      />
      <TextareaField
        label="Overview"
        rows={3}
        value={body}
        onCommit={v => onSave({ body_content: v || null })}
        placeholder="Every host is CPR + first-aid certified, background-checked, and trained on our allergy protocol."
      />
      <BulletListBuilder
        label="Specifics"
        items={bullets}
        onCommit={next => onSave({ bullet_points: next })}
        placeholder="e.g. All hosts CPR + first-aid certified"
      />
    </div>
  )
}
