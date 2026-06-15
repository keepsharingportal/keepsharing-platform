// ── Weekly Claude SEO audit ─────────────────────────────────────────────────
//
// Runs once a week per brand (cron Sun 02:00 UTC). Pulls the corpus
// state + GSC data + open issues, ships it all to Claude with a
// strict prompt that asks for: a prioritized action list, market
// coverage gaps, and a "what to publish next" recommendation list.
//
// Writes a row into seo_audit_runs with:
//   - report_markdown   — full LLM-generated narrative (rendered in admin)
//   - action_items      — programmatic list of {kind, target_id?, severity,
//                         recommendation, fix_url?}; UI surfaces as clickable
//                         tasks the editor can knock off in order
//   - articles_checked  — count of articles included in the audit
//   - tokens_used       — for cost tracking

import type { SupabaseClient } from '@supabase/supabase-js'
import { runAI } from '@/lib/ai/client'
import { getBrandSeoConfig } from '@/lib/seo/brand-seo'
import { MARKETS } from '@/lib/markets'
import { loadBrandPromptContext, renderBrandContextForPrompt } from '@/lib/seo/brand-profile'
import { computeBrandHealth } from '@/lib/seo/brand-health'

export interface ActionItem {
  kind:           'fix-article' | 'set-focus-keyword' | 'add-redirect' | 'fill-content-gap' | 'improve-internal-linking' | 'other'
  severity:       'high' | 'medium' | 'low'
  recommendation: string
  /** Article ID / page URL the action targets, when applicable. */
  target_id?:     string
  fix_url?:       string
}

export interface AuditOutput {
  reportMarkdown: string
  actionItems:    ActionItem[]
  articlesChecked: number
  tokensUsed:     number
  modelUsed:      string
}

const SYSTEM_PROMPT = `You are a senior local-SEO strategist for a family-publication
network. Each week you audit one brand's site and produce a prioritized action
report for the editor. Your goal: get the publication's most-targeted local
queries to page 1 of Google in its market.

You write reports that read like a smart consultant briefing — direct,
specific, with concrete next actions. Not generic SEO platitudes.

Anchor every recommendation in the brand's stated STRATEGY (pillars, sub-areas,
personas, editorial calendar themes). When the strategy says "October themes:
Halloween events, fall sports, harvest festivals" — your report calls out
missing coverage on those specifically.

Every recommendation must:
  - name a SPECIFIC article (by title) OR a SPECIFIC content gap aligned to
    a pillar / sub-area / persona / calendar theme
  - explain WHY (e.g. "GSC shows position 14 for 'Montgomery pediatricians' —
    one stronger H2 + adding focus keyword to first paragraph likely moves it
    to page 1; also matches the Healthy Kids pillar")
  - be ACTIONABLE in one editorial session (not "rewrite the site")
  - never suggest topics in the brand's negative_space list
  - respect the voice_notes when proposing content

OUTPUT FORMAT — emit raw JSON only, no prose outside the JSON, no code fences:
{
  "reportMarkdown": "Full audit report as markdown. Sections in this order:\\n
    ## Summary (2-3 sentences: what shape is the site in, top opportunity)\\n
    ## Quick wins (3-5 articles at position 11-20 that can hit page 1 with one
       session of work — title + specific edit + why)\\n
    ## Content gaps (target keywords with no article currently on the site —
       3-5 ideas, each with: query, why it matters, suggested article angle)\\n
    ## Articles needing focus keyword (any published article missing
       seo_focus_keyword — list, with suggested keyword each)\\n
    ## Other observations (orphans, low-score articles, anything else worth
       flagging)",
  "actionItems": [
    {
      "kind": "fix-article",
      "severity": "high",
      "recommendation": "specific action with article title quoted",
      "target_id": "uuid-or-empty",
      "fix_url": "/admin/articles/<id>/seo if known"
    }
  ]
}`

interface CorpusArticle {
  id:                string
  title:             string
  slug:              string
  column_slug:       string | null
  published_at:      string | null
  seo_score:         number | null
  seo_focus_keyword: string | null
  seo_title:         string | null
  seo_description:   string | null
}

export async function runWeeklyAudit(
  sb: SupabaseClient,
  brandSlug: string,
): Promise<AuditOutput> {
  const market = MARKETS.find(m => m.slug === brandSlug)
  if (!market) throw new Error(`Unknown brand: ${brandSlug}`)
  const seo = getBrandSeoConfig(market, `https://${market.publicHost ?? 'example.com'}`)

  // ── Gather the corpus state for the prompt ──────────────────────────
  // Last 90 days of published articles + their key SEO fields.
  const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
  const { data: recent } = await sb
    .from('guide_articles')
    .select('id, title, slug, column_slug, published_at, seo_score, seo_focus_keyword, seo_title, seo_description')
    .eq('published', true)
    .gte('published_at', cutoff)
    .order('published_at', { ascending: false })
    .limit(200)
  const articles = (recent ?? []) as CorpusArticle[]

  // Articles missing focus_keyword — high-leverage to fill in
  const missingFK = articles.filter(a => !a.seo_focus_keyword)

  // Low-score articles — score < 60
  const lowScore  = articles.filter(a => typeof a.seo_score === 'number' && a.seo_score < 60)

  // GSC "almost ranking" — positions 11-20 (page 2). When GSC data
  // isn't connected yet, this list will be empty and the prompt
  // handles that gracefully.
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const { data: gscRows } = await sb
    .from('search_console_data')
    .select('page_url, query, position, clicks, impressions')
    .eq('brand_slug', brandSlug)
    .gte('date', sevenDaysAgo)
    .gte('position', 11)
    .lte('position', 20)
    .order('impressions', { ascending: false })
    .limit(50)
  const pageTwoQueries = (gscRows ?? []) as Array<{
    page_url: string; query: string; position: number; clicks: number; impressions: number
  }>

  // Stale / open suggestions
  const { count: pendingLinkCount } = await sb
    .from('internal_link_suggestions')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending')

  // ── Build the user prompt (compact — Claude reads better short) ────
  const articleSummary = articles.slice(0, 80).map(a => ({
    id:      a.id,
    title:   a.title,
    column:  a.column_slug,
    score:   a.seo_score,
    fk:      a.seo_focus_keyword,
  }))

  // Pull the FULL strategic brief — pillars / sub-areas / personas /
  // editorial calendar / linkable assets / negative space / voice
  // notes — so the audit speaks the editor's strategy back to them
  // instead of generic best-practices.
  const promptCtx       = await loadBrandPromptContext(sb, brandSlug)
  const brandContextMd  = renderBrandContextForPrompt(promptCtx)

  // Composite brand-health snapshot — the single 0-100 score + its
  // weakest component lets Claude lead the report with "your biggest
  // lever this week is X" instead of generic SEO platitudes.
  const health = await computeBrandHealth(sb, brandSlug)
  const weakestComponent = pickWeakest(health)

  const healthBriefMd = `# Brand health snapshot
Composite score: **${health.score}/100** (${health.grade})
Components:
- Avg article SEO score:    ${health.avgArticleScore} (weight 40%)
- % with focus keyword:     ${health.withFocusKeywordPct}% (weight 20%)
- % with meta description:  ${health.withDescriptionPct}% (weight 15%)
- % with hero image:        ${health.withHeroImagePct}% (weight 10%)
- Recency (days w/ publish in last 30): ${health.recencyPct}% (weight 15%)
Weakest leverage point: **${weakestComponent}** — your report's Summary should call this out as the #1 lever for next week.`

  const userPrompt = `${brandContextMd}

${healthBriefMd}

# Audit corpus context
Brand: ${seo.organizationName}
Area served: ${seo.areaServedLabel}
Target local queries for this brand: ${seo.targetKeywords.join(', ')}
Known competitor domains: ${seo.competitorDomains.join(', ') || '(none listed)'}

Corpus snapshot (last 90 days, top 80 by recency):
${JSON.stringify(articleSummary, null, 2)}

Articles missing seo_focus_keyword (${missingFK.length}):
${missingFK.slice(0, 30).map(a => `- ${a.title} [/columns/${a.column_slug}/${a.slug}]`).join('\n') || '(none)'}

Articles with score < 60 (${lowScore.length}):
${lowScore.slice(0, 20).map(a => `- ${a.title} (score ${a.seo_score})`).join('\n') || '(none)'}

Search Console "almost ranking" queries (positions 11-20 in the last 7 days, top 30 by impressions):
${pageTwoQueries.slice(0, 30).map(r => `- "${r.query}" → ${r.page_url} @ position ${r.position.toFixed(1)} (${r.impressions} impressions, ${r.clicks} clicks)`).join('\n') || '(GSC data not available — note this in the report)'}

Internal-link suggestions pending review: ${pendingLinkCount ?? 0}

Now write the audit report per the system-prompt instructions. The
editor will open it in the admin and work through your action list
this week.`

  const res = await runAI({
    caller:       'seo-weekly-audit',
    taskKind:     'qa',
    systemPrompt: SYSTEM_PROMPT,
    messages:     [{ role: 'user', content: userPrompt }],
    maxTokens:    8000,
  })

  // Parse model output (strict JSON). Strip optional code fences.
  const raw = res.text.trim()
    .replace(/^```(?:json)?\n?/i, '')
    .replace(/\n?```$/i, '')
    .trim()

  let parsed: unknown
  try { parsed = JSON.parse(raw) } catch {
    throw new Error(`Weekly audit: model returned non-JSON: ${raw.slice(0, 300)}`)
  }
  const obj = parsed as Record<string, unknown>
  const reportMarkdown = (typeof obj.reportMarkdown === 'string' ? obj.reportMarkdown : '').trim()
  const actionItems    = Array.isArray(obj.actionItems) ? obj.actionItems as ActionItem[] : []
  if (!reportMarkdown) throw new Error('Weekly audit: missing reportMarkdown')

  return {
    reportMarkdown,
    actionItems,
    articlesChecked: articles.length,
    tokensUsed:      res.promptTokens + res.completionTokens,
    modelUsed:       res.model,
  }
}

/** Of the 4 percentage-based health components, return the human-readable
 *  label of whichever sits lowest. Drives the "biggest lever this week"
 *  line in the brand-health brief Claude reads. */
function pickWeakest(h: {
  withFocusKeywordPct: number
  withDescriptionPct:  number
  withHeroImagePct:    number
  recencyPct:          number
}): string {
  const candidates: Array<[string, number]> = [
    ['focus-keyword coverage', h.withFocusKeywordPct],
    ['meta-description coverage', h.withDescriptionPct],
    ['hero-image coverage',   h.withHeroImagePct],
    ['publishing recency',    h.recencyPct],
  ]
  candidates.sort((a, b) => a[1] - b[1])
  return `${candidates[0][0]} (${candidates[0][1]}%)`
}
