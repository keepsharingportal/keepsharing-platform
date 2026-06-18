// POST /api/birthday/subscribe
// Body: { email, child_first_name?, party_date?, source, brand_slug? }
//
// One endpoint, three side effects:
//   1. Row in birthday_planning_subscribers (idempotent on brand+email+source).
//   2. If source matches an active birthday_lead_magnets row, send the
//      editor-authored email via Resend (Planner PDF etc.).
//   3. Same match → upsert contact in GHL with the magnet's tags and
//      optional welcome workflow.
//
// Email + GHL failures are logged but never block the response — the
// subscriber row is saved either way.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { upsertContact, triggerWorkflow } from '@/lib/ghl'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

// Sources that are always accepted regardless of whether a lead magnet
// row exists for them — they predate the magnets system.
const LEGACY_SOURCES = ['timeline-checklist', 'freebies', 'newsletter']

interface LeadMagnetRow {
  slug:            string
  title:           string
  file_url:        string | null
  email_subject:   string
  email_body:      string
  from_name:       string | null
  ghl_tags:        string[] | null
  ghl_workflow_id: string | null
  is_active:       boolean
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
  const name = (fromName?.trim()) || 'River Region Parents'
  const env  = process.env.BIRTHDAY_FROM_EMAIL
  if (env) return env
  return `${name} <hello@riverregionparents.com>`
}

async function findLeadMagnet(brandSlug: string, source: string): Promise<LeadMagnetRow | null> {
  const client = sb()
  const { data } = await client
    .from('birthday_lead_magnets')
    .select('slug, title, file_url, email_subject, email_body, from_name, ghl_tags, ghl_workflow_id, is_active')
    .eq('brand_slug', brandSlug)
    .eq('source', source)
    .eq('is_active', true)
    .maybeSingle()
  return (data as LeadMagnetRow | null) ?? null
}

async function sendMagnetEmail(args: {
  magnet:    LeadMagnetRow
  email:     string
  firstName: string | null
  partyDate: string | null
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn('[birthday-subscribe] RESEND_API_KEY missing — skipping send.')
    return
  }
  const { magnet } = args
  if (!magnet.file_url || !magnet.email_subject || !magnet.email_body) {
    console.warn(`[birthday-subscribe] Magnet '${magnet.slug}' missing file_url/subject/body — skipping send.`)
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

async function syncToGhl(args: {
  magnet:    LeadMagnetRow
  brandSlug: string
  email:     string
  firstName: string | null
}): Promise<void> {
  const { magnet } = args
  const tags = (magnet.ghl_tags ?? []).filter(t => t && t.trim().length > 0)
  if (tags.length === 0 && !magnet.ghl_workflow_id) return
  try {
    const res = await upsertContact({
      publicationSlug: args.brandSlug,
      email:           args.email,
      firstName:       args.firstName ?? undefined,
      tags:            tags.length > 0 ? tags : undefined,
    })
    if (!res.success || !res.contactId) {
      console.warn(`[birthday-subscribe] GHL upsert failed for '${magnet.slug}': ${res.error ?? 'no contactId'}`)
      return
    }
    if (magnet.ghl_workflow_id) {
      await triggerWorkflow({
        publicationSlug: args.brandSlug,
        contactId:       res.contactId,
        workflowId:      magnet.ghl_workflow_id,
      }).catch(e => console.warn('[birthday-subscribe] GHL workflow trigger failed:', e))
    }
  } catch (e) {
    console.error('[birthday-subscribe] GHL sync error:', e)
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

  const source    = body.source ?? 'newsletter'
  const brandSlug = body.brand_slug ?? 'rrp'

  // Allow source if it's a legacy known source, the printables identifier,
  // OR if it matches a configured lead magnet for the brand.
  const magnet = await findLeadMagnet(brandSlug, source)
  const isAllowed =
    LEGACY_SOURCES.includes(source) ||
    source.startsWith('printables:') ||
    !!magnet
  if (!isAllowed) {
    return NextResponse.json({ error: 'Unknown source.' }, { status: 400 })
  }

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

  // Fire-and-log side effects. Wrapped sequentially because the volume
  // is tiny (one signup per request); switch to parallel if it ever matters.
  if (magnet) {
    await sendMagnetEmail({ magnet, email, firstName, partyDate })
    await syncToGhl({ magnet, brandSlug, email, firstName })
  }

  return NextResponse.json({ ok: true })
}
