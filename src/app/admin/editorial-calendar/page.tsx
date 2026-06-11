// ── /admin/editorial-calendar ───────────────────────────────────────────────
// AI-suggested editorial calendar. Joins:
//   - Google Search Console (real demand signals)
//   - Brand voice (how to angle the story for this brand)
//   - AI integration (drafting the suggestions)
//
// Editorial reviews the queue, accepts (creates an article draft),
// commissions (sends a contributor invite), or dismisses with a reason
// that's fed back into the next generation prompt.

import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { Calendar, Search, AlertCircle } from 'lucide-react'
import { MARKETS } from '@/lib/markets'
import { EditorialCalendarClient } from './EditorialCalendarClient'

export const metadata: Metadata = { title: 'Editorial Calendar — Admin' }
export const dynamic = 'force-dynamic'

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export interface SuggestionRow {
  id:                  string
  brand_slug:          string
  working_headline:    string
  angle:               string
  rationale:           string
  format_suggestion:   string | null
  target_column:       string | null
  evidence:            { queries?: string[]; type?: string } | Record<string, unknown>
  status:              string
  priority:            string
  generated_at:        string
  acted_article_id:    string | null
}

export interface RunRow {
  id:                   string
  brand_slug:           string
  started_at:           string
  finished_at:          string | null
  status:               string | null
  suggestion_count:     number | null
  query_count_analyzed: number | null
  error:                string | null
}

interface PageProps {
  searchParams: Promise<{ brand?: string }>
}

export default async function EditorialCalendarPage({ searchParams }: PageProps) {
  const { brand } = await searchParams
  const brandSlug = brand && MARKETS.some(m => m.slug === brand) ? brand : 'rrp'
  const sb = supabaseAdmin()

  let migrated = true
  let gscReady = true
  let suggestions: SuggestionRow[] = []
  let runs: RunRow[] = []

  try {
    const probe = await sb.from('editorial_calendar_suggestions').select('id').limit(1)
    if (probe.error && /relation .* does not exist/i.test(probe.error.message)) {
      migrated = false
    } else if (!probe.error) {
      const { data: sData } = await sb
        .from('editorial_calendar_suggestions')
        .select('*')
        .eq('brand_slug', brandSlug)
        .order('generated_at', { ascending: false })
        .limit(100)
      suggestions = (sData ?? []) as SuggestionRow[]

      const { data: rData } = await sb
        .from('editorial_calendar_runs')
        .select('*')
        .eq('brand_slug', brandSlug)
        .order('started_at', { ascending: false })
        .limit(5)
      runs = (rData ?? []) as RunRow[]
    }
  } catch { /* fall through */ }

  try {
    const probe = await sb.from('search_console_queries').select('id').limit(1)
    if (probe.error) gscReady = false
  } catch { gscReady = false }

  return (
    <div className="flex-1 overflow-y-auto bg-portal-bg">
      <div className="bg-white border-b border-portal-border px-6 py-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Calendar size={16} className="text-portal-blue" />
          <h1 className="portal-page-title">Editorial Calendar</h1>
        </div>
        <p className="portal-page-subtitle">
          AI-suggested story ideas built from real Google search demand + your brand voice. Review the queue weekly.
        </p>
      </div>

      <div className="p-6 max-w-5xl space-y-6">
        {!migrated && (
          <div className="bg-portal-amber-lt border border-portal-amber/30 rounded-lg p-4 text-portal-text text-xs">
            <strong>Migration 155 pending.</strong> Apply <code className="bg-white px-1 py-0.5 rounded border border-portal-border">supabase/migrations/155_editorial_calendar.sql</code>.
          </div>
        )}

        {migrated && !gscReady && (
          <div className="bg-portal-amber-lt border border-portal-amber/30 rounded-lg p-4 text-portal-text text-xs">
            <strong>Google Search Console not connected.</strong> The calendar suggester needs query data to work. Set it up at <Link href="/admin/integrations/search-console" className="text-portal-blue hover:underline">/admin/integrations/search-console</Link> and run a sync first.
          </div>
        )}

        {migrated && gscReady && (
          <EditorialCalendarClient
            currentBrand={brandSlug}
            suggestions={suggestions}
            runs={runs}
          />
        )}

        {migrated && (
          <div className="bg-white border border-portal-border rounded-lg p-5 text-xs text-portal-sub leading-relaxed">
            <div className="flex items-center gap-2 mb-2">
              <Search size={14} className="text-portal-blue" />
              <h3 className="text-sm font-bold text-portal-text">How the suggester thinks</h3>
            </div>
            <ol className="list-decimal pl-5 space-y-1">
              <li>Pulls the last 30 days of Google Search Console queries for this brand.</li>
              <li>Filters to "opportunity" queries: high impressions but low CTR (you rank but don&apos;t convert) OR position past 10 with real impressions (topic gap).</li>
              <li>Sends those queries + your brand voice + previously-dismissed ideas to the AI integration.</li>
              <li>Returns 8-12 specific story commissions with priority, rationale citing the evidence, and target column.</li>
              <li>Anything you dismiss with a reason gets fed back into the next run so it doesn&apos;t resurface.</li>
            </ol>
            <p className="text-portal-muted mt-3 text-[11px]">
              Set or refine the brand voice at <Link href="/admin/settings/brands" className="text-portal-blue hover:underline">/admin/settings/brands</Link>. The AI integration must be configured at <Link href="/admin/integrations/ai" className="text-portal-blue hover:underline">/admin/integrations/ai</Link>.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
