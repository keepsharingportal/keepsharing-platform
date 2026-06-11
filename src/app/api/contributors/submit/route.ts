// Contributor magic-link form submit. Token is auth; no login required.
//
// Flow:
//   1. Validate token + status + expiry
//   2. Mark invite completed
//   3. Insert contributor_responses
//   4. Fire AI drafting in the background; stamp the response with the
//      generated draft when done. We deliberately do NOT block the
//      submitter on the AI call — the form returns immediately.

import { NextRequest, NextResponse, after } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateContributorDraft, type QAQuestion } from '@/lib/contributors/draft'

export const runtime     = 'nodejs'
// Bumped from 30s to 120s so the AI drafting work scheduled via after()
// has room to finish even on long-form generations (Sonnet 4.6 with
// adaptive thinking can take 60-90s for a thorough draft). Below the
// 30s ceiling, the Lambda would die mid-draft and the contributor
// response would stay stuck at status='drafting' forever.
export const maxDuration = 120

function adminDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  )
}

export async function POST(req: NextRequest) {
  let body: { token?: string; responses?: Record<string, string> }
  try { body = await req.json() } catch { return NextResponse.json({ ok: false, error: 'Bad JSON' }, { status: 400 }) }
  const { token, responses } = body
  if (!token || typeof token !== 'string') return NextResponse.json({ ok: false, error: 'Missing token' }, { status: 400 })
  if (!responses || typeof responses !== 'object') return NextResponse.json({ ok: false, error: 'Missing responses' }, { status: 400 })

  const db = adminDb()

  const { data: inviteData } = await db
    .from('contributor_invites')
    .select(`
      id, ask, brand_slug, target_column, questions, status, expires_at,
      contributor_id,
      qa_templates:template_id (name, ai_drafting_brief),
      contributors:contributor_id (name, bio, expertise_tags)
    `)
    .eq('token', token)
    .maybeSingle()
  const invite = inviteData as null | {
    id: string; ask: string | null; brand_slug: string; target_column: string | null;
    questions: QAQuestion[]; status: string; expires_at: string | null;
    contributor_id: string;
    qa_templates: { name: string; ai_drafting_brief: string | null } | { name: string; ai_drafting_brief: string | null }[] | null;
    contributors: { name: string; bio: string | null; expertise_tags: string[] } | { name: string; bio: string | null; expertise_tags: string[] }[] | null;
  }
  if (!invite) return NextResponse.json({ ok: false, error: 'Invalid token' }, { status: 404 })
  if (invite.status !== 'pending') return NextResponse.json({ ok: false, error: 'Link no longer active' }, { status: 410 })
  if (invite.expires_at && new Date(invite.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ ok: false, error: 'Link expired' }, { status: 410 })
  }

  const contributor = Array.isArray(invite.contributors) ? invite.contributors[0] : invite.contributors
  const template    = Array.isArray(invite.qa_templates) ? invite.qa_templates[0] : invite.qa_templates

  // 1. Mark invite completed.
  await db.from('contributor_invites').update({
    status:       'completed',
    completed_at: new Date().toISOString(),
  }).eq('id', invite.id)

  // 2. Insert response row. Status flips through:
  //      drafting          → AI call in flight (set synchronously below)
  //      drafted           → AI call succeeded, ready for editorial review
  //      awaiting_review   → AI not configured / draft skipped
  //      draft_failed      → AI call surfaced an error; admin can retry
  const { data: respRow } = await db
    .from('contributor_responses')
    .insert({
      invite_id:      invite.id,
      contributor_id: invite.contributor_id,
      responses,
      status:         'drafting',
    })
    .select('id')
    .single()
  const responseId = (respRow as { id: string } | null)?.id

  // 3. Bump contributor stats.
  if (contributor) {
    await db.rpc('bump_contributor_completed', { contributor_id_in: invite.contributor_id }).then(
      () => undefined,
      // RPC may not exist; fall back to a direct update.
      async () => {
        await db.from('contributors').update({
          invites_completed:   1,
          last_contributed_at: new Date().toISOString(),
        }).eq('id', invite.contributor_id)
      },
    )
  }

  // 4. Schedule AI drafting via Next.js `after()`. Unlike a bare `void
  //    async`, after() keeps the Lambda alive until the callback finishes
  //    (up to the route's maxDuration). The previous void-async pattern
  //    could die when the response was sent, leaving the response stuck at
  //    status='drafting' forever with no error and no admin observability.
  //    The response below tells the contributor "we got it" before the AI
  //    call runs, so UX is unchanged.
  if (responseId) {
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
          responses,
          draftingBrief:    template?.ai_drafting_brief ?? null,
        })
        await db.from('contributor_responses').update({
          ai_draft:              draft,
          ai_draft_generated_at: new Date().toISOString(),
          ai_draft_caller:       'contributor.qa.draft',
          status:                'drafted',
        }).eq('id', responseId)
      } catch (e) {
        // Set status='draft_failed' so the admin queue surfaces this for
        // retry instead of letting it sit in 'drafting' forever.
        await db.from('contributor_responses').update({
          ai_draft:              { error: e instanceof Error ? e.message : String(e) },
          ai_draft_generated_at: new Date().toISOString(),
          ai_draft_caller:       'contributor.qa.draft',
          status:                'draft_failed',
        }).eq('id', responseId)
        console.error('[contributors/submit] draft generation failed', e)
      }
    })
  }

  return NextResponse.json({ ok: true })
}
