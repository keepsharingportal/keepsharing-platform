// AI model registry — model IDs, current pricing, and default picks per task.
//
// Update the prices when the providers update theirs (anthropic.com/pricing
// + openai.com/api/pricing). The cost is computed at client.ts call time so
// outdated numbers undercount but don't break anything.
//
// Pricing is per million tokens (industry convention). Storage in the
// usage log is per token in cents (NUMERIC(10,4)).

import type { AITaskKind } from './types'

export type Provider = 'openai' | 'anthropic'

export interface ModelSpec {
  /** Canonical model id passed to the provider API. */
  id:                 string
  provider:           Provider
  /** Display label for the admin UI. */
  label:              string
  /** $ per million INPUT tokens (USD). */
  inputPerMUsd:       number
  /** $ per million OUTPUT tokens (USD). */
  outputPerMUsd:      number
  /** Marketing description for the picker. */
  description:        string
  /** When true, the picker recommends this model for the task. */
  recommendedFor?:    AITaskKind[]
}

// Anthropic Claude family. Names align with current public model IDs.
// Recheck at anthropic.com/api before bumping defaults. The user has an
// existing ANTHROPIC_API_KEY env var that the new client can pick up as
// a fallback during the migration phase.
export const ANTHROPIC_MODELS: ModelSpec[] = [
  {
    id: 'claude-opus-4-8',
    provider: 'anthropic',
    label: 'Claude Opus 4.8',
    inputPerMUsd:  15,
    outputPerMUsd: 75,
    description: 'Highest quality, slowest, most expensive. Use for strategic content (advertiser coaching, key articles).',
    recommendedFor: ['coaching'],
  },
  {
    id: 'claude-sonnet-4-6',
    provider: 'anthropic',
    label: 'Claude Sonnet 4.6',
    inputPerMUsd:  3,
    outputPerMUsd: 15,
    description: 'Balanced — strong quality at a fraction of Opus cost. Default for drafting + most workflows.',
    recommendedFor: ['drafting', 'qa', 'caption', 'extraction', 'other'],
  },
  {
    id: 'claude-haiku-4-5-20251001',
    provider: 'anthropic',
    label: 'Claude Haiku 4.5',
    inputPerMUsd:  0.8,
    outputPerMUsd: 4,
    description: 'Cheap + fast. Right for classification, light-touch extraction, and high-volume work where quality is "good enough."',
    recommendedFor: ['classification', 'games'],
  },
]

// OpenAI GPT family. Pricing as of early 2026; recheck at openai.com.
export const OPENAI_MODELS: ModelSpec[] = [
  {
    id: 'gpt-4o',
    provider: 'openai',
    label: 'GPT-4o',
    inputPerMUsd:  2.50,
    outputPerMUsd: 10,
    description: 'OpenAI flagship. Strong general quality, good vision support if we add image inputs later.',
    recommendedFor: ['drafting', 'qa', 'caption'],
  },
  {
    id: 'gpt-4o-mini',
    provider: 'openai',
    label: 'GPT-4o mini',
    inputPerMUsd:  0.15,
    outputPerMUsd: 0.60,
    description: 'Very cheap, fast, surprisingly capable. Right for classification and bulk extraction.',
    recommendedFor: ['classification', 'extraction', 'games'],
  },
]

export const ALL_MODELS: ModelSpec[] = [...ANTHROPIC_MODELS, ...OPENAI_MODELS]

export function modelById(id: string): ModelSpec | null {
  return ALL_MODELS.find(m => m.id === id) ?? null
}

// "When no admin override + no integration default, what model do we pick?"
// These are the safest sensible defaults given current pricing.
export const FALLBACK_MODEL_BY_TASK: Record<AITaskKind, string> = {
  drafting:       'claude-sonnet-4-6',
  classification: 'claude-haiku-4-5-20251001',
  extraction:     'claude-haiku-4-5-20251001',
  games:          'claude-haiku-4-5-20251001',
  coaching:       'claude-sonnet-4-6',
  qa:             'claude-sonnet-4-6',
  caption:        'claude-sonnet-4-6',
  other:          'claude-sonnet-4-6',
}

/** Compute cost in cents from token counts + model. NUMERIC(10,4) handles
 *  fractional cents accurately. */
export function computeCostCents(model: ModelSpec, promptTokens: number, completionTokens: number): number {
  const inUsd  = (promptTokens     / 1_000_000) * model.inputPerMUsd
  const outUsd = (completionTokens / 1_000_000) * model.outputPerMUsd
  return (inUsd + outUsd) * 100   // cents
}
