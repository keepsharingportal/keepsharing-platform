// ── /admin/integrations/ai/usage ─────────────────────────────────────────────
// Where the money went. Per-day spend trend, top callers, top task kinds,
// per-provider month-to-date totals + budget burn-rate, recent errors.
//
// "How much did AI cost RRP this month, what did it pay for, and what's
// about to break?" — answered in one screen.

import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, Settings } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'

export const metadata: Metadata = { title: 'AI Usage — Admin' }
export const dynamic = 'force-dynamic'

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

interface UsageRow {
  provider:          string
  model:             string
  task_kind:         string
  caller:            string | null
  prompt_tokens:     number
  completion_tokens: number
  total_tokens:      number | null
  cost_cents:        number | string
  occurred_at:       string
  duration_ms:       number | null
  error:             string | null
}

interface BudgetRow {
  provider:             string
  monthly_budget_cents: number
}

function dollars(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

function dayKey(iso: string): string {
  return iso.slice(0, 10)
}

function lastNDays(n: number): string[] {
  const out: string[] = []
  const now = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setUTCDate(d.getUTCDate() - i)
    out.push(d.toISOString().slice(0, 10))
  }
  return out
}

export default async function AIUsagePage() {
  const sb = supabaseAdmin()

  let migrated = true
  let rows:    UsageRow[] = []
  let budgets: BudgetRow[] = []
  try {
    const probe = await sb.from('ai_usage_log').select('id').limit(1)
    if (probe.error && /relation .* does not exist/i.test(probe.error.message)) {
      migrated = false
    } else if (!probe.error) {
      // Pull the last 30 days, capped at 10k rows (more than enough headroom).
      const since = new Date()
      since.setUTCDate(since.getUTCDate() - 30)
      const { data } = await sb
        .from('ai_usage_log')
        .select('provider, model, task_kind, caller, prompt_tokens, completion_tokens, total_tokens, cost_cents, occurred_at, duration_ms, error')
        .gte('occurred_at', since.toISOString())
        .order('occurred_at', { ascending: false })
        .limit(10000)
      rows = (data ?? []) as UsageRow[]

      const { data: b } = await sb.from('ai_integrations').select('provider, monthly_budget_cents')
      budgets = (b ?? []) as BudgetRow[]
    }
  } catch { /* fall through */ }

  if (!migrated) {
    return (
      <Shell>
        <div className="bg-portal-amber-lt border border-portal-amber/30 rounded-lg p-4 text-portal-text text-xs">
          <strong>Migration 148 pending.</strong> Usage tracking goes live after the migration runs.
        </div>
      </Shell>
    )
  }

  // Bucket by day for the trend chart.
  const days = lastNDays(30)
  const byDay = new Map<string, { anthropic: number; openai: number }>()
  for (const d of days) byDay.set(d, { anthropic: 0, openai: 0 })
  for (const r of rows) {
    const key = dayKey(r.occurred_at)
    const bucket = byDay.get(key)
    if (!bucket) continue
    if (r.provider === 'anthropic') bucket.anthropic += Number(r.cost_cents)
    else if (r.provider === 'openai') bucket.openai    += Number(r.cost_cents)
  }
  const maxDayCents = Math.max(1, ...Array.from(byDay.values()).map(v => v.anthropic + v.openai))

  // Month-to-date totals per provider.
  const sinceMonth = new Date()
  sinceMonth.setUTCDate(1); sinceMonth.setUTCHours(0, 0, 0, 0)
  const monthRows = rows.filter(r => r.occurred_at >= sinceMonth.toISOString())
  const monthSpend = { anthropic: 0, openai: 0 }
  for (const r of monthRows) {
    if (r.provider === 'anthropic') monthSpend.anthropic += Number(r.cost_cents)
    else if (r.provider === 'openai') monthSpend.openai    += Number(r.cost_cents)
  }
  const budgetFor = (p: string) => budgets.find(b => b.provider === p)?.monthly_budget_cents ?? 0

  // Top callers (this month).
  const callerTotals = new Map<string, { calls: number; cents: number; tokens: number }>()
  for (const r of monthRows) {
    const k = r.caller ?? '(unknown)'
    const v = callerTotals.get(k) ?? { calls: 0, cents: 0, tokens: 0 }
    v.calls += 1
    v.cents += Number(r.cost_cents)
    v.tokens += Number(r.total_tokens ?? r.prompt_tokens + r.completion_tokens)
    callerTotals.set(k, v)
  }
  const topCallers = Array.from(callerTotals.entries())
    .sort((a, b) => b[1].cents - a[1].cents)
    .slice(0, 15)

  // Top tasks (this month).
  const taskTotals = new Map<string, { calls: number; cents: number }>()
  for (const r of monthRows) {
    const k = r.task_kind
    const v = taskTotals.get(k) ?? { calls: 0, cents: 0 }
    v.calls += 1
    v.cents += Number(r.cost_cents)
    taskTotals.set(k, v)
  }
  const topTasks = Array.from(taskTotals.entries()).sort((a, b) => b[1].cents - a[1].cents)

  // Recent errors.
  const recentErrors = rows.filter(r => r.error).slice(0, 10)

  // Burn-rate projection: average daily spend over the last 7 days, extrapolated to month-end.
  const last7 = days.slice(-7).map(d => byDay.get(d)!)
  const avgDaily = last7.reduce((s, b) => s + b.anthropic + b.openai, 0) / Math.max(1, last7.length)
  const now = new Date()
  const lastDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).getUTCDate()
  const daysLeft = lastDay - now.getUTCDate()
  const projectedMonthEnd = (monthSpend.anthropic + monthSpend.openai) + avgDaily * daysLeft

  return (
    <Shell>
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <SummaryCard
          label="Anthropic this month"
          value={dollars(monthSpend.anthropic)}
          sub={budgetFor('anthropic') > 0 ? `of ${dollars(budgetFor('anthropic'))} budget` : 'no budget set'}
          pct={budgetFor('anthropic') > 0 ? (monthSpend.anthropic / budgetFor('anthropic')) * 100 : null}
        />
        <SummaryCard
          label="OpenAI this month"
          value={dollars(monthSpend.openai)}
          sub={budgetFor('openai') > 0 ? `of ${dollars(budgetFor('openai'))} budget` : 'no budget set'}
          pct={budgetFor('openai') > 0 ? (monthSpend.openai / budgetFor('openai')) * 100 : null}
        />
        <SummaryCard
          label="Avg daily (last 7d)"
          value={dollars(avgDaily)}
          sub="across all providers"
          pct={null}
        />
        <SummaryCard
          label="Projected month end"
          value={dollars(projectedMonthEnd)}
          sub={`${daysLeft} days left at current rate`}
          pct={null}
        />
      </div>

      <section className="bg-white border border-portal-border rounded-lg p-5">
        <h3 className="text-sm font-bold text-portal-text mb-3">Daily spend, last 30 days</h3>
        <div className="flex items-end gap-1 h-32">
          {days.map(d => {
            const bucket = byDay.get(d)!
            const total = bucket.anthropic + bucket.openai
            const totalH = (total / maxDayCents) * 100
            const anthH = total > 0 ? (bucket.anthropic / total) * totalH : 0
            const oaiH  = total > 0 ? (bucket.openai    / total) * totalH : 0
            return (
              <div key={d} className="flex-1 flex flex-col justify-end h-full min-w-0" title={`${d} — ${dollars(total)}`}>
                <div className="w-full bg-portal-blue" style={{ height: `${anthH}%` }} />
                <div className="w-full bg-portal-green" style={{ height: `${oaiH}%` }} />
              </div>
            )
          })}
        </div>
        <div className="flex items-center justify-between mt-2 text-[10px] text-portal-muted">
          <span>{days[0]}</span>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1"><span className="inline-block w-2 h-2 bg-portal-blue" /> Anthropic</span>
            <span className="inline-flex items-center gap-1"><span className="inline-block w-2 h-2 bg-portal-green" /> OpenAI</span>
          </div>
          <span>{days[days.length - 1]}</span>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <section className="bg-white border border-portal-border rounded-lg p-5">
          <h3 className="text-sm font-bold text-portal-text mb-3">Top callers (this month)</h3>
          {topCallers.length === 0 ? (
            <p className="text-xs text-portal-muted">No AI calls yet this month.</p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-portal-muted text-left">
                  <th className="pb-2">Caller</th>
                  <th className="pb-2 text-right">Calls</th>
                  <th className="pb-2 text-right">Tokens</th>
                  <th className="pb-2 text-right">Spend</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-portal-border">
                {topCallers.map(([name, v]) => (
                  <tr key={name}>
                    <td className="py-1.5 text-portal-text font-mono">{name}</td>
                    <td className="py-1.5 text-right text-portal-sub">{v.calls}</td>
                    <td className="py-1.5 text-right text-portal-sub">{v.tokens.toLocaleString()}</td>
                    <td className="py-1.5 text-right text-portal-text font-bold">{dollars(v.cents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="bg-white border border-portal-border rounded-lg p-5">
          <h3 className="text-sm font-bold text-portal-text mb-3">Spend by task (this month)</h3>
          {topTasks.length === 0 ? (
            <p className="text-xs text-portal-muted">No AI calls yet this month.</p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-portal-muted text-left">
                  <th className="pb-2">Task</th>
                  <th className="pb-2 text-right">Calls</th>
                  <th className="pb-2 text-right">Spend</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-portal-border">
                {topTasks.map(([k, v]) => (
                  <tr key={k}>
                    <td className="py-1.5 text-portal-text">{k}</td>
                    <td className="py-1.5 text-right text-portal-sub">{v.calls}</td>
                    <td className="py-1.5 text-right text-portal-text font-bold">{dollars(v.cents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>

      {recentErrors.length > 0 && (
        <section className="bg-white border border-portal-border rounded-lg p-5">
          <h3 className="text-sm font-bold text-portal-text mb-3">Recent errors</h3>
          <ul className="space-y-2 text-xs">
            {recentErrors.map((r, i) => (
              <li key={i} className="border-l-2 border-red-500 pl-3">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-portal-muted">{new Date(r.occurred_at).toLocaleString()}</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-portal-sub">{r.provider} · {r.model}</span>
                  <span className="text-[10px] text-portal-muted">{r.caller ?? '(unknown caller)'}</span>
                </div>
                <p className="text-red-700 mt-0.5 break-all">{r.error}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex-1 overflow-y-auto bg-portal-bg">
      <div className="bg-white border-b border-portal-border px-6 py-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <Link href="/admin/integrations/ai" className="inline-flex items-center gap-1 text-[11px] text-portal-blue hover:text-portal-blue-dk mb-1">
              <ArrowLeft size={11} /> AI Integration
            </Link>
            <h1 className="portal-page-title">AI Usage</h1>
            <p className="portal-page-subtitle">Where the spend went — per-day trend, top callers, recent errors.</p>
          </div>
          <Link
            href="/admin/integrations/ai"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-portal-blue hover:text-portal-blue-dk bg-portal-blue-lt border border-portal-blue/30 px-3 py-1.5 rounded-md"
          >
            <Settings size={12} /> Setup
          </Link>
        </div>
      </div>
      <div className="p-6 max-w-6xl space-y-4">
        {children}
      </div>
    </div>
  )
}

interface SummaryProps { label: string; value: string; sub: string; pct: number | null }
function SummaryCard({ label, value, sub, pct }: SummaryProps) {
  const barColor = pct === null ? '' : pct > 90 ? 'bg-red-500' : pct > 75 ? 'bg-portal-amber' : 'bg-portal-green'
  return (
    <div className="bg-white border border-portal-border rounded-lg p-4">
      <div className="text-[11px] font-bold uppercase tracking-wider text-portal-sub">{label}</div>
      <div className="text-2xl font-bold text-portal-text mt-1">{value}</div>
      <div className="text-[11px] text-portal-muted mt-0.5">{sub}</div>
      {pct !== null && (
        <div className="h-1 bg-portal-bg rounded overflow-hidden mt-2">
          <div className={`h-full ${barColor}`} style={{ width: `${Math.min(100, pct)}%` }} />
        </div>
      )}
    </div>
  )
}
