'use client'

// Onboarding Step — Themes Available
// section_type='themes_available'. Bullet list of party themes (or
// equivalent for non-party guides).

import { TextField, TextareaField, BulletListBuilder } from './_shared'
import type { SectionStepProps } from './types'

export function ThemesStep({ section, onSave }: SectionStepProps) {
  const headline    = (section?.headline ?? '') as string
  const subheadline = (section?.subheadline ?? '') as string
  const bullets     = (section?.bullet_points ?? []) as string[]

  return (
    <div className="space-y-5">
      <header>
        <h2 className="text-[20px] font-bold text-portal-text">Themes available</h2>
        <p className="text-[12px] text-portal-sub mt-1">
          The party themes you offer. Each one renders as a card on
          your listing — short names work better than long descriptions.
        </p>
      </header>

      <TextField
        label="Section heading (optional)"
        value={headline}
        onCommit={v => onSave({ headline: v || null })}
        placeholder="Themes Available"
      />
      <TextareaField
        label="Sub-heading (optional)"
        rows={2}
        value={subheadline}
        onCommit={v => onSave({ subheadline: v || null })}
        placeholder="Eight ready-to-go themes plus custom themes by request (4 weeks notice)."
      />
      <BulletListBuilder
        label="Theme names"
        items={bullets}
        onCommit={next => onSave({ bullet_points: next })}
        placeholder="e.g. Princess Tea Party"
      />
    </div>
  )
}
