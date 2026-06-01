// GET  /api/admin/site/nav-visibility — list all hidden keys (admin view)
// POST /api/admin/site/nav-visibility — toggle one key
//
// Body: { key: string, hidden: boolean }
//
// Settings-tier only (super-admin / admin). When hidden=true, an upsert
// writes hidden=true. When hidden=false, the row is deleted (absence =
// visible). After every flip the public-side cache is invalidated and
// the homepage + a handful of high-traffic public pages get
// revalidated so the change shows up promptly.

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

export async function GET() {
  try { await requireSettingsAccess() }
  catch (e) { if (e instanceof Response) return e; throw e }

  const sb = supabaseAdmin()
  const { data, error } = await sb
    .from('nav_visibility')
    .select('key, hidden, updated_at')
    .eq('hidden', true)
  if (error) {
    if (/relation .* does not exist/i.test(error.message)) {
      return NextResponse.json({ hidden: [] })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ hidden: data ?? [] })
}

export async function POST(req: NextRequest) {
  try { await requireSettingsAccess() }
  catch (e) { if (e instanceof Response) return e; throw e }

  const body = await req.json().catch(() => null) as { key?: string; hidden?: boolean } | null
  if (!body?.key || typeof body.hidden !== 'boolean') {
    return NextResponse.json({ error: 'key (string) and hidden (boolean) required' }, { status: 400 })
  }

  const sb = supabaseAdmin()
  if (body.hidden) {
    const { error } = await sb
      .from('nav_visibility')
      .upsert({ key: body.key, hidden: true, updated_at: new Date().toISOString() })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else {
    const { error } = await sb
      .from('nav_visibility')
      .delete()
      .eq('key', body.key)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Bust the in-process cache and a few high-traffic public paths so
  // the change is visible without waiting on the 30s TTL.
  invalidateHiddenNavCache()
  revalidatePath('/')
  revalidatePath('/calendar')
  revalidatePath('/articles')

  return NextResponse.json({ ok: true })
}
