'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/admin/auth'
import { recordAuditEvent } from '@/lib/admin/audit'

type Provider = 'anthropic' | 'openai'

interface ConnectInput {
  provider:              Provider
  apiKey:                string
  monthlyBudgetCents:    number
}

export async function connectProviderAction(input: ConnectInput): Promise<{ ok: true } | { ok: false; error: string }> {
  const ctx = await requireAdmin()
  if (!input.apiKey || input.apiKey.length < 20) {
    return { ok: false, error: 'API key looks too short — paste the full key.' }
  }
  if (input.provider === 'anthropic' && !input.apiKey.startsWith('sk-ant-')) {
    return { ok: false, error: 'Anthropic keys start with sk-ant-. Double-check this is an Anthropic key.' }
  }
  if (input.provider === 'openai' && !input.apiKey.startsWith('sk-')) {
    return { ok: false, error: 'OpenAI keys start with sk-. Double-check this is an OpenAI key.' }
  }
  const sr = createAdminClient()
  const { error } = await sr
    .from('ai_integrations')
    .upsert({
      provider:             input.provider,
      api_key:              input.apiKey,
      is_active:            true,
      monthly_budget_cents: input.monthlyBudgetCents,
      connected_at:         new Date().toISOString(),
      connected_by:         ctx.adminId,
    }, { onConflict: 'provider' })
  if (error) return { ok: false, error: error.message }

  await recordAuditEvent({
    ctx,
    action:       'ai_integration.connected',
    target_table: 'ai_integrations',
    target_id:    input.provider,
    after:        { provider: input.provider, monthly_budget_cents: input.monthlyBudgetCents },
  })

  revalidatePath('/admin/integrations/ai')
  revalidatePath('/admin/integrations')
  return { ok: true }
}

export async function disconnectProviderAction(provider: Provider): Promise<{ ok: true } | { ok: false; error: string }> {
  const ctx = await requireAdmin()
  const sr = createAdminClient()
  const { error } = await sr.from('ai_integrations').delete().eq('provider', provider)
  if (error) return { ok: false, error: error.message }
  await recordAuditEvent({
    ctx,
    action:       'ai_integration.disconnected',
    target_table: 'ai_integrations',
    target_id:    provider,
    before:       { provider },
  })
  revalidatePath('/admin/integrations/ai')
  revalidatePath('/admin/integrations')
  return { ok: true }
}

interface UpdateBudgetInput {
  provider:           Provider
  monthlyBudgetCents: number
}

export async function updateBudgetAction(input: UpdateBudgetInput): Promise<{ ok: true } | { ok: false; error: string }> {
  const ctx = await requireAdmin()
  if (input.monthlyBudgetCents < 0) return { ok: false, error: 'Budget cannot be negative.' }
  const sr = createAdminClient()
  const { error } = await sr
    .from('ai_integrations')
    .update({ monthly_budget_cents: input.monthlyBudgetCents })
    .eq('provider', input.provider)
  if (error) return { ok: false, error: error.message }
  await recordAuditEvent({
    ctx,
    action:       'ai_integration.budget_updated',
    target_table: 'ai_integrations',
    target_id:    input.provider,
    after:        { monthly_budget_cents: input.monthlyBudgetCents },
  })
  revalidatePath('/admin/integrations/ai')
  return { ok: true }
}

interface UpdateDefaultsInput {
  provider: Provider
  defaults: Partial<{
    drafting:        string | null
    classification:  string | null
    extraction:      string | null
    games:           string | null
    coaching:        string | null
    qa:              string | null
    caption:         string | null
    other:           string | null
  }>
}

export async function updateDefaultsAction(input: UpdateDefaultsInput): Promise<{ ok: true } | { ok: false; error: string }> {
  const ctx = await requireAdmin()
  const sr = createAdminClient()
  const patch: Record<string, string | null> = {}
  for (const [k, v] of Object.entries(input.defaults)) patch[`default_${k}_model`] = v ?? null
  const { error } = await sr.from('ai_integrations').update(patch).eq('provider', input.provider)
  if (error) return { ok: false, error: error.message }
  await recordAuditEvent({
    ctx,
    action:       'ai_integration.defaults_updated',
    target_table: 'ai_integrations',
    target_id:    input.provider,
    after:        input.defaults as Record<string, unknown>,
  })
  revalidatePath('/admin/integrations/ai')
  return { ok: true }
}
