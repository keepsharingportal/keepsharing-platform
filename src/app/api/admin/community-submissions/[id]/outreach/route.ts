// POST /api/admin/community-submissions/[id]/outreach
//
// Sends the outreach email to the nominee + advances phase to
// 'outreach-sent' atomically. The email contains:
//   - Why they were nominated (the nominator's submission excerpt)
//   - A one-tap accept/decline link OR
//   - The interview form link (if action='send-interview')
//
// Body:
//   - action: 'outreach' (initial "we want to feature you")
//       → sends "you were nominated" email, includes a Yes/No link
//       → advances phase to 'outreach-sent'
//   - action: 'send-interview' (after they accepted)
//       → generates interview_token + sends the form link
//       → advances phase to 'interview-sent'
//
// Email goes through the existing circulation_email_queue infra so
// the email worker handles actual delivery.

import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { enqueue } from '@/lib/circulation/emailQueue'
import { loadBrand } from '@/lib/brands'

export const runtime     = 'nodejs'
export const dynamic     = 'force-dynamic'
export const maxDuration = 30

interface RouteCtx { params: Promise<{ id: string }> }

interface Sub {
  id:                   string
  submission_type:      string
  target_publication:   string
  nominee_email:        string | null
  nominee_name:         string | null
  submitter_name:       string | null
  submitter_email:      string | null
  related_person_name:  string | null
  related_business_name: string | null
  related_school_name:  string | null
  excerpt:              string | null
  working_title:        string | null
  phase:                string | null
  interview_token:      string | null
}

interface TypeConfig {
  needs_outreach:           boolean
  article_format:           string
  label:                    string | null
  outreach_email_subject:   string | null
  outreach_email_body:      string | null
  interview_email_subject:  string | null
  interview_email_body:     string | null
}

export async function POST(req: NextRequest, ctx: RouteCtx) {
  const adminCtx = await requireAdmin()
  const { id }   = await ctx.params
  const body     = await req.json().catch(() => null) as {
    action?: 'outreach' | 'send-interview'
    // Editor-supplied overrides from the composer panel. Fall back to
    // the per-type template from submission_type_columns when omitted.
    nominee_email?: string
    subject?:       string
    body_html?:     string
  } | null
  if (!body?.action) return NextResponse.json({ error: 'action required' }, { status: 400 })

  const sb = createAdminClient()

  // Load the submission + per-type config in one round trip.
  const [{ data: subRow, error: subErr }, { data: cfgRow }] = await Promise.all([
    sb.from('community_submissions')
      .select('id, submission_type, target_publication, nominee_email, nominee_name, submitter_name, submitter_email, related_person_name, related_business_name, related_school_name, excerpt, working_title, phase, interview_token')
      .eq('id', id)
      .maybeSingle(),
    sb.from('submission_type_columns')
      .select('needs_outreach, article_format, label, outreach_email_subject, outreach_email_body, interview_email_subject, interview_email_body')
      .eq('submission_type', (await peekType(sb, id)))
      .maybeSingle(),
  ])
  if (subErr || !subRow) return NextResponse.json({ error: 'submission not found' }, { status: 404 })
  const sub = subRow as unknown as Sub
  const cfg = (cfgRow as TypeConfig | null) ?? {
    needs_outreach: true, article_format: 'profile', label: null,
    outreach_email_subject: null, outreach_email_body: null,
    interview_email_subject: null, interview_email_body: null,
  }

  // Resolve nominee email — required for outreach. Falls back to the
  // submitter if no nominee email was captured (some types have
  // nominator = nominee, e.g. mom-to-mom self-nominate). Editor's
  // edits from the composer panel take precedence so they can fix
  // a typo without leaving the page.
  const nomineeEmail = body.nominee_email?.trim()
                    || sub.nominee_email?.trim()
                    || sub.submitter_email?.trim()
                    || null
  const nomineeName  = sub.nominee_name?.trim()
                    || sub.related_person_name?.trim()
                    || sub.related_business_name?.trim()
                    || sub.related_school_name?.trim()
                    || sub.submitter_name?.trim()
                    || 'there'
  if (!nomineeEmail) {
    return NextResponse.json({
      error: 'No nominee email on file. Edit the submission and add one before sending outreach.',
    }, { status: 400 })
  }

  const brand     = await loadBrand(sub.target_publication ?? 'rrp')
  const brandName = brand?.displayName ?? 'River Region Parents'
  const baseUrl   = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://riverregionparents.com'
  const opsSig    = process.env.NEXT_PUBLIC_OPS_EMAIL ?? ''
  const typeLabel = (cfg.label ?? sub.submission_type.replace(/-/g, ' ')) as string

  // ── Action A: Initial outreach ──────────────────────────────────────────
  if (body.action === 'outreach') {
    // Editor's edited content wins. If they didn't override, fall back
    // to the per-type template from submission_type_columns (substituted
    // with the live nomination data). If THAT'S also missing, fall back
    // to the legacy hardcoded copy (kept as a last-ditch default so the
    // workflow doesn't break on a market that hasn't seeded templates).
    const subject = body.subject?.trim()
      || substituteTemplate(cfg.outreach_email_subject, { typeLabel, brandName, nomineeName, nominator: sub.submitter_name, pitch: sub.excerpt, opsEmail: opsSig })
      || `You were nominated for ${typeLabel} in ${brandName}!`
    const bodyHtml = body.body_html?.trim()
      || substituteTemplate(cfg.outreach_email_body, { typeLabel, brandName, nomineeName, nominator: sub.submitter_name, pitch: sub.excerpt, opsEmail: opsSig })
      || `
<p>Hi ${escapeHtml(nomineeName)},</p>
<p><strong>${escapeHtml(sub.submitter_name ?? 'A community member')}</strong> nominated you to be featured in an upcoming <strong>${escapeHtml(typeLabel)}</strong> piece in ${escapeHtml(brandName)}.</p>
${sub.excerpt ? `<blockquote style="border-left:3px solid #1A5FA8;padding:8px 14px;color:#475569;font-style:italic;margin:14px 0;">${escapeHtml(sub.excerpt)}</blockquote>` : ''}
<p>If you'd like to be featured, just reply to this email and we'll send you a short interview form to fill out.</p>
<p>Thanks!<br>The ${escapeHtml(brandName)} team</p>`

    await enqueue({
      market:            sub.target_publication ?? 'rrp',
      template_key:      'nominee_outreach',
      to_email:          nomineeEmail,
      to_name:           nomineeName,
      subject,
      body_html:         bodyHtml,
      reply_to:          opsSig || null,
      related_stop_id:   null,
    })

    await sb.from('community_submissions').update({
      phase:               'outreach-sent',
      outreach_sent_at:    new Date().toISOString(),
      outreach_sent_by:    adminCtx.userId,
      outreach_message:    bodyHtml,
      nominee_email:       nomineeEmail,
      nominee_name:        nomineeName !== 'there' ? nomineeName : null,
    }).eq('id', id)

    return NextResponse.json({ ok: true, phase: 'outreach-sent', sent_to: nomineeEmail })
  }

  // ── Action B: Send interview form ───────────────────────────────────────
  if (body.action === 'send-interview') {
    if (!cfg.needs_outreach || cfg.article_format === 'news-brief' || cfg.article_format === 'photo-caption' || cfg.article_format === 'roundup') {
      return NextResponse.json({
        error: `This submission type (${sub.submission_type}) doesn't use the nominee interview form.`,
      }, { status: 400 })
    }

    const token = sub.interview_token ?? randomBytes(24).toString('base64url')
    const interviewUrl = `${baseUrl}/interview/${token}`

    const subject = body.subject?.trim()
      || substituteTemplate(cfg.interview_email_subject, { typeLabel, brandName, nomineeName, nominator: sub.submitter_name, pitch: sub.excerpt, opsEmail: opsSig, interviewUrl })
      || `Your ${typeLabel} interview — ${brandName}`
    const bodyHtml = body.body_html?.trim()
      || substituteTemplate(cfg.interview_email_body, { typeLabel, brandName, nomineeName, nominator: sub.submitter_name, pitch: sub.excerpt, opsEmail: opsSig, interviewUrl })
      || `
<p>Hi ${escapeHtml(nomineeName)},</p>
<p>Thanks for saying yes! Here's the interview form for your <strong>${escapeHtml(typeLabel)}</strong> feature in ${escapeHtml(brandName)}:</p>
<p style="margin:24px 0;text-align:center;">
  <a href="${interviewUrl}" style="display:inline-block;background:#1A5FA8;color:#fff;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:700;">Open your interview form →</a>
</p>
<p>Questions? Just reply.</p>
<p>— The ${escapeHtml(brandName)} team</p>`

    await enqueue({
      market:            sub.target_publication ?? 'rrp',
      template_key:      'nominee_interview_invite',
      to_email:          nomineeEmail,
      to_name:           nomineeName,
      subject,
      body_html:         bodyHtml,
      reply_to:          opsSig || null,
      related_stop_id:   null,
    })

    await sb.from('community_submissions').update({
      phase:              'interview-sent',
      interview_token:    token,
      interview_sent_at:  new Date().toISOString(),
    }).eq('id', id)

    return NextResponse.json({ ok: true, phase: 'interview-sent', interview_url: interviewUrl, sent_to: nomineeEmail })
  }

  return NextResponse.json({ error: 'unknown action' }, { status: 400 })
}

// Peek the submission's type so the parallel typeConfig fetch can run.
async function peekType(sb: ReturnType<typeof createAdminClient>, id: string): Promise<string> {
  const { data } = await sb
    .from('community_submissions')
    .select('submission_type')
    .eq('id', id)
    .maybeSingle()
  return (data?.submission_type as string) ?? ''
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

/** Substitute {{variables}} in a per-type template against the live
 *  submission's data. Returns null if the template is null so the
 *  caller can fall through to the legacy hardcoded copy. */
function substituteTemplate(
  template: string | null | undefined,
  ctx: {
    typeLabel:   string
    brandName:   string
    nomineeName: string
    nominator:   string | null
    pitch:       string | null
    opsEmail:    string
    interviewUrl?: string
  },
): string | null {
  if (!template) return null
  const nomineeFirst = ctx.nomineeName.split(' ')[0] || 'there'
  return template
    .replace(/\{\{\s*nominee_first\s*\}\}/g,    escapeHtml(nomineeFirst))
    .replace(/\{\{\s*nominee_name\s*\}\}/g,     escapeHtml(ctx.nomineeName))
    .replace(/\{\{\s*nominator_name\s*\}\}/g,   escapeHtml(ctx.nominator ?? 'A community member'))
    .replace(/\{\{\s*nomination_pitch\s*\}\}/g, escapeHtml(ctx.pitch ?? ''))
    .replace(/\{\{\s*brand_name\s*\}\}/g,       escapeHtml(ctx.brandName))
    .replace(/\{\{\s*type_label\s*\}\}/g,       escapeHtml(ctx.typeLabel))
    .replace(/\{\{\s*ops_email\s*\}\}/g,        escapeHtml(ctx.opsEmail))
    .replace(/\{\{\s*interview_url\s*\}\}/g,    ctx.interviewUrl ?? '')
}
