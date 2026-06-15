// ── Per-platform AI caption generator ─────────────────────────────────
//
// Reads:
//   - The content's title + excerpt + link
//   - The brand SEO profile (voice notes, audience, personas)
//   - Per-platform constraints (length, hashtag style, link handling)
//
// Produces:
//   - Platform-specific caption ready to send
//
// Each platform has a different voice + length:
//   - Facebook: 100-150 word conversational caption + link preview
//   - Instagram: 100-200 word caption + 5-10 niche hashtags; link in bio
//   - Twitter:  ≤280 chars, 1-2 hashtags, link inline
//   - Pinterest: 200-300 chars keyword-rich, can use emoji + 2-3 hashtags
//
// Falls back to a template when the AI call fails — the queue keeps
// moving instead of stalling.

import type { SupabaseClient } from '@supabase/supabase-js'
import { runAI } from '@/lib/ai/client'
import { loadBrandPromptContext, renderBrandContextForPrompt } from '@/lib/seo/brand-profile'

export type CaptionPlatform = 'facebook' | 'instagram' | 'twitter' | 'pinterest'

export interface CaptionInput {
  title:       string
  excerpt?:    string | null
  link:        string         // full URL
  contentType: string         // 'article' | 'event' | 'guide' | etc.
  recycleIndex?: number       // 0 = first post; 1+ = recycle (slightly different framing)
}

export interface PlatformCaption {
  platform:  CaptionPlatform
  caption:   string
  hashtags?: string[]
}

/** Generate captions for the given platforms in one Claude call (batched
 *  for token efficiency — one prompt with all platforms beats N calls). */
export async function generateCaptionsForContent(
  sb:         SupabaseClient,
  brandSlug:  string,
  input:      CaptionInput,
  platforms:  CaptionPlatform[],
): Promise<PlatformCaption[]> {
  const promptCtx = await loadBrandPromptContext(sb, brandSlug)
  const brandMd   = renderBrandContextForPrompt(promptCtx)

  const constraintTable = platforms.map(p => {
    switch (p) {
      case 'facebook':  return '- facebook: 100-150 word conversational caption. Lead with a hook. No hashtags or 1-2 only. Link is in the embed; don\'t repeat it in copy.'
      case 'instagram': return '- instagram: 100-200 word caption. Engaging, scannable. 5-10 niche hashtags at the END (#riverregionparents #montgomeryalabama etc). Mention "link in bio" since IG doesn\'t allow link previews.'
      case 'twitter':   return '- twitter: ≤270 chars TOTAL (excluding URL). 1-2 hashtags max. Punchy. Include the URL inline at the end.'
      case 'pinterest': return '- pinterest: 200-300 chars keyword-rich. Use 1-3 hashtags. Can include emoji. Lead with the search intent (what reader is solving).'
    }
  }).join('\n')

  const recycleHint = (input.recycleIndex ?? 0) > 0
    ? `Note: this is recycle #${input.recycleIndex} — vary the angle from a hypothetical first-post version. Lead with a different hook so returning readers don't see the same caption.`
    : ''

  const SYSTEM_PROMPT = `You write social media captions for a community publication. The
brand voice + audience are given. Per-platform constraints below
must be honored EXACTLY — length limits are hard.

OUTPUT FORMAT — emit raw JSON array only, no prose:
[
  { "platform": "facebook",  "caption": "...", "hashtags": [] },
  { "platform": "instagram", "caption": "...", "hashtags": ["#tag1","#tag2"] },
  ...
]

Per-platform constraints:
${constraintTable}`

  const userPrompt = `${brandMd}

# Content to promote
Title: ${input.title}
Excerpt: ${input.excerpt ?? '(no excerpt)'}
Link: ${input.link}
Content type: ${input.contentType}

${recycleHint}

Generate captions per the system prompt. Emit raw JSON array only.`

  try {
    const res = await runAI({
      caller:       'social-caption-generator',
      taskKind:     'drafting',
      systemPrompt: SYSTEM_PROMPT,
      messages:     [{ role: 'user', content: userPrompt }],
      maxTokens:    2000,
    })
    const raw = res.text.trim().replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim()
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) throw new Error('not an array')
    const validated: PlatformCaption[] = []
    for (const item of parsed) {
      if (!item || typeof item !== 'object') continue
      const platform = item.platform as CaptionPlatform
      if (!platforms.includes(platform)) continue
      validated.push({
        platform,
        caption:  String(item.caption ?? '').trim(),
        hashtags: Array.isArray(item.hashtags) ? item.hashtags as string[] : [],
      })
    }
    if (validated.length === 0) throw new Error('no valid platform entries')
    return validated
  } catch (e) {
    console.warn('[caption-generator] AI failed, using fallback templates:', e instanceof Error ? e.message : e)
    return platforms.map(p => fallbackCaption(p, input))
  }
}

/** Template fallback when the AI call fails. Better to ship a generic
 *  caption than to stall the entire queue. */
function fallbackCaption(platform: CaptionPlatform, input: CaptionInput): PlatformCaption {
  const base = input.excerpt?.trim() || input.title
  switch (platform) {
    case 'facebook':
      return { platform, caption: base, hashtags: [] }
    case 'instagram':
      return { platform, caption: `${base}\n\nLink in bio.`, hashtags: ['#riverregionparents', '#alabamafamilies'] }
    case 'twitter': {
      const room = 280 - input.link.length - 2
      const caption = base.length > room ? base.slice(0, room - 1) + '…' : base
      return { platform, caption: `${caption}\n${input.link}`, hashtags: [] }
    }
    case 'pinterest':
      return { platform, caption: base.slice(0, 300), hashtags: ['#parenting', '#alabama'] }
  }
}
