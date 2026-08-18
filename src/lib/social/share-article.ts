// Share a prepared article to the connected Facebook + Instagram accounts via
// GHL Social Planner.
//
// One function behind every route that shares an article, so the copy that goes
// out is the same no matter who triggers it or from where. Previously the
// publish handler had this inline and hardcoded scheduleDate to +1 hour, which
// meant a) nothing ever posted when the editor pressed publish, and b) the only
// way to see or change the post was to go into GHL. The captions written in the
// article editor existed precisely so that sharing is one action with the copy
// and image already decided — an hour's delay and a second tool defeated that.
//
// Posting is immediate by default. A schedule is something the editor chooses,
// not something the system imposes.

import { createClient } from '@supabase/supabase-js'
import { articleHref } from '@/lib/articles/slug'
import { listSocialAccounts, createSocialPost } from '@/lib/ghl-social'

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  )
}

const HOSTS: Record<string, string> = {
  rrp:       'riverregionparents.com',
  rr50plus:  'riverregion50plus.com',
  aop:       'auburnopelikaparents.com',
  mbp:       'mobilebayparents.com',
  esp:       'easternshoreparents.com',
  gpp:       'greaterpensacolaparents.com',
}

export interface ShareResult {
  ok:          boolean
  error?:      string
  /** Per-platform outcome so the admin can show exactly what happened. */
  facebook?:   { ok: boolean; postId?: string; error?: string }
  instagram?:  { ok: boolean; postId?: string; error?: string }
  link?:       string
  scheduledAt?: string | null
}

/**
 * Append the article link to a caption when it isn't already in the text.
 *
 * Both platforms want it there, for different reasons. Instagram strips links
 * entirely, so without this an IG caption points nowhere. Facebook does render
 * a preview card from the `link` field, but a bare card with no URL in the copy
 * is exactly the share that performs worst — and if the card fails to build,
 * the post has no route back to the site at all. Putting the URL in the text
 * makes the post self-sufficient on both.
 */
export function withLink(caption: string, url: string): string {
  const body = caption.trim()
  // Already linked — don't repeat it. Matches the bare host too, in case the
  // editor typed the URL without a scheme.
  const host = url.replace(/^https?:\/\//, '')
  if (body.includes(url) || body.includes(host)) return body
  return body ? `${body}\n\n${url}` : url
}

interface ShareOptions {
  /** ISO timestamp. Omit to post immediately — the default and the norm. */
  scheduleAt?: string | null
  /** Share again even though it has been shared before. */
  force?:      boolean
}

export async function shareArticleToSocial(
  articleId: string,
  opts: ShareOptions = {},
): Promise<ShareResult> {
  const sb = db()

  const { data, error } = await sb
    .from('guide_articles')
    .select(`
      id, brand_slug, title, slug, column_slug, hero_image_url,
      social_mode, social_hook, social_fb_caption, social_ig_caption,
      auto_posted_at
    `)
    .eq('id', articleId)
    .maybeSingle()

  if (error) return { ok: false, error: error.message }
  const a = data as null | {
    id: string; brand_slug: string | null; title: string; slug: string
    column_slug: string | null; hero_image_url: string | null
    social_mode: 'hook' | 'per-platform' | null
    social_hook: string | null
    social_fb_caption: string | null
    social_ig_caption: string | null
    auto_posted_at: string | null
  }
  if (!a) return { ok: false, error: 'Article not found' }
  if (a.auto_posted_at && !opts.force) {
    return { ok: false, error: `Already shared ${new Date(a.auto_posted_at).toLocaleString()}. Use Share again to post a second time.` }
  }

  const brand = a.brand_slug ?? 'rrp'
  const host  = HOSTS[brand] ?? HOSTS.rrp
  const link  = `https://${host}${articleHref({ slug: a.slug, title: a.title, column_slug: a.column_slug })}`

  // Editor's copy first, hook second, title as the floor. Never silently post
  // nothing.
  const mode = a.social_mode ?? 'hook'
  const hook = a.social_hook?.trim() || a.title
  const fbBase = (mode === 'per-platform' && a.social_fb_caption?.trim()) || hook
  const igBase = (mode === 'per-platform' && a.social_ig_caption?.trim()) || hook

  const fbCaption = withLink(fbBase, link)
  const igCaption = withLink(igBase, link)

  const { accounts, error: acctErr } = await listSocialAccounts(brand)
  if (acctErr) return { ok: false, error: `Could not list GHL social accounts: ${acctErr}` }
  const fbAccount = accounts.find(x => x.platform === 'facebook')
  const igAccount = accounts.find(x => x.platform === 'instagram')
  if (!fbAccount && !igAccount) {
    return { ok: false, error: 'No Facebook or Instagram account connected in GHL for this brand.' }
  }

  const scheduleDate = opts.scheduleAt ?? undefined
  const result: ShareResult = { ok: false, link, scheduledAt: opts.scheduleAt ?? null }

  if (fbAccount) {
    const r = await createSocialPost({
      brandSlug:  brand,
      accountIds: [fbAccount.id],
      caption:    fbCaption,
      imageUrl:   a.hero_image_url ?? undefined,
      link,
      scheduleDate,
    })
    result.facebook = { ok: r.ok, postId: r.postId, error: r.error }
  }

  // Instagram needs an image — a text-only IG post isn't a thing. Say so
  // rather than failing opaquely inside GHL.
  if (igAccount) {
    if (!a.hero_image_url) {
      result.instagram = { ok: false, error: 'Instagram needs a hero image — none set on this article.' }
    } else {
      const r = await createSocialPost({
        brandSlug:  brand,
        accountIds: [igAccount.id],
        caption:    igCaption,
        imageUrl:   a.hero_image_url,
        scheduleDate,
      })
      result.instagram = { ok: r.ok, postId: r.postId, error: r.error }
    }
  }

  result.ok = Boolean(result.facebook?.ok || result.instagram?.ok)

  // Log each posted platform to the unified social calendar so
  // /admin/social/calendar shows article shares alongside strategist plans and
  // urgent inserts. urgency 'direct' distinguishes these from planned slots.
  const slotWhen = opts.scheduleAt ?? new Date().toISOString()
  const posted: Array<[string, { ok: boolean; postId?: string } | undefined]> = [
    ['facebook',  result.facebook],
    ['instagram', result.instagram],
  ]
  for (const [platform, r] of posted) {
    if (!r?.ok) continue
    await sb.from('social_plan_slot').insert({
      plan_id:       null,
      day_of_week:   new Date(slotWhen).getUTCDay(),
      slot:          'midday',   // label-only; not load-bearing for direct posts
      scheduled_for: slotWhen,
      source_kind:   'article',
      source_id:     articleId,
      platforms:     [platform],
      fb_caption:    platform === 'facebook'  ? fbCaption : null,
      ig_caption:    platform === 'instagram' ? igCaption : null,
      image_url:     a.hero_image_url,
      status:        'dispatched',
      ghl_post_id:   r.postId ?? null,
      urgency:       'direct',
    }).then(() => undefined, () => undefined)
  }

  // Stamp only on a real success, so a failed attempt doesn't lock the article
  // out of being shared again.
  if (result.ok) {
    await sb.from('guide_articles').update({
      auto_posted_at:         new Date().toISOString(),
      auto_posted_fb_post_id: result.facebook?.postId ?? null,
      auto_post_error:        null,
    }).eq('id', articleId)
  } else {
    const msg = [result.facebook?.error, result.instagram?.error].filter(Boolean).join(' · ')
    await sb.from('guide_articles').update({ auto_post_error: msg.slice(0, 1000) }).eq('id', articleId)
    result.error = msg || 'Share failed'
  }

  return result
}
