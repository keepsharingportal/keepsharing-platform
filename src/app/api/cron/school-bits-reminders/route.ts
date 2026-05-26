// GET /api/cron/school-bits-reminders
//
// Vercel-cron-invoked (1st of each month at 9 AM Central — see vercel.json).
// Emails every school in the schools registry that has a contact_email,
// reminding them to submit news for the upcoming print issue.
//
// Each email includes a personalized submission link that prefills their
// school — so a principal doesn't have to find their school in the dropdown.
//
// Vercel automatically attaches a Bearer header equal to the CRON_SECRET env
// var; we verify it so the route can't be called externally.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const maxDuration = 60

const MARKET = 'rrp'

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  )
}

interface SchoolRow {
  id:            string
  name:          string
  area:          string
  contact_email: string
}

function nextMonthLabel(): string {
  const d = new Date()
  d.setUTCMonth(d.getUTCMonth() + 1)
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'America/Chicago' })
}

export async function GET(req: NextRequest) {
  // ── Cron auth: Vercel adds Authorization: Bearer ${CRON_SECRET}
  const cronSecret = process.env.CRON_SECRET
  const authHeader = req.headers.get('authorization') ?? ''
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const supabase = supabaseAdmin()

  // Probe — bail gracefully if migration 085 isn't applied
  const probe = await supabase.from('schools').select('id').limit(1)
  if (probe.error) {
    return NextResponse.json({ skipped: true, reason: 'schools table missing' }, { status: 200 })
  }

  const { data: schoolsData, error: schoolsErr } = await supabase
    .from('schools')
    .select('id, name, area, contact_email')
    .eq('market', MARKET)
    .eq('status', 'active')
    .not('contact_email', 'is', null)
    .neq('contact_email', '')
  if (schoolsErr) {
    return NextResponse.json({ error: schoolsErr.message }, { status: 500 })
  }
  const schools = (schoolsData ?? []) as SchoolRow[]

  if (schools.length === 0) {
    return NextResponse.json({
      success:    true,
      sent:       0,
      message:    'No schools with contact_email configured — nothing to send.',
    })
  }

  const webhookUrl = process.env.SCHOOL_BITS_REMINDER_WEBHOOK_URL
                  || process.env.GHL_NEWSLETTER_WEBHOOK_URL
  if (!webhookUrl) {
    return NextResponse.json({
      error: 'No reminder webhook configured. Set SCHOOL_BITS_REMINDER_WEBHOOK_URL (or GHL_NEWSLETTER_WEBHOOK_URL) in env.',
      schools_that_would_receive: schools.length,
    }, { status: 500 })
  }

  const siteUrl       = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://riverregionparents.com'
  const issueLabel    = nextMonthLabel()
  const sent: { school: string; email: string; ok: boolean; error?: string }[] = []

  // Fire one webhook call per school. GHL will route into an email template
  // keyed on the `template` field — operator wires that up on their side.
  // We send sequentially to be polite to the webhook; for 100+ schools this
  // is still under 30s. If it grows we can move to Promise.all with a small
  // concurrency limit.
  for (const s of schools) {
    const submitUrl = `${siteUrl}/school-bits/submit?school=${encodeURIComponent(s.id)}`
    const payload = {
      template:    'school-bits-monthly-reminder',
      event:       'school_bits.monthly_reminder',
      to:          s.contact_email,
      school_id:   s.id,
      school_name: s.name,
      issue_label: issueLabel,
      submit_url:  submitUrl,
      subject:     `Share your ${s.name} news for the ${issueLabel} issue`,
      message:     `Hi ${s.name},\n\nIt's time to send us your School Bits for the ${issueLabel} River Region Parents issue.\n\nClick here to submit (the form already knows you're at ${s.name}):\n${submitUrl}\n\nGreat content: award winners, Purple Star recognitions, science fair winners, band/sports championships, ribbon cuttings, teacher recognitions, community service projects. We can use either a quick paragraph + photo or a longer story.\n\nDeadline for the ${issueLabel} issue: mid-month before print.\n\nThanks!\n— River Region Parents`,
    }

    try {
      const res = await fetch(webhookUrl, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      })
      sent.push({
        school: s.name,
        email:  s.contact_email,
        ok:     res.ok,
        error:  res.ok ? undefined : `HTTP ${res.status}`,
      })
    } catch (e) {
      sent.push({
        school: s.name,
        email:  s.contact_email,
        ok:     false,
        error:  e instanceof Error ? e.message : String(e),
      })
    }
  }

  const okCount     = sent.filter(x => x.ok).length
  const failedCount = sent.length - okCount

  return NextResponse.json({
    success:      true,
    issue:        issueLabel,
    total:        sent.length,
    sent:         okCount,
    failed:       failedCount,
    failures:     sent.filter(x => !x.ok),
  })
}
