'use client'

import { useState, useTransition } from 'react'
import { Sparkles, CheckCircle2, AlertCircle, Eye, EyeOff, Trash2, Save } from 'lucide-react'
import type { ModelSpec } from '@/lib/ai/models'
import type { AITaskKind } from '@/lib/ai/types'
import type { AIIntegrationRow } from './page'
import {
  connectProviderAction, disconnectProviderAction,
  updateBudgetAction, updateDefaultsAction,
} from './actions'

type Provider = 'anthropic' | 'openai'

const TASKS: Array<{ kind: AITaskKind; label: string; blurb: string }> = [
  { kind: 'drafting',       label: 'Drafting',       blurb: 'Article first drafts, longform editorial output' },
  { kind: 'classification', label: 'Classification', blurb: 'Tagging, routing, yes/no judgments' },
  { kind: 'extraction',     label: 'Extraction',     blurb: 'Pulling structured data from raw text or images' },
  { kind: 'games',          label: 'Games',          blurb: 'Brain Games content generation' },
  { kind: 'coaching',       label: 'Coaching',       blurb: 'Advertiser report insights, sales-pitch language' },
  { kind: 'qa',             label: 'Q&A',            blurb: 'Contributor magic-link Q&A → article pipeline' },
  { kind: 'caption',        label: 'Captions',       blurb: 'Social post captions' },
  { kind: 'other',          label: 'Other',          blurb: 'Anything not in the categories above' },
]

interface Props {
  rows:                     AIIntegrationRow[]
  anthropicModels:          ModelSpec[]
  openaiModels:             ModelSpec[]
  monthSpendCents:          Record<string, number>
  envAnthropicConfigured:   boolean
  envOpenAIConfigured:      boolean
}

export function AIIntegrationClient(props: Props) {
  const anth = props.rows.find(r => r.provider === 'anthropic') ?? null
  const oai  = props.rows.find(r => r.provider === 'openai')    ?? null

  return (
    <div className="space-y-4">
      <ProviderCard
        provider="anthropic"
        label="Anthropic (Claude)"
        accentClass="text-portal-blue bg-portal-blue-lt"
        row={anth}
        envFallbackActive={!anth && props.envAnthropicConfigured}
        models={props.anthropicModels}
        spentCents={props.monthSpendCents.anthropic ?? 0}
        keyPlaceholder="sk-ant-api03-..."
      />
      <ProviderCard
        provider="openai"
        label="OpenAI (GPT)"
        accentClass="text-portal-green bg-portal-green-lt"
        row={oai}
        envFallbackActive={!oai && props.envOpenAIConfigured}
        models={props.openaiModels}
        spentCents={props.monthSpendCents.openai ?? 0}
        keyPlaceholder="sk-proj-..."
      />
    </div>
  )
}

interface CardProps {
  provider:           Provider
  label:              string
  accentClass:        string
  row:                AIIntegrationRow | null
  envFallbackActive:  boolean
  models:             ModelSpec[]
  spentCents:         number
  keyPlaceholder:     string
}

function ProviderCard(p: CardProps) {
  const [showConnect, setShowConnect] = useState(false)
  return (
    <div className="bg-white border border-portal-border rounded-lg overflow-hidden">
      <div className="flex items-start gap-4 px-5 py-4 border-b border-portal-border">
        <div className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${p.accentClass}`}>
          <Sparkles size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-bold text-portal-text">{p.label}</h3>
            {p.row?.is_active ? (
              <span className="text-[10px] font-bold uppercase tracking-wider text-portal-green bg-portal-green-lt border border-portal-green/30 px-1.5 py-0.5 rounded-full inline-flex items-center gap-1">
                <CheckCircle2 size={9} /> Connected
              </span>
            ) : p.envFallbackActive ? (
              <span className="text-[10px] font-bold uppercase tracking-wider text-portal-amber bg-portal-amber-lt border border-portal-amber/30 px-1.5 py-0.5 rounded-full inline-flex items-center gap-1">
                <AlertCircle size={9} /> Env-var fallback
              </span>
            ) : (
              <span className="text-[10px] font-bold uppercase tracking-wider text-portal-sub bg-portal-bg border border-portal-border px-1.5 py-0.5 rounded-full inline-flex items-center gap-1">
                <AlertCircle size={9} /> Not connected
              </span>
            )}
          </div>
          {p.row && (
            <p className="text-[11px] text-portal-sub mt-1">
              Connected {new Date(p.row.connected_at).toLocaleDateString()}
              {p.row.last_used_at && ` — last used ${new Date(p.row.last_used_at).toLocaleString()}`}
            </p>
          )}
          {!p.row && p.envFallbackActive && (
            <p className="text-[11px] text-portal-sub mt-1 leading-relaxed">
              Using the {p.provider === 'anthropic' ? 'ANTHROPIC_API_KEY' : 'OPENAI_API_KEY'} env-var as a fallback. No budget cap is enforced until you connect via the form below. Connect to track usage + cap spend.
            </p>
          )}
        </div>
        <div className="shrink-0 text-right text-xs">
          <div className="text-portal-muted">This month</div>
          <div className="text-portal-text font-bold">${(p.spentCents / 100).toFixed(2)}</div>
          {p.row && (
            <div className="text-[10px] text-portal-muted">
              of ${(p.row.monthly_budget_cents / 100).toFixed(0)}
            </div>
          )}
        </div>
      </div>

      {!p.row && (
        <div className="px-5 py-4">
          {!showConnect ? (
            <button
              onClick={() => setShowConnect(true)}
              className="text-xs font-bold text-portal-blue hover:text-portal-blue-dk border border-portal-blue/30 bg-portal-blue-lt px-3 py-1.5 rounded-md"
            >
              Connect {p.label}
            </button>
          ) : (
            <ConnectForm
              provider={p.provider}
              keyPlaceholder={p.keyPlaceholder}
              onCancel={() => setShowConnect(false)}
            />
          )}
        </div>
      )}

      {p.row && (
        <>
          <BudgetRow row={p.row} spentCents={p.spentCents} />
          <DefaultsGrid row={p.row} models={p.models} />
          <div className="px-5 py-3 border-t border-portal-border bg-portal-bg flex justify-end">
            <DisconnectButton provider={p.provider} />
          </div>
        </>
      )}
    </div>
  )
}

function ConnectForm({ provider, keyPlaceholder, onCancel }: { provider: Provider; keyPlaceholder: string; onCancel: () => void }) {
  const [apiKey, setApiKey] = useState('')
  const [budget, setBudget] = useState('100')
  const [showKey, setShowKey] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [pending, start] = useTransition()

  function submit() {
    setErr(null)
    const cents = Math.round(parseFloat(budget || '0') * 100)
    if (!Number.isFinite(cents) || cents < 0) { setErr('Budget must be a positive dollar amount.'); return }
    start(async () => {
      const out = await connectProviderAction({ provider, apiKey: apiKey.trim(), monthlyBudgetCents: cents })
      if (!out.ok) setErr(out.error)
    })
  }

  return (
    <div className="space-y-3 max-w-md">
      <div>
        <label className="block text-[11px] font-bold uppercase tracking-wider text-portal-sub mb-1">API key</label>
        <div className="relative">
          <input
            type={showKey ? 'text' : 'password'}
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            placeholder={keyPlaceholder}
            className="w-full text-xs font-mono px-3 py-2 pr-9 border border-portal-border rounded-md bg-white text-portal-text focus:outline-none focus:border-portal-blue"
          />
          <button
            type="button"
            onClick={() => setShowKey(s => !s)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-portal-muted hover:text-portal-text"
          >
            {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
      </div>
      <div>
        <label className="block text-[11px] font-bold uppercase tracking-wider text-portal-sub mb-1">Monthly budget (USD)</label>
        <input
          type="number" min="0" step="10" value={budget}
          onChange={e => setBudget(e.target.value)}
          className="w-32 text-xs px-3 py-2 border border-portal-border rounded-md bg-white text-portal-text focus:outline-none focus:border-portal-blue"
        />
        <p className="text-[10px] text-portal-muted mt-1">Hit this cap → new AI calls return budget-exhausted error. Reset on the 1st.</p>
      </div>
      {err && <p className="text-[11px] text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1">{err}</p>}
      <div className="flex gap-2">
        <button
          onClick={submit}
          disabled={pending}
          className="text-xs font-bold text-white bg-portal-blue hover:bg-portal-blue-dk px-3 py-1.5 rounded-md disabled:opacity-50"
        >
          {pending ? 'Connecting…' : 'Connect'}
        </button>
        <button
          onClick={onCancel}
          className="text-xs font-bold text-portal-sub hover:text-portal-text px-3 py-1.5 rounded-md"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

function BudgetRow({ row, spentCents }: { row: AIIntegrationRow; spentCents: number }) {
  const [dollars, setDollars] = useState((row.monthly_budget_cents / 100).toString())
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState<string | null>(null)

  const pct = row.monthly_budget_cents > 0 ? Math.min(100, (spentCents / row.monthly_budget_cents) * 100) : 0
  const barColor = pct > 90 ? 'bg-red-500' : pct > 75 ? 'bg-portal-amber' : 'bg-portal-green'

  function save() {
    const cents = Math.round(parseFloat(dollars || '0') * 100)
    if (!Number.isFinite(cents) || cents < 0) { setMsg('Invalid budget'); return }
    start(async () => {
      const out = await updateBudgetAction({ provider: row.provider, monthlyBudgetCents: cents })
      setMsg(out.ok ? 'Saved' : out.error)
      setTimeout(() => setMsg(null), 2500)
    })
  }

  return (
    <div className="px-5 py-4 border-b border-portal-border">
      <div className="flex items-end gap-3 flex-wrap">
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-portal-sub mb-1">Monthly budget (USD)</label>
          <div className="flex items-center gap-2">
            <span className="text-portal-muted text-xs">$</span>
            <input
              type="number" min="0" step="10"
              value={dollars}
              onChange={e => setDollars(e.target.value)}
              className="w-24 text-xs px-2 py-1.5 border border-portal-border rounded-md bg-white text-portal-text focus:outline-none focus:border-portal-blue"
            />
            <button
              onClick={save}
              disabled={pending}
              className="text-xs font-bold text-portal-blue hover:text-portal-blue-dk inline-flex items-center gap-1"
            >
              <Save size={11} /> {pending ? 'Saving…' : 'Save'}
            </button>
            {msg && <span className="text-[11px] text-portal-sub">{msg}</span>}
          </div>
        </div>
        <div className="flex-1 min-w-[200px]">
          <div className="text-[11px] text-portal-sub mb-1">
            ${(spentCents / 100).toFixed(2)} of ${(row.monthly_budget_cents / 100).toFixed(0)} used
          </div>
          <div className="h-2 bg-portal-bg rounded overflow-hidden">
            <div className={`h-full ${barColor}`} style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>
    </div>
  )
}

function DefaultsGrid({ row, models }: { row: AIIntegrationRow; models: ModelSpec[] }) {
  const initial: Record<AITaskKind, string | null> = {
    drafting:       row.default_drafting_model,
    classification: row.default_classification_model,
    extraction:     row.default_extraction_model,
    games:          row.default_games_model,
    coaching:       row.default_coaching_model,
    qa:             row.default_qa_model,
    caption:        row.default_caption_model,
    other:          row.default_other_model,
  }
  const [picks, setPicks] = useState(initial)
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState<string | null>(null)
  const dirty = TASKS.some(t => picks[t.kind] !== initial[t.kind])

  function save() {
    start(async () => {
      const out = await updateDefaultsAction({ provider: row.provider, defaults: picks })
      setMsg(out.ok ? 'Defaults saved' : out.error)
      setTimeout(() => setMsg(null), 2500)
    })
  }

  return (
    <div className="px-5 py-4 border-b border-portal-border">
      <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-portal-sub">Default model per task</h4>
          <p className="text-[11px] text-portal-muted">Leave a row blank to use the hardcoded sensible default.</p>
        </div>
        <button
          onClick={save}
          disabled={pending || !dirty}
          className="text-xs font-bold text-white bg-portal-blue hover:bg-portal-blue-dk px-3 py-1.5 rounded-md disabled:opacity-40 inline-flex items-center gap-1"
        >
          <Save size={11} /> {pending ? 'Saving…' : 'Save defaults'}
        </button>
        {msg && <span className="text-[11px] text-portal-sub">{msg}</span>}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {TASKS.map(t => {
          const recommended = models.find(m => (m.recommendedFor ?? []).includes(t.kind))
          return (
            <div key={t.kind} className="bg-portal-bg border border-portal-border rounded-md p-3">
              <div className="flex items-baseline justify-between gap-2 mb-1">
                <div>
                  <div className="text-xs font-bold text-portal-text">{t.label}</div>
                  <div className="text-[10px] text-portal-muted leading-snug">{t.blurb}</div>
                </div>
              </div>
              <select
                value={picks[t.kind] ?? ''}
                onChange={e => setPicks({ ...picks, [t.kind]: e.target.value || null })}
                className="w-full text-xs px-2 py-1.5 border border-portal-border rounded-md bg-white text-portal-text focus:outline-none focus:border-portal-blue"
              >
                <option value="">— Hardcoded default —</option>
                {models.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                    {recommended?.id === m.id ? '  ★ recommended' : ''}
                    {`  · $${m.inputPerMUsd}/$${m.outputPerMUsd}/M`}
                  </option>
                ))}
              </select>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function DisconnectButton({ provider }: { provider: Provider }) {
  const [confirming, setConfirming] = useState(false)
  const [pending, start] = useTransition()
  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="text-xs font-bold text-red-700 hover:text-red-900 inline-flex items-center gap-1"
      >
        <Trash2 size={11} /> Disconnect
      </button>
    )
  }
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] text-portal-sub">Remove the key + monthly budget? Usage log is preserved.</span>
      <button
        onClick={() => start(async () => { await disconnectProviderAction(provider) })}
        disabled={pending}
        className="text-xs font-bold text-white bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded-md disabled:opacity-50"
      >
        {pending ? 'Disconnecting…' : 'Yes, disconnect'}
      </button>
      <button
        onClick={() => setConfirming(false)}
        className="text-xs font-bold text-portal-sub hover:text-portal-text"
      >
        Cancel
      </button>
    </div>
  )
}
