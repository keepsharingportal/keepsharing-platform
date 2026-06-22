'use client'

// Onboarding Step — Parents Say (testimonials)
// section_type='parents_say'. items[] of { quote, name, detail }.

import { TextField, TextareaField, ItemListBuilder } from './_shared'
import type { SectionStepProps } from './types'

interface Testimonial { quote?: string; name?: string; detail?: string }

export function ParentsSayStep({ section, onSave }: SectionStepProps) {
  const headline = (section?.headline ?? '') as string
  const items    = (section?.items ?? []) as Testimonial[]

  return (
    <div className="space-y-5">
      <header>
        <h2 className="text-[20px] font-bold text-portal-text">Parents say</h2>
        <p className="text-[12px] text-portal-sub mt-1">
          Real quotes from parents who&apos;ve used your service. 3-5 is
          ideal — names + city build trust more than headcount.
        </p>
      </header>

      <TextField
        label="Section heading (optional)"
        value={headline}
        onCommit={v => onSave({ headline: v || null })}
        placeholder="Parents Say"
      />

      <ItemListBuilder<Testimonial>
        label="Testimonials"
        items={items}
        onCommit={next => onSave({ items: next as Array<Record<string, unknown>> })}
        addLabel="Add a testimonial"
        blank={() => ({ quote: '', name: '', detail: '' })}
        renderRow={(t, onChange, commit) => (
          <>
            <TextareaField label="Quote" rows={3} value={t.quote ?? ''}
              onCommit={v => { onChange({ quote: v }); commit() }}
              placeholder="What did the parent say?" />
            <div className="grid sm:grid-cols-2 gap-2">
              <TextField label="Name" value={t.name ?? ''}
                onCommit={v => { onChange({ name: v }); commit() }}
                placeholder="Megan T." />
              <TextField label="Detail (city, kids, etc.)" value={t.detail ?? ''}
                onCommit={v => { onChange({ detail: v }); commit() }}
                placeholder="Mom of 3 — Prattville" />
            </div>
          </>
        )}
      />
    </div>
  )
}
