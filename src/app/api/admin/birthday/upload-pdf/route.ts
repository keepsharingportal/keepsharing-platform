// POST /api/admin/birthday/upload-pdf
//
// Multipart file upload for PDF lead-magnet assets (the Birthday Bash
// Planner, future goody-bag list, etc.). Streams straight to Supabase
// Storage under the 'article-media' public bucket — no Sharp pipeline,
// the file goes up byte-for-byte.
//
// Vercel function bodies cap at ~4.5 MB; we enforce a generous 10 MB
// limit so the editor sees a clean error instead of a 413.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/admin/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const BUCKET    = 'article-media'
const MAX_BYTES = 10 * 1024 * 1024

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  )
}

function safeFilename(name: string): string {
  return name
    .toLowerCase()
    .replace(/\.pdf$/i, '')
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'lead-magnet'
}

export async function POST(req: NextRequest) {
  await requireAdmin()

  const form = await req.formData().catch(() => null)
  const file = form?.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided.' }, { status: 400 })
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: `File too large — keep PDFs under ${MAX_BYTES / (1024 * 1024)} MB.` }, { status: 413 })
  }
  if (file.type !== 'application/pdf') {
    return NextResponse.json({ error: 'Only PDF files are accepted here.' }, { status: 415 })
  }

  const buf = Buffer.from(await file.arrayBuffer())
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm   = String(now.getMonth() + 1).padStart(2, '0')
  const stamp = `${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`
  const path = `birthday-lead-magnets/${yyyy}/${mm}/${safeFilename(file.name)}-${stamp}.pdf`

  const sb = supabaseAdmin()
  const { error } = await sb.storage.from(BUCKET).upload(path, buf, {
    contentType: 'application/pdf',
    cacheControl: 'public, max-age=31536000, immutable',
    upsert: false,
  })
  if (error) {
    console.error('[birthday-upload-pdf]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  const { data: pub } = sb.storage.from(BUCKET).getPublicUrl(path)
  return NextResponse.json({ url: pub.publicUrl, path, size: file.size })
}
