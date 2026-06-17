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

    // IG captions need hashtags appended.
    const igCaption = ig
      ? `${ig.caption}${ig.hashtags && ig.hashtags.length ? '\n\n' + ig.hashtags.join(' ') : ''}`
      : ''

    // ── Hook: a SECOND, focused call ──────────────────────────────────
    // We used to derive the hook by slicing the first sentence of the FB
    // caption. Result: dry news leads ("Australia just banned kids under
    // 16 from social media") even when the rest of the caption was voice-
    // on. The first sentence is the "what"; the FRIEND VOICE is usually
    // in sentences 2-3. So we make a dedicated hook call — short, scroll-
    // stopping, 1-2 sentences, voice-on, no link, no hashtags. Cheap; the
    // editor gets a real hook they can paste into MashShare-style cards.
    const social_hook = await generateHook(
      sb, payload.brandSlug ?? 'rrp', {
        title:       payload.title,
        excerpt:     payload.excerpt,
        contentType: 'article',
        tone,
        authorName:  payload.authorName,
        columnLabel: payload.columnLabel,
        // Pass the FB caption Claude just wrote so the hook reads as a
        // natural distillation of the same voice / framing.
        fbCaption:   fb?.caption ?? '',
      },
    )

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

// Dedicated hook generator. Uses the brand's social_voice_profile (loaded
// inside generateCaptionsForContent's brand profile lookup) so the hook
// reads in the friend voice — not a news lead.
async function generateHook(
  sb:        ReturnType<typeof createAdminClient>,
  brandSlug: string,
  input: {
    title:        string
    excerpt:      string | null
    contentType:  string
    tone:         SocialTone | null
    authorName?:  string | null
    columnLabel?: string | null
    fbCaption?:   string
  },
): Promise<string> {
  const { runAI } = await import('@/lib/ai/client')
  const { loadBrandProfile } = await import('@/lib/seo/brand-profile')
  const profile      = await loadBrandProfile(sb, brandSlug)
  const voiceProfile = profile?.socialVoiceProfile?.trim() ?? ''
  void sb

  const systemPrompt = `${voiceProfile
    ? `# AUTHORITATIVE SOCIAL VOICE PROFILE
Follow this verbatim. It is THE rulebook for how this brand sounds.

────────────────────────────────────────
${voiceProfile}
────────────────────────────────────────
`
    : `You are the social media voice of a local family publication. Warm friend-of-the-family tone — never preachy, never newsy. Use "y'all" when natural, light emojis, conversational openers.`
}

Your job: write ONE social-post hook.

THE HOOK:
- 1-2 sentences max, 30-60 words total
- First 8 words MUST stop the scroll
- Voice = friend / coach / wise mom — NEVER a news anchor
- Conversational opener allowed (e.g. "Y'all..." / "Real talk:" / "Mom-to-mom:")
- 0-2 emojis where they add meaning
- NEVER paste the URL
- NEVER manipulation, fear-mongering, clickbait, CAPS LOCK shouting
- End on a question OR a "here's why this matters to you" line

OUTPUT: the hook text only. No JSON, no quotes, no preamble. Just the hook.`

  const userPrompt = `Article being promoted:
Title: ${input.title}
${input.excerpt ? `Excerpt: ${input.excerpt}` : ''}
${input.authorName ? `Author: ${input.authorName}` : ''}
${input.columnLabel ? `Column: ${input.columnLabel}` : ''}
${input.tone ? `Tone: ${input.tone}` : 'Tone: pick what fits — read the article first'}

${input.fbCaption ? `For voice reference — here's a draft Facebook caption I'm about to publish for the same article:
"${input.fbCaption}"

Write the hook in the same voice but tighter — distill the most scroll-stopping idea.` : ''}

Write the hook.`

  const res = await runAI({
    caller:       'social-hook-generator',
    taskKind:     'drafting',
    systemPrompt,
    messages:     [{ role: 'user', content: userPrompt }],
    maxTokens:    400,
  })
  return res.text.trim().replace(/^["']|["']$/g, '').slice(0, 280)
}
