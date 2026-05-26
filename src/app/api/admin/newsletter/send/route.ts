// POST /api/admin/newsletter/send
// Body: { issue_date, subject, list_tag?, scheduled_for? }
//
// Renders the current picks for the issue date, POSTs the HTML + metadata
// to your GHL workflow webhook, and logs the result to newsletter_issues.
//
// Scheduling is handled by GHL: pass `scheduled_for` and your GHL workflow's
// "Wait until {{trigger.scheduled_for}}" step holds the send until that time.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { renderNewsletterHtml, type NewsletterPickEvent } from '@/lib/newsletter/render'

export const runtime     = 'nodejs'
export const maxDuration = 60

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  )
}

interface PickRow {
  event_id:        string
  display_order:   number
  custom_blurb:    string | null
  custom_headline: string | null
}

interface CalendarEventRow {
  id:               string
  slug:             string | null
  title:            string
  start_date:       string
  start_time:       string | null
  end_time:         string | null
  location_name:    string | null
  city:             string | null
  description:      string | null
  hero_image_url:   string | null
  registration_url: string | null
  is_free:          boolean | null
  cost_text:        string | null
  category:         string | null
}

interface SendBody {
  issue_date:    string
  subject:       string
  list_tag?:     string
  scheduled_for?: string | null  // ISO datetime; null = send immediately
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as SendBody | null
  if (!body || !body.issue_date || !body.subject?.trim()) {
    return NextResponse.json({ error: 'issue_date and subject are required' }, { status: 400 })
  }

  const webhookUrl = process.env.GHL_NEWSLETTER_WEBHOOK_URL
  if (!webhookUrl) {
    return NextResponse.json({
      error: 'GHL webhook is not configured. Set GHL_NEWSLETTER_WEBHOOK_URL in .env.local.',
    }, { status: 500 })
  }

  const supabase = supabaseAdmin()

  // 1. Pull this issue's picks + the events they point at
  const { data: picksData } = await supabase
    .from('newsletter_picks')
    .select('event_id, display_order, custom_blurb, custom_headline')
    .eq('issue_date', body.issue_date)
    .eq('market', 'rrp')
    .order('display_order', { ascending: true })

  const picks = (picksData ?? []) as PickRow[]
  if (picks.length === 0) {
    return NextResponse.json({ error: 'No picks selected for this issue date.' }, { status: 400 })
  }

  const eventIds = picks.map(p => p.event_id)
  const { data: eventsData } = await supabase
    .from('calendar_events')
    .select('id, slug, title, start_date, start_time, end_time, location_name, city, description, hero_image_url, registration_url, is_free, cost_text, category')
    .in('id', eventIds)
  const eventsById = new Map(((eventsData ?? []) as CalendarEventRow[]).map(e => [e.id, e]))

  const pickEvents: NewsletterPickEvent[] = picks
    .map(p => {
      const ev = eventsById.get(p.event_id)
      if (!ev) return null
      return {
        ...ev,
        custom_headline: p.custom_headline,
        custom_blurb:    p.custom_blurb,
      } as NewsletterPickEvent
    })
    .filter((x): x is NewsletterPickEvent => x !== null)

  if (pickEvents.length === 0) {
    return NextResponse.json({ error: 'Picks reference no valid events.' }, { status: 400 })
  }

  // 2. Render the email HTML
  const html = renderNewsletterHtml(pickEvents, { issue_date: body.issue_date })

  // 3. Insert a pending audit row so we have a record even if the webhook fails
  const issueInsert = await supabase
    .from('newsletter_issues')
    .insert({
      issue_date:    body.issue_date,
      market:        'rrp',
      subject:       body.subject.trim(),
      list_tag:      body.list_tag?.trim() || null,
      scheduled_for: body.scheduled_for || null,
      status:        'pending',
      rendered_html: html,
      picks_count:   pickEvents.length,
    })
    .select('id')
    .single()

  const issueId = (issueInsert.data as { id?: string } | null)?.id

  // 4. POST to GHL workflow webhook
  const payload = {
    subject:       body.subject.trim(),
    html_body:     html,
    list_tag:      body.list_tag?.trim() || null,
    send_at:       body.scheduled_for || null,
    issue_date:    body.issue_date,
    picks_count:   pickEvents.length,
    source:        'keepsharing-platform',
  }

  let ghlStatus = 0
  let ghlBody:  unknown = null
  let ok = false
  try {
    const ctrl = AbortSignal.timeout(20_000)
    const res = await fetch(webhookUrl, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
      signal:  ctrl,
    })
    ghlStatus = res.status
    // GHL often returns a small JSON body; sometimes plain text
    const text = await res.text()
    try { ghlBody = JSON.parse(text) } catch { ghlBody = text }
    ok = res.ok
  } catch (e) {
    ghlBody = { error: e instanceof Error ? e.message : String(e) }
  }

  // 5. Update the audit row with the result
  const finalStatus = ok ? (body.scheduled_for ? 'queued' : 'sent') : 'failed'
  if (issueId) {
    await supabase.from('newsletter_issues').update({
      status:        finalStatus,
      ghl_response:  { status_code: ghlStatus, body: ghlBody },
      error_message: ok ? null : `GHL responded ${ghlStatus}`,
    }).eq('id', issueId)
  }

  revalidatePath('/admin/newsletter/pick-events')

  if (!ok) {
    return NextResponse.json({
      success: false,
      status:  finalStatus,
      message: `GHL webhook returned ${ghlStatus}`,
      ghl_response: ghlBody,
    }, { status: 502 })
  }

  return NextResponse.json({
    success: true,
    status:  finalStatus,
    issue_id: issueId,
    picks_count: pickEvents.length,
  })
}
