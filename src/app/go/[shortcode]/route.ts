// GET /go/[shortcode]
//
// Universal QR redirect. Every QR code — regardless of content type — points
// here. The handler looks up the shortcode, bumps the scan counter, and
// dispatches by content_type:
//
//   url    → 302 redirect with UTMs appended
//   phone  → redirect to tel: URI
//   email  → redirect to mailto: URI
//   sms    → redirect to sms: URI
//   vcard  → serve a .vcf file download
//   event  → serve a .ics file download
//   text   → render a branded text page
//
// Every type goes through the same /go/ path so scans are always tracked
// in one place — the short_links.click_count column.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

function supabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  )
}

type ContentType = 'url' | 'vcard' | 'phone' | 'email' | 'sms' | 'text' | 'event'

interface LinkRow {
  id:           string
  destination:  string
  content_type: ContentType
  content_data: Record<string, unknown> | null
  utm_source:   string | null
  utm_medium:   string | null
  utm_campaign: string | null
  utm_content:  string | null
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ shortcode: string }> },
) {
  const { shortcode } = await ctx.params
  if (!shortcode) return NextResponse.redirect(new URL('/', req.url))

  const sb = supabase()
  const { data, error } = await sb
    .from('short_links')
    .select('id, destination, content_type, content_data, utm_source, utm_medium, utm_campaign, utm_content')
    .ilike('shortcode', shortcode)
    .eq('is_active', true)
    .maybeSingle()

  if (error || !data) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  const row = data as LinkRow

  // Fire-and-forget click count bump
  sb.rpc('increment_short_link_click', { p_id: row.id }).then(() => {}, () => {})

  switch (row.content_type) {
    case 'url':
    default:
      return handleUrl(req, row)

    case 'phone':
      return handlePhone(row)

    case 'email':
      return handleEmail(row)

    case 'sms':
      return handleSms(row)

    case 'vcard':
      return handleVcard(row)

    case 'event':
      return handleEvent(row)

    case 'text':
      return handleText(req, row)
  }
}

// ── URL redirect (existing behavior + UTMs) ──────────────────────────────────
//
// The destination row stores a path like '/games'. To build a full URL
// we need a base origin. We PREFER process.env.NEXT_PUBLIC_SITE_URL
// (the canonical production domain) so that a QR printed when this
// project still lived at *.vercel.app — once scanned — redirects to
// riverregionparents.com instead of staying on the preview subdomain.
// Falls back to the incoming request's origin only when NEXT_PUBLIC_SITE_URL
// isn't configured.
function handleUrl(req: NextRequest, row: LinkRow) {
  const canonicalBase = (process.env.NEXT_PUBLIC_SITE_URL ?? '').trim()
  const base = canonicalBase || req.nextUrl.origin
  // Absolute destinations (http://, https://) pass through untouched.
  // Relative destinations get resolved against the canonical base.
  const dest = new URL(row.destination, base)
  if (row.utm_source)   dest.searchParams.set('utm_source',   row.utm_source)
  if (row.utm_medium)   dest.searchParams.set('utm_medium',   row.utm_medium)
  if (row.utm_campaign) dest.searchParams.set('utm_campaign', row.utm_campaign)
  if (row.utm_content)  dest.searchParams.set('utm_content',  row.utm_content)
  return NextResponse.redirect(dest, 302)
}

// ── Phone ────────────────────────────────────────────────────────────────────
function handlePhone(row: LinkRow) {
  const phone = row.destination.replace(/[^0-9+]/g, '')
  return NextResponse.redirect(`tel:${phone}`, 302)
}

// ── Email ────────────────────────────────────────────────────────────────────
function handleEmail(row: LinkRow) {
  const d = row.content_data ?? {}
  const params = new URLSearchParams()
  if (d.subject) params.set('subject', String(d.subject))
  if (d.body)    params.set('body',    String(d.body))
  const qs = params.toString()
  return NextResponse.redirect(`mailto:${row.destination}${qs ? '?' + qs : ''}`, 302)
}

// ── SMS ──────────────────────────────────────────────────────────────────────
function handleSms(row: LinkRow) {
  const phone = row.destination.replace(/[^0-9+]/g, '')
  const body  = (row.content_data as { body?: string } | null)?.body
  return NextResponse.redirect(`sms:${phone}${body ? `?body=${encodeURIComponent(body)}` : ''}`, 302)
}

// ── vCard (.vcf download) ────────────────────────────────────────────────────
function handleVcard(row: LinkRow) {
  const d = (row.content_data ?? {}) as Record<string, string>
  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    d.name    ? `FN:${d.name}` : `FN:${row.destination}`,
    d.org     ? `ORG:${d.org}` : '',
    d.phone   ? `TEL:${d.phone}` : '',
    d.email   ? `EMAIL:${d.email}` : '',
    d.url     ? `URL:${d.url}` : '',
    d.address ? `ADR:;;${d.address};;;` : '',
    d.title   ? `TITLE:${d.title}` : '',
    d.note    ? `NOTE:${d.note}` : '',
    'END:VCARD',
  ].filter(Boolean).join('\r\n')

  return new NextResponse(lines, {
    status: 200,
    headers: {
      'Content-Type': 'text/vcard; charset=utf-8',
      'Content-Disposition': `attachment; filename="${(d.name ?? 'contact').replace(/[^a-zA-Z0-9 ]/g, '')}.vcf"`,
    },
  })
}

// ── Event (.ics download) ────────────────────────────────────────────────────
function handleEvent(row: LinkRow) {
  const d = (row.content_data ?? {}) as Record<string, string>
  const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//River Region Parents//QR//EN',
    'BEGIN:VEVENT',
    `DTSTART:${d.start ?? now}`,
    d.end ? `DTEND:${d.end}` : '',
    `SUMMARY:${d.title ?? row.destination}`,
    d.description ? `DESCRIPTION:${d.description}` : '',
    d.location    ? `LOCATION:${d.location}` : '',
    d.url         ? `URL:${d.url}` : '',
    `DTSTAMP:${now}`,
    `UID:${row.id}@riverregionparents.com`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean).join('\r\n')

  return new NextResponse(lines, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${(d.title ?? 'event').replace(/[^a-zA-Z0-9 ]/g, '')}.ics"`,
    },
  })
}

// ── Text (branded page) ──────────────────────────────────────────────────────
function handleText(req: NextRequest, row: LinkRow) {
  const text = row.destination
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>River Region Parents</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 40px auto; padding: 20px; color: #1a2744; background: #faf8f5; }
    .brand { color: #ef6442; font-weight: 800; font-size: 14px; letter-spacing: 0.05em; text-transform: uppercase; margin-bottom: 24px; }
    .content { font-size: 18px; line-height: 1.7; white-space: pre-wrap; }
    .footer { margin-top: 40px; font-size: 12px; color: #999; }
    a { color: #ef6442; }
  </style>
</head>
<body>
  <div class="brand">River Region Parents</div>
  <div class="content">${escapeHtml(text)}</div>
  <div class="footer">
    <a href="${req.nextUrl.origin}">riverregionparents.com</a>
  </div>
</body>
</html>`

  return new NextResponse(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
