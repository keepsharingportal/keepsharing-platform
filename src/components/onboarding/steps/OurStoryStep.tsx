'use client'

// Onboarding Step — Our Story
// section_type='our_story'. Single body_content textarea.

import { TextField, TextareaField } from './_shared'
import type { SectionStepProps } from './types'

export function OurStoryStep({ section, onSave }: SectionStepProps) {
  const headline = (section?.headline ?? '') as string
  const body     = (section?.body_content ?? '') as string

  return (
    <div className="space-y-5">
      <header>
        <h2 className="text-[20px] font-bold text-portal-text">Our story</h2>
        <p className="text-[12px] text-portal-sub mt-1">
          The longer-form story of your business. Why you started, what
          parents should know, how you got here.
        </p>
      </header>

      <TextField
        label="Section heading (optional)"
        value={headline}
        onCommit={v => onSave({ headline: v || null })}
        placeholder="About us"
      />
      <TextareaField
        label="Body"
        rows={8}
        value={body}
        onCommit={v => onSave({ body_content: v || null })}
        placeholder="Tell parents your story — origin, what you stand for, what makes your team different."
      />
    </div>
  )
}
