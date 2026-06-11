// AI editorial calendar suggester. Joins:
//   - real search demand from Google Search Console
//   - brand voice context
//   - the AI integration
//
// Surfaces "we should write this" with cited evidence. Editorial reviews
// the queue weekly + acts via the admin page (accept → create draft;
// commission → send contributor invite; dismiss → with reason that's fed
// back into the next prompt).

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { runAI } from '@/lib/ai/client'
import { loadBrand, buildBrandPromptFragment } from '@/lib/brands'

function adminDb(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  )
}

interface QueryRollup {
  query:        string
  clicks:       number
  impressions:  number
  positionAvg:  number
  positionN:    number
  /** Top page receiving these clicks — surfaces "this query is mapped to
   *  an article that's not nailing it" patterns. */
  topPage:      string
  topPageClicks: number
}

export interface SuggestionItem {
  brand_slug:        string
  working_headline:  string
  angle:             string
  rationale:         string
  format_suggestion: string
  target_column:     string | null
  evidence:          Record<string, unknown>
  priority:          'high' | 'medium' | 'low'
}

export interface CalendarRunResult {
  status:            'success' | 'error'
  suggestionCount:   number
  queryCount:        number
  error:             string | null
  durationMs:        number
}

const MIN_IMPRESSIONS = 50
const LOOKBACK_DAYS   = 30
const MAX_QUERIES_PER_BRAND = 100

/** Pull the top-opportunity queries: high impressions, sub-par CTR or
 *  position. These are the "we're already showing up but not winning"
 *  signals — exactly what editorial can act on. */
async function loadOpportunityQueries(db: SupabaseClient): Promise<QueryRollup[]> {
  const since = new Date(); since.setUTCDate(since.getUTCDate() - LOOKBACK_DAYS)
  const sinceDay = since.toISOString().slice(0, 10)
  const { data } = await db
    .from('search_console_queries')
    .select('query, page, clicks, impressions, position')
    .gte('day', sinceDay)
    .limit(100_000)
  const rows = (data ?? []) as Array<{ query: string; page: string; clicks: number; impressions: number; position: number }>

  // Roll up query × page → query (carry top page).
  const queryMap = new Map<string, QueryRollup>()
  const pageMap  = new Map<string, Map<string, number>>()    // query → page → clicks
  for (const r of rows) {
    const v = queryMap.get(r.query) ?? { query: r.query, clicks: 0, impressions: 0, positionAvg: 0, positionN: 0, topPage: '', topPageClicks: 0 }
    v.clicks      += r.clicks
    v.impressions += r.impressions
    v.positionAvg += r.position
    v.positionN   += 1
    queryMap.set(r.query, v)

    let pages = pageMap.get(r.query)
    if (!pages) { pages = new Map(); pageMap.set(r.query, pages) }
    pages.set(r.page, (pages.get(r.page) ?? 0) + r.clicks)
  }
  for (const [q, v] of queryMap.entries()) {
    const pages = pageMap.get(q)
    if (pages) {
      let bestPage = ''; let bestClicks = -1
      for (const [page, clicks] of pages.entries()) {
        if (clicks > bestClicks) { bestPage = page; bestClicks = clicks }
      }
      v.topPage = bestPage
      v.topPageClicks = bestClicks
    }
  }

  // Filter to genuinely actionable: enough impressions to matter, AND
  // either low CTR (< 2%) at decent position OR poor position with decent
  // impressions (rank improvement opportunity).
  const filtered = Array.from(queryMap.values()).filter(v => {
    if (v.impressions < MIN_IMPRESSIONS) return false
    const ctr = v.clicks / v.impressions
    const avgPos = v.positionAvg / Math.max(1, v.positionN)
    if (ctr < 0.02 && avgPos <= 10) return true     // we rank, we don't get clicks → headline/snippet
    if (avgPos > 10) return true                     // we don't rank well → topic gap
    return false
  })

  filtered.sort((a, b) => b.impressions - a.impressions)
  return filtered.slice(0, MAX_QUERIES_PER_BRAND)
}

function buildPrompt(brandFragment: string, queries: QueryRollup[], priorDismissals: Array<{ headline: string; reason: string }>, existingArticles: Array<{ title: string; slug: string }>): string {
  const queryBlock = queries.map(q => {
    const ctr = (q.clicks / q.impressions) * 100
    const avgPos = q.positionAvg / Math.max(1, q.positionN)
    return `- "${q.query}" — ${q.impressions} impressions, ${q.clicks} clicks, CTR ${ctr.toFixed(2)}%, avg position ${avgPos.toFixed(1)}, top page: ${q.topPage}`
  }).join('\n')

  const dismissBlock = priorDismissals.length > 0
    ? `\n## PREVIOUSLY DISMISSED (don't suggest these again)\n${priorDismissals.map(d => `- ${d.headline} — dismissed because: ${d.reason}`).join('\n')}\n`
    : ''

  // Existing-article block: when a query is already served by a published
  // article, the suggester should recommend a HEADLINE/SNIPPET REWRITE for
  // that article — not "write a new article on this topic." Without this
  // block the AI proposes content we already published, wasting editorial
  // review time. Capped at 100 most-recent articles to keep token use sane.
  const existingBlock = existingArticles.length > 0
    ? `\n## ALREADY-PUBLISHED ARTICLES (do NOT propose a duplicate; if a query maps to one of these, propose a headline/snippet rewrite tied to that article)\n${existingArticles.map(a => `- "${a.title}" (slug: ${a.slug})`).join('\n')}\n`
    : ''

  return [
    '## BRAND CONTEXT',
    brandFragment,
    '',
    '## SEARCH DEMAND SIGNALS',
    'These are real Google search queries that land readers on this brand\'s site over the last 30 days. They\'re filtered to "opportunity" queries — high impressions but low CTR (headline rewrite or new content opportunity), or impressions at sub-par position (topic gap to rank for):',
    '',
    queryBlock,
    dismissBlock,
    existingBlock,
    '',
    '## TASK',
    'Generate 8-12 specific story ideas this brand should commission. For each, identify which queries it serves (cite them). Distinguish between:',
    '  (a) headline/snippet rewrites of an existing article that ranks but doesn\'t convert',
    '  (b) new articles addressing a topic gap',
    'Prioritize HIGH for ideas tied to queries with >300 impressions AND a clear angle. MEDIUM for solid opportunities. LOW for "nice to have."',
    '',
    'Return STRICT JSON — an array of objects (no wrapper):',
    '[',
    '  {',
    '    "working_headline": "string — title-case proposed headline",',
    '    "angle":           "string — 1-2 sentences on the editorial angle",',
    '    "rationale":       "string — why this matters, citing specific evidence queries",',
    '    "format_suggestion":"string — length, structure, ending hint",',
    '    "target_column":   "string or null — column slug if it fits an existing column",',
    '    "evidence":        { "queries": ["query1", "query2"], "type": "rewrite" or "new" },',
    '    "priority":        "high" | "medium" | "low"',
    '  }',
    ']',
    'Output JSON only. No markdown wrapper.',
  ].filter(Boolean).join('\n')
}

export async function runEditorialCalendar(brandSlug: string, trigger: string = 'manual'): Promise<CalendarRunResult> {
  const db = adminDb()
  const start = Date.now()

  // Open audit row.
  const { data: runRow } = await db
    .from('editorial_calendar_runs')
    .insert({
      brand_slug:   brandSlug,
      started_at:   new Date().toISOString(),
      triggered_by: trigger,
    })
    .select('id')
    .single()
  const runId = (runRow as { id: string } | null)?.id ?? null

  try {
    const brand = await loadBrand(brandSlug)
    if (!brand) throw new Error(`Unknown brand: ${brandSlug}`)
    const brandFragment = buildBrandPromptFragment(brand)

    const queries = await loadOpportunityQueries(db)
    if (queries.length === 0) {
      const result: CalendarRunResult = { status: 'success', suggestionCount: 0, queryCount: 0, error: null, durationMs: Date.now() - start }
      if (runId) await db.from('editorial_calendar_runs').update({
        finished_at: new Date().toISOString(), status: 'success', suggestion_count: 0, query_count_analyzed: 0,
      }).eq('id', runId)
      return result
    }

    // Load prior dismissals so we don't re-suggest the same thing.
    const { data: dismissData } = await db
      .from('editorial_calendar_suggestions')
      .select('working_headline, dismissed_reason')
      .eq('brand_slug', brandSlug)
      .eq('status', 'dismissed')
      .order('reviewed_at', { ascending: false })
      .limit(20)
    const priorDismissals = ((dismissData ?? []) as Array<{ working_headline: string; dismissed_reason: string | null }>)
      .map(d => ({ headline: d.working_headline, reason: d.dismissed_reason ?? '(no reason)' }))

    // Load recent published articles so the AI doesn't propose duplicates.
    // 100 most-recent is enough for the AI to recognize topic overlap without
    // blowing up the prompt; older articles are unlikely to compete for the
    // current opportunity queries anyway.
    const { data: existingData } = await db
      .from('guide_articles')
      .select('title, slug')
      .eq('published', true)
      .order('published_at', { ascending: false })
      .limit(100)
    const existingArticles = ((existingData ?? []) as Array<{ title: string; slug: string }>)

    const prompt = buildPrompt(brandFragment, queries, priorDismissals, existingArticles)
    const response = await runAI({
      taskKind: 'coaching',                          // editorial strategy = "coaching" task — uses better model
      caller:   'editorial-calendar.suggest',
      systemPrompt: 'You are an editorial strategist for hyperlocal media. You take real search-demand data and brand voice rules and propose story commissions that match what readers actually want. Your output is JSON only.',
      messages: [{ role: 'user', content: prompt }],
      maxTokens: 2500,
    })

    // Defensive markdown trim.
    let raw = response.text.trim()
    if (raw.startsWith('```')) raw = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
    const parsed = JSON.parse(raw) as SuggestionItem[]

    if (!Array.isArray(parsed) || parsed.length === 0) {
      throw new Error('AI returned no suggestions')
    }

    const inserts = parsed.map(s => ({
      brand_slug:         brandSlug,
      working_headline:   String(s.working_headline ?? '').slice(0, 300),
      angle:              String(s.angle ?? ''),
      rationale:          String(s.rationale ?? ''),
      format_suggestion:  s.format_suggestion ?? null,
      target_column:      s.target_column ?? null,
      evidence:           s.evidence ?? {},
      priority:           (['high','medium','low'].includes(s.priority) ? s.priority : 'medium') as string,
      generated_by_run_id: runId,
    }))
    await db.from('editorial_calendar_suggestions').insert(inserts)

    const durationMs = Date.now() - start
    if (runId) await db.from('editorial_calendar_runs').update({
      finished_at: new Date().toISOString(), status: 'success',
      suggestion_count: inserts.length, query_count_analyzed: queries.length,
    }).eq('id', runId)
    return { status: 'success', suggestionCount: inserts.length, queryCount: queries.length, error: null, durationMs }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (runId) await db.from('editorial_calendar_runs').update({
      finished_at: new Date().toISOString(), status: 'error', error: msg.slice(0, 1000),
    }).eq('id', runId)
    return { status: 'error', suggestionCount: 0, queryCount: 0, error: msg, durationMs: Date.now() - start }
  }
}
