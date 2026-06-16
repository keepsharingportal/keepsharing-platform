// ── AI brief generator for themed campaigns ───────────────────────────
//
// Reads the brand's full SEO profile + the campaign's theme/month/
// existing keywords + the article corpus + GSC's "almost ranking"
// queries, and proposes:
//   - Editorial brief (2-3 paragraphs)
//   - Article assignments (5-10 specific titles + angles + keywords)
//   - Sponsor categories worth pitching
//   - Newsletter spotlight angle
//   - Social hashtags + caption hooks
//
// Editor reviews + edits + saves; the ai_brief JSONB persists so
// regenerating doesn't wipe edits unless explicitly requested.

import type { SupabaseClient } from '@supabase/supabase-js'
import { runAI } from '@/lib/ai/client'
import { loadBrandPromptContext, renderBrandContextForPrompt } from '@/lib/seo/brand-profile'
import type { ThemedCampaign, AIBrief } from '@/lib/campaigns'

const SYSTEM_PROMPT = `You are a senior editorial strategist for a community family publication.
You're handed a brand's full strategic brief (pillars, sub-areas,
personas, calendar, voice notes) + a specific themed campaign for one
month + the brand's recent article history.

Your job: produce a campaign brief Claude or the editor could execute
without ambiguity. Be SPECIFIC to the brand's actual market — call out
named sub-areas (Prattville, Pike Road, Wetumpka for River Region) and
named institutions where relevant. Tie article angles to the brand's
existing pillars.

OUTPUT FORMAT — emit raw JSON only, no prose, no code fences:
{
  "editorial_brief": "2-3 paragraph strategic brief: why this theme matters this month for this brand, what angles win, how it ladders into the broader pillar coverage.",
  "article_assignments": [
    {
      "title": "specific working title",
      "angle": "one sentence on the editorial angle",
      "target_keyword": "SEO target if applicable",
      "word_count_target": 800,
      "role": "cover" | "feature" | "supporting" | "cta"
    },
    ... 6-10 entries, mixing roles
  ],
  "sponsor_categories": ["category 1", "category 2", ...],
  "newsletter_angle": "one-sentence angle for the newsletter spotlight",
  "social_hooks": {
    "hashtags": ["#riverregionbirthdays", ...],
    "hooks": ["hook line 1", "hook line 2", ...]
  }
}`

export async function generateCampaignBrief(
  sb:       SupabaseClient,
  campaign: ThemedCampaign,
): Promise<AIBrief> {
  const promptCtx = await loadBrandPromptContext(sb, campaign.brandSlug)
  const brandMd   = renderBrandContextForPrompt(promptCtx)

  // Pull 90-day corpus for tone + topical coverage signal.
  const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
  const { data: arts } = await sb
    .from('guide_articles')
    .select('title, column_slug, seo_focus_keyword')
    .eq('published', true)
    .eq('brand_slug', campaign.brandSlug)
    .gte('published_at', cutoff)
    .order('published_at', { ascending: false })
    .limit(40)

  const articleSummary = ((arts ?? []) as Array<{ title: string; column_slug: string | null; seo_focus_keyword: string | null }>)
    .map(a => `- [${a.column_slug ?? '?'}] ${a.title}${a.seo_focus_keyword ? ` (kw: ${a.seo_focus_keyword})` : ''}`)
    .join('\n') || '(no recent articles)'

  const userPrompt = `${brandMd}

# Campaign to brief
Theme title: ${campaign.themeTitle}
Month: ${new Date(campaign.month + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })}
Brand: ${campaign.brandSlug}
Existing brief (editor wrote): ${campaign.brief || '(none yet)'}
Existing target keywords: ${campaign.targetKeywords.join(', ') || '(none yet)'}

# Last 90 days of articles in this brand (avoid pitching duplicates)
${articleSummary}

Generate the campaign brief per the system prompt instructions.
Emit raw JSON only.`

  const res = await runAI({
    caller:       'campaign-brief-generator',
    taskKind:     'drafting',
    systemPrompt: SYSTEM_PROMPT,
    messages:     [{ role: 'user', content: userPrompt }],
    maxTokens:    8000,
  })

  const raw = res.text.trim()
    .replace(/^```(?:json)?\n?/i, '')
    .replace(/\n?```$/i, '')
    .trim()

  let parsed: AIBrief
  try {
    parsed = JSON.parse(raw) as AIBrief
  } catch {
    throw new Error(`Campaign brief: model returned non-JSON. First 500 chars: ${raw.slice(0, 500)}`)
  }

  return parsed
}
