// ── Per-platform AI social caption generator ──────────────────────────
//
// Voice: friend, coach, partner — a local-mom-influencer who happens to
// be wise. NEVER fear-driven manipulation. Reads:
//   - Brand profile voice_notes (the explicit voice tuning)
//   - Brand profile social_caption_examples (few-shot — 2-3 picked at
//     random each call so the model matches real tone)
//   - Article title + excerpt + author + column for natural attribution
//
// Tight length targets so captions fit modern feeds:
//   - Facebook: 40-60 words. Scroll-stopping in the first 60 chars.
//   - Instagram: 80-120 words + niche hashtags. "Link in bio" pattern.
//   - Twitter: ≤270 chars + URL.
//   - Pinterest: 200-300 chars, keyword-rich, searchable.
//
// Emojis: 1-3 per post, placed where they add meaning, never as
// decoration.

import type { SupabaseClient } from '@supabase/supabase-js'
import { runAI } from '@/lib/ai/client'
import { loadBrandPromptContext, renderBrandContextForPrompt, loadBrandProfile } from '@/lib/seo/brand-profile'

export type CaptionPlatform = 'facebook' | 'instagram' | 'twitter' | 'pinterest'

export type SocialTone =
  | 'supportive'
  | 'celebratory'
  | 'funny'
  | 'inspiring'
  | 'practical'
  | 'tender'

export interface CaptionInput {
  title:           string
  excerpt?:        string | null
  link:            string
  contentType:     string
  recycleIndex?:   number
  socialHook?:     string | null
  tone?:           SocialTone | null
  /** Author byline — when set, generator references by first name. */
  authorName?:     string | null
  /** Column display label (e.g. "Mom Knows Best") — when set, generator
   *  mentions it casually. */
  columnLabel?:    string | null
}

export interface PlatformCaption {
  platform:  CaptionPlatform
  caption:   string
  hashtags?: string[]
}

const TONE_DESCRIPTIONS: Record<SocialTone, string> = {
  supportive:  'Coach-friend voice. Warm, knowing, no judgment. "I see you. Here\'s what helped."',
  celebratory: 'Joy-led. Share pride in the moment, the kid, the win. Light energy.',
  funny:       'Light, playful, self-aware. Honest about parenting chaos. Levity, not sarcasm.',
  inspiring:   'Hopeful, possibility-focused. Lift the reader. Soft, never preachy.',
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

  // The authoritative social voice document, written by the editor.
  // When non-empty, this becomes the PRIMARY voice guidance — Claude
  // reads it verbatim. The few-shot examples become a secondary
  // signal, kept for backward compat.
  const profile      = await loadBrandProfile(sb, brandSlug)
  const voiceProfile = profile.socialVoiceProfile?.trim() ?? ''
  const examples     = voiceProfile.length > 0
    ? []  // voice profile already contains the gold-standard examples
    : pickRandomExamples(profile.socialCaptionExamples ?? [], 3)

  const tone = input.tone ?? pickRotatingTone(input.recycleIndex ?? 0)

  const constraintTable = platforms.map(p => {
    switch (p) {
      case 'facebook':
        return `- facebook: 40-60 words MAX. The first 60 characters MUST stop the scroll — make them count. Conversational. End with a soft question or "Here's what we found." NEVER paste the URL (the link preview card renders below). 1-3 emojis placed where they add meaning, never decoration.`
      case 'instagram':
        return `- instagram: 80-120 words. Lead with a strong hook (first line is what shows before "...more"). NEVER include a URL (IG strips them). Reference "link in bio" once near the end. 1-3 emojis placed naturally. Close with 5-10 niche locality-rich hashtags (e.g. #riverregionparents #montgomerymoms #pikeroadschools).`
      case 'twitter':
        return `- twitter: ≤270 chars TOTAL including the URL. One hook, one CTA. 1-2 hashtags MAX. Include ${input.link} inline at the end.`
      case 'pinterest':
        return `- pinterest: 200-300 chars. Pinterest IS searched, so weave the focus keyword in naturally. 1-3 hashtags. Lead with the search intent the reader is solving.`
    }
  }).join('\n')

  const hookGuidance = input.socialHook?.trim()
    ? `EDITOR-WRITTEN HOOK (use this as the lead, adapt for each platform's length):
"${input.socialHook.trim()}"`
    : 'Generate the hook yourself based on the article content + chosen tone.'

  const attributionGuidance = buildAttributionGuidance(input.authorName, input.columnLabel)

  const examplesBlock = examples.length > 0
    ? `# EDITOR-CURATED EXAMPLES (match this tone — these are captions that have hit perfectly for this brand)
${examples.map((e, i) => `Example ${i + 1}${e.platform ? ` (${e.platform})` : ''}${e.note ? ` — ${e.note}` : ''}:
"${e.caption}"`).join('\n\n')}

Match the rhythm + warmth + length of these examples. Do not copy phrases verbatim; capture the voice.`
    : ''

  // When the editor has filled in the social voice profile, it takes
  // primacy — Claude reads it verbatim and treats it as the rulebook.
  // Generic guidance only fills in when no profile is set.
  const voiceBlock = voiceProfile.length > 0
    ? `# AUTHORITATIVE SOCIAL VOICE PROFILE
Follow this document verbatim. It is the single source of truth for how
this brand sounds on Facebook and Instagram. Match the voice, hooks,
tone, formatting, and rhythm exactly. The gold-standard example posts
inside this document show you what good looks like — match their feel,
do not copy their words.

────────────────────────────────────────
${voiceProfile}
────────────────────────────────────────

Honor the voice profile above on every caption. Length targets in the
profile (or if absent: Facebook 40-60 words, Instagram 80-120 words)
are HARD limits — going over kills engagement.`
    : `You write social media captions for a community family publication. The
voice is a LOCAL MOM-INFLUENCER who happens to be wise — the friend a
mom would text first when she has a real parenting question. Warm,
knowing, never preachy. Always speaks TO the reader (you), never AT
them (parents).

ABSOLUTE RULES:
  1. NEVER fear-as-manipulation. Concerns can be acknowledged, never weaponized.
  2. NEVER clickbait formulas ("You'll never believe...", "MUST READ", "This one trick...").
  3. NEVER CAPS LOCK shouting, exclamation overload, or fake urgency.
  4. NEVER lecture. The voice is a peer who happens to know things, not an authority talking down.
  5. ALWAYS speak TO the reader, not ABOUT parents in general.
  6. Honor the brand voice from voice_notes EXACTLY.
  7. Length limits are HARD — Facebook 40-60 words, Instagram 80-120 words. Going over kills engagement.
  8. Emojis: 1-3 per post, placed where they add meaning, never decoration. Skip them entirely if they'd feel forced.`

  const SYSTEM_PROMPT = `${voiceBlock}

THIS POST'S TONE: ${tone}
${TONE_DESCRIPTIONS[tone]}

${attributionGuidance}

${hookGuidance}

${examplesBlock}

PER-PLATFORM CONSTRAINTS (HARD limits):
${constraintTable}

OUTPUT FORMAT — emit raw JSON array only, no prose, no code fences:
[
  { "platform": "facebook",  "caption": "...", "hashtags": [] },
  { "platform": "instagram", "caption": "...", "hashtags": ["#tag1","#tag2"] },
  ...
]`

  const userPrompt = `${brandMd}

# Article being promoted
Title: ${input.title}
Excerpt: ${input.excerpt ?? '(no excerpt)'}
${input.authorName ? `Author: ${input.authorName}` : ''}
${input.columnLabel ? `Column: ${input.columnLabel}` : ''}
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

function buildAttributionGuidance(authorName?: string | null, columnLabel?: string | null): string {
  const parts: string[] = ['ATTRIBUTION:']
  if (authorName?.trim()) {
    const firstName = extractFirstName(authorName.trim())
    parts.push(`- Reference the author casually by first name: "${firstName}" (e.g. "${firstName}'s take on this..." or "From ${firstName} — ..."). Don't force it on every caption; use when it fits naturally.`)
  }
  if (columnLabel?.trim()) {
    parts.push(`- The article runs in the brand's "${columnLabel.trim()}" column. Mention it casually like a friend sharing what she read (e.g. "Loved this from this week's ${columnLabel.trim()}..."). Optional — use when it flows.`)
  }
  if (parts.length === 1) {
    parts.push('- No author or column attribution available — skip those references.')
  }
  return parts.join('\n')
}

function extractFirstName(byline: string): string {
  // Strip honorifics + suffixes; return what comes after.
  const trimmed = byline.replace(/^(Dr|Mr|Mrs|Ms|Mx|Rev|Pastor|Prof|Coach)\.?\s+/i, '').trim()
  const first = trimmed.split(/\s+/)[0]
  // Some bylines are "Dr. Beth Long" — keep the honorific for the
  // first-name reference if present in the original.
  const honorific = byline.match(/^(Dr|Mr|Mrs|Ms|Mx|Rev|Pastor|Prof|Coach)\.?\s+/i)
  return honorific ? `${honorific[1]}. ${first}` : first
}

function pickRandomExamples<T>(arr: T[], n: number): T[] {
  if (arr.length <= n) return arr
  const copy = [...arr]
  const out: T[] = []
  // Deterministic-feeling but varied across runs: simple modulo pick
  // using current minute so the same set isn't always returned.
  const seed = Math.floor(Date.now() / 60000) % copy.length
  for (let i = 0; i < n; i++) {
    const idx = (seed + i * 7) % copy.length
    out.push(copy[idx])
  }
  return out
}

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
