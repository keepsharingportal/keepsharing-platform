// ── /admin/trending ───────────────────────────────────────────────────────────
// Manage the homepage "Trending" bar.
// Each item has a label, link, emoji, display order, and an optional
// start_at/end_at window. The homepage shows up to 4 currently-active items
// (is_active = true AND now between start_at and end_at), ordered by
// display_order.

import type { Metadata } from 'next'
import { revalidatePath } from 'next/cache'
import { TrendingUp } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Trending Bar — Admin' }

// ── Types ─────────────────────────────────────────────────────────────────────

interface TrendingItem {
  id:             string
  emoji:          string | null
  label:          string
  link:           string
  display_order:  number
  is_active:      boolean
  start_at:       string | null
  end_at:         string | null
  created_at:     string
}

type Status = 'live' | 'scheduled' | 'expired' | 'inactive'

// ── Helpers ───────────────────────────────────────────────────────────────────

function classify(item: TrendingItem, now: Date): Status {
  if (!item.is_active) return 'inactive'
  if (item.start_at && new Date(item.start_at) > now) return 'scheduled'
  if (item.end_at   && new Date(item.end_at)   < now) return 'expired'
  return 'live'
}

const STATUS_STYLE: Record<Status, { dot: string; bg: string; text: string; label: string }> = {
  live:      { dot: '#22c55e', bg: '#f0fdf4', text: '#15803d', label: 'Live'      },
  scheduled: { dot: '#3b82f6', bg: '#eff6ff', text: '#1e40af', label: 'Scheduled' },
  expired:   { dot: '#9ca3af', bg: '#f3f4f6', text: '#4b5563', label: 'Expired'   },
  inactive:  { dot: '#d1d5db', bg: '#f9fafb', text: '#6b7280', label: 'Off'       },
}

function fmtDateTime(s: string | null): string {
  if (!s) return '—'
  const d = new Date(s)
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function toLocalInput(s: string | null): string {
  if (!s) return ''
  // datetime-local wants YYYY-MM-DDTHH:mm in local time
  const d = new Date(s)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// ── Server actions ────────────────────────────────────────────────────────────

async function createItem(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const emoji         = ((formData.get('emoji')         as string) || '').trim() || null
  const label         = ((formData.get('label')         as string) || '').trim()
  const link          = ((formData.get('link')          as string) || '').trim()
  const display_order = parseInt((formData.get('display_order') as string) || '0', 10) || 0
  const start_at      = (formData.get('start_at') as string) || null
  const end_at        = (formData.get('end_at')   as string) || null

  if (!label || !link) return

  await supabase.from('trending_items').insert({
    emoji,
    label,
    link,
    display_order,
    is_active: true,
    start_at: start_at ? new Date(start_at).toISOString() : null,
    end_at:   end_at   ? new Date(end_at).toISOString()   : null,
  })

  revalidatePath('/admin/trending')
  revalidatePath('/')
}

async function updateItem(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const id            = (formData.get('id')            as string) || ''
  const emoji         = ((formData.get('emoji')        as string) || '').trim() || null
  const label         = ((formData.get('label')        as string) || '').trim()
  const link          = ((formData.get('link')         as string) || '').trim()
  const display_order = parseInt((formData.get('display_order') as string) || '0', 10) || 0
  const start_at      = (formData.get('start_at') as string) || null
  const end_at        = (formData.get('end_at')   as string) || null

  if (!id || !label || !link) return

  await supabase.from('trending_items').update({
    emoji,
    label,
    link,
    display_order,
    start_at: start_at ? new Date(start_at).toISOString() : null,
    end_at:   end_at   ? new Date(end_at).toISOString()   : null,
  }).eq('id', id)

  revalidatePath('/admin/trending')
  revalidatePath('/')
}

async function toggleActive(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const id      = (formData.get('id') as string) || ''
  const current = (formData.get('current') as string) === 'true'
  if (!id) return
  await supabase.from('trending_items').update({ is_active: !current }).eq('id', id)
  revalidatePath('/admin/trending')
  revalidatePath('/')
}

async function deleteItem(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const id = (formData.get('id') as string) || ''
  if (!id) return
  await supabase.from('trending_items').delete().eq('id', id)
  revalidatePath('/admin/trending')
  revalidatePath('/')
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function TrendingAdminPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('trending_items')
    .select('id, emoji, label, link, display_order, is_active, start_at, end_at, created_at')
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: false })

  const items = (data ?? []) as TrendingItem[]
  const now   = new Date()

  const liveCount      = items.filter(i => classify(i, now) === 'live').length
  const scheduledCount = items.filter(i => classify(i, now) === 'scheduled').length
  const expiredCount   = items.filter(i => classify(i, now) === 'expired').length

  const inputCls = 'w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-gray-400 transition-colors'

  return (
    <main className="p-6 max-w-[1100px] mx-auto space-y-6 pb-16">

      {/* HEADER */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={20} className="text-primary" />
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Trending Bar</h1>
          </div>
          <p className="text-sm text-gray-500">
            The homepage shows up to 4 currently-live items, ordered by display order.
          </p>
        </div>
        <a href="/" target="_blank" rel="noreferrer"
           className="text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg px-3 py-2 hover:bg-gray-50">
          View homepage →
        </a>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Live now',  value: liveCount,      tone: '#22c55e' },
          { label: 'Scheduled', value: scheduledCount, tone: '#3b82f6' },
          { label: 'Expired',   value: expiredCount,   tone: '#9ca3af' },
          { label: 'Total',     value: items.length,   tone: '#374151' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-lg px-4 py-3">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.tone }} />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{s.label}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
          </div>
        ))}
      </div>

      {/* HELP */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 text-sm leading-relaxed">
        <p className="font-bold text-amber-900 mb-1">How scheduling works</p>
        <ul className="list-disc list-inside text-amber-800 space-y-0.5">
          <li><strong>Start</strong> empty = live immediately. <strong>End</strong> empty = no expiry.</li>
          <li>An item only appears on the homepage when it&apos;s active <em>and</em> the current time is inside its window.</li>
          <li>Use <strong>display order</strong> to control which 4 win when more than 4 are live (lower = earlier).</li>
        </ul>
      </div>

      {/* ADD NEW */}
      <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
          <h2 className="text-sm font-bold text-gray-700">Add a new trending item</h2>
        </div>
        <form action={createItem} className="p-5 grid md:grid-cols-12 gap-3 items-end">
          <div className="md:col-span-1">
            <label className="block text-[11px] font-semibold text-gray-500 mb-1">Emoji</label>
            <input name="emoji" type="text" maxLength={4} placeholder="☀️" className={inputCls} />
          </div>
          <div className="md:col-span-4">
            <label className="block text-[11px] font-semibold text-gray-500 mb-1">Label *</label>
            <input name="label" type="text" required placeholder="2026 Summer Camp Guide" className={inputCls} />
          </div>
          <div className="md:col-span-3">
            <label className="block text-[11px] font-semibold text-gray-500 mb-1">Link *</label>
            <input name="link" type="text" required placeholder="/summer-camp-guide" className={inputCls} />
          </div>
          <div className="md:col-span-1">
            <label className="block text-[11px] font-semibold text-gray-500 mb-1">Order</label>
            <input name="display_order" type="number" defaultValue={(items.at(-1)?.display_order ?? 0) + 1} className={inputCls} />
          </div>
          <div className="md:col-span-3 grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 mb-1">Start (optional)</label>
              <input name="start_at" type="datetime-local" className={inputCls} />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 mb-1">End (optional)</label>
              <input name="end_at" type="datetime-local" className={inputCls} />
            </div>
          </div>
          <div className="md:col-span-12">
            <button type="submit"
              className="px-5 py-2 bg-gray-900 text-white text-sm font-bold rounded-lg hover:bg-gray-700">
              Add item
            </button>
          </div>
        </form>
      </section>

      {/* LIST */}
      <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-700">All items</h2>
          <span className="text-xs text-gray-400">{items.length} total</span>
        </div>

        {items.length === 0 ? (
          <p className="p-8 text-center text-sm text-gray-400">No items yet — add one above.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {items.map(item => {
              const status = classify(item, now)
              const style  = STATUS_STYLE[status]
              return (
                <li key={item.id} className="p-5">
                  {/* Summary row */}
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-2xl" aria-hidden="true">{item.emoji ?? '·'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-gray-900 truncate">{item.label}</p>
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded"
                              style={{ backgroundColor: style.bg, color: style.text }}>
                          <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ backgroundColor: style.dot }} />
                          {style.label}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 font-mono truncate">{item.link}</p>
                      <p className="text-[11px] text-gray-400 mt-1">
                        Order {item.display_order} · Starts {fmtDateTime(item.start_at)} · Ends {fmtDateTime(item.end_at)}
                      </p>
                    </div>
                    <form action={toggleActive}>
                      <input type="hidden" name="id"      value={item.id} />
                      <input type="hidden" name="current" value={String(item.is_active)} />
                      <button type="submit"
                        className={`text-xs font-semibold px-3 py-1.5 rounded-lg border ${
                          item.is_active
                            ? 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                            : 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                        }`}>
                        {item.is_active ? 'Turn off' : 'Turn on'}
                      </button>
                    </form>
                  </div>

                  {/* Inline edit form */}
                  <details className="group">
                    <summary className="text-xs font-semibold text-gray-500 cursor-pointer hover:text-gray-700 select-none">
                      Edit
                    </summary>
                    <form action={updateItem} className="mt-3 grid md:grid-cols-12 gap-3 items-end">
                      <input type="hidden" name="id" value={item.id} />
                      <div className="md:col-span-1">
                        <label className="block text-[11px] font-semibold text-gray-500 mb-1">Emoji</label>
                        <input name="emoji" type="text" maxLength={4} defaultValue={item.emoji ?? ''} className={inputCls} />
                      </div>
                      <div className="md:col-span-4">
                        <label className="block text-[11px] font-semibold text-gray-500 mb-1">Label</label>
                        <input name="label" type="text" required defaultValue={item.label} className={inputCls} />
                      </div>
                      <div className="md:col-span-3">
                        <label className="block text-[11px] font-semibold text-gray-500 mb-1">Link</label>
                        <input name="link" type="text" required defaultValue={item.link} className={inputCls} />
                      </div>
                      <div className="md:col-span-1">
                        <label className="block text-[11px] font-semibold text-gray-500 mb-1">Order</label>
                        <input name="display_order" type="number" defaultValue={item.display_order} className={inputCls} />
                      </div>
                      <div className="md:col-span-3 grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-semibold text-gray-500 mb-1">Start</label>
                          <input name="start_at" type="datetime-local" defaultValue={toLocalInput(item.start_at)} className={inputCls} />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-gray-500 mb-1">End</label>
                          <input name="end_at" type="datetime-local" defaultValue={toLocalInput(item.end_at)} className={inputCls} />
                        </div>
                      </div>
                      <div className="md:col-span-12 flex gap-2">
                        <button type="submit"
                          className="px-4 py-2 bg-gray-900 text-white text-sm font-bold rounded-lg hover:bg-gray-700">
                          Save
                        </button>
                      </div>
                    </form>
                    <form action={deleteItem} className="mt-2">
                      <input type="hidden" name="id" value={item.id} />
                      <button type="submit"
                        className="text-xs text-red-600 hover:text-red-700 font-semibold">
                        Delete permanently
                      </button>
                    </form>
                  </details>
                </li>
              )
            })}
          </ul>
        )}
      </section>

    </main>
  )
}
