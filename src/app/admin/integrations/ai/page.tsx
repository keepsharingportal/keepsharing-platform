// ── /admin/integrations/ai ───────────────────────────────────────────────────
// AI provider setup: paste keys, set monthly budget caps, choose default
// models per task. The wrapper at src/lib/ai/client.ts reads these rows.
//
// Two cards: one for Anthropic, one for OpenAI. Either can be connected
// independently. The wrapper picks the provider based on which model is
// selected for a task — so wiring both lets you mix-and-match (e.g. Haiku
// for classification, GPT-4o for drafting).

import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, BarChart3 } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'
import { AIIntegrationClient } from './AIIntegrationClient'
import { ANTHROPIC_MODELS, OPENAI_MODELS } from '@/lib/ai/models'

export const metadata: Metadata = { title: 'AI Integration — Admin' }
export const dynamic = 'force-dynamic'

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export interface AIIntegrationRow {
  id:                            string
  provider:                      'anthropic' | 'openai'
  api_key:                       string
  is_active:                     boolean
  monthly_budget_cents:          number
  default_drafting_model:        string | null
  default_classification_model:  string | null
  default_extraction_model:      string | null
  default_games_model:           string | null
  default_coaching_model:        string | null
  default_qa_model:              string | null
  default_caption_model:         string | null
  default_other_model:           string | null
  connected_at:                  string
  last_used_at:                  string | null
}

export default async function AIIntegrationPage() {
  const sb = supabaseAdmin()

  let migrated   = true
  let rows: AIIntegrationRow[] = []
  try {
    const probe = await sb.from('ai_integrations').select('id').limit(1)
    if (probe.error && /relation .* does not exist/i.test(probe.error.message)) {
      migrated = false
    } else if (!probe.error) {
      const { data } = await sb.from('ai_integrations').select('*')
      rows = (data ?? []) as AIIntegrationRow[]
    }
  } catch { /* fall through */ }

  // Current-month spend per provider, for the dashboard summary card.
  const spend: Record<string, number> = { anthropic: 0, openai: 0 }
  if (migrated) {
    const since = new Date()
    since.setUTCDate(1); since.setUTCHours(0, 0, 0, 0)
    const { data } = await sb
      .from('ai_usage_log')
      .select('provider, cost_cents')
      .gte('occurred_at', since.toISOString())
    for (const r of (data ?? []) as Array<{ provider: string; cost_cents: number | string }>) {
      spend[r.provider] = (spend[r.provider] ?? 0) + Number(r.cost_cents ?? 0)
    }
  }

  return (
    <div className="flex-1 overflow-y-auto bg-portal-bg">
      <div className="bg-white border-b border-portal-border px-6 py-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <Link href="/admin/integrations" className="inline-flex items-center gap-1 text-[11px] text-portal-blue hover:text-portal-blue-dk mb-1">
              <ArrowLeft size={11} /> Integrations
            </Link>
            <h1 className="portal-page-title">AI Integration</h1>
            <p className="portal-page-subtitle">
              Centralized LLM keys + budget caps + per-task model picks. All AI calls in the app route through these.
            </p>
          </div>
          <Link
            href="/admin/integrations/ai/usage"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-portal-blue hover:text-portal-blue-dk bg-portal-blue-lt border border-portal-blue/30 px-3 py-1.5 rounded-md"
          >
            <BarChart3 size={12} /> Usage dashboard
          </Link>
        </div>
      </div>

      <div className="p-6 max-w-4xl space-y-6">
        {!migrated ? (
          <div className="bg-portal-amber-lt border border-portal-amber/30 rounded-lg p-4 text-portal-text text-xs">
            <strong>Migration 148 pending.</strong> Run <code className="bg-white px-1 py-0.5 rounded border border-portal-border">supabase/migrations/148_ai_integration.sql</code> against the database before connecting providers.
          </div>
        ) : (
          <AIIntegrationClient
            rows={rows}
            anthropicModels={ANTHROPIC_MODELS}
            openaiModels={OPENAI_MODELS}
            monthSpendCents={spend}
            envAnthropicConfigured={!!process.env.ANTHROPIC_API_KEY}
            envOpenAIConfigured={!!process.env.OPENAI_API_KEY}
          />
        )}

        <div className="bg-white border border-portal-border rounded-lg p-5 text-xs text-portal-sub leading-relaxed space-y-3">
          <h3 className="text-sm font-bold text-portal-text">How task routing works</h3>
          <p>
            Every AI call in the codebase declares a <code className="bg-portal-bg px-1 py-0.5 rounded border border-portal-border">taskKind</code> — drafting, classification, extraction, games, coaching, QA, caption, or other.
            The wrapper picks the model in this order:
          </p>
          <ol className="list-decimal pl-5 space-y-1">
            <li>Explicit override passed at the call site (rare).</li>
            <li><strong>Default model for this task on the active integration row</strong> (set below).</li>
            <li>Hardcoded sensible fallback in <code className="bg-portal-bg px-1 py-0.5 rounded border border-portal-border">src/lib/ai/models.ts</code> (Sonnet 4.6 for most tasks; Haiku 4.5 for high-volume).</li>
          </ol>
          <p>
            Set the default per task to whatever balance of quality / cost makes sense. The picker shows recommended models per task — those are the picks for a healthy regional publication budget.
          </p>
        </div>
      </div>
    </div>
  )
}
