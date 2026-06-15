// ── AI-assisted SEO content generation ──────────────────────────────────────
//
// Given an article body + the article's brand context, Claude
// generates:
//   - SEO title (50-60 chars, keyword-leading, location-aware)
//   - Meta description (150-160 chars, action-oriented, location-aware)
//   - Focus keyword (the primary phrase this article should target)
//   - Secondary keywords (LSI / related)
//
// Brand-aware: pulls knowsAbout + areaServed from brand-seo so the
// suggestions naturally incorporate "Montgomery families", "River
// Region schools", "Mobile Bay parents" etc.

import { runAI } from '@/lib/ai/client'
import { getBrandSeoConfig } from '@/lib/seo/brand-seo'
import { MARKETS } from '@/lib/markets'
import { createAdminClient } from '@/lib/supabase/admin'
import { loadBrandPromptContext, renderBrandContextForPrompt } from '@/lib/seo/brand-profile'

export interface SeoAssistInput {
  articleTitle:   string
  articleBody:    string          // HTML or text; we'll strip tags
  articleColumn?: string | null   // column slug for context
  brandSlug:      string          // 'rrp' | 'mbp' | etc.
  /** Existing values, if any — the AI returns suggestions even when
   *  these are set so the editor can compare. */
  existingSeoTitle?:       string | null
  existingSeoDescription?: string | null
  existingFocusKeyword?:   string | null
}

export interface SeoAssistOutput {
  seoTitle:           string
  seoDescription:     string
  focusKeyword:       string
  secondaryKeywords:  string[]
  rationale:          string  // 1-sentence explanation
}

function stripHtml(html: string): string {
  return (html ?? '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi,  ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const SYSTEM_PROMPT = `You are an SEO editor for a network of local family magazines.
Each magazine serves a specific community (e.g. River Region Parents covers Montgomery,
Mobile Bay Parents covers Mobile, etc.). Your job is to write SEO titles + descriptions
+ pick focus keywords that maximize local-search ranking for the magazine's home market
while reading like a real publication editor wrote them.

CONSTRAINTS — every output MUST honor these:
- SEO title: 50-60 characters. Lead with the most important keyword phrase. No "—
  Publication Name" suffix (the renderer appends the brand). Title Case.
- Meta description: 150-160 characters. Action-oriented (what the reader gets).
  Include the focus keyword naturally. End with a period.
- Focus keyword: the primary 2-5 word phrase. Should appear in the article body.
  Prefer phrases that include the regional/locality identifier when natural
  (e.g. "Montgomery preschools", "River Region summer camps").
- Secondary keywords: 3-5 LSI / related phrases. No quotes. Comma-separated.
- Avoid clickbait, all-caps, exclamation marks, em-dashes in the title.
- Write like a magazine editor, not a marketer.

STRATEGIC ALIGNMENT — when the brand has a strategic brief in the prompt:
- Prefer keywords that ladder up to an existing topic pillar.
- Reach for sub-area target keywords when the article is locality-specific.
- Respect the negative_space list — never suggest a keyword from it.
- Match the voice_notes if present.
- If the current month's calendar themes apply to the article, lean into them
  in the description so the page is seasonally relevant.

OUTPUT FORMAT — emit raw JSON only, no prose, no code fences:
{
  "seoTitle": "...",
  "seoDescription": "...",
  "focusKeyword": "...",
  "secondaryKeywords": ["...", "..."],
  "rationale": "One short sentence explaining the keyword choice and what's targeted."
}`

export async function generateSeoSuggestions(input: SeoAssistInput): Promise<SeoAssistOutput> {
  const market = MARKETS.find(m => m.slug === input.brandSlug)
  if (!market) throw new Error(`Unknown brand: ${input.brandSlug}`)

  // We synthesize publicOrigin since brand-seo wants it; for prompt
  // construction we only care about the labels, not the origin.
  const seo = getBrandSeoConfig(market, `https://${market.publicHost ?? 'example.com'}`)

  // Pull the brand's strategic brief — pillars/personas/calendar/etc —
  // so SEO suggestions land aligned to the brand's stated strategy
  // instead of generic "use a focus keyword" advice. Falls through
  // gracefully when the profile is empty (renderer just emits the
  // baseline brand identity in that case).
  const sb       = createAdminClient()
  const promptCtx = await loadBrandPromptContext(sb, input.brandSlug)
  const brandCtxMd = renderBrandContextForPrompt(promptCtx)

  const bodyText = stripHtml(input.articleBody)
  const bodyForPrompt = bodyText.slice(0, 4000)  // cap for cost; leading body is the highest-signal part

  const userPrompt = `${brandCtxMd}

# This specific article
${input.articleColumn ? `Editorial column: ${input.articleColumn}` : ''}

Article title (as written by the editor): "${input.articleTitle}"

Article body (truncated to first 4000 chars for cost):
"""
${bodyForPrompt}
"""

${input.existingSeoTitle       ? `Existing SEO title (may be tweaked): "${input.existingSeoTitle}"`             : ''}
${input.existingSeoDescription ? `Existing meta description (may be tweaked): "${input.existingSeoDescription}"` : ''}
${input.existingFocusKeyword   ? `Existing focus keyword (consider keeping): "${input.existingFocusKeyword}"`     : ''}

Now generate the SEO fields. The locality should appear naturally somewhere
in the title OR description OR focus keyword (preferably more than one) because
this is a local-search-targeted publication.`

  const res = await runAI({
    caller:       'seo-assist',
    taskKind:     'drafting',
    systemPrompt: SYSTEM_PROMPT,
    messages:     [{ role: 'user', content: userPrompt }],
    maxTokens:    800,
  })

  // Strip code fences if the model returns them despite the instruction
  const raw = res.text.trim()
    .replace(/^```(?:json)?\n?/i, '')
    .replace(/\n?```$/i, '')
    .trim()

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error(`SEO assist: model returned non-JSON: ${raw.slice(0, 200)}`)
  }
  const obj = parsed as Record<string, unknown>
  return {
    seoTitle:          asStr(obj.seoTitle,        'seoTitle'),
    seoDescription:    asStr(obj.seoDescription,  'seoDescription'),
    focusKeyword:      asStr(obj.focusKeyword,    'focusKeyword'),
    secondaryKeywords: Array.isArray(obj.secondaryKeywords)
                       ? obj.secondaryKeywords.map((k, i) => asStr(k, `secondaryKeywords[${i}]`))
                       : [],
    rationale:         asStr(obj.rationale,       'rationale'),
  }
}

function asStr(v: unknown, field: string): string {
  if (typeof v !== 'string' || !v.trim()) throw new Error(`SEO assist: missing/invalid ${field}`)
  return v.trim()
}
