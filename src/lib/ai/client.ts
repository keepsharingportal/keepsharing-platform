// Central AI client — all LLM calls in the codebase route through this.
//
// Why a wrapper at all:
//   - One place to enforce monthly budget caps
//   - One place to log every call (provider, model, tokens, cost, caller, admin)
//   - One place to swap default models per task without redeploying
//   - One place to handle "key not configured" gracefully
//   - One place to switch providers later without rewriting callers
//
// Usage:
//   import { runAI } from '@/lib/ai/client'
//   const out = await runAI({
//     taskKind: 'drafting',
//     caller:   'article-generator',
//     systemPrompt: 'You write in River Region Parents voice...',
//     messages: [{ role: 'user', content: 'Draft an article about...' }],
//     maxTokens: 1500,
//     adminId,
//   })
//
// Existing features migrate over one at a time. While migrating, the
// wrapper falls back to ANTHROPIC_API_KEY / OPENAI_API_KEY env vars if no
// integration row exists yet — that way we never block legacy callers
// during the rollout.

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import {
  ALL_MODELS, ANTHROPIC_MODELS, OPENAI_MODELS, FALLBACK_MODEL_BY_TASK,
  computeCostCents, modelById, type ModelSpec, type Provider,
} from './models'
import {
  AIBudgetExceededError, AINotConfiguredError,
  type AIRequest, type AIResponse, type AITaskKind,
} from './types'

function adminDb(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  )
}

interface IntegrationRow {
  provider: Provider
  api_key: string
  is_active: boolean
  monthly_budget_cents: number
  default_drafting_model:        string | null
  default_classification_model:  string | null
  default_extraction_model:      string | null
  default_games_model:           string | null
  default_coaching_model:        string | null
  default_qa_model:              string | null
  default_caption_model:         string | null
  default_other_model:           string | null
}

/** Resolve which model to use for a given task. Order of precedence:
 *   1. Explicit modelOverride on the request
 *   2. Integration-row default for that task (active rows only)
 *   3. FALLBACK_MODEL_BY_TASK
 *   The selected model determines which provider is called. */
async function resolveModel(req: AIRequest, integrations: IntegrationRow[]): Promise<ModelSpec> {
  if (req.modelOverride) {
    const m = modelById(req.modelOverride)
    if (m) return m
  }
  const column = `default_${req.taskKind}_model` as keyof IntegrationRow
  for (const row of integrations) {
    if (!row.is_active) continue
    const id = row[column] as string | null
    if (id) {
      const m = modelById(id)
      if (m && m.provider === row.provider) return m
    }
  }
  const fallbackId = FALLBACK_MODEL_BY_TASK[req.taskKind]
  const fallback = modelById(fallbackId)
  if (!fallback) throw new Error(`AI fallback model not registered: ${fallbackId}`)
  return fallback
}

/** Total spend (in cents) for a provider over the current calendar month. */
async function monthSpentCents(db: SupabaseClient, provider: Provider): Promise<number> {
  const since = new Date()
  since.setUTCDate(1)
  since.setUTCHours(0, 0, 0, 0)
  const { data, error } = await db
    .from('ai_usage_log')
    .select('cost_cents')
    .eq('provider', provider)
    .gte('occurred_at', since.toISOString())
  if (error) {
    // Don't block calls on a usage-log read failure — that would turn a
    // logging problem into an outage.
    console.warn('[ai/client] monthSpentCents failed:', error.message)
    return 0
  }
  return (data ?? []).reduce((s: number, r: { cost_cents: number | string }) => s + Number(r.cost_cents ?? 0), 0)
}

async function loadIntegrations(db: SupabaseClient): Promise<IntegrationRow[]> {
  const { data, error } = await db.from('ai_integrations').select('*')
  if (error) {
    // Table might not exist yet (pre-migration) — fall through to env-var mode.
    if (/relation .* does not exist/i.test(error.message)) return []
    throw new Error(`ai_integrations load failed: ${error.message}`)
  }
  return (data ?? []) as IntegrationRow[]
}

interface KeyResolution {
  apiKey:          string
  budgetCents:     number | null   // null = no row, no cap
  fromIntegration: boolean
}

function envKeyFor(provider: Provider): string | undefined {
  return provider === 'anthropic'
    ? process.env.ANTHROPIC_API_KEY
    : process.env.OPENAI_API_KEY
}

function resolveKey(provider: Provider, integrations: IntegrationRow[]): KeyResolution {
  const row = integrations.find(r => r.provider === provider && r.is_active)
  if (row && row.api_key) {
    return {
      apiKey: row.api_key,
      budgetCents: row.monthly_budget_cents,
      fromIntegration: true,
    }
  }
  const envKey = envKeyFor(provider)
  if (envKey) {
    return { apiKey: envKey, budgetCents: null, fromIntegration: false }
  }
  throw new AINotConfiguredError(provider)
}

/** Log a usage row. Best-effort — failure here must not throw past the caller. */
async function logUsage(db: SupabaseClient, row: {
  provider: Provider
  model: string
  taskKind: AITaskKind
  caller: string
  promptTokens: number
  completionTokens: number
  costCents: number
  durationMs: number
  adminId: string | null
  error: string | null
}): Promise<void> {
  try {
    await db.from('ai_usage_log').insert({
      provider:              row.provider,
      model:                 row.model,
      task_kind:             row.taskKind,
      caller:                row.caller,
      prompt_tokens:         row.promptTokens,
      completion_tokens:     row.completionTokens,
      cost_cents:            row.costCents,
      duration_ms:           row.durationMs,
      triggered_by_admin_id: row.adminId,
      error:                 row.error,
    })
    if (!row.error) {
      await db.from('ai_integrations')
        .update({ last_used_at: new Date().toISOString() })
        .eq('provider', row.provider)
    }
  } catch (e) {
    console.warn('[ai/client] logUsage failed:', e instanceof Error ? e.message : String(e))
  }
}

// ─── Provider adapters ────────────────────────────────────────────────────

interface ProviderCallResult {
  text:             string
  promptTokens:     number
  completionTokens: number
}

async function callAnthropic(apiKey: string, model: ModelSpec, req: AIRequest): Promise<ProviderCallResult> {
  const messages = req.messages.filter(m => m.role !== 'system').map(m => ({
    role: m.role, content: m.content,
  }))
  const body: Record<string, unknown> = {
    model: model.id,
    max_tokens: req.maxTokens ?? 1024,
    messages,
  }
  if (req.systemPrompt) body.system = req.systemPrompt
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type':      'application/json',
      'x-api-key':         apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`Anthropic API ${res.status}: ${errText.slice(0, 400)}`)
  }
  const data = await res.json() as {
    content?: Array<{ type: string; text?: string }>
    usage?: { input_tokens?: number; output_tokens?: number }
  }
  const text = (data.content ?? [])
    .filter(b => b.type === 'text')
    .map(b => b.text ?? '')
    .join('')
  return {
    text,
    promptTokens:     data.usage?.input_tokens  ?? 0,
    completionTokens: data.usage?.output_tokens ?? 0,
  }
}

async function callOpenAI(apiKey: string, model: ModelSpec, req: AIRequest): Promise<ProviderCallResult> {
  const messages: Array<{ role: string; content: string }> = []
  if (req.systemPrompt) messages.push({ role: 'system', content: req.systemPrompt })
  for (const m of req.messages) messages.push({ role: m.role, content: m.content })
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'content-type':  'application/json',
      'authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model.id,
      messages,
      max_tokens: req.maxTokens ?? 1024,
    }),
  })
  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`OpenAI API ${res.status}: ${errText.slice(0, 400)}`)
  }
  const data = await res.json() as {
    choices?: Array<{ message?: { content?: string } }>
    usage?: { prompt_tokens?: number; completion_tokens?: number }
  }
  const text = data.choices?.[0]?.message?.content ?? ''
  return {
    text,
    promptTokens:     data.usage?.prompt_tokens     ?? 0,
    completionTokens: data.usage?.completion_tokens ?? 0,
  }
}

// ─── Entry point ──────────────────────────────────────────────────────────

export async function runAI(req: AIRequest): Promise<AIResponse> {
  if (!req.caller || !req.taskKind) {
    throw new Error('runAI requires caller + taskKind for usage attribution.')
  }
  const db = adminDb()
  const integrations = await loadIntegrations(db)
  const model = await resolveModel(req, integrations)
  const { apiKey, budgetCents, fromIntegration } = resolveKey(model.provider, integrations)

  // Budget cap — only when the integration row owns the key (env-var fallback
  // has no opinion on budgets).
  if (fromIntegration && budgetCents !== null && budgetCents > 0) {
    const spent = await monthSpentCents(db, model.provider)
    if (spent >= budgetCents) throw new AIBudgetExceededError(spent, budgetCents)
  }

  const start = Date.now()
  let result: ProviderCallResult
  try {
    result = model.provider === 'anthropic'
      ? await callAnthropic(apiKey, model, req)
      : await callOpenAI(apiKey, model, req)
  } catch (e) {
    const durationMs = Date.now() - start
    await logUsage(db, {
      provider:         model.provider,
      model:            model.id,
      taskKind:         req.taskKind,
      caller:           req.caller,
      promptTokens:     0,
      completionTokens: 0,
      costCents:        0,
      durationMs,
      adminId:          req.adminId ?? null,
      error:            e instanceof Error ? e.message.slice(0, 500) : String(e).slice(0, 500),
    })
    throw e
  }
  const durationMs = Date.now() - start
  const costCents  = computeCostCents(model, result.promptTokens, result.completionTokens)

  await logUsage(db, {
    provider:         model.provider,
    model:            model.id,
    taskKind:         req.taskKind,
    caller:           req.caller,
    promptTokens:     result.promptTokens,
    completionTokens: result.completionTokens,
    costCents,
    durationMs,
    adminId:          req.adminId ?? null,
    error:            null,
  })

  return {
    text:             result.text,
    provider:         model.provider,
    model:            model.id,
    promptTokens:     result.promptTokens,
    completionTokens: result.completionTokens,
    costCents,
    durationMs,
  }
}

/** Log a usage row from a caller that invoked a provider SDK directly
 *  (e.g. uses adaptive thinking / output schemas the simple wrapper doesn't
 *  support yet). Keeps the usage dashboard accurate. Best-effort; never
 *  throws.
 *
 *  Use when:
 *   - You're calling the SDK directly because runAI() doesn't expose the
 *     feature you need (adaptive thinking, output_config, streaming hooks).
 *   - You still want the call to show up in /admin/integrations/ai/usage.
 */
export async function logExternalAIUsage(input: {
  provider:         Provider
  model:            string
  taskKind:         AITaskKind
  caller:           string
  promptTokens:     number
  completionTokens: number
  durationMs:       number
  adminId?:         string | null
  error?:           string | null
}): Promise<void> {
  const db = adminDb()
  const spec = modelById(input.model)
  const costCents = spec ? computeCostCents(spec, input.promptTokens, input.completionTokens) : 0
  await logUsage(db, {
    provider:         input.provider,
    model:            input.model,
    taskKind:         input.taskKind,
    caller:           input.caller,
    promptTokens:     input.promptTokens,
    completionTokens: input.completionTokens,
    costCents,
    durationMs:       input.durationMs,
    adminId:          input.adminId ?? null,
    error:            input.error ?? null,
  })
}

/** Read the active API key for a provider — for callers using a provider SDK
 *  directly. Falls back to the env-var if no integration row exists, exactly
 *  as runAI() does. Throws AINotConfiguredError if neither is configured. */
export async function getProviderApiKey(provider: Provider): Promise<string> {
  const db = adminDb()
  const integrations = await loadIntegrations(db)
  const { apiKey } = resolveKey(provider, integrations)
  return apiKey
}

/** Resolve the configured default model id for a (provider, task) pair —
 *  same precedence as runAI(): integration row override → hardcoded fallback.
 *  Useful for direct-SDK callers who need the wrapper's task-routing logic
 *  without the wrapper's HTTP call. */
export async function resolveTaskModelId(taskKind: AITaskKind, provider: Provider): Promise<string> {
  const db = adminDb()
  const integrations = await loadIntegrations(db)
  const column = `default_${taskKind}_model` as keyof IntegrationRow
  for (const row of integrations) {
    if (!row.is_active || row.provider !== provider) continue
    const id = row[column] as string | null
    if (id) return id
  }
  return FALLBACK_MODEL_BY_TASK[taskKind]
}

/** Throw if the provider is over budget. For direct-SDK callers — runAI()
 *  does this internally. */
export async function assertBudgetAvailable(provider: Provider): Promise<void> {
  const db = adminDb()
  const integrations = await loadIntegrations(db)
  const row = integrations.find(r => r.provider === provider && r.is_active)
  if (!row || row.monthly_budget_cents <= 0) return
  const spent = await monthSpentCents(db, provider)
  if (spent >= row.monthly_budget_cents) throw new AIBudgetExceededError(spent, row.monthly_budget_cents)
}

/** True when at least one provider is connected (either via integration row
 *  or env-var fallback). Useful for hiding AI-driven UI when nothing is
 *  configured yet. */
export async function isAIConfigured(): Promise<boolean> {
  const db = adminDb()
  try {
    const integrations = await loadIntegrations(db)
    for (const r of integrations) if (r.is_active && r.api_key) return true
  } catch { /* fall through to env check */ }
  return !!process.env.ANTHROPIC_API_KEY || !!process.env.OPENAI_API_KEY
}

// Re-export for callers who want to introspect.
export { ALL_MODELS, ANTHROPIC_MODELS, OPENAI_MODELS, FALLBACK_MODEL_BY_TASK }
export type { AIRequest, AIResponse, AITaskKind }
