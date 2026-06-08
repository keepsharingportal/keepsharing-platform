'use client'

import { useState } from 'react'
import { Megaphone, RefreshCw, CheckCircle2, AlertTriangle, Clock, Send } from 'lucide-react'

interface Props {
  isoYear: number
  isoWeek: number
  webhookConfigured: boolean
}

export function AnnouncePanel({ isoYear, isoWeek, webhookConfigured }: Props) {
  const [subject, setSubject]           = useState(`This week's brain games are live — Week ${isoWeek}`)
  const [listTag, setListTag]           = useState('weekly-scoop')
  const [scheduleMode, setScheduleMode] = useState<'now' | 'later'>('now')
  const [scheduledFor, setScheduledFor] = useState<string>(() => {
    // Default: next Sunday 8 AM local
    const d = new Date()
    d.setHours(8, 0, 0, 0)
    const dow = d.getDay()
    const delta = (7 - dow) % 7 || 7
    d.setDate(d.getDate() + delta)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  })
  const [busy, setBusy]   = useState(false)
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null)

  async function send() {
    const verb = scheduleMode === 'now' ? `Send now` : `Schedule for ${scheduledFor}`
    if (!confirm(`${verb}: announce this week's brain games to "${listTag}"?`)) return
    setBusy(true)
    setResult(null)
    try {
      const res = await fetch('/api/admin/games/announce', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          subject:       subject.trim(),
          list_tag:      listTag.trim() || null,
          scheduled_for: scheduleMode === 'later' ? new Date(scheduledFor).toISOString() : null,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (res.ok) {
        setResult({
          ok:  true,
          msg: scheduleMode === 'later'
            ? `✓ Scheduled. GHL will release the announcement at ${scheduledFor}.`
            : `✓ Announcement sent to "${listTag}". Players will see this week's games and a CTA.`,
        })
      } else {
        setResult({ ok: false, msg: json?.message || json?.error || `HTTP ${res.status}` })
      }
    } finally { setBusy(false) }
  }

  const inputCls = 'w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-portal-blue/60 bg-white'

  return (
    <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
        <Megaphone size={14} className="text-portal-blue" />
        <h2 className="text-sm font-bold text-gray-700">Announce new games</h2>
        {!webhookConfigured && (
          <span className="ml-auto text-[10px] font-bold uppercase tracking-wider text-portal-amber bg-portal-amber-lt px-2 py-0.5 rounded">
            Webhook not configured
          </span>
        )}
      </div>

      {!webhookConfigured && (
        <div className="px-5 py-3 bg-portal-amber-lt border-b border-amber-200 text-xs text-amber-900 leading-relaxed">
          Set <code className="bg-portal-amber-lt px-1 rounded">GHL_GAMES_ANNOUNCEMENT_WEBHOOK_URL</code> in <code className="bg-portal-amber-lt px-1 rounded">.env.local</code>{' '}
          (or fall back to <code className="bg-portal-amber-lt px-1 rounded">GHL_NEWSLETTER_WEBHOOK_URL</code> if you want to reuse the same workflow), then restart the dev server.
        </div>
      )}

      <div className="p-5 space-y-3">
        <p className="text-sm text-gray-600 leading-relaxed">
          Sends a short HTML email to your subscriber list announcing this week's puzzles.
          One-paragraph intro, big "Play now" CTA, links to all six games. Each play is still a $50 drawing entry —
          this is the nudge that turns the rotation into a list-grower.
        </p>

        <div>
          <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Subject line</label>
          <input type="text" value={subject} onChange={e => setSubject(e.target.value)} className={inputCls} />
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">GHL list / tag</label>
            <input type="text" value={listTag} onChange={e => setListTag(e.target.value)} placeholder="weekly-scoop" className={inputCls} />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">For week</label>
            <p className="text-sm font-semibold text-gray-900 pt-2">Week {isoWeek}, {isoYear}</p>
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">When to send</label>
          <div className="flex gap-2 mb-2">
            <button type="button" onClick={() => setScheduleMode('now')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${scheduleMode === 'now' ? 'bg-portal-navy text-portal-blue-foreground' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              <Send size={11} /> Send now
            </button>
            <button type="button" onClick={() => setScheduleMode('later')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${scheduleMode === 'later' ? 'bg-portal-navy text-portal-blue-foreground' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              <Clock size={11} /> Schedule (next Sunday 8 AM)
            </button>
          </div>
          {scheduleMode === 'later' && (
            <input type="datetime-local" value={scheduledFor} onChange={e => setScheduledFor(e.target.value)} className={inputCls} />
          )}
        </div>

        <div className="pt-2">
          <button type="button" onClick={send} disabled={busy || !webhookConfigured || !subject.trim()}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-bold bg-portal-navy text-portal-blue-foreground rounded-lg hover:bg-portal-navy/90 disabled:opacity-40">
            {busy ? <RefreshCw size={13} className="animate-spin" /> : <Megaphone size={13} />}
            {scheduleMode === 'now' ? 'Send announcement now' : 'Schedule announcement'}
          </button>
        </div>

        {result && (
          <div className={`rounded-lg border px-3 py-2 text-xs flex items-start gap-2 ${
            result.ok ? 'border-green-200 bg-green-50 text-green-800' : 'border-portal-red/30 bg-portal-red-lt text-portal-red'
          }`}>
            {result.ok ? <CheckCircle2 size={13} className="mt-0.5 shrink-0" /> : <AlertTriangle size={13} className="mt-0.5 shrink-0" />}
            <span>{result.msg}</span>
          </div>
        )}
      </div>
    </section>
  )
}
