'use client'

import { useState } from 'react'
import { Send, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react'

interface Account {
  id:       string
  name:     string
  platform: string
}

export function GhlTestPostPanel({ brand, accounts }: { brand: string; accounts: Account[] }) {
  const [open,        setOpen]        = useState(false)
  const [caption,     setCaption]     = useState('Test post from the AI Social Media Manager — please ignore.')
  const [imageUrl,    setImageUrl]    = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [busy,        setBusy]        = useState(false)
  const [result,      setResult]      = useState<{ ok: boolean; postId?: string; error?: string } | null>(null)

  function toggle(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else              next.add(id)
      return next
    })
  }

  async function run() {
    setBusy(true); setResult(null)
    try {
      const res = await fetch('/api/admin/social/ghl-test-post', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          brand,
          accountIds:   Array.from(selectedIds),
          caption,
          imageUrl:     imageUrl.trim() || undefined,
          scheduleDate: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 min from now
        }),
      })
      const j = await res.json()
      setResult({ ok: res.ok, postId: j.postId, error: j.error })
    } catch (e) {
      setResult({ ok: false, error: e instanceof Error ? e.message : String(e) })
    } finally { setBusy(false) }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-[11px] font-bold text-portal-blue hover:underline"
      >
        + Send a test post via GHL (scheduled +10 min)
      </button>
    )
  }

  return (
    <div className="border border-portal-border rounded p-3 bg-portal-bg space-y-2 mt-2">
      <div className="text-[11px] font-bold uppercase tracking-wider text-portal-sub">Test post</div>
      <div>
        <div className="text-[11px] font-bold text-portal-text mb-1">Pick account(s)</div>
        <div className="flex flex-wrap gap-1">
          {accounts.map(a => (
            <button
              key={a.id} type="button" onClick={() => toggle(a.id)}
              className={`text-[11px] px-2 py-1 rounded border ${
                selectedIds.has(a.id)
                  ? 'bg-portal-navy text-white border-portal-navy'
                  : 'bg-white text-portal-sub border-portal-border hover:bg-portal-bg'
              }`}
            >
              {a.platform} · {a.name}
            </button>
          ))}
        </div>
      </div>
      <textarea
        rows={3} value={caption} onChange={e => setCaption(e.target.value)}
        className="w-full px-2 py-1 text-[12px] border border-portal-border-2 rounded bg-white"
      />
      <input
        type="url" value={imageUrl} onChange={e => setImageUrl(e.target.value)}
        placeholder="Optional image URL"
        className="w-full px-2 py-1 text-[12px] border border-portal-border-2 rounded bg-white"
      />
      <div className="flex items-center gap-2">
        <button
          type="button" onClick={run} disabled={busy || selectedIds.size === 0 || !caption.trim()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-bold text-white bg-portal-navy rounded hover:opacity-90 disabled:opacity-50"
        >
          {busy ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
          {busy ? 'Sending…' : 'Send test'}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-[11px] text-portal-sub hover:underline">cancel</button>
      </div>
      {result && (
        <div className={`rounded p-2 text-[11px] inline-flex items-start gap-1.5 ${
          result.ok ? 'bg-portal-green-lt text-portal-green' : 'bg-portal-red-lt text-portal-red'
        }`}>
          {result.ok
            ? <><CheckCircle2 size={11} className="mt-0.5" /> Posted to GHL · id <code>{result.postId ?? '(none)'}</code></>
            : <><AlertTriangle size={11} className="mt-0.5" /> {result.error}</>}
        </div>
      )}
    </div>
  )
}
