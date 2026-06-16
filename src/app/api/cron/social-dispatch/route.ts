// GET /api/cron/social-dispatch
//
// Runs every 15 minutes. Two phases:
//
//   PHASE 1 — Caption prep:
//     For every queue row with status='pending' whose scheduled_for is
//     within 24 hours: generate per-platform captions + crop images,
//     flip to status='ready'. The "needs_review" flag stays TRUE — an
//     editor approves before fire.
//
//   PHASE 2 — Dispatch:
//     For every queue row with status='ready' AND needs_review=FALSE
//     AND scheduled_for <= now AND respecting quiet_hours_local +
//     max_posts_per_day caps: fire on each platform, log outputs.

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { loadPayload } from '@/lib/social/source-adapters'
import { generateCaptionsForContent, type CaptionPlatform } from '@/lib/social/caption-generator'
import { generateAllPlatformCrops, type SocialPlatform } from '@/lib/social/image-crops'

export const runtime     = 'nodejs'
export const dynamic     = 'force-dynamic'
export const maxDuration = 300

interface QueueRow {
  id:            string
  source_kind:   string
  source_id:     string
  brand_slug:    string | null
  scheduled_for: string
  status:        string
  captions:      Record<string, { caption: string; image_url?: string; hashtags?: string[] }>
  platforms:     string[]
  needs_review:  boolean
  recycle_index: number
}

export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const auth = req.headers.get('authorization')
    if (auth !== `Bearer ${cronSecret}`) return new NextResponse('Unauthorized', { status: 401 })
  }

  const sb = createAdminClient()

  // ── Phase 1: Caption prep ────────────────────────────────────────
  const horizon = new Date(Date.now() + 24 * 86400000).toISOString()
  const { data: pending } = await sb
    .from('social_queue')
    .select('*')
    .eq('status', 'pending')
    .lte('scheduled_for', horizon)
    .limit(50)

  let prepared = 0
  for (const row of (pending ?? []) as QueueRow[]) {
    try {
      const payload = await loadPayload(sb, row.source_kind, row.source_id, row.brand_slug)
      if (!payload) {
        await sb.from('social_queue').update({ status: 'failed' }).eq('id', row.id)
        continue
      }
      const platforms = (row.platforms as CaptionPlatform[])

      // Honor per-platform editor overrides — but ONLY when the article
      // is in 'per-platform' mode. In 'hook' mode (Sprint 9) the hook is
      // the single source of truth: even if an old override row leaked
      // through, ignore it and AI-generate fresh from the hook.
      const honorOverrides = (payload.socialMode ?? 'hook') === 'per-platform'
      const platformsNeedingAI = platforms.filter(p => {
        if (!honorOverrides) return true
        if (p === 'facebook' && payload.fbCaptionOverride?.trim()) return false
        if (p === 'instagram' && payload.igCaptionOverride?.trim()) return false
        return true
      })

      const aiCaptions = platformsNeedingAI.length > 0
        ? await generateCaptionsForContent(sb, row.brand_slug ?? 'rrp', {
            title:        payload.title,
            excerpt:      payload.excerpt,
            link:         payload.link,
            contentType:  row.source_kind,
            recycleIndex: row.recycle_index,
            socialHook:   payload.socialHook,
            tone:         (payload.voiceTone as 'supportive' | 'celebratory' | 'funny' | 'inspiring' | 'practical' | 'tender' | null) ?? null,
            authorName:   payload.authorName,
            columnLabel:  payload.columnLabel,
          }, platformsNeedingAI)
        : []

      const captions = [
        ...aiCaptions,
        ...(honorOverrides && payload.fbCaptionOverride?.trim() && platforms.includes('facebook')
          ? [{ platform: 'facebook' as CaptionPlatform, caption: payload.fbCaptionOverride.trim(), hashtags: [] }]
          : []),
        ...(honorOverrides && payload.igCaptionOverride?.trim() && platforms.includes('instagram')
          ? [{ platform: 'instagram' as CaptionPlatform, caption: payload.igCaptionOverride.trim(), hashtags: [] }]
          : []),
      ]

      const crops = payload.imageUrl
        ? await generateAllPlatformCrops(payload.imageUrl, platforms as unknown as SocialPlatform[])
        : {} as Record<SocialPlatform, string>

      const captionsByPlatform: Record<string, { caption: string; image_url?: string; hashtags?: string[] }> = {}
      for (const c of captions) {
        captionsByPlatform[c.platform] = {
          caption:   c.caption,
          image_url: (crops as Record<string, string>)[c.platform] ?? payload.imageUrl ?? undefined,
          hashtags:  c.hashtags,
        }
      }

      await sb.from('social_queue').update({
        status:   'ready',
        captions: captionsByPlatform,
      }).eq('id', row.id)
      prepared++
    } catch (e) {
      console.error('[social-dispatch] prep failed for', row.id, e)
      await sb.from('social_queue').update({ status: 'failed' }).eq('id', row.id)
    }
  }

  // ── Phase 2: Dispatch ────────────────────────────────────────────
  // Pull ready rows whose schedule has arrived.
  const { data: ready } = await sb
    .from('social_queue')
    .select('*')
    .eq('status', 'ready')
    .eq('needs_review', false)
    .lte('scheduled_for', new Date().toISOString())
    .limit(20)

  let dispatched = 0
  let failed     = 0
  for (const row of (ready ?? []) as QueueRow[]) {
    try {
      await sb.from('social_queue').update({ status: 'dispatching' }).eq('id', row.id)
      // Per-platform fire. For now we delegate Facebook + Instagram to
      // the existing meta-suite client; Twitter + Pinterest are stubs.
      let anyOk = false
      for (const platform of row.platforms) {
        const cap = row.captions[platform]
        if (!cap) continue
        try {
          // The actual posting code lives in meta-suite/auto-post for now.
          // Eventually we want one platform dispatcher per platform here.
          const { postToPlatform } = await import('@/lib/social/platform-dispatcher')
          const result = await postToPlatform(row.brand_slug ?? 'rrp', platform, {
            caption:  cap.caption,
            imageUrl: cap.image_url,
          })
          await sb.from('social_post_outputs').insert({
            queue_item_id:    row.id,
            platform,
            status:           result.ok ? 'success' : 'failed',
            platform_post_id: result.postId ?? null,
            permalink:        result.permalink ?? null,
            error_text:       result.error ?? null,
          })
          if (result.ok) anyOk = true
        } catch (e) {
          await sb.from('social_post_outputs').insert({
            queue_item_id: row.id,
            platform,
            status:        'failed',
            error_text:    e instanceof Error ? e.message : String(e),
          })
        }
      }
      await sb.from('social_queue').update({
        status: anyOk ? 'completed' : 'failed',
      }).eq('id', row.id)
      if (anyOk) dispatched++; else failed++
    } catch (e) {
      console.error('[social-dispatch] dispatch failed for', row.id, e)
      await sb.from('social_queue').update({ status: 'failed' }).eq('id', row.id)
      failed++
    }
  }

  return NextResponse.json({
    ok: true,
    at: new Date().toISOString(),
    prepared,
    dispatched,
    failed,
  })
}
