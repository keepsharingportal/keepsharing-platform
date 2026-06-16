'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Send, CheckCircle2, AlertTriangle } from 'lucide-react'

type Timing = 'now' | 'specific' | 'window' | 'ai-pick'

export function UrgentInsertClient({ brand }: { brand: string }) {
  const router = useRouter()
  const [caption,  setCaption]  = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [link,     setLink]     = useState('')
  const [platforms, setPlatforms] = useState<Set<string>>(new Set(['facebook', 'instagram']))
  const [timing,   setTiming]   = useState<Timing>('ai-pick')
  const [whenIso,  setWhenIso]  = useState(new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16))
  const [windowStart, setWindowStart] = useState(new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16))
  const [windowEnd,   setWindowEnd]   = useState(new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString().slice(0, 16))
  const [busy,     setBusy]     = useState(false)
  const [result,   setResult]   = useState<null | { ok: boolean; scheduledFor?: string; error?: string }>(null)

  function togglePlatform(p: string) {
    setPlatforms(prev => {
      const next = new Set(prev)
      if (next.has(p)) next.delete(p)
      else             next.add(p)
      return next
    })
  }

  async function submit() {
    setBusy(true); setResult(null)
    try {
      const body: Record<string, unknown> = {
        brand,
        caption,
        image_url: imageUrl.trim() || null,
        link:      link.trim()     || null,
        platforms: Array.from(platforms),
        timing,
      }
      if (timing === 'specific') body.scheduled_for = new Date(whenIso).toISOString()
      if (timing === 'window')   { body.window_start = new Date(windowStart).toISOString(); body.window_end = new Date(windowEnd).toISOString() }
      const res = await fetch('/api/admin/social/plan/urgent', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      })
      const j = await res.json()
      if (!res.ok) setResult({ ok: false, error: j?.error ?? 'failed' })
      else { setResult({ ok: true, scheduledFor: j.scheduledFor }); router.refresh() }
    } catch (e) {
      setResult({ ok: false, error: e instanceof Error ? e.message : String(e) })
    } finally { setBusy(false) }
  }

  return (
    <div className="bg-white border border-portal-border rounded-lg p-4 space-y-3 max-w-3xl">

      <div>
        <label className="block text-[11px] font-bold text-portal-text mb-1">Caption</label>
        <textarea
          rows={5} value={caption} onChange={e => setCaption(e.target.value)}
          placeholder="The post text. Plain prose; the same caption goes to FB + IG unless you customize per-platform later."
          className="w-full px-2 py-1.5 text-[13px] border border-portal-border-2 rounded outline-none focus:border-portal-blue bg-white text-portal-text resize-vertical"
        />
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-bold text-portal-text mb-1">Image URL (recommended for IG)</label>
          <input type="url" value={imageUrl} onChange={e => setImageUrl(e.target.value)}
            placeholder="https://…"
            className="w-full px-2 py-1.5 text-[12px] border border-portal-border-2 rounded bg-white"
          />
        </div>
        <div>
          <label className="block text-[11px] font-bold text-portal-text mb-1">Link (FB only — IG strips it)</label>
          <input type="url" value={link} onChange={e => setLink(e.target.value)}
            placeholder="https://…"
            className="w-full px-2 py-1.5 text-[12px] border border-portal-border-2 rounded bg-white"
          />
        </div>
      </div>

      <div>
        <label className="block text-[11px] font-bold text-portal-text mb-1">Platforms</label>
        <div className="flex gap-1.5">
          {['facebook', 'instagram'].map(p => (
            <button
              key={p} type="button" onClick={() => togglePlatform(p)}
              className={`px-2 py-1 text-[11px] font-bold uppercase rounded border ${
                platforms.has(p) ? 'bg-portal-navy text-white border-portal-navy' : 'bg-white text-portal-sub border-portal-border'
              }`}
            >{p}</button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-[11px] font-bold text-portal-text mb-1">When?</label>
        <div className="space-y-2">
          {([
            { value: 'ai-pick',  label: 'AI picks the next-best gap',          help: 'Drops it into the soonest plan gap that fits engagement windows.' },
            { value: 'specific', label: 'Specific date + time',                 help: 'Pick the exact moment.' },
            { value: 'window',   label: 'Within a window (AI picks moment)',   help: 'Give a start and end window; AI picks the best moment inside it.' },
            { value: 'now',      label: 'Send now',                            help: 'Posts immediately. Use sparingly.' },
          ] as Array<{ value: Timing; label: string; help: string }>).map(t => (
            <label key={t.value} className="flex items-start gap-2 cursor-pointer p-2 rounded hover:bg-portal-bg">
              <input
                type="radio" name="timing" value={t.value} checked={timing === t.value}
                onChange={() => setTiming(t.value)}
                className="mt-0.5"
              />
              <div>
                <div className="text-[12px] font-bold text-portal-text">{t.label}</div>
                <div className="text-[11px] text-portal-sub">{t.help}</div>
              </div>
            </label>
          ))}
        </div>
        {timing === 'specific' && (
          <input type="datetime-local" value={whenIso} onChange={e => setWhenIso(e.target.value)}
            className="mt-2 px-2 py-1 text-[12px] border border-portal-border-2 rounded bg-white"
          />
        )}
        {timing === 'window' && (
          <div className="mt-2 flex items-center gap-2">
            <input type="datetime-local" value={windowStart} onChange={e => setWindowStart(e.target.value)}
              className="px-2 py-1 text-[12px] border border-portal-border-2 rounded bg-white"
            />
            <span className="text-[11px] text-portal-sub">to</span>
            <input type="datetime-local" value={windowEnd} onChange={e => setWindowEnd(e.target.value)}
              className="px-2 py-1 text-[12px] border border-portal-border-2 rounded bg-white"
            />
          </div>
        )}
      </div>

      <button
        type="button" onClick={submit} disabled={busy || !caption.trim() || platforms.size === 0}
        className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-bold text-white bg-portal-navy rounded-lg hover:opacity-90 disabled:opacity-50"
      >
        {busy ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
        Send to GHL
      </button>

      {result && (
        <div className={`rounded p-2 text-[12px] inline-flex items-start gap-1.5 ${
          result.ok ? 'bg-portal-green-lt text-portal-green' : 'bg-portal-red-lt text-portal-red'
        }`}>
          {result.ok
            ? <><CheckCircle2 size={12} className="mt-0.5" /> Scheduled for {result.scheduledFor ? new Date(result.scheduledFor).toLocaleString() : 'now'}</>
            : <><AlertTriangle size={12} className="mt-0.5" /> {result.error}</>}
        </div>
      )}

    </div>
  )
}
