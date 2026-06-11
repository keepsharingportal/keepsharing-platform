// ── Editorial Promo AI ────────────────────────────────────────────────────────
// AI-assisted promotional copy generation for approved community content.
// Produces first-pass social captions, newsletter teasers, hashtags, and
// image notes. All output requires human editorial approval before use.
//
// AI generates — editors approve. Nothing posts automatically.
//
// TODO: Requires ANTHROPIC_API_KEY in .env.local

import { runAI }            from '@/lib/ai/client'
import { createClient }      from '@supabase/supabase-js'

// ── Supabase admin (same pattern as community-drafts.ts) ──────────────────────

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL        ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY       ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY   ?? '',
  )
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type PromoChannel =
  | 'facebook' | 'instagram' | 'newsletter' | 'sms' | 'hashtags' | 'image-note'

interface PromoSubmission {
  id:                    string
  submission_type:       string
  target_publication:    string
  working_title:         string | null
  excerpt:               string | null
  ai_draft_content:      string | null
  related_person_name:   string | null
  related_business_name: string | null
  related_school_name:   string | null
  payload:               Record<string, string>
}

// ── Static data ───────────────────────────────────────────────────────────────

const PUB_NAMES: Record<string, string> = {
  rrp:  'River Region Parents',
  mbp:  'Mobile Bay Parents',
  aop:  'Auburn Opelika Parents',
  esp:  'Eastern Shore Parents',
  gpp:  'Greater Pensacola Parents',
  boom: 'River Region Boom',
}

// Prompt version tag stored in editor_notes for auditability
// Bump the version string when prompts change significantly.
const PROMPT_VERSION = 'promo-v1'

// ── Shared editorial context ───────────────────────────────────────────────────

const PROMO_CONTEXT = `You write short promotional copy for River Region Parents, a trusted family media publication in the Montgomery, Alabama metro area. You promote real community content — never invent, hype, or misrepresent.

Rules — follow without exception:
• Warm, local, and parent-friendly
• Conversational — not corporate, not fake-cheerful
• Never invent facts, quotes, awards, or details not in the source
• No clickbait ("You won't believe", "AMAZING", "Life-changing")
• No promises or guaranteed outcomes
• Minimal emojis — one at most, only if it fits naturally
• No starting sentences with "Discover" or "Check out"
• Promote the story, not a product or service`

// ── Source content builder ─────────────────────────────────────────────────────

function buildSource(sub: PromoSubmission): string {
  const parts: string[] = []
  if (sub.working_title)         parts.push(`TITLE: ${sub.working_title}`)
  if (sub.excerpt)               parts.push(`EXCERPT: ${sub.excerpt}`)
  if (sub.ai_draft_content) {
    // First 800 chars of draft — enough context without massive tokens
    const draft = sub.ai_draft_content.trim().slice(0, 800)
    parts.push(`ARTICLE DRAFT:\n${draft}${sub.ai_draft_content.length > 800 ? '…' : ''}`)
  }
  if (sub.related_person_name)   parts.push(`FEATURED PERSON: ${sub.related_person_name}`)
  if (sub.related_business_name) parts.push(`FEATURED BUSINESS: ${sub.related_business_name}`)
  if (sub.related_school_name)   parts.push(`SCHOOL: ${sub.related_school_name}`)
  return parts.join('\n\n')
}

function hasSufficientContent(sub: PromoSubmission): boolean {
  return !!(sub.ai_draft_content?.trim() || sub.excerpt?.trim())
}

// ── Per-channel prompt builders (v1) ──────────────────────────────────────────

function buildPrompt(channel: PromoChannel, sub: PromoSubmission, pubName: string): string {
  const source = buildSource(sub)
  const header = `${PROMO_CONTEXT}\n\nSOURCE CONTENT:\n${source}\n\nPUBLICATION: ${pubName}\nCONTENT TYPE: ${sub.submission_type}`

  switch (channel) {

    case 'facebook':
      return `${header}

TASK: Write a Facebook post (3–5 sentences) to share this ${pubName} story.

Format:
• Open by naturally acknowledging the person, moment, or community — not with "We" or the publication name
• 2–3 sentences that capture what makes this story worth sharing
• End with a warm, natural invitation to read or celebrate
• At most 1 emoji if it fits the tone
• No hashtags in this section (added separately)
• Output only the post text`

    case 'instagram':
      return `${header}

TASK: Write an Instagram caption (2–4 sentences) to accompany a photo for this story.

Format:
• Shorter and more visual/emotional than Facebook
• Works alongside a photo — let the image do the heavy lifting
• 1–2 sentences on what makes this special
• Warm, celebratory if the content calls for it
• At most 1 emoji
• No hashtags in this section (added separately)
• Output only the caption text`

    case 'newsletter':
      return `${header}

TASK: Write a newsletter section teaser (2–3 sentences) for the ${pubName} email newsletter.

Format:
• Sentence 1: Who or what is featured — pulls the reader in
• Sentence 2: Why it matters or what makes it worth reading
• Sentence 3 (optional): A soft, natural invitation to read more — not clickbait
• Clear, readable prose — no hype, no emoji
• Output only the teaser text — no headline or title line`

    case 'sms':
      return `${header}

TASK: Write an SMS/text teaser (maximum 140 characters total) for text subscribers.

Format:
• 140 characters or fewer — count carefully
• Names what's featured and where to find it
• Clear and brief — no padding, no filler words
• No emoji, no spammy language ("EXCLUSIVE", "LIMITED TIME", etc.)
• Output only the SMS text — nothing else`

    case 'hashtags':
      return `${header}

TASK: Suggest exactly 5 hashtags for promoting this content on Facebook and Instagram.

Rules:
• Exactly 5 hashtags
• Relevant to the content, community, and audience
• Mix of local (e.g., montgomeryAL, riverregion) and topical (e.g., teacherappreciation, localfamilies)
• No generic influencer tags (#blessed, #amazing, #instagood, #lifestyle)
• All tags must be real and usable — no invented tags
• Output as a comma-separated list with no # symbols (the system adds them)
• Example format: riverregionparents, montgomeryAL, schoolnews, localteacher, familyfirst`

    case 'image-note':
      return `${header}

TASK: Write a brief image note (1–2 sentences) describing what kind of photo should accompany this social post.

Format:
• Describe the type of shot that would work well — candid, portrait, action, location, group
• If a person is featured, describe what kind of image fits (classroom shot, action photo, family portrait, etc.)
• Do not claim any specific photo exists or has been received
• No promotional language
• Output only the image note — 1–2 sentences`
  }
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function generatePromo(
  submissionId: string,
  channel: PromoChannel,
): Promise<void> {
  const supabase = supabaseAdmin()

  // Load the submission
  const { data } = await supabase
    .from('community_submissions')
    .select('id, submission_type, target_publication, working_title, excerpt, ai_draft_content, related_person_name, related_business_name, related_school_name, payload')
    .eq('id', submissionId)
    .single()

  if (!data) {
    console.error('[editorial-promo-ai] submission not found:', submissionId)
    return
  }

  const sub     = data as unknown as PromoSubmission
  const pubName = PUB_NAMES[sub.target_publication] ?? 'River Region Parents'

  // ── Missing content guard ─────────────────────────────────────────────────

  if (!hasSufficientContent(sub)) {
    const note = '⚠️ Needs a draft or excerpt before generating promotional copy.'
    const update: Record<string, unknown> = {}
    switch (channel) {
      case 'facebook':    update.caption_facebook  = note; break
      case 'instagram':   update.caption_instagram = note; break
      case 'newsletter':  update.newsletter_teaser = note; break
      case 'sms':         update.caption_sms       = note; break
      case 'hashtags':    update.social_hashtags   = [];   break
      case 'image-note':  update.social_image_note = note; break
    }
    await supabase.from('community_submissions').update(update).eq('id', submissionId)
    return
  }

  // ── Call AI via the central wrapper ───────────────────────────────────────
  // Routes through runAI() so budget caps + per-provider rotation + usage
  // tracking all apply. The 'caption' task kind picks the model configured
  // for caption work in /admin/integrations/ai.

  try {
    const prompt = buildPrompt(channel, sub, pubName)
    const aiResponse = await runAI({
      taskKind: 'caption',
      caller:   `editorial-promo.${channel}`,
      messages: [{ role: 'user', content: prompt }],
      maxTokens: 512,
    })
    const raw = aiResponse.text.trim()

    // ── Write to the correct column ─────────────────────────────────────────

    const update: Record<string, unknown> = {}

    switch (channel) {
      case 'facebook':
        update.caption_facebook = raw
        break

      case 'instagram':
        update.caption_instagram = raw
        break

      case 'newsletter':
        update.newsletter_teaser = raw
        break

      case 'sms':
        // Enforce 140 char hard limit — the prompt asks Claude to do this,
        // but we truncate defensively to protect SMS delivery
        update.caption_sms = raw.slice(0, 140)
        break

      case 'hashtags': {
        // Parse comma-separated list, strip # prefix, deduplicate, cap at 5
        const tags = raw
          .split(',')
          .map(t => t.trim().replace(/^#/, '').toLowerCase())
          .filter(t => t.length > 0 && /^[a-zA-Z0-9_]+$/.test(t))
          .slice(0, 5)
        update.social_hashtags = tags
        break
      }

      case 'image-note':
        update.social_image_note = raw
        break
    }

    await supabase
      .from('community_submissions')
      .update(update)
      .eq('id', submissionId)

    console.log(`[editorial-promo-ai] ${PROMPT_VERSION} · ${channel} generated for ${submissionId}`)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error(`[editorial-promo-ai] ${channel} failed:`, msg)
  }
}
