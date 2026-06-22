'use client'

// Onboarding Step — Party Hours
// section_type='party_hours'. Pre-populates a 7-row grid (Sun-Sat)
// rather than the empty list-builder pattern — every business has
// the same day labels, just different hours.

import { useState, useEffect } from 'react'
import type { SectionStepProps } from './types'
import { TextField, TextareaField } from './_shared'

interface HourRow {
  day:     string
  open?:   string
  close?:  string
  closed?: boolean
}

const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'] as const

function seedFrom(items: HourRow[]): HourRow[] {
  // Always return 7 rows in calendar order, merging in whatever's saved.
  return DAYS.map(day => {
    const existing = items.find(r => (r.day ?? '').toLowerCase() === day.toLowerCase())
    return existing ?? { day }
  })
}

export function HoursStep({ section, onSave }: SectionStepProps) {
  const headline   = (section?.headline ?? '') as string
  const bodyHint   = (section?.body_content ?? '') as string
  const savedItems = (section?.items ?? []) as unknown as HourRow[]
  const [rows, setRows] = useState<HourRow[]>(seedFrom(savedItems))
  useEffect(() => setRows(seedFrom(savedItems)), [JSON.stringify(savedItems)]) // eslint-disable-line react-hooks/exhaustive-deps

  function commit(next: HourRow[]) {
    setRows(next)
    onSave({ items: next as unknown as Array<Record<string, unknown>> })
  }

  function patch(i: number, p: Partial<HourRow>) {
    const next = rows.map((r, ix) => ix === i ? { ...r, ...p } : r)
    commit(next)
  }

  return (
    <div className="space-y-5">
      <header>
        <h2 className="text-[20px] font-bold text-portal-text">Party hours</h2>
        <p className="text-[12px] text-portal-sub mt-1">
          When you take bookings — not your office hours. Mark closed
          days and the public listing skips them with a Closed label.
        </p>
      </header>

      <TextField
        label="Section heading (optional)"
        value={headline}
        onCommit={v => onSave({ headline: v || null })}
        placeholder="Party Hours"
      />

      <div className="rounded-lg border border-portal-border bg-white overflow-hidden">
        {rows.map((r, i) => (
          <div key={r.day} className={`grid grid-cols-[120px,1fr,1fr,auto] items-center gap-2 px-3 py-2 text-[12px] ${i < rows.length - 1 ? 'border-b border-portal-border' : ''}`}>
            <span className="font-bold text-portal-text">{r.day}</span>
            <input type="text"
              value={r.open ?? ''}
              onChange={e => patch(i, { open: e.target.value })}
              disabled={r.closed}
              placeholder="10:00 AM"
              className="px-2 py-1.5 border border-portal-border-2 rounded outline-none focus:border-portal-blue disabled:bg-portal-bg disabled:text-portal-muted"
            />
            <input type="text"
              value={r.close ?? ''}
              onChange={e => patch(i, { close: e.target.value })}
              disabled={r.closed}
              placeholder="9:00 PM"
              className="px-2 py-1.5 border border-portal-border-2 rounded outline-none focus:border-portal-blue disabled:bg-portal-bg disabled:text-portal-muted"
            />
            <label className="inline-flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox"
                checked={!!r.closed}
                onChange={e => patch(i, { closed: e.target.checked, open: e.target.checked ? '' : r.open, close: e.target.checked ? '' : r.close })} />
              <span className="text-[11px] font-semibold">Closed</span>
            </label>
          </div>
        ))}
      </div>

      <TextareaField
        label="Notes (optional)"
        rows={2}
        value={bodyHint}
        onCommit={v => onSave({ body_content: v || null })}
        placeholder="Most parties book 2 – 6 weeks out. Saturday afternoons fill up first."
      />
    </div>
  )
}
