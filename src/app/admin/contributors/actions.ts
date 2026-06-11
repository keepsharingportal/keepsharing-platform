'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/admin/auth'
import { recordAuditEvent } from '@/lib/admin/audit'
import { mintContributorToken } from '@/lib/contributors/token'

interface CreateContributorInput {
  name:           string
  email:          string
  phone?:         string
  bio?:           string
  expertiseTags?: string[]
  brandSlugs?:    string[]
  notes?:         string
}

export async function createContributorAction(input: CreateContributorInput): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const ctx = await requireAdmin()
  const sr = createAdminClient()
  if (!input.name || !input.email) return { ok: false, error: 'Name + email required.' }

  const { data, error } = await sr.from('contributors').upsert({
    name:           input.name.trim(),
    email:          input.email.trim().toLowerCase(),
    phone:          input.phone?.trim() || null,
    bio:            input.bio?.trim()   || null,
    expertise_tags: input.expertiseTags ?? [],
    brand_slugs:    input.brandSlugs    ?? ['rrp'],
    notes:          input.notes?.trim() || null,
    created_by:     ctx.adminId,
  }, { onConflict: 'email' }).select('id').single()
  if (error) return { ok: false, error: error.message }

  const id = (data as { id: string }).id
  await recordAuditEvent({
    ctx, action: 'contributor.created', target_table: 'contributors', target_id: id,
    after: { name: input.name, email: input.email },
  })
  revalidatePath('/admin/contributors')
  return { ok: true, id }
}

interface SendInviteInput {
  contributorId:  string
  templateSlug?:  string
  ask?:           string
  brandSlug?:     string
  targetColumn?:  string
  expiresAtIso?:  string
}

export async function sendInviteAction(input: SendInviteInput): Promise<{ ok: true; token: string; url: string } | { ok: false; error: string }> {
  const ctx = await requireAdmin()
  const sr = createAdminClient()

  let templateId: string | null = null
  let questions: unknown[] = []
  if (input.templateSlug) {
    const { data } = await sr
      .from('qa_templates')
      .select('id, questions')
      .eq('slug', input.templateSlug)
      .maybeSingle()
    const tmpl = data as { id: string; questions: unknown[] } | null
    if (!tmpl) return { ok: false, error: `Template not found: ${input.templateSlug}` }
    templateId = tmpl.id
    questions  = Array.isArray(tmpl.questions) ? tmpl.questions : []
  }

  const token = mintContributorToken()
  const { error } = await sr.from('contributor_invites').insert({
    contributor_id: input.contributorId,
    template_id:    templateId,
    token,
    ask:            input.ask?.trim() || null,
    brand_slug:     input.brandSlug ?? 'rrp',
    target_column:  input.targetColumn?.trim() || null,
    questions,
    expires_at:     input.expiresAtIso ?? null,
    status:         'pending',
    sent_by:        ctx.adminId,
  })
  if (error) return { ok: false, error: error.message }

  // Increment invites_sent atomically via RPC (migration 154).
  await sr.rpc('bump_contributor_invite_sent', { contributor_id_in: input.contributorId })
    .then(() => undefined, e => console.warn('[contributors] bump_invite_sent failed', e))

  await recordAuditEvent({
    ctx, action: 'contributor.invite_sent', target_table: 'contributor_invites', target_id: token,
    after: { contributor_id: input.contributorId, template_slug: input.templateSlug },
  })

  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://riverregionparents.com'
  const url = `${base}/contribute/${token}`

  revalidatePath('/admin/contributors')
  return { ok: true, token, url }
}

export async function revokeInviteAction(inviteId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const ctx = await requireAdmin()
  const sr = createAdminClient()
  const { error } = await sr.from('contributor_invites').update({ status: 'revoked' }).eq('id', inviteId)
  if (error) return { ok: false, error: error.message }
  await recordAuditEvent({ ctx, action: 'contributor.invite_revoked', target_table: 'contributor_invites', target_id: inviteId })
  revalidatePath('/admin/contributors')
  return { ok: true }
}

interface PublishDraftInput {
  responseId:  string
  headline:    string
  deck:        string
  body:        string
  brandSlug:   string
  targetColumn?: string | null
  tags?:       string[]
  pullQuote?:  string
}

export async function publishDraftAction(input: PublishDraftInput): Promise<{ ok: true; articleId: string } | { ok: false; error: string }> {
  const ctx = await requireAdmin()
  const sr = createAdminClient()

  // Fetch the contributor for byline.
  const { data: respData } = await sr
    .from('contributor_responses')
    .select('contributor_id, contributors:contributor_id (name)')
    .eq('id', input.responseId)
    .maybeSingle()
  const resp = respData as null | {
    contributor_id: string;
    contributors: { name: string } | { name: string }[] | null;
  }
  if (!resp) return { ok: false, error: 'Response not found.' }
  const contributor = Array.isArray(resp.contributors) ? resp.contributors[0] : resp.contributors

  const slug = input.headline.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80)

  // Insert into guide_articles as a pending draft.
  // Map the AI-generated structure onto real columns:
  //   pullQuote → pull_quotes (JSONB array)
  //   tags      → topics      (text[])
  // editorial_notes carries provenance, not the suggested data.
  const insert: Record<string, unknown> = {
    title:           input.headline,
    subtitle:        input.deck,
    body:            input.body,
    slug,
    section:         input.targetColumn ?? null,
    status:          'pending',
    author_name:     contributor?.name ?? null,
    editorial_notes: `Drafted from contributor Q&A (response ${input.responseId}).`,
  }
  if (input.pullQuote) insert.pull_quotes = [input.pullQuote]
  if (input.tags && input.tags.length > 0) insert.topics = input.tags
  const { data: artData, error: artErr } = await sr.from('guide_articles').insert(insert).select('id').single()
  if (artErr) return { ok: false, error: artErr.message }
  const articleId = (artData as { id: string }).id

  await sr.from('contributor_responses').update({
    status:               'published',
    published_article_id: articleId,
    reviewed_at:          new Date().toISOString(),
    reviewed_by:          ctx.adminId,
  }).eq('id', input.responseId)

  await recordAuditEvent({
    ctx, action: 'contributor.response_published', target_table: 'guide_articles', target_id: articleId,
    after: { response_id: input.responseId, headline: input.headline },
  })

  revalidatePath('/admin/contributors')
  revalidatePath(`/admin/articles/${articleId}/edit`)
  return { ok: true, articleId }
}

export async function rejectResponseAction(responseId: string, reason: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const ctx = await requireAdmin()
  const sr = createAdminClient()
  const { error } = await sr.from('contributor_responses').update({
    status:           'rejected',
    rejected_reason:  reason,
    reviewed_at:      new Date().toISOString(),
    reviewed_by:      ctx.adminId,
  }).eq('id', responseId)
  if (error) return { ok: false, error: error.message }
  await recordAuditEvent({ ctx, action: 'contributor.response_rejected', target_table: 'contributor_responses', target_id: responseId, after: { reason } })
  revalidatePath('/admin/contributors')
  return { ok: true }
}
