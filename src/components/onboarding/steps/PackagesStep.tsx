'use client'

// Onboarding Step — Party Packages
// section_type='party_packages'. items[] of { name, price, duration,
// includes: [], note, featured }.

import { TextField, TextareaField, ItemListBuilder, BulletListBuilder } from './_shared'
import type { SectionStepProps } from './types'

interface Pkg {
  name?:     string
  price?:    string
  duration?: string
  includes?: string[]
  note?:     string
  featured?: boolean
}

export function PackagesStep({ section, onSave }: SectionStepProps) {
  const headline    = (section?.headline ?? '') as string
  const subheadline = (section?.subheadline ?? '') as string
  const items       = (section?.items ?? []) as Pkg[]

  return (
    <div className="space-y-5">
      <header>
        <h2 className="text-[20px] font-bold text-portal-text">Party packages</h2>
        <p className="text-[12px] text-portal-sub mt-1">
          Each package shows as a card on your listing. Star one as
          &ldquo;Most Popular&rdquo; to draw the eye.
        </p>
      </header>

      <TextField
        label="Section heading (optional)"
        value={headline}
        onCommit={v => onSave({ headline: v || null })}
        placeholder="Party Packages"
      />
      <TextareaField
        label="Sub-heading (optional)"
        rows={2}
        value={subheadline}
        onCommit={v => onSave({ subheadline: v || null })}
        placeholder="Every package includes setup, hosting, food, cake plating, and post-party cleanup."
      />

      <ItemListBuilder<Pkg>
        label="Packages"
        items={items}
        onCommit={next => onSave({ items: next as Array<Record<string, unknown>> })}
        addLabel="Add a package"
        blank={() => ({ name: '', price: '', duration: '', includes: [], featured: false })}
        renderRow={(pkg, onChange, commit) => (
          <>
            <div className="grid sm:grid-cols-[2fr,1fr,1fr] gap-2">
              <TextField label="Name" value={pkg.name ?? ''}
                onCommit={v => { onChange({ name: v }); commit() }}
                placeholder="The Confetti" />
              <TextField label="Price" value={pkg.price ?? ''}
                onCommit={v => { onChange({ price: v }); commit() }}
                placeholder="$495" />
              <TextField label="Duration / size" value={pkg.duration ?? ''}
                onCommit={v => { onChange({ duration: v }); commit() }}
                placeholder="2 hours · up to 16 kids" />
            </div>
            <BulletListBuilder
              label="What's included"
              items={pkg.includes ?? []}
              onCommit={inc => { onChange({ includes: inc }); commit() }}
              placeholder="e.g. Choice of 2 theme rooms"
            />
            <TextField label="Note (optional)" value={pkg.note ?? ''}
              onCommit={v => { onChange({ note: v }); commit() }}
              placeholder="Whole-studio buyout — no other parties booked during your slot." />
            <label className="inline-flex items-center gap-2 text-[12px] font-semibold text-portal-text cursor-pointer pt-1">
              <input type="checkbox"
                checked={!!pkg.featured}
                onChange={e => { onChange({ featured: e.target.checked }); commit() }} />
              Mark as &ldquo;Most Popular&rdquo; (gold badge + accent border)
            </label>
          </>
        )}
      />
    </div>
  )
}
