'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, X, RefreshCw, Bot } from 'lucide-react'

interface Props {
  id:        string
  gameType:  string
  payload:   Record<string, unknown>
  theme:     string | null
  model:     string | null
  createdAt: string
}

export function ProposalRow({ id, gameType, payload, theme, model, createdAt }: Props) {
  const router = useRouter()
  const [busy,   setBusy]   = useState<'approve' | 'reject' | null>(null)
  const [err,    setErr]    = useState<string | null>(null)
  const [hidden, setHidden] = useState(false)

  async function review(action: 'approve' | 'reject') {
    if (busy) return
    setBusy(action); setErr(null)
    try {
      const res = await fetch(`/api/admin/games/proposals/${id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { setErr(json?.error ?? `HTTP ${res.status}`); return }
      setHidden(true)
      router.refresh()
    } finally { setBusy(null) }
  }

  if (hidden) return null

  return (
    <li className="px-5 py-3 flex items-start gap-4">
      <div className="flex-1 min-w-0">
        <PreviewByGame gameType={gameType} payload={payload} />
        <div className="flex items-center gap-3 mt-2 text-[11px] text-gray-400">
          {model && <span className="inline-flex items-center gap-1"><Bot size={11} />{model}</span>}
          {theme && <span>theme: <em className="text-gray-600">{theme}</em></span>}
          <span>{new Date(createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
        </div>
        {err && <p className="text-xs text-rose-700 font-semibold mt-2">{err}</p>}
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={() => review('approve')}
          disabled={busy !== null}
          className="inline-flex items-center gap-1 text-xs font-bold bg-green-600 text-white rounded-lg px-3 py-1.5 hover:bg-green-700 disabled:opacity-40"
        >
          {busy === 'approve' ? <RefreshCw size={12} className="animate-spin" /> : <Check size={12} />}
          Approve
        </button>
        <button
          type="button"
          onClick={() => review('reject')}
          disabled={busy !== null}
          className="inline-flex items-center gap-1 text-xs font-bold border border-gray-200 text-gray-600 rounded-lg px-3 py-1.5 hover:bg-gray-50 disabled:opacity-40"
        >
          {busy === 'reject' ? <RefreshCw size={12} className="animate-spin" /> : <X size={12} />}
          Reject
        </button>
      </div>
    </li>
  )
}

// ── Per-game preview renderers ────────────────────────────────────────────────
// Lightweight previews so the operator can decide approve/reject at a glance
// without leaving the queue page.

function PreviewByGame({ gameType, payload }: { gameType: string; payload: Record<string, unknown> }) {
  switch (gameType) {
    case 'scramble':       return <ScramblePreview p={payload as any} />
    case 'emoji':          return <EmojiPreview p={payload as any} />
    case 'math':           return <MathPreview p={payload as any} />
    case 'trivia':         return <TriviaPreview p={payload as any} />
    case 'memory':         return <MemoryPreview p={payload as any} />
    case 'family-connect': return <FamilyConnectPreview p={payload as any} />
    default:               return <pre className="text-xs font-mono text-gray-500 whitespace-pre-wrap">{JSON.stringify(payload).slice(0, 240)}</pre>
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function ScramblePreview({ p }: { p: any }) {
  return (
    <div>
      <p className="text-sm font-semibold text-gray-900">
        <span className="font-mono tracking-widest">{p.scrambled}</span>
        <span className="text-gray-400 mx-2">→</span>
        <span className="text-portal-blue">{p.answer}</span>
      </p>
    </div>
  )
}

function EmojiPreview({ p }: { p: any }) {
  return (
    <div>
      <p className="text-sm font-semibold text-gray-900">
        <span className="text-xl">{p.emoji}</span>
        <span className="text-gray-400 mx-2">→</span>
        <span className="text-portal-blue">{p.answer}</span>
      </p>
    </div>
  )
}

function MathPreview({ p }: { p: any }) {
  return (
    <div>
      <p className="text-sm font-semibold text-gray-900">{p.q}</p>
      <p className="text-xs text-gray-500 mt-0.5">Answer: <strong className="text-portal-blue">{p.a}</strong></p>
    </div>
  )
}

function TriviaPreview({ p }: { p: any }) {
  return (
    <div>
      <p className="text-sm font-semibold text-gray-900 mb-1">{p.q}</p>
      <ul className="text-xs text-gray-600 space-y-0.5">
        {p.options.map((opt: string) => (
          <li key={opt} className={opt === p.a ? 'text-green-700 font-bold' : ''}>
            {opt === p.a ? '✓ ' : '· '}{opt}
          </li>
        ))}
      </ul>
    </div>
  )
}

function MemoryPreview({ p }: { p: any }) {
  return (
    <div>
      <p className="text-sm font-semibold text-gray-900 mb-1">{p.pairs} pairs · {p.icons.join(' ')}</p>
    </div>
  )
}

function FamilyConnectPreview({ p }: { p: any }) {
  const toneClass: Record<string, string> = {
    yellow: 'bg-yellow-100 text-yellow-900',
    green:  'bg-green-100 text-green-900',
    blue:   'bg-blue-100 text-blue-900',
    purple: 'bg-purple-100 text-purple-900',
  }
  return (
    <div className="space-y-1">
      {p.groups.map((g: any) => (
        <div key={g.label} className={`text-xs rounded px-2 py-1 ${toneClass[g.tone] ?? 'bg-gray-100'}`}>
          <strong>{g.label}</strong> · {g.words.join(', ')}
        </div>
      ))}
    </div>
  )
}
/* eslint-enable @typescript-eslint/no-explicit-any */
