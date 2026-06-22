'use client'

// Onboarding Step — What Makes Us Different
// section_type='whats_different'. Single body_content textarea — the
// "elevator pitch" of what sets this vendor apart.

import { TextField, TextareaField } from './_shared'
import type { SectionStepProps } from './types'

export function WhatsDifferentStep({ section, onSave }: SectionStepProps) {
  const headline = (section?.headline ?? '') as string
  const body     = (section?.body_content ?? '') as string

  return (
    <div className="space-y-5">
      <header>
        <h2 className="text-[20px] font-bold text-portal-text">What makes you different</h2>
        <p className="text-[12px] text-portal-sub mt-1">
          The one paragraph that captures why a parent should pick you
          over the alternatives. Specific beats generic — name the
          actual differentiator.
        </p>
      </header>

      <TextField
        label="Section heading (optional)"
        value={headline}
        onCommit={v => onSave({ headline: v || null })}
        placeholder="What makes us different"
      />
      <TextareaField
        label="Body"
        rows={6}
        value={body}
        onCommit={v => onSave({ body_content: v || null })}
        placeholder="One paragraph that captures what sets you apart. Be specific."
      />
    </div>
  )
}
