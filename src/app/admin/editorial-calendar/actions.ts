'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/admin/auth'
import { recordAuditEvent } from '@/lib/admin/audit'
import { runEditorialCalendar } from '@/lib/editorial-calendar/suggest'

export async function generateCalendarAction(brandSlug: string): Promise<{ ok: true; count: number } | { ok: false; error: string }> {
  const ctx = await requireAdmin()
  const result = await runEditorialCalendar(brandSlug, `manual:${ctx.adminId}`)
  revalidatePath('/admin/editorial-calendar')
  if (result.status === 'error') return { ok: false, error: result.error ?? 'unknown error' }
  return { ok: true, count: result.suggestionCount }
}

interface AcceptInput {
  suggestionId:  string
  headline:      string
  body?:         string
}

export async function acceptSuggestionAction(input: AcceptInput): Promise<{ ok: true; articleId: string } | { ok: false; error: string }> {
  const ctx = await requireAdmin()
  const sr = createAdminClient()
  const { data: sData } = await sr
    .from('editorial_calendar_suggestions')
    .select('brand_slug, target_column, working_headline, rationale')
    .eq('id', input.suggestionId)
    .maybeSingle()
  const sug = sData as null | { brand_slug: string; target_column: string | null; working_headline: string; rationale: string }
  if (!sug) return { ok: false, error: 'Suggestion not found.' }

  const slug = input.headline.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80)

  const { data: artData, error: artErr } = await sr.from('guide_articles').insert({
    title:           input.headline,
    body:            input.body ?? '',
    slug,
    section:         sug.target_column ?? null,
    status:          'draft',
    editorial_notes: `From editorial calendar suggestion. Rationale: ${sug.rationale}`,
  }).select('id').single()
  if (artErr) return { ok: false, error: artErr.message }
  const articleId = (artData as { id: string }).id

  await sr.from('editorial_calendar_suggestions').update({
    status:           'accepted',
    acted_article_id: articleId,
    reviewed_at:      new Date().toISOString(),
    reviewed_by:      ctx.adminId,
  }).eq('id', input.suggestionId)

  await recordAuditEvent({
    ctx, action: 'editorial_calendar.accepted', target_table: 'editorial_calendar_suggestions',
    target_id: input.suggestionId, after: { article_id: articleId },
  })
  revalidatePath('/admin/editorial-calendar')
  return { ok: true, articleId }
}

export async function dismissSuggestionAction(suggestionId: string, reason: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const ctx = await requireAdmin()
  if (!reason.trim()) return { ok: false, error: 'Reason required so we don\'t resuggest this.' }
  const sr = createAdminClient()
  const { error } = await sr.from('editorial_calendar_suggestions').update({
    status:           'dismissed',
    dismissed_reason: reason.trim(),
    reviewed_at:      new Date().toISOString(),
    reviewed_by:      ctx.adminId,
  }).eq('id', suggestionId)
  if (error) return { ok: false, error: error.message }
  await recordAuditEvent({
    ctx, action: 'editorial_calendar.dismissed', target_table: 'editorial_calendar_suggestions',
    target_id: suggestionId, after: { reason },
  })
  revalidatePath('/admin/editorial-calendar')
  return { ok: true }
}
