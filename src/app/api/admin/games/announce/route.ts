// POST /api/admin/games/announce
// Body: { subject, list_tag?, scheduled_for? }
//
// Renders the games-announcement HTML for the current ISO week and POSTs it
// to the GHL webhook (same workflow as the newsletter, or a dedicated one
// via GHL_GAMES_ANNOUNCEMENT_WEBHOOK_URL). Logs to newsletter_issues so the
// send history surfaces in /admin/newsletter/pick-events too.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { isoWeek } from '@/lib/games/weekly'
import { renderGamesAnnouncementHtml } from '@/lib/games/announce-render'

export const runtime     = 'nodejs'
export const maxDuration = 30

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  )
}

interface Body {
  subject:       string
  list_tag?:     string
  scheduled_for?: string | null
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as Body | null
  if (!body || !body.subject?.trim()) {
    return NextResponse.json({ error: 'subject is required' }, { status: 400 })
  }

  // Prefer the dedicated games-announcement webhook; fall back to the newsletter one.
  const webhookUrl = process.env.GHL_GAMES_ANNOUNCEMENT_WEBHOOK_URL || process.env.GHL_NEWSLETTER_WEBHOOK_URL
  if (!webhookUrl) {
    return NextResponse.json({
      error: 'No GHL webhook configured. Set GHL_GAMES_ANNOUNCEMENT_WEBHOOK_URL (or GHL_NEWSLETTER_WEBHOOK_URL) in .env.local.',
    }, { status: 500 })
  }

  const week = isoWeek()
  const html = renderGamesAnnouncementHtml(week)

  const supabase = supabaseAdmin()
  const issueDate = new Date().toISOString().slice(0, 10)

  // Audit row first (idempotency + record even on webhook failure).
  const issueInsert = await supabase
    .from('newsletter_issues')
    .insert({
      issue_date:    issueDate,
      market:        'rrp',
      subject:       body.subject.trim(),
      list_tag:      body.list_tag?.trim() || 'weekly-scoop',
      scheduled_for: body.scheduled_for || null,
      status:        'pending',
      rendered_html: html,
      picks_count:   6,   // 6 games
    })
    .select('id')
    .single()

  // Soft-fail if the newsletter_issues table doesn't exist yet (migration 079 missing).
  const issueId = (issueInsert.data as { id?: string } | null)?.id

  // Fire the webhook
  const payload = {
    subject:     body.subject.trim(),
    html_body:   html,
    list_tag:    body.list_tag?.trim() || 'weekly-scoop',
    send_at:     body.scheduled_for || null,
    source:      'brain-games-weekly',
    iso_year:    week.year,
    iso_week:    week.week,
  }

  let status = 0
  let parsed: unknown = null
  let ok = false
  try {
    const res = await fetch(webhookUrl, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
      signal:  AbortSignal.timeout(20_000),
    })
    status = res.status
    const text = await res.text()
    try { parsed = JSON.parse(text) } catch { parsed = text }
    ok = res.ok
  } catch (e) {
    parsed = { error: e instanceof Error ? e.message : String(e) }
  }

  const finalStatus = ok ? (body.scheduled_for ? 'queued' : 'sent') : 'failed'
  if (issueId) {
    await supabase.from('newsletter_issues').update({
      status:        finalStatus,
      ghl_response:  { status_code: status, body: parsed },
      error_message: ok ? null : `GHL responded ${status}`,
    }).eq('id', issueId)
  }

  revalidatePath('/admin/games')
  revalidatePath('/admin/newsletter/pick-events')

  if (!ok) {
    return NextResponse.json({
      success: false,
      status:  finalStatus,
      message: `GHL webhook returned ${status}`,
      ghl_response: parsed,
    }, { status: 502 })
  }

  return NextResponse.json({ success: true, status: finalStatus, issue_id: issueId })
}
