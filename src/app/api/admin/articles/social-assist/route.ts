// POST /api/admin/articles/social-assist
// Body: { articleId, tone? }
//
// Generates social_hook + FB + IG captions for one article using the
// friend-voice caption generator. Editor reviews + saves via the
// normal article PATCH.

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { loadArticlePayload } from '@/lib/social/source-adapters'
import { generateCaptionsForContent, type SocialTone } from '@/lib/social/caption-generator'

export const runtime     = 'nodejs'
export const dynamic     = 'force-dynamic'
export const maxDuration = 120

const VALID_TONES: SocialTone[] = ['supportive', 'celebratory', 'funny', 'inspiring', 'practical', 'tender']

export async function POST(req: NextRequest) {
  await requireAdmin()
  const body = await req.json().catch(() => null) as { articleId?: string; tone?: string } | null
  if (!body?.articleId) return NextResponse.json({ error: 'articleId required' }, { status: 400 })

  const sb = createAdminClient()
  const payload = await loadArticlePayload(sb, body.articleId)
  if (!payload) return NextResponse.json({ error: 'article not found' }, { status: 404 })

  const tone = body.tone && VALID_TONES.includes(body.tone as SocialTone)
    ? body.tone as SocialTone
    : null

  try {
    const captions = await generateCaptionsForContent(
      sb,
      payload.brandSlug ?? 'rrp',
      {
        title:        payload.title,
        excerpt:      payload.excerpt,
        link:         payload.link,
        contentType:  'article',
        socialHook:   payload.socialHook,
        tone,
        authorName:   payload.authorName,
        columnLabel:  payload.columnLabel,
      },
      ['facebook', 'instagram'],
    )

    const fb = captions.find(c => c.platform === 'facebook')
    const ig = captions.find(c => c.platform === 'instagram')

    // Build a hook by taking the first sentence of the FB caption.
    // The dispatcher will use the full captions; the hook just helps
    // the editor see the lead.
    const hookSource = fb?.caption ?? ig?.caption ?? ''
    const social_hook = hookSource.split(/[.!?]\s/)[0]?.trim().slice(0, 240) ?? ''

    // IG captions need hashtags appended.
    const igCaption = ig
      ? `${ig.caption}${ig.hashtags && ig.hashtags.length ? '\n\n' + ig.hashtags.join(' ') : ''}`
      : ''

    return NextResponse.json({
      ok: true,
      social_hook,
      facebook_caption: fb?.caption ?? '',
      instagram_caption: igCaption,
    })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'generation failed' }, { status: 500 })
  }
}
