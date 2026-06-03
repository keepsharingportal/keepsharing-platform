// GET    /api/admin/site/nav-visibility          — list all override rows
// POST   /api/admin/site/nav-visibility          — toggle hidden flag
// PATCH  /api/admin/site/nav-visibility          — set overrides on an item
// PUT    /api/admin/site/nav-visibility          — create a custom item
// DELETE /api/admin/site/nav-visibility?key=...  — delete a row (custom item
//                                                  or just reset overrides)
//
// Settings-tier only (super-admin / admin). Every mutation invalidates
// the public-side cache + revalidates a handful of high-traffic public
// paths so the change shows up promptly.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { requireSettingsAccess } from '@/lib/admin/auth'
import { invalidateHiddenNavCache } from '@/lib/site-nav/visibility'

export const runtime = 'nodejs'

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
    { auth: { persistSession: false } },
  )
}

function bustCachesAndRevalidate() {
  invalidateHiddenNavCache()
  revalidatePath('/')
  revalidatePath('/calendar')
  revalidatePath('/articles')
}

// ── GET ─────────────────────────────────────────────────────────────────────
// Returns every row in nav_visibility (not just hidden) so the admin
// can render rename/new-tab overrides + custom items.
export async function GET() {
  try { await requireSettingsAccess() }
  catch (e) { if (e instanceof Response) return e; throw e }

  const sb = supabaseAdmin()
  const { data, error } = await sb
    .from('nav_visibility')
    .select('key, hidden, label_override, href_override, open_in_new_tab, is_custom, parent_key, sort_order, updated_at')
  if (error) {
    if (/relation .* does not exist/i.test(error.message)) {
      return NextResponse.json({ rows: [] })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ rows: data ?? [] })
}

// ── POST ────────────────────────────────────────────────────────────────────
// Toggle the hidden flag. Hidden=false on a catalog item with no other
// overrides → delete the row (absence = visible). Hidden=false on a
// catalog item that ALSO has overrides → update hidden to false but
// keep the row.
export async function POST(req: NextRequest) {
  try { await requireSettingsAccess() }
  catch (e) { if (e instanceof Response) return e; throw e }

  const body = await req.json().catch(() => null) as { key?: string; hidden?: boolean } | null
  if (!body?.key || typeof body.hidden !== 'boolean') {
    return NextResponse.json({ error: 'key (string) and hidden (boolean) required' }, { status: 400 })
  }

  const sb = supabaseAdmin()
  // Look up existing row to know whether we should delete-on-show
  const { data: existing } = await sb
    .from('nav_visibility')
    .select('key, label_override, href_override, open_in_new_tab, is_custom')
    .eq('key', body.key)
    .maybeSingle()

  if (body.hidden) {
    // Upsert hidden=true (preserves any existing label/href overrides).
    const { error } = await sb
      .from('nav_visibility')
      .upsert({
        key:        body.key,
        hidden:     true,
        updated_at: new Date().toISOString(),
      })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else {
    // Hidden=false. If the row has no other overrides, delete it
    // entirely (visibility default). Otherwise keep the row but flip
    // hidden to false so the overrides stick around.
    const hasOverrides = !!(existing?.label_override || existing?.href_override || existing?.open_in_new_tab || existing?.is_custom)
    if (existing && hasOverrides) {
      const { error } = await sb
        .from('nav_visibility')
        .update({ hidden: false, updated_at: new Date().toISOString() })
        .eq('key', body.key)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    } else {
      const { error } = await sb
        .from('nav_visibility')
        .delete()
        .eq('key', body.key)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  bustCachesAndRevalidate()
  return NextResponse.json({ ok: true })
}

// ── PATCH ───────────────────────────────────────────────────────────────────
// Set overrides on an item (label rename, href change, new-tab toggle,
// sort order). Use null to clear an override.
export async function PATCH(req: NextRequest) {
  try { await requireSettingsAccess() }
  catch (e) { if (e instanceof Response) return e; throw e }

  const body = await req.json().catch(() => null) as {
    key?:           string
    labelOverride?: string | null
    hrefOverride?:  string | null
    openInNewTab?:  boolean
    sortOrder?:     number | null
  } | null
  if (!body?.key) {
    return NextResponse.json({ error: 'key (string) required' }, { status: 400 })
  }

  const updates: Record<string, unknown> = { key: body.key, updated_at: new Date().toISOString() }
  if (body.labelOverride !== undefined) updates.label_override  = body.labelOverride
  if (body.hrefOverride  !== undefined) updates.href_override   = body.hrefOverride
  if (body.openInNewTab  !== undefined) updates.open_in_new_tab = body.openInNewTab
  if (body.sortOrder     !== undefined) updates.sort_order      = body.sortOrder

  const sb = supabaseAdmin()
  const { error } = await sb
    .from('nav_visibility')
    .upsert(updates)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  bustCachesAndRevalidate()
  return NextResponse.json({ ok: true })
}

// ── PUT — create custom item ────────────────────────────────────────────────
// Admins use this to add a new menu link that doesn't exist in the code
// catalog (e.g. a "Print Edition" link). The key is auto-generated as
// 'custom.<uuid-fragment>' to guarantee no collision with catalog keys.
export async function PUT(req: NextRequest) {
  try { await requireSettingsAccess() }
  catch (e) { if (e instanceof Response) return e; throw e }

  const body = await req.json().catch(() => null) as {
    label?:        string
    href?:         string
    parentKey?:    string | null
    openInNewTab?: boolean
    sortOrder?:    number | null
  } | null
  if (!body?.label?.trim() || !body?.href?.trim()) {
    return NextResponse.json({ error: 'label and href required' }, { status: 400 })
  }

  // Custom-item key prefix avoids any collision with catalog keys.
  const key = `custom.${crypto.randomUUID().slice(0, 12)}`

  const sb = supabaseAdmin()
  const { error } = await sb
    .from('nav_visibility')
    .insert({
      key,
      hidden:          false,
      label_override:  body.label.trim(),
      href_override:   body.href.trim(),
      open_in_new_tab: body.openInNewTab ?? false,
      is_custom:       true,
      parent_key:      body.parentKey ?? null,
      sort_order:      body.sortOrder ?? null,
    })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  bustCachesAndRevalidate()
  return NextResponse.json({ ok: true, key })
}

// ── DELETE ──────────────────────────────────────────────────────────────────
// Removes a row entirely. For custom items this fully deletes them.
// For catalog items it resets the row (visibility default, no overrides).
export async function DELETE(req: NextRequest) {
  try { await requireSettingsAccess() }
  catch (e) { if (e instanceof Response) return e; throw e }

  const key = new URL(req.url).searchParams.get('key')?.trim()
  if (!key) {
    return NextResponse.json({ error: 'key query param required' }, { status: 400 })
  }

  const sb = supabaseAdmin()
  const { error } = await sb.from('nav_visibility').delete().eq('key', key)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  bustCachesAndRevalidate()
  return NextResponse.json({ ok: true })
}
