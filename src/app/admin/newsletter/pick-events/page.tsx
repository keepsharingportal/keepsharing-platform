// ── /admin/newsletter/pick-events ─────────────────────────────────────────────
// Weekly newsletter picker. Pick 4–6 calendar events for this Thursday's
// "Weekly Scoop" newsletter, override the headline/blurb per pick, and
// copy the rendered HTML to paste into the email tool.

import type { Metadata } from 'next'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import { Mail, Calendar as CalIcon, Plus, X, GripVertical, ArrowLeft, CheckCircle2, Clock, AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { renderNewsletterHtml, type NewsletterPickEvent } from '@/lib/newsletter/render'
import { CopyHtmlIsland } from './CopyHtmlIsland'
import { SendPanel } from './SendPanel'
import { EVENT_CATEGORIES } from '@/lib/calendar-taxonomy'

export const metadata: Metadata = { title: 'Newsletter Picks — Admin' }
export const dynamic = 'force-dynamic'

// ── Types ─────────────────────────────────────────────────────────────────────

interface CalendarEventRow {
  id:               string
  slug:             string | null
  title:            string
  start_date:       string
  start_time:       string | null
  end_time:         string | null
  location_name:    string | null
  city:             string | null
  description:      string | null
  hero_image_url:   string | null
  registration_url: string | null
  is_free:          boolean | null
  cost_text:        string | null
  category:         string | null
}

interface PickRow {
  id:              string
  event_id:        string
  issue_date:      string
  display_order:   number
  custom_blurb:    string | null
  custom_headline: string | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function nextThursday(): string {
  const d   = new Date()
  d.setHours(12, 0, 0, 0)
  const dow = d.getDay()  // 0 Sun .. 6 Sat
  const delta = (4 - dow + 7) % 7 || 7  // never returns today; pick next Thursday
  d.setDate(d.getDate() + delta)
  return d.toISOString().split('T')[0]
}

function fmtDate(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  })
}

// ── Server actions ────────────────────────────────────────────────────────────

async function addPick(formData: FormData) {
  'use server'
  const supabase     = await createClient()
  const issue_date   = (formData.get('issue_date') as string) || nextThursday()
  const event_id     = (formData.get('event_id')   as string) || ''
  if (!event_id) return

  // Position at the end of the current picks list.
  const { data: existing } = await supabase
    .from('newsletter_picks')
    .select('display_order')
    .eq('issue_date', issue_date)
    .eq('market', 'rrp')
    .order('display_order', { ascending: false })
    .limit(1)
  const nextOrder = ((existing?.[0]?.display_order as number | undefined) ?? -1) + 1

  await supabase.from('newsletter_picks').insert({
    issue_date, market: 'rrp', event_id, display_order: nextOrder,
  })
  revalidatePath('/admin/newsletter/pick-events')
}

async function removePick(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const id = (formData.get('id') as string) || ''
  if (!id) return
  await supabase.from('newsletter_picks').delete().eq('id', id)
  revalidatePath('/admin/newsletter/pick-events')
}

async function updatePick(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const id              = (formData.get('id') as string) || ''
  const custom_headline = ((formData.get('custom_headline') as string) || '').trim() || null
  const custom_blurb    = ((formData.get('custom_blurb')    as string) || '').trim() || null
  if (!id) return
  await supabase.from('newsletter_picks').update({ custom_headline, custom_blurb }).eq('id', id)
  revalidatePath('/admin/newsletter/pick-events')
}

async function reorderPick(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const id        = (formData.get('id')        as string) || ''
  const direction = (formData.get('direction') as string) || ''
  if (!id || !['up', 'down'].includes(direction)) return

  const { data: pick } = await supabase
    .from('newsletter_picks')
    .select('id, issue_date, display_order')
    .eq('id', id)
    .maybeSingle()
  if (!pick) return

  // Find the neighbor in the chosen direction.
  const op  = direction === 'up' ? 'lt' : 'gt'
  const ord = direction === 'up' ? { ascending: false } : { ascending: true }
  const { data: neighbor } = await supabase
    .from('newsletter_picks')
    .select('id, display_order')
    .eq('issue_date', (pick as PickRow).issue_date)
    .eq('market', 'rrp')
    [op]('display_order', (pick as PickRow).display_order)
    .order('display_order', ord)
    .limit(1)
    .maybeSingle()
  if (!neighbor) return

  const me = pick as PickRow
  const nb = neighbor as { id: string; display_order: number }
  await Promise.all([
    supabase.from('newsletter_picks').update({ display_order: nb.display_order }).eq('id', me.id),
    supabase.from('newsletter_picks').update({ display_order: me.display_order }).eq('id', nb.id),
  ])
  revalidatePath('/admin/newsletter/pick-events')
}

// ── Page ──────────────────────────────────────────────────────────────────────

interface PageProps {
  searchParams: Promise<{ issue?: string; category?: string; free?: string }>
}

export default async function NewsletterPicksPage({ searchParams }: PageProps) {
  const sp        = await searchParams
  const issueDate = sp.issue ?? nextThursday()
  const category  = sp.category ?? 'all'
  const freeOnly  = sp.free === 'true'

  const supabase = await createClient()

  // 1. Eligible events — published, in the 7-day window leading up to the next 14 days.
  // Editors usually pick events 1–14 days out; the window can be tuned.
  const today    = new Date().toISOString().split('T')[0]
  const horizon  = (() => {
    const d = new Date(issueDate + 'T12:00:00')
    d.setDate(d.getDate() + 10)  // include a few days past issue date
    return d.toISOString().split('T')[0]
  })()

  let eventsQ = supabase
    .from('calendar_events')
    .select('id, slug, title, start_date, start_time, end_time, location_name, city, description, hero_image_url, registration_url, is_free, cost_text, category')
    .eq('status', 'published')
    .gte('start_date', today)
    .lte('start_date', horizon)
    .order('start_date', { ascending: true })
  if (category !== 'all') eventsQ = eventsQ.eq('category', category)
  if (freeOnly)           eventsQ = eventsQ.eq('is_free', true)

  // Probe for deleted_at column once and chain only if present
  const probe = await supabase.from('calendar_events').select('deleted_at').limit(1)
  if (!probe.error) eventsQ = eventsQ.is('deleted_at', null)

  const { data: eventsData } = await eventsQ
  const allEvents = (eventsData ?? []) as CalendarEventRow[]

  // 2. Current picks for this issue
  const { data: pickRowsData } = await supabase
    .from('newsletter_picks')
    .select('id, event_id, issue_date, display_order, custom_blurb, custom_headline')
    .eq('issue_date', issueDate)
    .eq('market', 'rrp')
    .order('display_order', { ascending: true })

  const pickRows = (pickRowsData ?? []) as PickRow[]
  const pickedIds = new Set(pickRows.map(p => p.event_id))

  // 3. Last 28 days of picks across all issues (so we can dim recently-featured events)
  const recentCutoff = (() => {
    const d = new Date()
    d.setDate(d.getDate() - 28)
    return d.toISOString().split('T')[0]
  })()
  const { data: recentPicksData } = await supabase
    .from('newsletter_picks')
    .select('event_id, issue_date')
    .gte('issue_date', recentCutoff)
    .eq('market', 'rrp')
  const recentlyFeatured = new Map<string, string>()
  for (const r of recentPicksData ?? []) {
    const evt = (r as { event_id: string; issue_date: string })
    if (!recentlyFeatured.has(evt.event_id) || evt.issue_date > (recentlyFeatured.get(evt.event_id) ?? '')) {
      recentlyFeatured.set(evt.event_id, evt.issue_date)
    }
  }

  // 4. Compose pick payload + render preview HTML
  const eventsById = new Map(allEvents.map(e => [e.id, e]))
  // If a picked event falls outside the eligible window, fetch it explicitly so
  // the preview still renders.
  const missingPickIds = pickRows.filter(p => !eventsById.has(p.event_id)).map(p => p.event_id)
  if (missingPickIds.length > 0) {
    const { data: extraEvents } = await supabase
      .from('calendar_events')
      .select('id, slug, title, start_date, start_time, end_time, location_name, city, description, hero_image_url, registration_url, is_free, cost_text, category')
      .in('id', missingPickIds)
    for (const e of (extraEvents ?? []) as CalendarEventRow[]) eventsById.set(e.id, e)
  }

  const picks: NewsletterPickEvent[] = pickRows
    .map(p => {
      const ev = eventsById.get(p.event_id)
      if (!ev) return null
      return {
        ...ev,
        custom_headline: p.custom_headline,
        custom_blurb:    p.custom_blurb,
      } as NewsletterPickEvent
    })
    .filter((x): x is NewsletterPickEvent => x !== null)

  const html = renderNewsletterHtml(picks, { issue_date: issueDate })

  // 6. Pull send history for this issue and recent sends (last 4 issues for context)
  interface IssueRow {
    id: string; issue_date: string; subject: string; status: string;
    list_tag: string | null; scheduled_for: string | null; sent_at: string;
    picks_count: number; error_message: string | null
  }
  let thisIssueSends: IssueRow[] = []
  let recentSends:    IssueRow[] = []
  const issuesProbe = await supabase.from('newsletter_issues').select('id').limit(1)
  const newsletterIssuesAvailable = !issuesProbe.error
  if (newsletterIssuesAvailable) {
    const { data: thisIssueData } = await supabase
      .from('newsletter_issues')
      .select('id, issue_date, subject, status, list_tag, scheduled_for, sent_at, picks_count, error_message')
      .eq('issue_date', issueDate)
      .eq('market', 'rrp')
      .order('sent_at', { ascending: false })
      .limit(5)
    thisIssueSends = (thisIssueData ?? []) as IssueRow[]

    const { data: recentData } = await supabase
      .from('newsletter_issues')
      .select('id, issue_date, subject, status, list_tag, scheduled_for, sent_at, picks_count, error_message')
      .eq('market', 'rrp')
      .neq('issue_date', issueDate)
      .order('sent_at', { ascending: false })
      .limit(4)
    recentSends = (recentData ?? []) as IssueRow[]
  }

  const webhookConfigured = Boolean(process.env.GHL_NEWSLETTER_WEBHOOK_URL)

  // 5. Build a list of 8 likely next Thursdays for the date selector
  const nextDates = (() => {
    const out: string[] = []
    const start = new Date()
    start.setHours(12, 0, 0, 0)
    const dow   = start.getDay()
    const delta = (4 - dow + 7) % 7 || 7
    start.setDate(start.getDate() + delta)
    for (let i = 0; i < 8; i++) {
      const d = new Date(start); d.setDate(d.getDate() + i * 7)
      out.push(d.toISOString().split('T')[0])
    }
    return out
  })()

  return (
    <main className="p-6 max-w-[1400px] mx-auto space-y-6 pb-16">

      {/* HEADER */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <Link href="/admin" className="inline-flex items-center gap-1 text-xs font-semibold text-portal-muted hover:text-portal-text mb-2">
            <ArrowLeft size={12} /> Back to admin
          </Link>
          <div className="flex items-center gap-2 mb-1">
            <Mail size={20} className="text-portal-blue" />
            <h1 className="text-xl font-bold text-portal-text tracking-tight">Weekly Newsletter Picks</h1>
          </div>
          <p className="text-sm text-portal-sub">
            Build the "Weekly Scoop" event picks. Select 4–6 events, optionally override
            the headline/blurb per pick, then copy the rendered HTML into your email tool.
          </p>
        </div>
        <Link href="/admin/go/calendar" target="_blank" rel="noreferrer"
          className="text-sm font-semibold text-portal-text bg-white border border-portal-border rounded-lg px-3 py-2 hover:bg-portal-bg">
          View public calendar →
        </Link>
      </div>

      {/* DATE + FILTERS */}
      <section className="bg-white border border-portal-border rounded-lg px-5 py-4 flex flex-wrap items-end gap-4">
        <form className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-[11px] font-bold text-portal-sub uppercase tracking-wider mb-1">Issue date</label>
            <select name="issue" defaultValue={issueDate}
              className="text-sm border border-portal-border rounded-lg px-3 py-2 bg-white">
              {nextDates.map(d => (
                <option key={d} value={d}>{fmtDate(d)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-portal-sub uppercase tracking-wider mb-1">Category</label>
            <select name="category" defaultValue={category}
              className="text-sm border border-portal-border rounded-lg px-3 py-2 bg-white">
              <option value="all">All categories</option>
              {EVENT_CATEGORIES.map(c => (
                <option key={c.slug} value={c.slug}>{c.emoji} {c.label}</option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm font-semibold text-portal-text mb-2">
            <input type="checkbox" name="free" value="true" defaultChecked={freeOnly} className="w-4 h-4 rounded text-portal-blue" />
            Free events only
          </label>
          <button type="submit"
            className="px-4 py-2 text-xs font-bold bg-portal-navy text-white rounded-lg hover:bg-portal-navy">
            Apply
          </button>
        </form>
      </section>

      <div className="grid lg:grid-cols-2 gap-6">

        {/* LEFT — eligible events */}
        <section className="bg-white border border-portal-border rounded-lg overflow-hidden">
          <div className="px-5 py-3 border-b border-portal-border bg-portal-bg flex items-center gap-2">
            <CalIcon size={14} className="text-portal-muted" />
            <h2 className="text-sm font-bold text-portal-text">Eligible events</h2>
            <span className="ml-auto text-xs text-portal-muted">{allEvents.length} found</span>
          </div>
          {allEvents.length === 0 ? (
            <p className="p-8 text-center text-sm text-portal-muted">
              No upcoming events for this window. Try widening the date range or adjusting filters.
            </p>
          ) : (
            <ul className="divide-y divide-portal-border max-h-[800px] overflow-y-auto">
              {allEvents.map(ev => {
                const isPicked    = pickedIds.has(ev.id)
                const lastIssue   = recentlyFeatured.get(ev.id)
                const wasFeatured = lastIssue && lastIssue !== issueDate
                return (
                  <li key={ev.id} className={`p-4 flex items-start gap-3 ${isPicked ? 'opacity-50' : wasFeatured ? 'opacity-70' : ''}`}>
                    {ev.hero_image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={ev.hero_image_url} alt={ev.title} className="w-16 h-12 rounded-lg object-cover bg-portal-row-hover shrink-0" />
                    ) : (
                      <div className="w-16 h-12 rounded-lg bg-portal-row-hover shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-portal-text truncate">{ev.title}</p>
                      <p className="text-xs text-portal-muted truncate">
                        {fmtDate(ev.start_date)}{ev.start_time ? ` · ${ev.start_time}` : ''}
                        {ev.location_name && ` · ${ev.location_name}`}
                      </p>
                      <p className="text-[11px] text-portal-muted mt-0.5">
                        {ev.is_free && <span className="text-secondary font-semibold mr-1.5">Free</span>}
                        {ev.category && <span>{ev.category}</span>}
                        {wasFeatured && <span className="ml-1.5 text-portal-amber">· Featured {fmtDate(lastIssue!)}</span>}
                      </p>
                    </div>
                    {isPicked ? (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-portal-blue bg-portal-blue-lt px-2 py-0.5 rounded">In picks</span>
                    ) : (
                      <form action={addPick}>
                        <input type="hidden" name="event_id"   value={ev.id} />
                        <input type="hidden" name="issue_date" value={issueDate} />
                        <button type="submit"
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold border border-portal-border bg-white text-portal-text rounded-lg hover:bg-portal-bg">
                          <Plus size={11} /> Add
                        </button>
                      </form>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        {/* RIGHT — this week's picks */}
        <section className="bg-white border border-portal-border rounded-lg overflow-hidden">
          <div className="px-5 py-3 border-b border-portal-border bg-portal-bg flex items-center gap-2">
            <Mail size={14} className="text-portal-blue" />
            <h2 className="text-sm font-bold text-portal-text">This issue's picks ({picks.length})</h2>
            <span className="ml-auto text-xs text-portal-muted">{fmtDate(issueDate)}</span>
          </div>
          {picks.length === 0 ? (
            <p className="p-8 text-center text-sm text-portal-muted">
              No picks yet for this issue. Add events from the left.
            </p>
          ) : (
            <ul className="divide-y divide-portal-border">
              {picks.map((pk, idx) => {
                const pickRow = pickRows.find(p => p.event_id === pk.id)!
                const isFirst = idx === 0
                const isLast  = idx === picks.length - 1
                return (
                  <li key={pickRow.id} className="p-4">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="flex flex-col items-center gap-1 pt-1">
                        <GripVertical size={14} className="text-portal-border-2" />
                        <span className="text-[9px] font-bold text-portal-muted">{idx + 1}</span>
                      </div>
                      {pk.hero_image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={pk.hero_image_url} alt={pk.title} className="w-16 h-12 rounded-lg object-cover bg-portal-row-hover shrink-0" />
                      ) : (
                        <div className="w-16 h-12 rounded-lg bg-portal-row-hover shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-portal-text truncate">{pk.title}</p>
                        <p className="text-xs text-portal-muted truncate">
                          {fmtDate(pk.start_date)}{pk.start_time ? ` · ${pk.start_time}` : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {!isFirst && (
                          <form action={reorderPick}>
                            <input type="hidden" name="id" value={pickRow.id} />
                            <input type="hidden" name="direction" value="up" />
                            <button type="submit" className="px-1.5 py-1 text-xs text-portal-sub hover:text-portal-text hover:bg-portal-row-hover rounded" title="Move up">↑</button>
                          </form>
                        )}
                        {!isLast && (
                          <form action={reorderPick}>
                            <input type="hidden" name="id" value={pickRow.id} />
                            <input type="hidden" name="direction" value="down" />
                            <button type="submit" className="px-1.5 py-1 text-xs text-portal-sub hover:text-portal-text hover:bg-portal-row-hover rounded" title="Move down">↓</button>
                          </form>
                        )}
                        <form action={removePick}>
                          <input type="hidden" name="id" value={pickRow.id} />
                          <button type="submit" className="p-1 text-portal-red hover:bg-portal-red-lt rounded" title="Remove from picks">
                            <X size={13} />
                          </button>
                        </form>
                      </div>
                    </div>

                    <details className="ml-9">
                      <summary className="text-xs font-semibold text-portal-sub cursor-pointer hover:text-portal-text select-none">
                        Override headline / blurb for this newsletter
                      </summary>
                      <form action={updatePick} className="mt-3 space-y-2">
                        <input type="hidden" name="id" value={pickRow.id} />
                        <div>
                          <label className="block text-[10px] font-bold text-portal-sub uppercase tracking-wider mb-1">Headline override</label>
                          <input name="custom_headline" type="text" defaultValue={pickRow.custom_headline ?? ''}
                            placeholder={pk.title}
                            className="w-full text-sm border border-portal-border rounded-lg px-3 py-1.5 outline-none focus:border-portal-blue/60" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-portal-sub uppercase tracking-wider mb-1">Blurb override</label>
                          <textarea name="custom_blurb" rows={3} defaultValue={pickRow.custom_blurb ?? ''}
                            placeholder={pk.description?.slice(0, 200) ?? 'Custom newsletter blurb…'}
                            className="w-full text-sm border border-portal-border rounded-lg px-3 py-1.5 outline-none focus:border-portal-blue/60 resize-y" />
                        </div>
                        <button type="submit" className="text-xs font-bold bg-portal-navy text-white rounded-lg px-3 py-1.5 hover:bg-portal-navy">
                          Save overrides
                        </button>
                      </form>
                    </details>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>

      {/* PREVIEW + COPY HTML */}
      {picks.length > 0 && (
        <section className="bg-white border border-portal-border rounded-lg overflow-hidden">
          <div className="px-5 py-3 border-b border-portal-border bg-portal-bg">
            <h2 className="text-sm font-bold text-portal-text">Preview &amp; Export</h2>
          </div>
          <div className="grid lg:grid-cols-2 gap-0">
            <div className="p-5 border-r border-portal-border">
              <p className="text-xs font-bold text-portal-sub uppercase tracking-wider mb-2">Rendered preview</p>
              <div className="border border-portal-border rounded-lg bg-portal-bg p-3 overflow-auto max-h-[600px]"
                   dangerouslySetInnerHTML={{ __html: html }} />
            </div>
            <div className="p-5">
              <CopyHtmlIsland html={html} />
            </div>
          </div>
        </section>
      )}

      {/* SEND VIA GHL */}
      {picks.length > 0 && newsletterIssuesAvailable && (
        <SendPanel
          issueDate={issueDate}
          picksCount={picks.length}
          defaultSubject={`This Weekend in the River Region — ${fmtDate(issueDate)}`}
          defaultListTag="weekly-scoop"
          webhookConfigured={webhookConfigured}
        />
      )}

      {picks.length > 0 && !newsletterIssuesAvailable && (
        <div className="rounded-lg border border-portal-amber/40 bg-portal-amber-lt px-5 py-4">
          <p className="text-sm font-bold text-portal-amber mb-1 flex items-center gap-1.5">
            <AlertTriangle size={14} /> Send history needs a database migration
          </p>
          <p className="text-sm text-portal-amber leading-relaxed">
            Apply <code className="bg-portal-amber-lt px-1 rounded">supabase/migrations/079_newsletter_issues.sql</code> in the Supabase SQL editor.
            Once the <code className="bg-portal-amber-lt px-1 rounded">newsletter_issues</code> table exists, the Send-via-GHL panel + send history will activate.
            For now you can still use the Copy HTML button above.
          </p>
        </div>
      )}

      {/* SEND HISTORY */}
      {newsletterIssuesAvailable && (thisIssueSends.length > 0 || recentSends.length > 0) && (
        <section className="bg-white border border-portal-border rounded-lg overflow-hidden">
          <div className="px-5 py-3 border-b border-portal-border bg-portal-bg">
            <h2 className="text-sm font-bold text-portal-text">Send history</h2>
          </div>
          <div className="p-5 space-y-4">
            {thisIssueSends.length > 0 && (
              <div>
                <p className="text-xs font-bold text-portal-sub uppercase tracking-wider mb-2">This issue ({fmtDate(issueDate)})</p>
                <ul className="space-y-1">
                  {thisIssueSends.map(is => <IssueLine key={is.id} issue={is} />)}
                </ul>
              </div>
            )}
            {recentSends.length > 0 && (
              <div>
                <p className="text-xs font-bold text-portal-sub uppercase tracking-wider mb-2">Recent issues</p>
                <ul className="space-y-1">
                  {recentSends.map(is => <IssueLine key={is.id} issue={is} />)}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}
    </main>
  )
}

// ── Subcomponents ─────────────────────────────────────────────────────────────

function IssueLine({ issue }: { issue: {
  id: string; issue_date: string; subject: string; status: string;
  list_tag: string | null; scheduled_for: string | null; sent_at: string;
  picks_count: number; error_message: string | null
}}) {
  const statusBadge =
    issue.status === 'sent'   ? { Icon: CheckCircle2, cls: 'bg-portal-green-lt text-portal-green', label: 'Sent' } :
    issue.status === 'queued' ? { Icon: Clock,        cls: 'bg-portal-blue-lt text-portal-blue',   label: 'Scheduled' } :
    issue.status === 'failed' ? { Icon: AlertTriangle,cls: 'bg-portal-red-lt text-portal-red',   label: 'Failed' } :
                                { Icon: Clock,        cls: 'bg-portal-row-hover text-portal-text',   label: 'Pending' }
  const Icon = statusBadge.Icon
  const when = issue.scheduled_for
    ? `for ${new Date(issue.scheduled_for).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}`
    : `at ${new Date(issue.sent_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}`
  return (
    <li className="flex items-start gap-3 text-sm">
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${statusBadge.cls} shrink-0`}>
        <Icon size={11} /> {statusBadge.label}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-portal-text truncate">{issue.subject}</p>
        <p className="text-[11px] text-portal-sub">
          {issue.picks_count} pick(s) · to <strong className="text-portal-text">{issue.list_tag ?? '(no tag)'}</strong> · {when}
          {issue.error_message && <span className="text-portal-red"> · {issue.error_message}</span>}
        </p>
      </div>
    </li>
  )
}
