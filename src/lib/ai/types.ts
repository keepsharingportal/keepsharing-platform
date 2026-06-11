// AI integration shared types.

export type AITaskKind =
  | 'drafting'        // article first-drafts, longform editorial output
  | 'classification'  // tagging, routing, yes/no judgments
  | 'extraction'      // pulling structured data out of raw text/images
  | 'games'           // Brain Games content generation
  | 'coaching'        // advertiser report insights, sales-pitch language
  | 'qa'              // contributor magic-link Q&A → article draft pipeline
  | 'caption'         // social post captions
  | 'other'

export interface AIMessage {
  role:    'user' | 'assistant' | 'system'
  content: string
}

export interface AIRequest {
  /** What kind of task this is — drives default model selection + budget bucket. */
  taskKind:     AITaskKind
  /** Optional system prompt (often the brand voice / format spec). */
  systemPrompt?: string
  /** Conversation history; usually a single user message. */
  messages:     AIMessage[]
  /** Hard upper bound on output tokens. Defaults to a sensible value per task. */
  maxTokens?:   number
  /** Human-readable origin label for the usage log, e.g. 'games.generate'. */
  caller:       string
  /** Override the chosen model — usually leave unset; integration defaults apply. */
  modelOverride?: string
  /** Admin who triggered this call (for usage attribution). */
  adminId?:     string | null
}

export interface AIResponse {
  text:             string
  provider:         'openai' | 'anthropic'
  model:            string
  promptTokens:     number
  completionTokens: number
  costCents:        number
  durationMs:       number
}

export class AIBudgetExceededError extends Error {
  constructor(public spentCents: number, public budgetCents: number) {
    super(`AI monthly budget exceeded: $${(spentCents / 100).toFixed(2)} of $${(budgetCents / 100).toFixed(2)}.`)
    this.name = 'AIBudgetExceededError'
  }
}

export class AINotConfiguredError extends Error {
  constructor(public provider: 'openai' | 'anthropic') {
    super(`AI provider not configured: ${provider}. Connect at /admin/integrations/ai.`)
    this.name = 'AINotConfiguredError'
  }
}
