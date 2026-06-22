'use client'

// Onboarding Step — Booking & Policies
// section_type='booking_notes'. body_content + bullet_points.

import { TextField, TextareaField, BulletListBuilder } from './_shared'
import type { SectionStepProps } from './types'

export function BookingNotesStep({ section, onSave }: SectionStepProps) {
  const headline = (section?.headline ?? '') as string
  const body     = (section?.body_content ?? '') as string
  const bullets  = (section?.bullet_points ?? []) as string[]

  return (
    <div className="space-y-5">
      <header>
        <h2 className="text-[20px] font-bold text-portal-text">Booking & policies</h2>
        <p className="text-[12px] text-portal-sub mt-1">
          Deposit, cancellation, rescheduling — anything a parent
          should know before they book. Bullet list works great for
          specifics.
        </p>
      </header>

      <TextField
        label="Section heading (optional)"
        value={headline}
        onCommit={v => onSave({ headline: v || null })}
        placeholder="Booking & Policies"
      />
      <TextareaField
        label="Overview"
        rows={3}
        value={body}
        onCommit={v => onSave({ body_content: v || null })}
        placeholder="Deposits are non-refundable but transferable to a future date with 14 days' notice."
      />
      <BulletListBuilder
        label="Specifics"
        items={bullets}
        onCommit={next => onSave({ bullet_points: next })}
        placeholder="e.g. $100 deposit reserves the date"
      />
    </div>
  )
}
