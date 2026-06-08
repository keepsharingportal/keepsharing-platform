// ── /admin/events/sources ─────────────────────────────────────────────────────
// Manage the trusted event sources we ingest from. Each row is an organization
// whose events we want to pull (via iCal, AI extraction, or manual entry).
// Used by the Phase 2 iCal ingestor and Phase 4 AI-extract route.

import type { Metadata } from 'next'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import { Globe, ExternalLink, Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { SourceActions } from './SourceActions'
import { RunAllButton } from './RunAllButton'

export const metadata: Metadata = { title: 'Event Sources — Admin' }
export const dynamic  = 'force-dynamic'

// ── Types ─────────────────────────────────────────────────────────────────────

interface TrustedSource {
  id:                 string
  name:               string
  org_url:            string | null
  events_url:         string
  ingestion_method:   string   // 'ical' | 'ai-extract' | 'manual' | 'scrape'
  ical_url:           string | null
  market:             string
  scrape_frequency:   string | null
  last_ingested_at:   string | null
  last_ingested_count: number
  is_active:          boolean
  notes:              string | null
  created_at:         string
}

const METHODS = [
  { value: 'ical',       label: 'iCal feed (best)' },
  { value: 'ai-extract', label: 'AI extraction from URL' },
  { value: 'manual',     label: 'Manual entry only' },
  { value: 'scrape',     label: 'Custom scrape (last resort)' },
]

const FREQUENCIES = [
  { value: 'daily',   label: 'Daily'   },
  { value: 'weekly',  label: 'Weekly'  },
  { value: 'monthly', label: 'Monthly' },
  { value: 'manual',  label: 'Manual'  },
]

function fmtDateTime(s: string | null): string {
  if (!s) return '—'
  return new Date(s).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
}

// ── Server actions ────────────────────────────────────────────────────────────

async function createSource(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const name             = ((formData.get('name')             as string) || '').trim()
  const org_url          = ((formData.get('org_url')          as string) || '').trim() || null
  const events_url       = ((formData.get('events_url')       as string) || '').trim()
  const ingestion_method = ((formData.get('ingestion_method') as string) || 'manual').trim()
  const ical_url         = ((formData.get('ical_url')         as string) || '').trim() || null
  const market           = ((formData.get('market')           as string) || 'rrp').trim()
  const scrape_frequency = ((formData.get('scrape_frequency') as string) || 'weekly').trim()
  const notes            = ((formData.get('notes')            as string) || '').trim() || null

  if (!name || !events_url) return
  await supabase.from('trusted_event_sources').insert({
    name, org_url, events_url, ingestion_method, ical_url, market, scrape_frequency, notes, is_active: true,
  })
  revalidatePath('/admin/events/sources')
}

async function updateSource(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const id               = (formData.get('id') as string) || ''
  const name             = ((formData.get('name')             as string) || '').trim()
  const org_url          = ((formData.get('org_url')          as string) || '').trim() || null
  const events_url       = ((formData.get('events_url')       as string) || '').trim()
  const ingestion_method = ((formData.get('ingestion_method') as string) || 'manual').trim()
  const ical_url         = ((formData.get('ical_url')         as string) || '').trim() || null
  const scrape_frequency = ((formData.get('scrape_frequency') as string) || 'weekly').trim()
  const notes            = ((formData.get('notes')            as string) || '').trim() || null

  if (!id || !name || !events_url) return
  await supabase
    .from('trusted_event_sources')
    .update({ name, org_url, events_url, ingestion_method, ical_url, scrape_frequency, notes })
    .eq('id', id)
  revalidatePath('/admin/events/sources')
}

async function toggleActive(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const id      = (formData.get('id') as string) || ''
  const current = (formData.get('current') as string) === 'true'
  if (!id) return
  await supabase.from('trusted_event_sources').update({ is_active: !current }).eq('id', id)
  revalidatePath('/admin/events/sources')
}

async function deleteSource(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const id = (formData.get('id') as string) || ''
  if (!id) return
  await supabase.from('trusted_event_sources').delete().eq('id', id)
  revalidatePath('/admin/events/sources')
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function SourcesAdminPage() {
  const supabase = await createClient()

  // Probe — migration 077 may not be applied yet.
  const { data, error } = await supabase
    .from('trusted_event_sources')
    .select('*')
    .order('name', { ascending: true })

  const tableMissing = !!error && /relation .* does not exist/i.test(error.message)
  const sources      = tableMissing ? [] : ((data ?? []) as TrustedSource[])

  const activeCount  = sources.filter(s => s.is_active).length
  const icalCount    = sources.filter(s => s.is_active && s.ingestion_method === 'ical').length
  const aiCount      = sources.filter(s => s.is_active && s.ingestion_method === 'ai-extract').length
  const manualCount  = sources.filter(s => s.is_active && s.ingestion_method === 'manual').length

  const inputCls = 'w-full text-sm border border-portal-border rounded-lg px-3 py-2 outline-none focus:border-portal-blue transition-colors'

  return (
    <main className="p-6 max-w-[1200px] mx-auto space-y-6 pb-16">

      {/* HEADER */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Globe size={20} className="text-portal-blue" />
            <h1 className="text-xl font-bold text-portal-text tracking-tight">Trusted Event Sources</h1>
          </div>
          <p className="text-sm text-portal-sub">
            Organizations whose events we ingest. iCal feeds run automatically; AI extraction and manual entries
            need an operator. New events from any source always land in <Link href="/admin/events/pending" className="text-portal-blue hover:underline">Pending Events</Link>.
          </p>
        </div>
        <div className="flex items-start gap-2 flex-wrap">
          {!tableMissing && icalCount > 0 && <RunAllButton activeIcalCount={icalCount} />}
          <Link href="/admin/events/extract" className="text-sm font-semibold text-purple-700 bg-purple-50 border border-purple-200 rounded-lg px-3 py-2 hover:bg-purple-100">
            AI extract →
          </Link>
          <Link href="/admin/events/pending" className="text-sm font-semibold text-portal-text bg-white border border-portal-border rounded-lg px-3 py-2 hover:bg-portal-bg">
            Pending queue →
          </Link>
        </div>
      </div>

      {tableMissing && (
        <div className="rounded-xl border border-amber-300 bg-portal-amber-lt px-5 py-4">
          <p className="text-sm font-bold text-amber-900 mb-1">Trusted sources need a database migration</p>
          <p className="text-sm text-portal-amber leading-relaxed">
            Apply <code className="bg-portal-amber-lt px-1 rounded">supabase/migrations/077_calendar_sources_and_workflow.sql</code> in the Supabase SQL editor.
            Once that runs, the seeded source list will appear here and you can add more.
          </p>
        </div>
      )}

      {/* STATS */}
      {!tableMissing && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Active sources', value: activeCount, tone: '#22c55e' },
            { label: 'iCal feeds',     value: icalCount,   tone: '#3b82f6' },
            { label: 'AI extraction',  value: aiCount,     tone: '#8b5cf6' },
            { label: 'Manual only',    value: manualCount, tone: '#9ca3af' },
          ].map(s => (
            <div key={s.label} className="bg-white border border-portal-border rounded-lg px-4 py-3">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.tone }} />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-portal-muted">{s.label}</span>
              </div>
              <p className="text-2xl font-bold text-portal-text">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* ADD NEW */}
      {!tableMissing && (
        <section className="bg-white border border-portal-border rounded-lg overflow-hidden">
          <div className="px-5 py-3 border-b border-portal-border bg-portal-bg flex items-center gap-2">
            <Plus size={14} className="text-portal-muted" />
            <h2 className="text-sm font-bold text-portal-text">Add a source</h2>
          </div>
          <form action={createSource} className="p-5 grid md:grid-cols-12 gap-3 items-end">
            <div className="md:col-span-3">
              <label className="block text-[11px] font-semibold text-portal-sub mb-1">Name *</label>
              <input name="name" type="text" required placeholder="Montgomery Zoo" className={inputCls} />
            </div>
            <div className="md:col-span-4">
              <label className="block text-[11px] font-semibold text-portal-sub mb-1">Events URL *</label>
              <input name="events_url" type="url" required placeholder="https://example.org/events" className={inputCls} />
            </div>
            <div className="md:col-span-3">
              <label className="block text-[11px] font-semibold text-portal-sub mb-1">Org URL (optional)</label>
              <input name="org_url" type="url" placeholder="https://example.org" className={inputCls} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[11px] font-semibold text-portal-sub mb-1">Method</label>
              <select name="ingestion_method" defaultValue="ai-extract" className={inputCls}>
                {METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <div className="md:col-span-4">
              <label className="block text-[11px] font-semibold text-portal-sub mb-1">iCal URL (if known)</label>
              <input name="ical_url" type="url" placeholder="https://example.org/events.ics" className={inputCls} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[11px] font-semibold text-portal-sub mb-1">Frequency</label>
              <select name="scrape_frequency" defaultValue="weekly" className={inputCls}>
                {FREQUENCIES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-[11px] font-semibold text-portal-sub mb-1">Market</label>
              <input name="market" type="text" defaultValue="rrp" className={inputCls} />
            </div>
            <div className="md:col-span-4">
              <label className="block text-[11px] font-semibold text-portal-sub mb-1">Notes</label>
              <input name="notes" type="text" placeholder="Internal notes (auth needed, feed flaky, etc.)" className={inputCls} />
            </div>
            <div className="md:col-span-12">
              <button type="submit" className="px-5 py-2 bg-gray-900 text-white text-sm font-bold rounded-lg hover:bg-gray-700">
                Add source
              </button>
            </div>
          </form>
        </section>
      )}

      {/* LIST */}
      {!tableMissing && (
        <section className="bg-white border border-portal-border rounded-lg overflow-hidden">
          <div className="px-5 py-3 border-b border-portal-border bg-portal-bg flex items-center justify-between">
            <h2 className="text-sm font-bold text-portal-text">All sources</h2>
            <span className="text-xs text-portal-muted">{sources.length} total · {activeCount} active</span>
          </div>

          {sources.length === 0 ? (
            <p className="p-8 text-center text-sm text-portal-muted">No sources yet. Add one above.</p>
          ) : (
            <ul className="divide-y divide-portal-border">
              {sources.map(s => (
                <li key={s.id} className="p-5">
                  <div className="flex items-start gap-3 mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-portal-text">{s.name}</p>
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                          s.ingestion_method === 'ical'       ? 'bg-portal-blue-lt text-portal-blue'    :
                          s.ingestion_method === 'ai-extract' ? 'bg-purple-100 text-purple-800' :
                          s.ingestion_method === 'manual'     ? 'bg-gray-100 text-portal-text'    :
                                                                'bg-portal-amber-lt text-portal-amber'
                        }`}>{s.ingestion_method}</span>
                        {!s.is_active && (
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-gray-100 text-portal-sub">Off</span>
                        )}
                      </div>
                      <a href={s.events_url} target="_blank" rel="noreferrer" className="text-xs text-portal-blue hover:underline font-mono break-all inline-flex items-center gap-1 mt-0.5">
                        {s.events_url} <ExternalLink size={10} />
                      </a>
                      <div className="text-[11px] text-portal-muted mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                        <span>Market: <strong className="text-portal-sub">{s.market}</strong></span>
                        <span>Frequency: <strong className="text-portal-sub">{s.scrape_frequency ?? '—'}</strong></span>
                        <span>Last ingested: <strong className="text-portal-sub">{fmtDateTime(s.last_ingested_at)}</strong> ({s.last_ingested_count} events)</span>
                      </div>
                    </div>
                    <form action={toggleActive}>
                      <input type="hidden" name="id"      value={s.id} />
                      <input type="hidden" name="current" value={String(s.is_active)} />
                      <button type="submit" className={`text-xs font-semibold px-3 py-1.5 rounded-lg border ${
                        s.is_active
                          ? 'bg-white text-portal-text border-portal-border hover:bg-portal-bg'
                          : 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                      }`}>
                        {s.is_active ? 'Turn off' : 'Turn on'}
                      </button>
                    </form>
                  </div>

                  {s.notes && (
                    <p className="text-xs text-portal-sub italic bg-portal-bg rounded px-3 py-1.5 mb-2">{s.notes}</p>
                  )}

                  {s.ical_url && (
                    <p className="text-[11px] text-portal-muted mb-2">
                      iCal feed: <a href={s.ical_url} target="_blank" rel="noreferrer" className="text-portal-blue hover:underline font-mono break-all">{s.ical_url}</a>
                    </p>
                  )}

                  <div className="mb-3">
                    <SourceActions
                      sourceId={s.id}
                      sourceName={s.name}
                      eventsUrl={s.events_url}
                      ingestionMethod={s.ingestion_method}
                      hasIcalUrl={Boolean(s.ical_url)}
                    />
                  </div>

                  <details className="group">
                    <summary className="text-xs font-semibold text-portal-sub cursor-pointer hover:text-portal-text select-none">
                      Edit
                    </summary>
                    <form action={updateSource} className="mt-3 grid md:grid-cols-12 gap-3 items-end">
                      <input type="hidden" name="id" value={s.id} />
                      <div className="md:col-span-3">
                        <label className="block text-[11px] font-semibold text-portal-sub mb-1">Name</label>
                        <input name="name" type="text" required defaultValue={s.name} className={inputCls} />
                      </div>
                      <div className="md:col-span-4">
                        <label className="block text-[11px] font-semibold text-portal-sub mb-1">Events URL</label>
                        <input name="events_url" type="url" required defaultValue={s.events_url} className={inputCls} />
                      </div>
                      <div className="md:col-span-3">
                        <label className="block text-[11px] font-semibold text-portal-sub mb-1">Org URL</label>
                        <input name="org_url" type="url" defaultValue={s.org_url ?? ''} className={inputCls} />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-[11px] font-semibold text-portal-sub mb-1">Method</label>
                        <select name="ingestion_method" defaultValue={s.ingestion_method} className={inputCls}>
                          {METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                        </select>
                      </div>
                      <div className="md:col-span-5">
                        <label className="block text-[11px] font-semibold text-portal-sub mb-1">iCal URL</label>
                        <input name="ical_url" type="url" defaultValue={s.ical_url ?? ''} className={inputCls} />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-[11px] font-semibold text-portal-sub mb-1">Frequency</label>
                        <select name="scrape_frequency" defaultValue={s.scrape_frequency ?? 'weekly'} className={inputCls}>
                          {FREQUENCIES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                        </select>
                      </div>
                      <div className="md:col-span-5">
                        <label className="block text-[11px] font-semibold text-portal-sub mb-1">Notes</label>
                        <input name="notes" type="text" defaultValue={s.notes ?? ''} className={inputCls} />
                      </div>
                      <div className="md:col-span-12 flex gap-2">
                        <button type="submit" className="px-4 py-2 bg-gray-900 text-white text-sm font-bold rounded-lg hover:bg-gray-700">
                          Save
                        </button>
                      </div>
                    </form>
                    <form action={deleteSource} className="mt-2">
                      <input type="hidden" name="id" value={s.id} />
                      <button type="submit" className="text-xs text-portal-red hover:text-red-700 font-semibold">
                        Delete permanently
                      </button>
                    </form>
                  </details>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </main>
  )
}
