'use client'

// QuickAddEventPanel — inline drop-down panel rendered above the events list
// when the operator clicks "Quick Add Event". Mirrors the SchoolNewsClient
// Quick Add pattern: compact form with the essentials, then the inline editor
// (in EventRowItem) can backfill anything else after creation.
//
// On submit:
//   POST /api/admin/events (action='create')
//   → row inserted with status='pending' (so it lands in Pending Review).
//   onAdded() drops the new row into the list optimistically.

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Plus, RefreshCw, Calendar, Camera, Image as ImageIcon, AlertTriangle, ExternalLink,
} from 'lucide-react'
import { EVENT_CATEGORIES } from '@/lib/calendar-taxonomy'
import { compressIfLarge } from '@/lib/admin/compress-image'
import { EventRecurrenceEditor } from './EventRecurrenceEditor'
import type { EventRow, EventSource } from './page'

interface DuplicateMatch {
  id:            string
  title:         string
  start_date:    string
  start_time:    string | null
  location_name: string | null
  status:        string
  similarity:    number
}

interface Props {
  sources:  EventSource[]
  onCancel: () => void
  onAdded:  (ev: EventRow) => void
}

export function QuickAddEventPanel({ sources, onCancel, onAdded }: Props) {
  const [title,       setTitle]       = useState('')
  const [description, setDescription] = useState('')
  const [startDate,   setStartDate]   = useState('')
  const [endDate,     setEndDate]     = useState('')
  const [startTime,   setStartTime]   = useState('')
  const [endTime,     setEndTime]     = useState('')
  const [location,    setLocation]    = useState('')
  const [address,     setAddress]     = useState('')
  const [city,        setCity]        = useState('')
  const [organizer,   setOrganizer]   = useState('')
  const [registration, setRegistration] = useState('')
  const [costText,    setCostText]    = useState('')
  const [isFree,      setIsFree]      = useState(false)
  const [isFeatured,  setIsFeatured]  = useState(false)
  const [category,    setCategory]    = useState('')
  const [sourceId,    setSourceId]    = useState('')
  const [heroUrl,     setHeroUrl]     = useState('')
  const [autoPublish, setAutoPublish] = useState(false)

  // Image pipeline outputs — held until submit so the event row carries
  // image_orig_path/width/height alongside hero_image_url and re-crop works
  // immediately after creation.
  const [origPath,    setOrigPath]    = useState<string | null>(null)
  const [imgW,        setImgW]        = useState<number | null>(null)
  const [imgH,        setImgH]        = useState<number | null>(null)

  // RRULE-encoded recurrence pattern (null = one-off event).
  // EventRecurrenceEditor handles the friendly UI and emits the string.
  const [recurrenceRule, setRecurrenceRule] = useState<string | null>(null)
  // Optional plain-text override for how the event time displays publicly
  // (e.g. "10 AM & 1 PM", "Doors at 6:30", "Drop in 10–4"). Empty = auto-
  // format from start_time/end_time.
  const [displayTimeOverride, setDisplayTimeOverride] = useState('')

  const [busy,        setBusy]        = useState(false)
  const [imageBusy,   setImageBusy]   = useState(false)
  const [err,         setErr]         = useState<string | null>(null)

  // ── Duplicate detection ───────────────────────────────────────────────────
  // Debounced check that fires once title + start_date are populated. Surfaces
  // a soft warning above the submit button — operator can still proceed
  // ("Add anyway") if they're sure the dupe isn't actually a dupe.
  const [duplicates, setDuplicates] = useState<DuplicateMatch[]>([])
  const [dupeChecking, setDupeChecking] = useState(false)
  const [overrideDupe, setOverrideDupe] = useState(false)
  useEffect(() => {
    const trimmedTitle = title.trim()
    if (trimmedTitle.length < 3 || !startDate) {
      setDuplicates([])
      return
    }
    const handle = setTimeout(async () => {
      setDupeChecking(true)
      try {
        const res = await fetch('/api/admin/events/check-duplicates', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            title:      trimmedTitle,
            start_date: startDate,
            city:       city.trim() || null,
          }),
        })
        if (res.ok) {
          const json = await res.json() as { matches: DuplicateMatch[] }
          setDuplicates(json.matches ?? [])
        } else {
          setDuplicates([])
        }
      } catch {
        setDuplicates([])
      } finally {
        setDupeChecking(false)
      }
    }, 500)
    return () => clearTimeout(handle)
  }, [title, startDate, city])

  // Optimize a pasted URL: pulls the remote image once, runs it through the
  // Sharp pipeline (attention crop, WebP, ~50KB), stores on our Supabase
  // bucket. Trades a few seconds at edit time for fast loads forever after,
  // plus removes the hot-link risk if the organizer takes their site down.
  async function optimizeUrl(rawUrl: string) {
    setImageBusy(true); setErr(null)
    try {
      const res = await fetch('/api/admin/events/upload', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ url: rawUrl, title: title.trim() || undefined }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        // Don't blank the URL on error — operator may still want the raw
        // link as a last resort. Just show the message and let them decide.
        setErr(json?.error ?? `HTTP ${res.status}`)
        return
      }
      setHeroUrl(json.hero_image_url)
      setOrigPath(json.image_orig_path)
      setImgW(json.image_width)
      setImgH(json.image_height)
    } finally {
      setImageBusy(false)
    }
  }

  async function uploadImage(file: File) {
    setImageBusy(true); setErr(null)
    try {
      const compressed = await compressIfLarge(file)
      const fd = new FormData()
      fd.append('image', compressed)
      if (title.trim()) fd.append('title', title.trim())
      const res = await fetch('/api/admin/events/upload', { method: 'POST', body: fd })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { setErr(json?.error ?? `HTTP ${res.status}`); return }
      setHeroUrl(json.hero_image_url)
      setOrigPath(json.image_orig_path)
      setImgW(json.image_width)
      setImgH(json.image_height)
    } finally {
      setImageBusy(false)
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    if (!title.trim())     { setErr('Title is required');      return }
    if (!startDate.trim()) { setErr('Start date is required'); return }
    // Block save until the operator either has no matching duplicates OR has
    // explicitly clicked "Add anyway" past the warning.
    if (duplicates.length > 0 && !overrideDupe) {
      setErr('Possible duplicate found — review the matches above and click "Add anyway" if this is genuinely different.')
      return
    }

    setBusy(true)
    try {
      const sourceName = sources.find(s => s.id === sourceId)?.name ?? null
      const res = await fetch('/api/admin/events', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          action:           'create',
          title:            title.trim(),
          description:      description.trim() || null,
          start_date:       startDate,
          end_date:         endDate || null,
          start_time:       startTime || null,
          end_time:         endTime || null,
          location_name:    location.trim() || null,
          address:          address.trim() || null,
          city:             city.trim() || null,
          organizer_name:   organizer.trim() || null,
          registration_url: registration.trim() || null,
          cost_text:        costText.trim() || null,
          is_free:          isFree,
          is_featured:      isFeatured,
          category:         category || null,
          hero_image_url:   heroUrl.trim() || null,
          image_orig_path:  origPath,
          image_width:      imgW,
          image_height:     imgH,
          source_id:        sourceId || null,
          source_name:      sourceName,
          status:           autoPublish ? 'published' : 'pending',
          recurrence_rule:  recurrenceRule,
          display_time_override: displayTimeOverride.trim() || null,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { setErr(json?.error ?? `HTTP ${res.status}`); return }
      onAdded(json.event as EventRow)
    } finally {
      setBusy(false)
    }
  }

  const inp = 'w-full text-sm border border-blue-200 rounded-lg px-3 py-2 outline-none focus:border-portal-blue bg-white'
  const lbl = 'block text-[10px] font-bold uppercase tracking-wider text-portal-blue mb-1'

  return (
    <form
      onSubmit={submit}
      className="bg-portal-blue-lt/40 border-b border-portal-blue/20 px-6 py-5"
    >
      <div className="flex items-baseline justify-between mb-4 flex-wrap gap-2">
        <h2 className="text-sm font-bold text-blue-900 inline-flex items-center gap-2">
          <Calendar size={14} /> Quick Add Event
        </h2>
        <label className="inline-flex items-center gap-2 text-xs text-blue-900 cursor-pointer">
          <input
            type="checkbox"
            checked={autoPublish}
            onChange={e => setAutoPublish(e.target.checked)}
            className="rounded"
          />
          Publish immediately (skip review)
        </label>
      </div>

      <div className="grid md:grid-cols-[200px_1fr] gap-4">
        {/* Image column */}
        <div>
          <p className={lbl}>Hero image</p>
          <div className="aspect-[4/3] w-full rounded-lg overflow-hidden bg-white ring-1 ring-portal-blue/30">
            {heroUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={heroUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-blue-200">
                <ImageIcon size={36} />
              </div>
            )}
          </div>
          <label className="mt-2 inline-flex items-center justify-center gap-1.5 w-full px-2 py-1.5 text-xs font-semibold border border-dashed border-portal-border-2 rounded-lg bg-white cursor-pointer hover:border-blue-500 text-portal-blue">
            {imageBusy ? <RefreshCw size={11} className="animate-spin" /> : <Camera size={11} />}
            {imageBusy ? 'Uploading…' : (heroUrl ? 'Replace image' : 'Upload image')}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
              className="hidden"
              onChange={e => {
                const f = e.target.files?.[0]
                if (f) uploadImage(f)
              }}
            />
          </label>
          <div className="mt-2">
            <p className={lbl}>Or paste URL</p>
            <input
              value={heroUrl}
              onChange={e => setHeroUrl(e.target.value)}
              onBlur={e => {
                const v = e.target.value.trim()
                // Only re-process external URLs. If the operator pasted
                // something we already optimized (lives on our Supabase
                // bucket), don't re-fetch it.
                if (
                  v &&
                  /^https?:\/\//.test(v) &&
                  !v.includes('.supabase.co') &&
                  !imageBusy
                ) {
                  optimizeUrl(v)
                }
              }}
              placeholder="https://..."
              className="w-full text-xs border border-blue-200 rounded px-2 py-1 outline-none focus:border-portal-blue bg-white"
            />
            <p className="mt-1 text-[10px] text-portal-sub leading-relaxed">
              Pasted URLs get auto-optimized into our storage (faster loads,
              survives if the source goes down).
            </p>
          </div>
        </div>

        {/* Fields column */}
        <div className="space-y-3">
          <div>
            <label className={lbl}>Title <span className="text-rose-600">*</span></label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
              autoFocus
              placeholder="e.g., Storytime at the Library"
              className={`${inp} font-semibold`}
            />
          </div>
          <div>
            <label className={lbl}>Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              placeholder="A short description for families browsing the calendar."
              className={`${inp} resize-y`}
            />
          </div>

          <div className="grid sm:grid-cols-4 gap-3">
            <div>
              <label className={lbl}>Start date <span className="text-rose-600">*</span></label>
              <input type="date" required value={startDate} onChange={e => setStartDate(e.target.value)} className={inp} />
            </div>
            <div>
              <label className={lbl}>End date</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className={inp} />
            </div>
            <div>
              <label className={lbl}>Start time</label>
              <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className={inp} />
            </div>
            <div>
              <label className={lbl}>End time</label>
              <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className={inp} />
            </div>
          </div>

          {/* Optional override for how the time renders publicly. Use
              when the event has multiple showtimes the same day, drop-in
              hours, or other notes the start/end pair can't express.
              Examples: "10 AM & 1 PM", "Doors at 6:30", "Anytime 10–4". */}
          <div>
            <label className={lbl}>Time display override (optional)</label>
            <input
              value={displayTimeOverride}
              onChange={e => setDisplayTimeOverride(e.target.value)}
              className={inp}
              placeholder={`Use when start/end can't describe it. e.g. "10 AM & 1 PM", "Doors at 6:30"`}
            />
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className={lbl}>Venue name</label>
              <input value={location} onChange={e => setLocation(e.target.value)} className={inp} placeholder="Library, park, etc." />
            </div>
            <div>
              <label className={lbl}>Address</label>
              <input value={address} onChange={e => setAddress(e.target.value)} className={inp} />
            </div>
            <div>
              <label className={lbl}>City</label>
              <input value={city} onChange={e => setCity(e.target.value)} className={inp} />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Organizer</label>
              <input value={organizer} onChange={e => setOrganizer(e.target.value)} className={inp} />
            </div>
            <div>
              <label className={lbl}>Registration URL</label>
              <input type="url" value={registration} onChange={e => setRegistration(e.target.value)} className={inp} placeholder="https://..." />
            </div>
          </div>

          <div className="grid sm:grid-cols-4 gap-3">
            <div>
              <label className={lbl}>Cost text</label>
              <input value={costText} onChange={e => setCostText(e.target.value)} className={inp} placeholder="$5 per child" />
            </div>
            <div>
              <label className={lbl}>Category</label>
              <select value={category} onChange={e => setCategory(e.target.value)} className={`${inp} cursor-pointer`}>
                <option value="">— Select —</option>
                {EVENT_CATEGORIES.map(c => (
                  <option key={c.slug} value={c.slug}>{c.emoji} {c.label}</option>
                ))}
              </select>
            </div>
            {sources.length > 0 && (
              <div>
                <label className={lbl}>Source</label>
                <select value={sourceId} onChange={e => setSourceId(e.target.value)} className={`${inp} cursor-pointer`}>
                  <option value="">— Manual entry —</option>
                  {sources.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex flex-col gap-2 justify-end pb-1">
              <label className="inline-flex items-center gap-2 text-xs text-blue-900 cursor-pointer">
                <input type="checkbox" checked={isFree} onChange={e => setIsFree(e.target.checked)} className="rounded" />
                Free event
              </label>
              <label className="inline-flex items-center gap-2 text-xs text-blue-900 cursor-pointer">
                <input type="checkbox" checked={isFeatured} onChange={e => setIsFeatured(e.target.checked)} className="rounded" />
                Featured
              </label>
            </div>
          </div>

          {/* Recurrence — RRULE picker. One-off events leave this off and
              skip the section entirely; recurring events get expanded
              into virtual occurrences on the public calendar at read time
              (see src/lib/calendar/expand-recurrence.ts). */}
          <EventRecurrenceEditor value={recurrenceRule} onChange={setRecurrenceRule} />

          {/* Duplicate warning — fires after the operator has enough info
              for a check to be useful (title + date). Soft block: shows the
              matches inline, and the operator can override with "Add anyway"
              if they're sure this is a different event. */}
          {duplicates.length > 0 && (
            <div className="rounded-xl bg-portal-amber-lt ring-1 ring-amber-200 p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle size={14} className="text-portal-amber shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-amber-900 mb-1">
                    Possible duplicate{duplicates.length > 1 ? 's' : ''} — {duplicates.length} match{duplicates.length > 1 ? 'es' : ''} in the next few days
                  </p>
                  <ul className="space-y-1 text-xs text-amber-900">
                    {duplicates.map(d => (
                      <li key={d.id} className="flex items-baseline gap-2">
                        <Link
                          href={`/admin/events/preview/${d.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="font-semibold hover:underline inline-flex items-center gap-0.5"
                        >
                          {d.title}
                          <ExternalLink size={9} className="opacity-60" />
                        </Link>
                        <span className="opacity-70">
                          · {new Date(d.start_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          {d.location_name ? ` · ${d.location_name}` : ''}
                          <span className="ml-1 text-[10px]">({Math.round(d.similarity * 100)}% match)</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                  <label className="mt-2 inline-flex items-center gap-1.5 text-xs text-amber-900 cursor-pointer font-semibold">
                    <input
                      type="checkbox"
                      checked={overrideDupe}
                      onChange={e => setOverrideDupe(e.target.checked)}
                      className="rounded"
                    />
                    Add anyway — this is genuinely different
                  </label>
                </div>
              </div>
            </div>
          )}

          {dupeChecking && duplicates.length === 0 && (
            <p className="text-[11px] text-portal-sub italic inline-flex items-center gap-1">
              <RefreshCw size={9} className="animate-spin" /> Checking for duplicates…
            </p>
          )}

          {err && <p className="text-xs text-portal-red font-semibold">{err}</p>}

          <div className="flex items-center gap-2 pt-1">
            <button
              type="submit"
              disabled={busy || (duplicates.length > 0 && !overrideDupe)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-portal-navy text-white rounded-lg hover:bg-portal-navy/90 disabled:opacity-40"
            >
              {busy ? <RefreshCw size={12} className="animate-spin" /> : <Plus size={12} />}
              {busy ? 'Saving…' : (autoPublish ? 'Publish event' : 'Add to queue')}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="px-3 py-2 text-xs text-portal-blue hover:text-blue-950"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </form>
  )
}
