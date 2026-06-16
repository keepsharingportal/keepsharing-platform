// ── Per-platform AI social caption generator ──────────────────────────
//
// Voice: friend, coach, partner. NEVER fear-driven manipulation.
// We want readers to feel like we're a TRUE FRIEND who genuinely
// supports them — not a marketer trying to scare them into clicking.
//
// Tone rotation: across articles in the feed we mix tones so the brand
// doesn't get monotonous. Editor can pin a tone per article via
// social_voice_tone; otherwise the generator picks based on the
// article's vibe.
//
// Tones available:
//   supportive   — "I see you. Here's what's helped." Coach-friend.
//   celebratory  — "Look at this win!" Joy-led, sharing pride.
//   funny        — Light, playful, self-aware. Levity.
//   inspiring    — Hopeful, possibility-focused. Lifts the reader.
//   practical    — "Here's the answer." Direct, useful, no fluff.
//   tender       — Soft, warm, emotional. Family moments.
//
// Per-platform constraints:
//   Facebook — full caption, link preview does the heavy lifting.
//              ~100-180 words. Conversational. End with subtle CTA
//              that respects the reader ("Here's what we found." not
//              "CLICK NOW!").
//   Instagram — no link! Use "Link in bio" pattern. ~100-200 words.
//              5-10 niche hashtags at the end. Emojis when natural.
//   Twitter — ≤270 chars + URL. Tight. One hook, one CTA.
//   Pinterest — keyword-rich (this IS searched). 200-300 chars. Can
//              use emojis. 1-3 hashtags.

import type { SupabaseClient } from '@supabase/supabase-js'
import { runAI } from '@/lib/ai/client'
import { loadBrandPromptContext, renderBrandContextForPrompt } from '@/lib/seo/brand-profile'

export type CaptionPlatform = 'facebook' | 'instagram' | 'twitter' | 'pinterest'

export type SocialTone =
  | 'supportive'
  | 'celebratory'
  | 'funny'
  | 'inspiring'
  | 'practical'
  | 'tender'

export interface CaptionInput {
  title:        string
  excerpt?:     string | null
  link:         string
  contentType:  string
  recycleIndex?: number
  /** Editor-written one-line hook — the "Why click?" lead. When set,
   *  every platform caption should build from this opening. */
  socialHook?:  string | null
  /** Pinned tone for this article. When NULL, the generator picks. */
  tone?:        SocialTone | null
}

export interface PlatformCaption {
  platform:  CaptionPlatform
  caption:   string
  hashtags?: string[]
}

const TONE_DESCRIPTIONS: Record<SocialTone, string> = {
  supportive:  '"I see you. Here\'s what\'s helped." Coach-friend voice. Warm, knowing, no judgment.',
  celebratory: '"Look at this win!" Joy-led. Share pride in the moment, the kid, the moment of grace.',
  funny:       'Light, playful, self-aware. Honest about parenting chaos. Levity, not sarcasm.',
  inspiring:   'Hopeful, possibility-focused. Lift the reader. "What if it could be different?"',
  practical:   '"Here\'s the answer." Direct, useful, respects the reader\'s time. No fluff.',
  tender:      'Soft, warm, emotional. Family moments. The kind of post that makes a parent pause.',
}

export async function generateCaptionsForContent(
  sb:         SupabaseClient,
  brandSlug:  string,
  input:      CaptionInput,
  platforms:  CaptionPlatform[],
): Promise<PlatformCaption[]> {
  const promptCtx = await loadBrandPromptContext(sb, brandSlug)
  const brandMd   = renderBrandContextForPrompt(promptCtx)

  const tone = input.tone ?? pickRotatingTone(input.recycleIndex ?? 0)

  const constraintTable = platforms.map(p => {
    switch (p) {
      case 'facebook':
        return `- facebook: 100-180 words. Conversational hook → context → soft CTA. The link preview renders the article card below, so DON'T paste the URL in the caption. End with a question or a gentle "Here's what we found" — never "CLICK NOW" energy. 0-2 hashtags max.`
      case 'instagram':
        return `- instagram: 100-200 words. Lead with the hook. Story-led, scannable, mobile-friendly. NEVER include a URL — IG strips them. Mention "Link in bio" or "More on the blog (link in bio)" once. End with 5-10 niche locality-rich hashtags (e.g. #riverregionparents #montgomerymoms #pikeroadschools). Emojis where natural, not gimmicky.`
      case 'twitter':
        return `- twitter: ≤270 chars including the URL. One hook, one CTA. 1-2 hashtags MAX. Include ${input.link} inline at the end.`
      case 'pinterest':
        return `- pinterest: 200-300 chars. Pinterest IS searched, so weave the focus keyword in naturally. Use emoji sparingly. 1-3 hashtags. Lead with the search intent the reader is solving.`
    }
  }).join('\n')

  const hookGuidance = input.socialHook?.trim()
    ? `EDITOR-WRITTEN HOOK (use this as the lead, don't rewrite it):
"${input.socialHook.trim()}"
Build each platform's caption from this opening.`
    : 'Generate the hook yourself based on the article content + the chosen tone.'

  const SYSTEM_PROMPT = `You write social captions for a community family publication. The
brand voice is FRIEND / COACH / PARTNER — never marketer, never
manipulator. We want readers to feel like we're a true friend who
genuinely supports them.

ABSOLUTE RULES:
  1. Never lead with fear-as-manipulation ("Your kid will fail unless..."). Fear can ACKNOWLEDGE a real concern, but it never weaponizes it.
  2. Never use clickbait formulas ("You'll never believe...", "This one trick...", "MUST READ"). They're insulting.
  3. Never use CAPS LOCK shouting, exclamation overload, or fake urgency.
  4. Always speak TO the reader (you), not ABOUT them (parents).
  5. Honor the brand voice from the profile — peer-mom tone, warm, evidence-aware not academic, locally specific.
  6. Mix HOW we share across articles. We are not a one-note brand.

THIS POST'S TONE: ${tone}
${TONE_DESCRIPTIONS[tone]}

${hookGuidance}

Per-platform constraints (HARD limits):
${constraintTable}

OUTPUT FORMAT — emit raw JSON array only, no prose:
[
  { "platform": "facebook",  "caption": "...", "hashtags": [] },
  { "platform": "instagram", "caption": "...", "hashtags": ["#tag1","#tag2"] },
  ...
]`

  const userPrompt = `${brandMd}

# Article being promoted
Title: ${input.title}
Excerpt: ${input.excerpt ?? '(no excerpt)'}
Link (FB + Twitter only — NEVER paste in IG): ${input.link}
Content type: ${input.contentType}
${input.recycleIndex && input.recycleIndex > 0 ? `Recycle #${input.recycleIndex} — vary the angle from a hypothetical first post.` : ''}

Generate captions per the system prompt. Emit raw JSON array only.`

  try {
    const res = await runAI({
      caller:       'social-caption-generator',
      taskKind:     'drafting',
      systemPrompt: SYSTEM_PROMPT,
      messages:     [{ role: 'user', content: userPrompt }],
      maxTokens:    2500,
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

/** Rotates through tones based on the recycle index so the feed
 *  varies across articles + recycles. Editor-pinned tone overrides. */
function pickRotatingTone(rotationKey: number): SocialTone {
  const order: SocialTone[] = ['supportive', 'practical', 'celebratory', 'inspiring', 'tender', 'funny']
  return order[Math.abs(rotationKey) % order.length]
}

function fallbackCaption(platform: CaptionPlatform, input: CaptionInput): PlatformCaption {
  const base = input.socialHook?.trim() || input.excerpt?.trim() || input.title
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
