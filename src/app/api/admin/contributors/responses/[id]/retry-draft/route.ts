// POST /api/admin/contributors/responses/[id]/retry-draft
//
// Re-runs AI drafting for a contributor response. Use when:
//   - status='draft_failed' (AI surfaced an error on first try)
//   - status='drafting' but stuck >5 minutes (Lambda likely died before
//     `after()` callback finished)
//
// Re-uses the same prompt and template as the original submit handler so
// the result is identical to a fresh submission.

import { NextRequest, NextResponse, after } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/admin/auth'
import { requireAal2 } from '@/lib/admin/mfa-gate'
import { recordAuditEvent } from '@/lib/admin/audit'
import { generateContributorDraft, type QAQuestion } from '@/lib/contributors/draft'

export const runtime     = 'nodejs'
export const maxDuration = 120

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const adminCtx = await requireAdmin()
  const gate = await requireAal2()
  if (!gate.ok) return gate.response

  const { id } = await ctx.params
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const db = createAdminClient()
  const { data } = await db
    .from('contributor_responses')
    .select(`
      id, status, responses, contributor_id,
      contributor_invites:invite_id (ask, brand_slug, target_column, questions, qa_templates:template_id (name, ai_drafting_brief)),
      contributors:contributor_id (name, bio, expertise_tags)
    `)
    .eq('id', id)
    .maybeSingle()
  const row = data as null | {
    id: string; status: string; responses: Record<string, string>; contributor_id: string;
    contributor_invites: { ask: string | null; brand_slug: string; target_column: string | null; questions: QAQuestion[]; qa_templates: { name: string; ai_drafting_brief: string | null } | { name: string; ai_drafting_brief: string | null }[] | null } | { ask: string | null; brand_slug: string; target_column: string | null; questions: QAQuestion[]; qa_templates: { name: string; ai_drafting_brief: string | null } | { name: string; ai_drafting_brief: string | null }[] | null }[] | null;
    contributors: { name: string; bio: string | null; expertise_tags: string[] } | { name: string; bio: string | null; expertise_tags: string[] }[] | null;
  }
  if (!row) return NextResponse.json({ error: 'response not found' }, { status: 404 })
  // Only allow retry when the response is stuck or failed. Don't re-fire on
  // a happy 'drafted' row — that would silently overwrite editor edits.
  if (!['drafting', 'draft_failed'].includes(row.status)) {
    return NextResponse.json({ error: `cannot retry: status=${row.status}` }, { status: 409 })
  }

  const invite = Array.isArray(row.contributor_invites) ? row.contributor_invites[0] : row.contributor_invites
  if (!invite) return NextResponse.json({ error: 'invite missing' }, { status: 500 })
  const template = Array.isArray(invite.qa_templates) ? invite.qa_templates[0] : invite.qa_templates
  const contributor = Array.isArray(row.contributors) ? row.contributors[0] : row.contributors

  // Mark in flight so the UI shows progress + repeated clicks no-op cleanly.
  await db.from('contributor_responses').update({ status: 'drafting' }).eq('id', id)

  after(async () => {
    try {
      const draft = await generateContributorDraft({
        brandSlug:        invite.brand_slug,
        templateName:     template?.name ?? 'general',
        targetColumn:     invite.target_column,
        contributorName:  contributor?.name ?? 'Contributor',
        contributorBio:   contributor?.bio   ?? null,
        expertiseTags:    contributor?.expertise_tags ?? [],
        ask:              invite.ask,
        questions:        invite.questions,
        responses:        row.responses,
        draftingBrief:    template?.ai_drafting_brief ?? null,
      })
      await db.from('contributor_responses').update({
        ai_draft:              draft,
        ai_draft_generated_at: new Date().toISOString(),
        ai_draft_caller:       'contributor.qa.draft.retry',
        status:                'drafted',
      }).eq('id', id)
    } catch (e) {
      await db.from('contributor_responses').update({
        ai_draft:              { error: e instanceof Error ? e.message : String(e) },
        ai_draft_generated_at: new Date().toISOString(),
        ai_draft_caller:       'contributor.qa.draft.retry',
        status:                'draft_failed',
      }).eq('id', id)
      console.error('[contributors/retry-draft] draft generation failed', e)
    }
  })

  await recordAuditEvent({
    ctx: adminCtx, req,
    action:       'contributor.draft_retried',
    target_table: 'contributor_responses',
    target_id:    id,
  })
  return NextResponse.json({ ok: true })
}
