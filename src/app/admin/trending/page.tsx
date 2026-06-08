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
import { createAdminClient } from '@/lib/supabase/admin'
import { buildAutoTrendingItems } from '@/lib/trending/auto-trending'
import { TrendingList, type TrendingItem } from './TrendingList'
import { AutoTrendingPreview, type AutoCandidate, type BlockedPath } from './AutoTrendingPreview'

export const metadata: Metadata = { title: 'Trending Bar — Admin' }
export const dynamic  = 'force-dynamic'

// ── Server actions ────────────────────────────────────────────────────────────

async function createItem(formData: FormData) {
  'use server'
  const supabase = createAdminClient()
  const emoji         = ((formData.get('emoji')         as string) || '').trim() || null
  const label         = ((formData.get('label')         as string) || '').trim()
  const link          = ((formData.get('link')          as string) || '').trim()
  const display_order = parseInt((formData.get('display_order') as string) || '0', 10) || 0
  const start_at      = (formData.get('start_at') as string) || null
  const end_at        = (formData.get('end_at')   as string) || null

  if (!label || !link) return

  const { error } = await supabase.from('trending_items').insert({
    emoji,
    label,
    link,
    display_order,
    is_active: true,
    start_at: start_at ? new Date(start_at).toISOString() : null,
    end_at:   end_at   ? new Date(end_at).toISOString()   : null,
  })
  if (error) console.error('[trending createItem]', error)

  revalidatePath('/admin/trending')
  revalidatePath('/')
}

async function updateItem(formData: FormData) {
  'use server'
  const supabase = createAdminClient()
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
  const supabase = createAdminClient()
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
  const supabase = createAdminClient()
  const id      = (formData.get('id') as string) || ''
  const current = (formData.get('current') as string) === 'true'
  if (!id) return
  await supabase.from('trending_items').update({ is_active: !current }).eq('id', id)
  revalidatePath('/admin/trending')
  revalidatePath('/')
}

async function endNow(formData: FormData) {
  'use server'
  const supabase = createAdminClient()
  const id = (formData.get('id') as string) || ''
  if (!id) return
  await supabase.from('trending_items').update({ end_at: new Date().toISOString() }).eq('id', id)
  revalidatePath('/admin/trending')
  revalidatePath('/')
}

async function archiveItem(formData: FormData) {
  'use server'
  const supabase = createAdminClient()
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
  const supabase = createAdminClient()
  const id = (formData.get('id') as string) || ''
  if (!id) return
  await supabase.from('trending_items').update({ archived_at: null }).eq('id', id)
  revalidatePath('/admin/trending')
  revalidatePath('/')
}

async function deleteItem(formData: FormData) {
  'use server'
  const supabase = createAdminClient()
  const id = (formData.get('id') as string) || ''
  if (!id) return
  await supabase.from('trending_items').delete().eq('id', id)
  revalidatePath('/admin/trending')
  revalidatePath('/')
}

// Block an auto-trending path so it stops filling the bar. Writes to
// trending_blocked_paths (migration 126). The label is a snapshot of
// what the editor saw at the moment they clicked Block — kept purely
// for the admin UI's recognition of "what was this?".
async function blockAutoPath(formData: FormData) {
  'use server'
  const supabase = createAdminClient()
  const path  = ((formData.get('path')  as string) || '').trim()
  const label = ((formData.get('label') as string) || '').trim() || null
  if (!path) return

  await supabase
    .from('trending_blocked_paths')
    .upsert({ path, label }, { onConflict: 'path' })

  revalidatePath('/admin/trending')
  revalidatePath('/')
}

async function unblockAutoPath(formData: FormData) {
  'use server'
  const supabase = createAdminClient()
  const path = ((formData.get('path') as string) || '').trim()
  if (!path) return

  await supabase.from('trending_blocked_paths').delete().eq('path', path)
  revalidatePath('/admin/trending')
  revalidatePath('/')
}

// Drag-to-reorder — accepts comma-sep ids in new order. Writes
// display_order = array index for each. One round trip, all in order.
async function reorderItems(formData: FormData) {
  'use server'
  const supabase = createAdminClient()
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
  const supabase = createAdminClient()

  // Probe: does the archived_at column exist? If migration 117 hasn't
  // been applied yet, gracefully skip the auto-archive sweep and the
  // archived_at filter in the select. The TrendingList component treats
  // archived_at as null on every row so the rest of the UI still works.
  const probe = await supabase.from('trending_items').select('archived_at').limit(1)
  const archiveMigrationApplied = !probe.error
  let autoArchivedCount = 0

  if (archiveMigrationApplied) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const { data: archivedRows } = await supabase
      .from('trending_items')
      .update({ archived_at: new Date().toISOString(), is_active: false })
      .lt('end_at', thirtyDaysAgo)
      .is('archived_at', null)
      .select('id')
    autoArchivedCount = archivedRows?.length ?? 0
  }

  const cols = archiveMigrationApplied
    ? 'id, emoji, label, link, display_order, is_active, start_at, end_at, archived_at, created_at'
    : 'id, emoji, label, link, display_order, is_active, start_at, end_at, created_at'

  const { data } = await supabase
    .from('trending_items')
    .select(cols)
    .order('display_order', { ascending: true })
    .order('created_at',    { ascending: false })

  type RawRow = Omit<TrendingItem, 'archived_at'> & { archived_at?: string | null }
  const items: TrendingItem[] = ((data ?? []) as unknown as RawRow[]).map(r => ({
    ...r,
    archived_at: r.archived_at ?? null,
  }))

  // ── Auto-trending preview ───────────────────────────────────────────────
  // Mirror what the homepage does: build the exclude set from pinned
  // (live) items + the manual blocklist, then ask buildAutoTrendingItems
  // for the top 10 candidates. Migration-tolerant: pre-126 DBs get
  // empty blockedRows so the page still loads.
  const nowIso = new Date().toISOString()
  const pinnedActive = items.filter(t =>
    t.is_active && !t.archived_at &&
    (!t.start_at || t.start_at <= nowIso) &&
    (!t.end_at   || t.end_at   >= nowIso)
  )
  const blockedRes = await supabase
    .from('trending_blocked_paths')
    .select('path, label, blocked_at')
    .order('blocked_at', { ascending: false })
  const blockedRows: BlockedPath[] = (blockedRes.data ?? []) as BlockedPath[]
  const blocklistMigrationApplied = !blockedRes.error

  const excludeLinks = new Set<string>(pinnedActive.map(p => p.link))
  for (const b of blockedRows) excludeLinks.add(b.path)

  const pathsRes = await supabase
    .from('trending_paths_7d')
    .select('path, unique_views')
    .limit(40)              // pull extra so we still get 10 after filters
  const autoCandidates: AutoCandidate[] = !pathsRes.error
    ? (await buildAutoTrendingItems(
        supabase,
        (pathsRes.data ?? []) as Array<{ path: string; unique_views: number }>,
        excludeLinks,
        10,
      )).map(c => ({
        path:         c.link,
        label:        c.label,
        emoji:        c.emoji,
        unique_views: c.unique_views,
      }))
    : []

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-6 pb-16">
      <div className="max-w-[1100px] mx-auto space-y-6">

        <header className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp size={20} className="text-portal-blue" />
              <h1 className="text-xl font-bold text-portal-text tracking-tight">Trending Bar</h1>
            </div>
            <p className="text-sm text-portal-sub">
              Smart scheduling — start/end dates auto-show/hide items. Up to 4 live items appear in the bar at any time.
            </p>
            {(autoArchivedCount ?? 0) > 0 && (
              <p className="text-xs text-portal-blue mt-1">
                Auto-archived {autoArchivedCount} item{autoArchivedCount === 1 ? '' : 's'} that ended 30+ days ago.
              </p>
            )}
          </div>
          <a href="/" target="_blank" rel="noreferrer"
             className="text-sm font-semibold text-portal-text bg-white border border-portal-border rounded-lg px-3 py-2 hover:bg-portal-bg">
            View homepage →
          </a>
        </header>

        {/* Migration banner — only shows until 117 is applied. */}
        {!archiveMigrationApplied && (
          <div className="rounded-lg border border-amber-200 bg-portal-amber-lt p-4 text-sm text-amber-900">
            <p className="font-bold">Migration 117 not applied yet</p>
            <p className="text-xs mt-1">
              Apply <code className="px-1 bg-portal-amber-lt rounded">supabase/migrations/117_trending_archived.sql</code> in Supabase Studio to enable auto-archive, the Archived filter, and the Archive bulk action. The page works without it — those features just sit dormant.
            </p>
          </div>
        )}

        {/* Fallback notice — when the DB is empty, the homepage falls back
            to a hardcoded "starter pack" until the editor adds real items.
            Show that pack here so the editor knows what's rendering and
            can either add their own items (which take over) or live with
            the defaults. */}
        {items.length === 0 && (
          <div className="rounded-lg border border-blue-200 bg-portal-blue-lt p-4 text-sm">
            <p className="font-bold text-blue-900 mb-1">No items in the database yet</p>
            <p className="text-xs text-portal-blue mb-3">
              While the table is empty, the homepage shows these hardcoded fallback items so the trending strip isn&apos;t blank. Add your first real item below — once you do, the fallback stops rendering.
            </p>
            <ul className="space-y-1 text-xs text-blue-900">
              <li>⛺ Summer Camp Guide 2026 → <code className="bg-portal-blue-lt px-1 rounded">/summer-camp-guide</code></li>
              <li>🏠 Family Resource Guide → <code className="bg-portal-blue-lt px-1 rounded">/family-resource-guide</code></li>
              <li>🏆 Nominate a Teacher of the Month → <code className="bg-portal-blue-lt px-1 rounded">/nominate</code></li>
              <li>📅 Upcoming Community Events → <code className="bg-portal-blue-lt px-1 rounded">/calendar</code></li>
            </ul>
          </div>
        )}

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

        {/* Auto-fill preview + manual blocklist. Migration 126 must be
            applied for the blocklist actions to persist — until then the
            preview still renders, but the Block button writes 0 rows and
            the path comes back next refresh. */}
        {blocklistMigrationApplied ? (
          <AutoTrendingPreview
            candidates={autoCandidates}
            blocked={blockedRows}
            blockAction={blockAutoPath}
            unblockAction={unblockAutoPath}
          />
        ) : (
          <div className="rounded-lg border border-amber-200 bg-portal-amber-lt p-4 text-sm text-amber-900">
            <p className="font-bold">Migration 126 not applied yet</p>
            <p className="text-xs mt-1">
              Apply <code className="px-1 bg-portal-amber-lt rounded">supabase/migrations/126_trending_blocked_paths.sql</code> in Supabase Studio to enable the auto-trending preview and the manual blocklist.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
