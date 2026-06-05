// ── /admin/trending ───────────────────────────────────────────────────────────
// Manage the homepage "Trending" bar.
//
// Per-item: emoji, label, link, display_order, is_active, start_at, end_at.
// The homepage shows up to 4 currently-live items (is_active=true AND now is
// inside [start_at, end_at]), ordered by display_order, archived items
// excluded.
//
// On every page load we run a lightweight auto-archive: anything whose
// end_at is more than 30 days in the past gets archived_at stamped. They
// stay in the DB (so you can restore) but disappear from default view.

import type { Metadata } from 'next'
import { revalidatePath } from 'next/cache'
import { TrendingUp } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { TrendingList, type TrendingItem } from './TrendingList'

export const metadata: Metadata = { title: 'Trending Bar — Admin' }
export const dynamic  = 'force-dynamic'

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

// Bulk action — accepts comma-sep ids + an action name. Used by the bulk
// action bar at the bottom of the list.
async function bulkAction(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const ids    = ((formData.get('ids')    as string) || '').split(',').filter(Boolean)
  const action = (formData.get('action') as string) || ''
  if (ids.length === 0 || !action) return

  const nowIso = new Date().toISOString()
  switch (action) {
    case 'turn-off':
      await supabase.from('trending_items').update({ is_active: false }).in('id', ids)
      break
    case 'turn-on':
      await supabase.from('trending_items').update({ is_active: true  }).in('id', ids)
      break
    case 'end-now':
      await supabase.from('trending_items').update({ end_at: nowIso }).in('id', ids)
      break
    case 'archive':
      await supabase.from('trending_items').update({ archived_at: nowIso, is_active: false }).in('id', ids)
      break
    case 'restore':
      await supabase.from('trending_items').update({ archived_at: null }).in('id', ids)
      break
    case 'delete':
      await supabase.from('trending_items').delete().in('id', ids)
      break
  }
  revalidatePath('/admin/trending')
  revalidatePath('/')
}

// Single-item quick actions used by the per-row buttons.
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

async function endNow(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const id = (formData.get('id') as string) || ''
  if (!id) return
  await supabase.from('trending_items').update({ end_at: new Date().toISOString() }).eq('id', id)
  revalidatePath('/admin/trending')
  revalidatePath('/')
}

async function archiveItem(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const id = (formData.get('id') as string) || ''
  if (!id) return
  await supabase.from('trending_items').update({
    archived_at: new Date().toISOString(),
    is_active:   false,
  }).eq('id', id)
  revalidatePath('/admin/trending')
  revalidatePath('/')
}

async function restoreItem(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const id = (formData.get('id') as string) || ''
  if (!id) return
  await supabase.from('trending_items').update({ archived_at: null }).eq('id', id)
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

// Drag-to-reorder — accepts comma-sep ids in new order. Writes
// display_order = array index for each. One round trip, all in order.
async function reorderItems(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const ids = ((formData.get('ids') as string) || '').split(',').filter(Boolean)
  if (ids.length === 0) return
  // Sequential updates; tiny payloads, low contention. Doing them in one
  // server action keeps the optimistic UI snappy.
  for (let i = 0; i < ids.length; i++) {
    await supabase.from('trending_items').update({ display_order: i }).eq('id', ids[i])
  }
  revalidatePath('/admin/trending')
  revalidatePath('/')
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function TrendingAdminPage() {
  const supabase = await createClient()

  // Auto-archive: anything whose end_at is more than 30 days in the past
  // and isn't already archived. Cheap because of the partial index on
  // archived_at. We pull the affected ids back so we can show a small
  // toast saying how many were swept up.
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const { data: archivedRows } = await supabase
    .from('trending_items')
    .update({ archived_at: new Date().toISOString(), is_active: false })
    .lt('end_at', thirtyDaysAgo)
    .is('archived_at', null)
    .select('id')
  const autoArchivedCount = archivedRows?.length ?? 0

  const { data } = await supabase
    .from('trending_items')
    .select('id, emoji, label, link, display_order, is_active, start_at, end_at, archived_at, created_at')
    .order('display_order', { ascending: true })
    .order('created_at',    { ascending: false })

  const items = (data ?? []) as TrendingItem[]

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-6 pb-16">
      <div className="max-w-[1100px] mx-auto space-y-6">

        <header className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp size={20} className="text-primary" />
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">Trending Bar</h1>
            </div>
            <p className="text-sm text-gray-500">
              Smart scheduling — start/end dates auto-show/hide items. Up to 4 live items appear in the bar at any time.
            </p>
            {(autoArchivedCount ?? 0) > 0 && (
              <p className="text-xs text-blue-700 mt-1">
                Auto-archived {autoArchivedCount} item{autoArchivedCount === 1 ? '' : 's'} that ended 30+ days ago.
              </p>
            )}
          </div>
          <a href="/" target="_blank" rel="noreferrer"
             className="text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg px-3 py-2 hover:bg-gray-50">
            View homepage →
          </a>
        </header>

        <TrendingList
          initialItems={items}
          createItem={createItem}
          updateItem={updateItem}
          toggleActive={toggleActive}
          endNow={endNow}
          archiveItem={archiveItem}
          restoreItem={restoreItem}
          deleteItem={deleteItem}
          bulkAction={bulkAction}
          reorderItems={reorderItems}
        />
      </div>
    </div>
  )
}
