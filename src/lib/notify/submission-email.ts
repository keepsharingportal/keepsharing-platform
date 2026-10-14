// Editor notification email for new community submissions.
//
// Fires when someone hits Submit on /submit/[type]. Sends a brief
// "new nomination" email to the editor inbox (env-configurable) so the
// editor knows to check /admin/community without polling.
//
// Best-effort: any failure is caught + logged at the caller. The submission
// itself never blocks on email delivery.

import { Resend } from 'resend'
import { brandSender } from '@/lib/email/brand-sender'
import { SUBMISSION_TYPES } from '@/lib/submissions'
import { inboxForBrand, subjectTag } from '@/lib/email/brand-recipient'

interface NotifyArgs {
  /** Brand this submission came in on. Decides the From: name, the site
   *  links in the body, and which editor inbox hears about it. */
  marketSlug?:     string | null
  submissionType:  string
  submitterName:   string
  submitterEmail:  string
  /** Subject of the nomination — the person / business / school being nominated. */
  subjectLine:     string
  payload:         Record<string, string | null>
  photoCount:      number
}

function siteUrl(marketSlug?: string | null): string {
  // Brand's own origin so the "review it" link in the editor email lands on
  // the right site. Falls back to the configured default.
  const sender = brandSender(marketSlug)
  return sender.siteUrl || process.env.NEXT_PUBLIC_SITE_URL || 'https://riverregionparents.com'
}

function editorEmail(marketSlug?: string | null): Promise<string> {
  // The brand's OWN editorial desk. This was a single env var with a literal
  // River Region fallback, and one deployment serves six brands — so a
  // Greater Pensacola school bit was reviewed by River Region's editor, or by
  // whoever the one env var happened to name. The env var is still honoured
  // for brands with no inbox configured yet; see brand-recipient.ts for why
  // the fallback chain ends at the platform inbox here but renders nothing on
  // a public page.
  return inboxForBrand(marketSlug, 'editorial', process.env.SUBMISSIONS_EDITOR_EMAIL)
}

function fromAddress(marketSlug?: string | null): string {
  // Brand display name over the Resend-verified address — see
  // lib/email/brand-sender.ts for why those two halves move separately.
  return brandSender(marketSlug, process.env.SUBMISSIONS_FROM_EMAIL).from
}

export async function notifyEditorOfSubmission(args: NotifyArgs): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return  // env not set → silently skip

  const sender = brandSender(args.marketSlug, process.env.SUBMISSIONS_FROM_EMAIL)
  const config = SUBMISSION_TYPES.find(t => t.type === args.submissionType)
  const typeLabel = config?.label ?? args.submissionType

  // Filter out empty payload fields so the editor sees only what was
  // actually submitted. Order = submission-config order so labels line
  // up with the form the submitter filled out.
  const fieldRows = (config?.fields ?? [])
    .map(f => {
      const value = args.payload[f.id]
      if (!value) return null
      return { label: f.label, value }
    })
    .filter(Boolean) as Array<{ label: string; value: string }>

  const fieldsHtml = fieldRows.length === 0
    ? '<p style="color:#64748b;">(no field data captured)</p>'
    : fieldRows.map(r =>
        `<p style="margin:0 0 10px;"><strong style="color:#0f172a;">${escapeHtml(r.label)}:</strong><br><span style="color:#334155;">${escapeHtml(r.value).replace(/\n/g, '<br>')}</span></p>`
      ).join('')

  const adminLink = `${siteUrl(args.marketSlug)}/admin/community?type=${encodeURIComponent(args.submissionType)}`

  const html = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#0f172a;">
  <div style="background:#0f172a;padding:24px 28px;">
    <p style="color:#fb923c;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;margin:0 0 4px;">New nomination</p>
    <h1 style="color:#fff;font-family:Georgia,serif;font-size:22px;margin:0;">${escapeHtml(typeLabel)}</h1>
  </div>
  <div style="padding:24px 28px;">
    <p style="margin:0 0 16px;font-size:14px;">
      <strong>${escapeHtml(args.subjectLine)}</strong> was nominated by
      <strong>${escapeHtml(args.submitterName)}</strong>
      (<a href="mailto:${escapeHtml(args.submitterEmail)}" style="color:#fb923c;">${escapeHtml(args.submitterEmail)}</a>).
    </p>
    ${args.photoCount > 0
      ? `<p style="margin:0 0 16px;font-size:13px;color:#475569;">📷 ${args.photoCount} photo${args.photoCount === 1 ? '' : 's'} attached.</p>`
      : ''}
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0;">
    ${fieldsHtml}
    <p style="margin:24px 0 8px;">
      <a href="${adminLink}" style="display:inline-block;background:#fb923c;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:700;font-size:14px;">
        Open in Admin
      </a>
    </p>
  </div>
  <div style="background:#f8fafc;padding:14px 28px;border-top:1px solid #e2e8f0;font-size:11px;color:#64748b;">
    Sent automatically when a nomination is submitted at ${siteUrl(args.marketSlug)}/submit/${escapeHtml(args.submissionType)}.
  </div>
</div>`

  const subject = `${subjectTag(args.marketSlug)}New ${typeLabel} nomination: ${args.subjectLine}`

  const resend = new Resend(apiKey)
  await resend.emails.send({
    from:    fromAddress(args.marketSlug),
    to:      [await editorEmail(args.marketSlug)],
    replyTo: args.submitterEmail || undefined,
    subject,
    html,
  })
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
