// POST /api/birthday/subscribe
// Body: { email, child_first_name?, party_date?, source, brand_slug? }
//
// Captures email signups from the planning timeline, freebies block,
// printables unlock, and newsletter widget. Idempotent on (brand,
// email, source).
//
// When the source maps to a configured lead magnet (today: source =
// 'timeline-checklist' → slug 'planner'), we also send the editor's
// configured email via Resend with the PDF link. Failure to send the
// email never blocks the subscribe — the row is saved either way and
// the editor can re-trigger from the subscribers list later.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

const ALLOWED_SOURCES = ['timeline-checklist', 'freebies', 'newsletter']

// Maps a subscribe source → the lead-magnet slug that should fire.
// Add more entries as new magnets ship; the route picks up new rows
// without code changes once the source is whitelisted here.
const SOURCE_TO_LEAD_MAGNET: Record<string, string> = {
  'timeline-checklist': 'planner',
}

function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)
}

function formatPartyDate(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso + 'T00:00:00')
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

function renderTemplate(tpl: string, vars: Record<string, string>): string {
  return tpl
    .replaceAll('{{first_name}}', vars.first_name || 'Mom')
    .replaceAll('{{file_url}}',   vars.file_url   || '')
    .replaceAll('{{party_date}}', vars.party_date || '')
}

function fromAddress(fromName: string | null | undefined): string {
  // Same Resend-verified sender used for submission notifications.
  const name = (fromName?.trim()) || 'River Region Parents'
  const env  = process.env.BIRTHDAY_FROM_EMAIL
  if (env) return env
  return `${name} <hello@riverregionparents.com>`
}

async function sendLeadMagnetEmail(args: {
  brandSlug:   string
  source:      string
  email:       string
  firstName:   string | null
  partyDate:   string | null
}): Promise<void> {
  const slug = SOURCE_TO_LEAD_MAGNET[args.source]
  if (!slug) return

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn('[birthday-subscribe] RESEND_API_KEY missing — skipping lead-magnet email.')
    return
  }

  const client = sb()
  const { data: magnet } = await client
    .from('birthday_lead_magnets')
    .select('title, file_url, email_subject, email_body, from_name, is_active')
    .eq('brand_slug', args.brandSlug)
    .eq('slug', slug)
    .maybeSingle()

  if (!magnet || !magnet.is_active) return
  if (!magnet.file_url || !magnet.email_subject || !magnet.email_body) {
    console.warn(`[birthday-subscribe] Lead magnet '${slug}' missing file_url/subject/body — skipping send.`)
    return
  }

  const html = renderTemplate(magnet.email_body, {
    first_name: args.firstName ?? '',
    file_url:   magnet.file_url,
    party_date: formatPartyDate(args.partyDate),
  })

  try {
    await new Resend(apiKey).emails.send({
      from:    fromAddress(magnet.from_name),
      to:      args.email,
      subject: magnet.email_subject,
      html,
    })
  } catch (e) {
    console.error('[birthday-subscribe] Resend send failed:', e)
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as {
    email?:             string
    child_first_name?:  string | null
    party_date?:        string | null
    source?:            string
    brand_slug?:        string
  }

  const email = (body.email ?? '').trim().toLowerCase()
  if (!email || !isValidEmail(email)) {
    return NextResponse.json({ error: 'Valid email required.' }, { status: 400 })
  }
  // Allow source = ALLOWED_SOURCES OR a printables:<id> identifier.
  const source = body.source ?? 'newsletter'
  if (!ALLOWED_SOURCES.includes(source) && !source.startsWith('printables:')) {
    return NextResponse.json({ error: 'Unknown source.' }, { status: 400 })
  }

  const brandSlug = body.brand_slug ?? 'rrp'
  const firstName = body.child_first_name?.trim() || null
  const partyDate = body.party_date || null

  const supabase = sb()
  const { error } = await supabase.from('birthday_planning_subscribers').upsert({
    brand_slug:       brandSlug,
    email,
    child_first_name: firstName,
    party_date:       partyDate,
    source,
    is_active:        true,
  }, { onConflict: 'brand_slug,email,source' })

  if (error) {
    console.error('[birthday-subscribe]', error)
    return NextResponse.json({ error: 'Could not save your signup. Try again.' }, { status: 500 })
  }

  // Fire-and-log the delivery email — never block the response on it.
  await sendLeadMagnetEmail({ brandSlug, source, email, firstName, partyDate })

  return NextResponse.json({ ok: true })
}
