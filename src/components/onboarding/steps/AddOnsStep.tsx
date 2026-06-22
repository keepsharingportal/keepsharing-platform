'use client'

// Onboarding Step — Add-Ons
// section_type='party_addons'. items[] of { name, price, note }.

import { TextField, TextareaField, ItemListBuilder } from './_shared'
import type { SectionStepProps } from './types'

interface AddOn { name?: string; price?: string; note?: string }

export function AddOnsStep({ section, onSave }: SectionStepProps) {
  const headline    = (section?.headline ?? '') as string
  const subheadline = (section?.subheadline ?? '') as string
  const items       = (section?.items ?? []) as AddOn[]

  return (
    <div className="space-y-5">
      <header>
        <h2 className="text-[20px] font-bold text-portal-text">Add-on options</h2>
        <p className="text-[12px] text-portal-sub mt-1">
          Optional extras a parent can stack onto any package. Each
          shows as a price line on your listing.
        </p>
      </header>

      <TextField
        label="Section heading (optional)"
        value={headline}
        onCommit={v => onSave({ headline: v || null })}
        placeholder="Add-On Options"
      />
      <TextareaField
        label="Sub-heading (optional)"
        rows={2}
        value={subheadline}
        onCommit={v => onSave({ subheadline: v || null })}
        placeholder="Stack any of these onto any package."
      />

      <ItemListBuilder<AddOn>
        label="Add-ons"
        items={items}
        onCommit={next => onSave({ items: next as Array<Record<string, unknown>> })}
        addLabel="Add an add-on"
        blank={() => ({ name: '', price: '' })}
        renderRow={(a, onChange, commit) => (
          <div className="grid sm:grid-cols-[2fr,1fr] gap-2">
            <TextField label="Name" value={a.name ?? ''}
              onCommit={v => { onChange({ name: v }); commit() }}
              placeholder="Face painting (1 hr)" />
            <TextField label="Price" value={a.price ?? ''}
              onCommit={v => { onChange({ price: v }); commit() }}
              placeholder="+$85" />
          </div>
        )}
      />
    </div>
  )
}
