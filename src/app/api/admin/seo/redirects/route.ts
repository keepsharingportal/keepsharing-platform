// CRUD for the redirects table. Invalidates the middleware in-memory
// cache after each write so the next public request honors the change.

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { invalidateRedirectCache } from '@/lib/seo/redirect-lookup'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const adminCtx = await requireAdmin()
  const body = await req.json().catch(() => null) as {
    fromPath?:   string
    toPath?:     string
    statusCode?: number
    brandSlug?:  string | null
    note?:       string | null
  } | null
  if (!body?.fromPath?.trim() || !body?.toPath?.trim()) {
    return NextResponse.json({ error: 'fromPath + toPath required' }, { status: 400 })
  }

  const status = body.statusCode ?? 301
  if (![301, 302, 307, 308].includes(status)) {
    return NextResponse.json({ error: 'statusCode must be 301/302/307/308' }, { status: 400 })
  }

  // Path validation — local paths must start with /; external must be
  // absolute URL.
  const to = body.toPath.trim()
  if (!to.startsWith('/') && !to.startsWith('http://') && !to.startsWith('https://')) {
    return NextResponse.json({ error: 'toPath must be a / path or absolute URL' }, { status: 400 })
  }
  const from = body.fromPath.trim()
  if (!from.startsWith('/')) {
    return NextResponse.json({ error: 'fromPath must start with /' }, { status: 400 })
  }

  const sb = createAdminClient()
  const { data, error } = await sb.from('redirects').insert({
    from_path:   from,
    to_path:     to,
    status_code: status,
    brand_slug:  body.brandSlug || null,
    note:        body.note || null,
    is_active:   true,
    created_by:  adminCtx.userId ?? null,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  invalidateRedirectCache()
  return NextResponse.json({ ok: true, row: data })
}

export async function DELETE(req: NextRequest) {
  await requireAdmin()
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const sb = createAdminClient()
  const { error } = await sb.from('redirects').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  invalidateRedirectCache()
  return NextResponse.json({ ok: true })
}
