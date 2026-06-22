'use client'

// Onboarding Step — Special Offer
// section_type='special_offer'. Single offer with text + CTA.

import { TextField, TextareaField } from './_shared'
import type { SectionStepProps } from './types'

export function SpecialOfferStep({ section, onSave }: SectionStepProps) {
  const headline = (section?.headline ?? '') as string
  const offerText = (section?.offer_text ?? '') as string
  const ctaLabel = (section?.offer_cta_label ?? '') as string
  const ctaUrl   = (section?.offer_cta_url ?? '') as string

  return (
    <div className="space-y-5">
      <header>
        <h2 className="text-[20px] font-bold text-portal-text">Special offer (optional)</h2>
        <p className="text-[12px] text-portal-sub mt-1">
          Optional. A perk for River Region Parents readers — works
          best when it&apos;s specific and named (&ldquo;Mention RRP at
          booking for a free…&rdquo;) rather than a generic discount.
        </p>
      </header>

      <TextField
        label="Heading (optional)"
        value={headline}
        onCommit={v => onSave({ headline: v || null })}
        placeholder="Special Offer for River Region Parents"
      />
      <TextareaField
        label="Offer details"
        rows={3}
        value={offerText}
        onCommit={v => onSave({ offer_text: v || null })}
        placeholder="Mention River Region Parents at booking and we'll add face painting to any package, free ($85 value)."
      />
      <div className="grid sm:grid-cols-[1fr,2fr] gap-3">
        <TextField label="CTA button label (optional)"
          value={ctaLabel}
          onCommit={v => onSave({ offer_cta_label: v || null })}
          placeholder="Book a Tour" />
        <TextField label="CTA URL (optional)"
          value={ctaUrl}
          onCommit={v => onSave({ offer_cta_url: v || null })}
          placeholder="https://yourbusiness.com/book" />
      </div>
    </div>
  )
}
