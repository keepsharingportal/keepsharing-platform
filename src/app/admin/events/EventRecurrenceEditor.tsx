'use client'

// EventRecurrenceEditor — friendly picker UI for the events recurrence
// rule. Produces an RFC 5545 RRULE string that gets saved to
// calendar_events.recurrence_rule (added in migration 077). Mirrors the
// Modern Events Calendar UI editors already know from WordPress: a
// "Repeats" select with friendly options, an interval input, an
// optional weekday picker for the "Certain Weekdays" choice, and an
// "Ends" group (Never / On / After N).
//
// The component carries its own UI state and emits the canonical RRULE
// string through onChange. Pass an existing rule via `value` to seed
// the UI; the parser handles the simple cases this picker generates
// and falls back to Advanced mode (raw string editing) for anything
// more exotic.
//
// Why RRULE: it's the iCal standard, what Google Calendar / Apple
// Calendar / MEC all use, and the `rrule` npm library can expand it
// into virtual occurrences on the public side (phase 2).

import { useEffect, useMemo, useState } from 'react'

type Freq = 'DAILY' | 'WEEKDAYS' | 'WEEKENDS' | 'CERTAIN_WEEKDAYS' | 'WEEKLY' | 'MONTHLY' | 'YEARLY' | 'CUSTOM_DAYS' | 'ADVANCED'

interface EditorState {
  enabled:    boolean
  freq:       Freq
  interval:   number
  byday:      string[]                  // ['MO','WE','FR']
  endsMode:   'NEVER' | 'ON' | 'AFTER'
  until:      string                    // YYYY-MM-DD
  count:      number
  raw:        string                    // ADVANCED mode raw RRULE
}

const FREQ_OPTIONS: Array<{ value: Freq; label: string }> = [
  { value: 'DAILY',            label: 'Daily'            },
  { value: 'WEEKDAYS',         label: 'Every Weekday'    },
  { value: 'WEEKENDS',         label: 'Every Weekend'    },
  { value: 'CERTAIN_WEEKDAYS', label: 'Certain Weekdays' },
  { value: 'WEEKLY',           label: 'Weekly'           },
  { value: 'MONTHLY',          label: 'Monthly'          },
  { value: 'YEARLY',           label: 'Yearly'           },
  { value: 'CUSTOM_DAYS',      label: 'Custom Days'      },
  { value: 'ADVANCED',         label: 'Advanced (raw)'   },
]

const DAY_OPTIONS = [
  { value: 'MO', label: 'Mon' }, { value: 'TU', label: 'Tue' },
  { value: 'WE', label: 'Wed' }, { value: 'TH', label: 'Thu' },
  { value: 'FR', label: 'Fri' }, { value: 'SA', label: 'Sat' },
  { value: 'SU', label: 'Sun' },
]

const DEFAULT_STATE: EditorState = {
  enabled:  false,
  freq:     'WEEKLY',
  interval: 1,
  byday:    [],
  endsMode: 'NEVER',
  until:    '',
  count:    10,
  raw:      '',
}

// ── Generate ──────────────────────────────────────────────────────────────
// Turn the UI state into an RRULE string. Returns null when the
// recurrence is disabled, which the caller saves as a NULL recurrence_rule.
function buildRrule(s: EditorState): string | null {
  if (!s.enabled) return null
  if (s.freq === 'ADVANCED') {
    return s.raw.trim() || null
  }

  const parts: string[] = []
  let freq:   string    = 'DAILY'
  let byday:  string[]  = []

  switch (s.freq) {
    case 'DAILY':
      freq = 'DAILY'; break
    case 'WEEKDAYS':
      freq = 'WEEKLY'; byday = ['MO','TU','WE','TH','FR']; break
    case 'WEEKENDS':
      freq = 'WEEKLY'; byday = ['SA','SU']; break
    case 'CERTAIN_WEEKDAYS':
      freq = 'WEEKLY'; byday = s.byday.length > 0 ? s.byday : ['MO']; break
    case 'WEEKLY':
      freq = 'WEEKLY'; break
    case 'MONTHLY':
      freq = 'MONTHLY'; break
    case 'YEARLY':
      freq = 'YEARLY'; break
    case 'CUSTOM_DAYS':
      // CUSTOM_DAYS uses RDATE instead of RRULE — explicit list of dates.
      // For phase 1 we treat it as Advanced and let the editor enter the
      // RDATE/dates by hand in raw form; we expose it as a hint.
      return s.raw.trim() || null
  }

  parts.push(`FREQ=${freq}`)
  if (s.interval > 1) parts.push(`INTERVAL=${s.interval}`)
  if (byday.length > 0) parts.push(`BYDAY=${byday.join(',')}`)

  if (s.endsMode === 'ON' && s.until) {
    // Compact-date form: YYYYMMDD with a 'T000000Z' suffix at midnight UTC.
    // The RRULE spec requires a date-time when UNTIL is used with a
    // date-time DTSTART; keep midnight to mean "end of that day."
    const compact = s.until.replace(/-/g, '')
    parts.push(`UNTIL=${compact}T235959Z`)
  } else if (s.endsMode === 'AFTER' && s.count > 0) {
    parts.push(`COUNT=${s.count}`)
  }

  return parts.join(';')
}

// ── Parse ─────────────────────────────────────────────────────────────────
// Best-effort parse of a known-shape RRULE back into editor state. Anything
// we can't recognize drops into ADVANCED mode so the editor can still see
// and edit the raw rule without losing it.
function parseRrule(rrule: string | null | undefined): EditorState {
  if (!rrule) return { ...DEFAULT_STATE }

  const tokens: Record<string, string> = {}
  for (const part of rrule.split(';')) {
    const [k, v] = part.split('=')
    if (k && v) tokens[k.toUpperCase()] = v
  }

  const freqTok  = tokens['FREQ']
  const interval = Number(tokens['INTERVAL'] || '1') || 1
  const byday    = (tokens['BYDAY'] || '').split(',').filter(Boolean)
  const count    = Number(tokens['COUNT'] || '0') || 0
  const until    = tokens['UNTIL'] || ''

  let untilDate = ''
  if (until) {
    // 'YYYYMMDD' or 'YYYYMMDDTHHMMSSZ' → 'YYYY-MM-DD'
    const m = until.match(/^(\d{4})(\d{2})(\d{2})/)
    if (m) untilDate = `${m[1]}-${m[2]}-${m[3]}`
  }

  const endsMode: EditorState['endsMode'] =
    until ? 'ON'
    : count > 0 ? 'AFTER'
    : 'NEVER'

  // Map the canonical (freq + byday) back to a friendly choice if possible.
  let freq: Freq = 'ADVANCED'
  let rawHint = rrule
  if (freqTok === 'DAILY') {
    freq    = 'DAILY'
    rawHint = ''
  } else if (freqTok === 'WEEKLY') {
    const set = new Set(byday)
    if (byday.length === 0) {
      freq    = 'WEEKLY'
      rawHint = ''
    } else if (set.size === 5 && ['MO','TU','WE','TH','FR'].every(d => set.has(d))) {
      freq    = 'WEEKDAYS'
      rawHint = ''
    } else if (set.size === 2 && ['SA','SU'].every(d => set.has(d))) {
      freq    = 'WEEKENDS'
      rawHint = ''
    } else {
      freq    = 'CERTAIN_WEEKDAYS'
      rawHint = ''
    }
  } else if (freqTok === 'MONTHLY') {
    freq    = 'MONTHLY'
    rawHint = ''
  } else if (freqTok === 'YEARLY') {
    freq    = 'YEARLY'
    rawHint = ''
  }

  return {
    enabled:  true,
    freq,
    interval,
    byday,
    endsMode,
    until:    untilDate,
    count:    count > 0 ? count : 10,
    raw:      rawHint,
  }
}

// ── Component ─────────────────────────────────────────────────────────────

interface Props {
  value:    string | null
  onChange: (next: string | null) => void
}

export function EventRecurrenceEditor({ value, onChange }: Props) {
  // Seed once from value; further updates flow from the UI to onChange,
  // not back from value (otherwise typing in raw mode would fight the
  // round-trip). When the parent changes the row context (e.g. switching
  // events), the useEffect below re-seeds.
  const [state, setState] = useState<EditorState>(() => parseRrule(value))
  useEffect(() => {
    setState(parseRrule(value))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  // Whenever state changes, regenerate and emit. Mirrors the canonical
  // RRULE up to the parent on every keystroke / select so the saving
  // form sees a fresh value at submit time.
  const generated = useMemo(() => buildRrule(state), [state])
  useEffect(() => {
    onChange(generated)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generated])

  function toggleDay(d: string) {
    setState(s => ({
      ...s,
      byday: s.byday.includes(d) ? s.byday.filter(x => x !== d) : [...s.byday, d],
    }))
  }

  const showWeekdays = state.freq === 'CERTAIN_WEEKDAYS'
  const showRaw      = state.freq === 'ADVANCED' || state.freq === 'CUSTOM_DAYS'

  return (
    <div className="rounded-lg border border-portal-border bg-white p-4 space-y-3">
      <label className="flex items-center gap-2 text-sm font-semibold text-portal-text">
        <input
          type="checkbox"
          checked={state.enabled}
          onChange={e => setState(s => ({ ...s, enabled: e.target.checked }))}
          className="rounded border-portal-border-2"
        />
        Event Repeating (recurring event)
      </label>

      {state.enabled && (
        <div className="space-y-3 pl-6">
          {/* Repeats + interval */}
          <div className="flex items-center gap-3 flex-wrap">
            <label className="text-xs font-semibold text-portal-sub uppercase tracking-wide w-20">Repeats</label>
            <select
              value={state.freq}
              onChange={e => setState(s => ({ ...s, freq: e.target.value as Freq }))}
              className="px-3 py-1.5 text-sm rounded-lg border border-portal-border bg-white outline-none focus:border-portal-blue"
            >
              {FREQ_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <span className="text-xs text-portal-sub">every</span>
            <input
              type="number"
              min={1}
              value={state.interval}
              onChange={e => setState(s => ({ ...s, interval: Math.max(1, Number(e.target.value) || 1) }))}
              className="w-16 px-2 py-1.5 text-sm rounded-lg border border-portal-border bg-white outline-none focus:border-portal-blue"
            />
            <span className="text-xs text-portal-sub">
              {state.freq === 'DAILY'   ? (state.interval > 1 ? 'days'   : 'day')
              : state.freq === 'WEEKLY' || state.freq === 'WEEKDAYS' || state.freq === 'WEEKENDS' || state.freq === 'CERTAIN_WEEKDAYS'
                                        ? (state.interval > 1 ? 'weeks'  : 'week')
              : state.freq === 'MONTHLY' ? (state.interval > 1 ? 'months' : 'month')
              : state.freq === 'YEARLY'  ? (state.interval > 1 ? 'years'  : 'year')
              : ''}
            </span>
          </div>

          {showWeekdays && (
            <div className="flex items-center gap-2 flex-wrap pl-20">
              {DAY_OPTIONS.map(d => {
                const on = state.byday.includes(d.value)
                return (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => toggleDay(d.value)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md border transition ${
                      on
                        ? 'bg-portal-navy text-white border-portal-blue'
                        : 'bg-white text-portal-sub border-portal-border hover:border-portal-border-2'
                    }`}
                  >
                    {d.label}
                  </button>
                )
              })}
            </div>
          )}

          {showRaw && (
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-portal-sub uppercase tracking-wide">
                {state.freq === 'CUSTOM_DAYS' ? 'Custom dates (RDATE)' : 'Raw RRULE'}
              </label>
              <input
                value={state.raw}
                onChange={e => setState(s => ({ ...s, raw: e.target.value }))}
                placeholder={state.freq === 'CUSTOM_DAYS'
                  ? 'RDATE:20260601T080000Z,20260615T080000Z,20260629T080000Z'
                  : 'FREQ=WEEKLY;BYDAY=TU,TH;UNTIL=20261231T235959Z'}
                className="w-full px-3 py-1.5 text-xs font-mono rounded-lg border border-portal-border bg-white outline-none focus:border-portal-blue"
              />
              <p className="text-[11px] text-portal-sub">
                {state.freq === 'CUSTOM_DAYS'
                  ? 'Comma-separated list of UTC date-times. Use the friendly options above unless you need explicit dates.'
                  : 'RFC 5545 RRULE format. Falls back to this when the friendly options can’t express the schedule.'}
              </p>
            </div>
          )}

          {/* Ends */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-portal-sub uppercase tracking-wide">Ends Repeat</label>
            <div className="flex items-center gap-3 flex-wrap">
              <label className="inline-flex items-center gap-1.5 text-sm text-portal-text">
                <input
                  type="radio"
                  name="ends-mode"
                  checked={state.endsMode === 'NEVER'}
                  onChange={() => setState(s => ({ ...s, endsMode: 'NEVER' }))}
                />
                Never
              </label>
              <label className="inline-flex items-center gap-1.5 text-sm text-portal-text">
                <input
                  type="radio"
                  name="ends-mode"
                  checked={state.endsMode === 'ON'}
                  onChange={() => setState(s => ({ ...s, endsMode: 'ON' }))}
                />
                On
                <input
                  type="date"
                  value={state.until}
                  onChange={e => setState(s => ({ ...s, endsMode: 'ON', until: e.target.value }))}
                  className="px-2 py-1 text-xs rounded-lg border border-portal-border bg-white outline-none focus:border-portal-blue disabled:opacity-50"
                  disabled={state.endsMode !== 'ON'}
                />
              </label>
              <label className="inline-flex items-center gap-1.5 text-sm text-portal-text">
                <input
                  type="radio"
                  name="ends-mode"
                  checked={state.endsMode === 'AFTER'}
                  onChange={() => setState(s => ({ ...s, endsMode: 'AFTER' }))}
                />
                After
                <input
                  type="number"
                  min={1}
                  value={state.count}
                  onChange={e => setState(s => ({ ...s, endsMode: 'AFTER', count: Math.max(1, Number(e.target.value) || 1) }))}
                  className="w-16 px-2 py-1 text-xs rounded-lg border border-portal-border bg-white outline-none focus:border-portal-blue disabled:opacity-50"
                  disabled={state.endsMode !== 'AFTER'}
                />
                occurrences
              </label>
            </div>
          </div>

          {/* Preview */}
          {generated && (
            <div className="rounded-md bg-portal-bg px-3 py-2">
              <p className="text-[10px] font-bold uppercase tracking-wide text-portal-sub mb-0.5">Saved as</p>
              <code className="text-[11px] font-mono text-portal-text break-all">{generated}</code>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
