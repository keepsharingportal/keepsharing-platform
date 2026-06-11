'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/admin/auth'
import { recordAuditEvent } from '@/lib/admin/audit'
import {
  listManagedPages, createPagePost, createInstagramPost,
  fetchPostComments, fetchRecentPagePosts, replyToComment,
  metaSuiteErrorMessage,
} from '@/lib/integrations/meta-suite/client'
import { runAI } from '@/lib/ai/client'

/** Re-discovery pass: pull the user's managed pages from Meta and upsert
 *  rows into facebook_pages. The integration row's user-level access_token
 *  must have the page scopes granted (otherwise /me/accounts returns
 *  empty). Run after the user re-authorizes with the new scopes. */
export async function discoverPagesAction(): Promise<{ ok: true; count: number } | { ok: false; error: string }> {
  const ctx = await requireAdmin()
  const sr = createAdminClient()

  const { data: integ } = await sr
    .from('facebook_integrations')
    .select('id, access_token')
    .eq('market', 'rrp')
    .eq('is_active', true)
    .maybeSingle()
  const integration = integ as { id: string; access_token: string } | null
  if (!integration) return { ok: false, error: 'No active Facebook integration. Connect the Marketing token first.' }

  let pages: Awaited<ReturnType<typeof listManagedPages>>
  try {
    pages = await listManagedPages(integration.access_token)
  } catch (e) {
    return { ok: false, error: metaSuiteErrorMessage(e) }
  }
  if (pages.length === 0) {
    return { ok: false, error: 'No managed Pages returned. Re-authorize the Meta token with pages_show_list + pages_manage_posts + pages_read_engagement scopes.' }
  }
  const upserts = pages.map(p => ({
    integration_id:     integration.id,
    fb_page_id:         p.id,
    fb_page_name:       p.name,
    page_access_token:  p.access_token,
    ig_business_id:     p.instagram_business_account?.id ?? null,
    is_active:          true,
    connected_at:       new Date().toISOString(),
  }))
  const { error } = await sr.from('facebook_pages').upsert(upserts, { onConflict: 'integration_id,fb_page_id' })
  if (error) return { ok: false, error: error.message }

  await recordAuditEvent({
    ctx,
    action:       'meta_suite.pages_discovered',
    target_table: 'facebook_pages',
    after:        { count: pages.length, names: pages.map(p => p.name) },
  })
  revalidatePath('/admin/integrations/meta-suite')
  revalidatePath('/admin/integrations')
  return { ok: true, count: pages.length }
}

interface PostInput {
  pageId:           string                    // facebook_pages.id (UUID)
  message:          string
  link?:            string
  mediaUrl?:        string
  alsoToInstagram:  boolean
}

export async function postToPageAction(input: PostInput): Promise<{ ok: true; fbPostId: string; igMediaId?: string } | { ok: false; error: string }> {
  const ctx = await requireAdmin()
  const sr = createAdminClient()
  const { data } = await sr
    .from('facebook_pages')
    .select('fb_page_id, page_access_token, ig_business_id')
    .eq('id', input.pageId)
    .maybeSingle()
  const page = data as { fb_page_id: string; page_access_token: string; ig_business_id: string | null } | null
  if (!page) return { ok: false, error: 'Page not found.' }

  if (!input.message || input.message.length < 5) return { ok: false, error: 'Post message must be at least 5 characters.' }
  if (input.alsoToInstagram && !input.mediaUrl) return { ok: false, error: 'Instagram requires an image — paste a media URL.' }
  if (input.alsoToInstagram && !page.ig_business_id) return { ok: false, error: 'This Page has no linked Instagram business account.' }

  // Insert pending row first for the audit trail.
  const { data: pendingRow } = await sr
    .from('facebook_page_posts')
    .insert({
      page_id:            input.pageId,
      message:            input.message,
      link:               input.link ?? null,
      media_url:          input.mediaUrl ?? null,
      also_to_instagram:  input.alsoToInstagram,
      status:             'pending',
      created_by:         ctx.adminId,
    })
    .select('id')
    .single()
  const pendingId = (pendingRow as { id: string } | null)?.id ?? null

  try {
    const fbResult = await createPagePost(page.fb_page_id, page.page_access_token, {
      message:  input.message,
      link:     input.link,
      mediaUrl: input.mediaUrl,
    })
    let igMediaId: string | undefined
    if (input.alsoToInstagram && page.ig_business_id && input.mediaUrl) {
      const ig = await createInstagramPost(page.ig_business_id, page.page_access_token, {
        message:  input.message,
        mediaUrl: input.mediaUrl,
      })
      igMediaId = ig.id
    }
    if (pendingId) {
      await sr.from('facebook_page_posts').update({
        fb_post_id:    fbResult.id,
        ig_media_id:   igMediaId ?? null,
        status:        'live',
        published_at:  new Date().toISOString(),
      }).eq('id', pendingId)
    }

    await recordAuditEvent({
      ctx,
      action:       'meta_suite.post_created',
      target_table: 'facebook_page_posts',
      target_id:    pendingId,
      after:        { fb_post_id: fbResult.id, ig_media_id: igMediaId, message: input.message.slice(0, 200) },
    })
    revalidatePath('/admin/integrations/meta-suite')
    return { ok: true, fbPostId: fbResult.id, igMediaId }
  } catch (e) {
    const msg = metaSuiteErrorMessage(e)
    if (pendingId) {
      await sr.from('facebook_page_posts').update({ status: 'error', error: msg.slice(0, 1000) }).eq('id', pendingId)
    }
    return { ok: false, error: msg }
  }
}

/** Pull recent comments from each connected Page into the local inbox. */
export async function syncCommentsAction(): Promise<{ ok: true; commentCount: number } | { ok: false; error: string }> {
  await requireAdmin()
  const sr = createAdminClient()
  const { data: pages } = await sr
    .from('facebook_pages')
    .select('id, fb_page_id, page_access_token')
    .eq('is_active', true)
  const pageRows = (pages ?? []) as Array<{ id: string; fb_page_id: string; page_access_token: string }>
  if (pageRows.length === 0) return { ok: false, error: 'No connected Pages. Discover Pages first.' }

  let total = 0
  for (const p of pageRows) {
    try {
      const posts = await fetchRecentPagePosts(p.fb_page_id, p.page_access_token, 10)
      for (const post of posts) {
        if ((post.comments?.summary?.total_count ?? 0) === 0) continue
        const comments = await fetchPostComments(post.id, p.page_access_token, 25)
        const upserts = comments.map(c => ({
          page_id:               p.id,
          fb_post_id:            post.id,
          fb_comment_id:         c.id,
          author_name:           c.from?.name ?? null,
          author_id:             c.from?.id ?? null,
          message:               c.message,
          created_at_facebook:   c.created_time,
          fetched_at:            new Date().toISOString(),
        }))
        if (upserts.length > 0) {
          await sr.from('facebook_page_comments').upsert(upserts, { onConflict: 'fb_comment_id' })
          total += upserts.length
        }
      }
      await sr.from('facebook_pages').update({ last_sync_at: new Date().toISOString() }).eq('id', p.id)
    } catch (e) {
      console.warn('[meta-suite/sync]', p.fb_page_id, metaSuiteErrorMessage(e))
    }
  }
  revalidatePath('/admin/integrations/meta-suite')
  return { ok: true, commentCount: total }
}

interface ReplyInput {
  commentLocalId: string                       // facebook_page_comments.id
  message:        string
}

export async function replyToCommentAction(input: ReplyInput): Promise<{ ok: true } | { ok: false; error: string }> {
  const ctx = await requireAdmin()
  const sr = createAdminClient()
  const { data } = await sr
    .from('facebook_page_comments')
    .select('id, fb_comment_id, page_id, facebook_pages!inner(page_access_token)')
    .eq('id', input.commentLocalId)
    .maybeSingle()
  const row = data as null | { id: string; fb_comment_id: string; page_id: string; facebook_pages: { page_access_token: string } | { page_access_token: string }[] }
  if (!row) return { ok: false, error: 'Comment not found.' }
  const token = Array.isArray(row.facebook_pages) ? row.facebook_pages[0]?.page_access_token : row.facebook_pages?.page_access_token
  if (!token) return { ok: false, error: 'Page access token unavailable.' }

  try {
    await replyToComment(row.fb_comment_id, token, input.message)
  } catch (e) {
    return { ok: false, error: metaSuiteErrorMessage(e) }
  }
  await sr.from('facebook_page_comments').update({
    is_handled:  true,
    handled_by:  ctx.adminId,
    handled_at:  new Date().toISOString(),
  }).eq('id', row.id)

  await recordAuditEvent({
    ctx,
    action:       'meta_suite.comment_replied',
    target_table: 'facebook_page_comments',
    target_id:    row.id,
    after:        { reply: input.message.slice(0, 200) },
  })
  revalidatePath('/admin/integrations/meta-suite')
  return { ok: true }
}

export async function dismissCommentAction(commentLocalId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const ctx = await requireAdmin()
  const sr = createAdminClient()
  const { error } = await sr.from('facebook_page_comments').update({
    is_handled:  true,
    handled_by:  ctx.adminId,
    handled_at:  new Date().toISOString(),
  }).eq('id', commentLocalId)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/admin/integrations/meta-suite')
  return { ok: true }
}

/** Generate a caption suggestion via the AI integration. Uses the
 *  'caption' task kind so the right default model applies. */
export async function generateCaptionAction(prompt: string): Promise<{ ok: true; caption: string } | { ok: false; error: string }> {
  const ctx = await requireAdmin()
  if (!prompt || prompt.length < 10) return { ok: false, error: 'Give a hint of at least 10 characters (topic, article title, etc.).' }
  try {
    const out = await runAI({
      taskKind: 'caption',
      caller:   'meta-suite.caption',
      systemPrompt: 'You write Facebook + Instagram captions for a regional family publication called River Region Parents (Montgomery, Alabama area). Warm, modern-parenting voice — no clichés, no jargon. Hook in the first line. 1-3 short paragraphs max. Light emoji use only when it fits.',
      messages: [{ role: 'user', content: prompt }],
      maxTokens: 350,
      adminId:  ctx.adminId,
    })
    return { ok: true, caption: out.text.trim() }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}
