'use client'

// /calendar/submit
// Public event submission form. Posts to /api/calendar/submit which inserts
// into calendar_events with status='pending'. Admins review at
// /admin/events/pending and publish manually.

import { useState } from 'react'
import Link from 'next/link'
import { Navigation } from '@/components/Navigation'
import { PublicFooter } from '@/components/PublicFooter'
import { HeroImageUpload } from '@/components/admin/HeroImageUpload'
import { EVENT_CATEGORIES } from '@/lib/calendar-taxonomy'
import {
  CalendarDays, ArrowLeft, CheckCircle, Clock, MapPin, Users, AlertCircle, RefreshCw,
} from 'lucide-react'

const WHAT_TO_INCLUDE = [
  { icon: CalendarDays, label: 'Event date and time'   },
  { icon: MapPin,       label: 'Location (name + address)' },
  { icon: Users,        label: 'Who is it for (ages, families, etc.)' },
  { icon: Clock,        label: 'Cost (free vs. paid, registration required)' },
]

const GUIDELINES = [
  'Events must be family-friendly and open to the River Region community',
  'Commercial events or ongoing promotions may not qualify for free listings',
  'We reserve the right to edit submissions for clarity and space',
  'Events are typically published within 2 business days of receipt',
]

const initialForm = {
  title:            '',
  organization:     '',
  contact_name:     '',
  contact_email:    '',
  contact_phone:    '',
  start_date:       '',
  end_date:         '',
  start_time:       '',
  end_time:         '',
  // Plain-text override for the time display (e.g. "10 AM & 1 PM",
  // "Doors at 6:30") — used when start_time/end_time can't describe
  // the actual schedule.
  display_time_override: '',
  location_name:    '',
  address:          '',
  city:             '',
  description:      '',
  category:         '',
  age_range:        '',
  cost_text:        '',
  is_free:          false,
  registration_url: '',
  hero_image_url:   '',
  editor_notes:     '',
  consent:          false,
}

type FormState = typeof initialForm

export default function SubmitEventPage() {
  const [form, setForm]       = useState<FormState>(initialForm)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm(f => ({ ...f, [k]: v }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      const res  = await fetch('/api/calendar/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(form),
      })
      const json = await res.json().catch(() => ({}))

      if (!res.ok) {
        setError(json?.error ?? `Submission failed (${res.status})`)
        return
      }
      setSuccess(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Confirmation state ─────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container py-16 md:py-24 text-center max-w-2xl">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-foreground leading-tight mb-3">
            Thanks — your event was submitted.
          </h1>
          <p className="text-base text-muted-foreground leading-relaxed mb-8">
            We&apos;ll review and publish within 2 business days. You&apos;ll get a confirmation email at{' '}
            <span className="font-semibold text-foreground">{form.contact_email}</span> when it goes live.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/calendar" className="px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors">
              See the Calendar
            </Link>
            <button
              onClick={() => { setForm(initialForm); setSuccess(false) }}
              className="px-5 py-2.5 rounded-full border border-border text-foreground text-sm font-semibold hover:bg-muted/40 transition-colors"
            >
              Submit Another Event
            </button>
          </div>
        </main>
        <PublicFooter />
      </div>
    )
  }

  // ── Form ───────────────────────────────────────────────────────────────────
  const inp = 'w-full px-3 py-2 text-sm rounded-lg border border-gray-200 outline-none focus:border-primary bg-white'
  const lbl = 'block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5'

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="container py-10 md:py-14">
        <Link
          href="/calendar"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors mb-6"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Calendar
        </Link>

        <div className="grid lg:grid-cols-3 gap-10 max-w-5xl">
          <div className="lg:col-span-2">
            <div className="mb-7">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary mb-2">
                <CalendarDays className="h-3.5 w-3.5" />
                Community Calendar
              </div>
              <h1 className="text-3xl md:text-4xl font-black text-foreground leading-tight mb-3">
                Submit an Event
              </h1>
              <p className="text-base text-muted-foreground leading-relaxed max-w-lg">
                Share your family-friendly event with thousands of River Region families. Community events are free to submit.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="bg-card border border-border/50 rounded-2xl p-6 md:p-8 space-y-6">

              {/* ── Event basics ── */}
              <section className="space-y-4">
                <h2 className="text-sm font-bold text-foreground uppercase tracking-wider border-b border-border/40 pb-2">Event Details</h2>

                <div>
                  <label className={lbl}>Event title <span className="text-red-500">*</span></label>
                  <input required className={inp} value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. River Region Family Festival" />
                </div>

                <div>
                  <label className={lbl}>Description <span className="text-red-500">*</span></label>
                  <textarea required rows={4} className={`${inp} resize-y`} value={form.description} onChange={e => set('description', e.target.value)} placeholder="What is the event? Who is it for? What can families expect?" />
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className={lbl}>Start date <span className="text-red-500">*</span></label>
                    <input required type="date" className={inp} value={form.start_date} onChange={e => set('start_date', e.target.value)} />
                  </div>
                  <div>
                    <label className={lbl}>End date</label>
                    <input type="date" className={inp} value={form.end_date} onChange={e => set('end_date', e.target.value)} placeholder="(if multi-day)" />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className={lbl}>Start time</label>
                    <input type="time" className={inp} value={form.start_time} onChange={e => set('start_time', e.target.value)} />
                  </div>
                  <div>
                    <label className={lbl}>End time</label>
                    <input type="time" className={inp} value={form.end_time} onChange={e => set('end_time', e.target.value)} />
                  </div>
                </div>

                {/* Optional override for events that don't fit a single
                    start/end pair: multiple showtimes the same day,
                    drop-in windows, doors-open notes. */}
                <div>
                  <label className={lbl}>Time display note (optional)</label>
                  <input
                    className={inp}
                    value={form.display_time_override}
                    onChange={e => set('display_time_override', e.target.value)}
                    placeholder={`Use only if the time above can't describe it. e.g. "10 AM & 1 PM", "Doors at 6:30"`}
                  />
                </div>
              </section>

              {/* ── Location ── */}
              <section className="space-y-4">
                <h2 className="text-sm font-bold text-foreground uppercase tracking-wider border-b border-border/40 pb-2">Location</h2>

                <div>
                  <label className={lbl}>Venue / location name</label>
                  <input className={inp} value={form.location_name} onChange={e => set('location_name', e.target.value)} placeholder="e.g. Riverwalk Amphitheater" />
                </div>

                <div className="grid sm:grid-cols-[2fr_1fr] gap-4">
                  <div>
                    <label className={lbl}>Street address</label>
                    <input className={inp} value={form.address} onChange={e => set('address', e.target.value)} />
                  </div>
                  <div>
                    <label className={lbl}>City</label>
                    <input className={inp} value={form.city} onChange={e => set('city', e.target.value)} placeholder="Montgomery" />
                  </div>
                </div>
              </section>

              {/* ── Audience + cost ── */}
              <section className="space-y-4">
                <h2 className="text-sm font-bold text-foreground uppercase tracking-wider border-b border-border/40 pb-2">Audience &amp; Cost</h2>

                <div>
                  <label className={lbl}>Category</label>
                  <select
                    className={`${inp} cursor-pointer`}
                    value={form.category}
                    onChange={e => set('category', e.target.value)}
                  >
                    <option value="">Pick the closest fit (optional)</option>
                    {EVENT_CATEGORIES.map(c => (
                      <option key={c.slug} value={c.slug}>{c.emoji} {c.label}</option>
                    ))}
                  </select>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className={lbl}>Age range / who is it for</label>
                    <input className={inp} value={form.age_range} onChange={e => set('age_range', e.target.value)} placeholder="e.g. All ages, Ages 5-12, Teens" />
                  </div>
                  <div>
                    <label className={lbl}>Cost</label>
                    <input className={inp} value={form.cost_text} onChange={e => set('cost_text', e.target.value)} placeholder="e.g. Free, $10/family" disabled={form.is_free} />
                  </div>
                </div>

                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.is_free} onChange={e => set('is_free', e.target.checked)} className="rounded" />
                  This event is free
                </label>

                <div>
                  <label className={lbl}>Registration URL</label>
                  <input type="url" className={inp} value={form.registration_url} onChange={e => set('registration_url', e.target.value)} placeholder="https://..." />
                </div>
              </section>

              {/* ── Image ── */}
              <section className="space-y-2">
                <h2 className="text-sm font-bold text-foreground uppercase tracking-wider border-b border-border/40 pb-2">Event Image</h2>
                <p className="text-xs text-muted-foreground">Optional — a poster, flyer, or family-friendly photo. Improves how your event appears on the calendar.</p>
                <HeroImageUpload
                  value={form.hero_image_url}
                  onChange={url => set('hero_image_url', url)}
                />
              </section>

              {/* ── Contact ── */}
              <section className="space-y-4">
                <h2 className="text-sm font-bold text-foreground uppercase tracking-wider border-b border-border/40 pb-2">Your Contact Info</h2>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className={lbl}>Your name</label>
                    <input className={inp} value={form.contact_name} onChange={e => set('contact_name', e.target.value)} />
                  </div>
                  <div>
                    <label className={lbl}>Organization (if any)</label>
                    <input className={inp} value={form.organization} onChange={e => set('organization', e.target.value)} />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className={lbl}>Email <span className="text-red-500">*</span></label>
                    <input required type="email" className={inp} value={form.contact_email} onChange={e => set('contact_email', e.target.value)} />
                  </div>
                  <div>
                    <label className={lbl}>Phone</label>
                    <input type="tel" className={inp} value={form.contact_phone} onChange={e => set('contact_phone', e.target.value)} />
                  </div>
                </div>

                <div>
                  <label className={lbl}>Notes for our editors</label>
                  <textarea rows={2} className={`${inp} resize-y`} value={form.editor_notes} onChange={e => set('editor_notes', e.target.value)} placeholder="Anything we should know — sponsor details, special timing, etc." />
                </div>
              </section>

              {/* ── Consent + submit ── */}
              <section className="space-y-4 pt-2">
                <label className="flex items-start gap-2.5 text-sm text-foreground cursor-pointer">
                  <input
                    type="checkbox" required
                    checked={form.consent} onChange={e => set('consent', e.target.checked)}
                    className="mt-0.5 rounded"
                  />
                  <span className="text-sm leading-relaxed">
                    I confirm this event is family-friendly and open to the community, and I&apos;m authorized to submit it. <span className="text-red-500">*</span>
                  </span>
                </label>

                {error && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
                    <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {submitting ? <><RefreshCw className="h-4 w-4 animate-spin" /> Submitting…</> : 'Submit Event'}
                </button>
                <p className="text-xs text-muted-foreground text-center">
                  Your event goes into our review queue. We publish within 2 business days.
                </p>
              </section>
            </form>
          </div>

          {/* Sidebar */}
          <aside className="space-y-6">
            <div className="bg-card border border-border/50 rounded-2xl p-5">
              <h2 className="font-bold text-base text-foreground mb-4">What to Include</h2>
              <div className="space-y-3">
                {WHAT_TO_INCLUDE.map(item => (
                  <div key={item.label} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <item.icon className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <p className="text-sm text-muted-foreground leading-snug">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-muted/30 border border-border/40 rounded-2xl p-5">
              <h2 className="font-bold text-base text-foreground mb-3">Submission Guidelines</h2>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {GUIDELINES.map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-secondary/8 border border-secondary/25 rounded-2xl p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-secondary mb-2">For Businesses</p>
              <h3 className="font-bold text-sm text-foreground mb-2">Want Premium Event Placement?</h3>
              <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                Promoted events get featured placement at the top of the calendar, social sharing, and newsletter inclusion.
              </p>
              <Link href="/advertise" className="inline-flex items-center gap-1.5 text-sm font-bold text-secondary hover:text-secondary/80 transition-colors">
                Learn About Promoted Listings <CalendarDays className="h-3.5 w-3.5" />
              </Link>
            </div>
          </aside>
        </div>
      </main>

      <PublicFooter />
    </div>
  )
}
