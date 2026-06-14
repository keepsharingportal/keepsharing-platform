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
  needs_outreach:      boolean
  article_format:      string
  label:               string | null
}

export async function POST(req: NextRequest, ctx: RouteCtx) {
  const adminCtx = await requireAdmin()
  const { id }   = await ctx.params
  const body     = await req.json().catch(() => null) as { action?: 'outreach' | 'send-interview' } | null
  if (!body?.action) return NextResponse.json({ error: 'action required' }, { status: 400 })

  const sb = createAdminClient()

  // Load the submission + per-type config in one round trip.
  const [{ data: subRow, error: subErr }, { data: cfgRow }] = await Promise.all([
    sb.from('community_submissions')
      .select('id, submission_type, target_publication, nominee_email, nominee_name, submitter_name, submitter_email, related_person_name, related_business_name, related_school_name, excerpt, working_title, phase, interview_token')
      .eq('id', id)
      .maybeSingle(),
    sb.from('submission_type_columns')
      .select('needs_outreach, article_format, label')
      .eq('submission_type', (await peekType(sb, id)))
      .maybeSingle(),
  ])
  if (subErr || !subRow) return NextResponse.json({ error: 'submission not found' }, { status: 404 })
  const sub = subRow as unknown as Sub
  const cfg = (cfgRow as TypeConfig | null) ?? { needs_outreach: true, article_format: 'profile', label: null }

  // Resolve nominee email — required for outreach. Falls back to the
  // submitter if no nominee email was captured (some types have
  // nominator = nominee, e.g. mom-to-mom self-nominate).
  const nomineeEmail = sub.nominee_email?.trim() || sub.submitter_email?.trim() || null
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
    const subject = `You were nominated for ${typeLabel} in ${brandName}!`
    const bodyHtml = `
<p>Hi ${escapeHtml(nomineeName)},</p>
<p><strong>${escapeHtml(sub.submitter_name ?? 'A community member')}</strong> nominated you to be featured in an upcoming
<strong>${escapeHtml(typeLabel)}</strong> piece in ${escapeHtml(brandName)}.</p>
${sub.excerpt ? `<blockquote style="border-left:3px solid #1A5FA8;padding:8px 14px;color:#475569;font-style:italic;margin:14px 0;">${escapeHtml(sub.excerpt)}</blockquote>` : ''}
<p>If you'd like to be featured, just reply to this email and we'll send you a short interview form to fill out — no more than 10 minutes of your time. You'll get to share your story in your own words and upload a couple of photos.</p>
<p>If now's not a good time, no worries at all — just reply with a "not right now" and we'll close it out.</p>
<p>Thanks for considering!<br>The ${escapeHtml(brandName)} team${opsSig ? `<br><a href="mailto:${escapeHtml(opsSig)}">${escapeHtml(opsSig)}</a>` : ''}</p>`

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

    const subject = `Your ${typeLabel} interview — ${brandName}`
    const bodyHtml = `
<p>Hi ${escapeHtml(nomineeName)},</p>
<p>Thanks for saying yes! Here's the interview form for your <strong>${escapeHtml(typeLabel)}</strong> feature in ${escapeHtml(brandName)}:</p>
<p style="margin:24px 0;text-align:center;">
  <a href="${interviewUrl}" style="display:inline-block;background:#1A5FA8;color:#fff;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:700;">Open your interview form →</a>
</p>
<p style="font-size:12px;color:#64748b;">Or paste this link: <a href="${interviewUrl}">${interviewUrl}</a></p>
<p>The form takes about 10 minutes. You'll answer a handful of questions in your own words and upload 1-3 photos. Once you submit, our editorial team takes it from there.</p>
<p>Questions? Just reply to this email.</p>
<p>Thanks again!<br>The ${escapeHtml(brandName)} team</p>`

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
