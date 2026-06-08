'use client'

import { useState } from 'react'
import { Send, RefreshCw, CheckCircle2, AlertTriangle, Clock } from 'lucide-react'

interface Props {
  issueDate:        string                 // YYYY-MM-DD
  picksCount:       number
  defaultSubject?:  string
  defaultListTag?:  string
  webhookConfigured: boolean
  pageHasUnsavedHint?: boolean
}

export function SendPanel({
  issueDate, picksCount, defaultSubject, defaultListTag, webhookConfigured,
}: Props) {
  const [subject, setSubject]           = useState(defaultSubject ?? `River Region Parents — Family Picks for ${issueDate}`)
  const [listTag, setListTag]           = useState(defaultListTag ?? 'weekly-scoop')
  const [scheduleMode, setScheduleMode] = useState<'now' | 'later'>('now')
  const [scheduledFor, setScheduledFor] = useState<string>(() => {
    // Default schedule = next Thursday at 8 AM local
    const d = new Date(`${issueDate}T08:00:00`)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  })
  const [sending, setSending]           = useState(false)
  const [result, setResult]             = useState<{ ok: boolean; msg: string; status?: string } | null>(null)

  async function send() {
    if (!confirm(scheduleMode === 'now'
      ? `Send the newsletter NOW to "${listTag}" with ${picksCount} picks?`
      : `Schedule the newsletter for ${scheduledFor} to "${listTag}" with ${picksCount} picks?`)) {
      return
    }
    setSending(true)
    setResult(null)
    try {
      const body = {
        issue_date:    issueDate,
        subject:       subject.trim(),
        list_tag:      listTag.trim() || null,
        scheduled_for: scheduleMode === 'later' ? new Date(scheduledFor).toISOString() : null,
      }
      const res = await fetch('/api/admin/newsletter/send', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      })
      const json = await res.json().catch(() => ({}))
      if (res.ok) {
        setResult({
          ok: true,
          status: json.status as string,
          msg: json.status === 'queued'
            ? `✓ Scheduled. GHL will hold the send until ${scheduledFor}.`
            : `✓ Sent to "${listTag}" — ${json.picks_count} picks delivered.`,
        })
      } else {
        setResult({ ok: false, msg: json?.message || json?.error || `HTTP ${res.status}` })
      }
    } catch (e) {
      setResult({ ok: false, msg: e instanceof Error ? e.message : 'Network error' })
    } finally {
      setSending(false)
    }
  }

  const cls = 'w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-portal-blue/60 bg-white'

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
        <Send size={14} className="text-portal-blue" />
        <h2 className="text-sm font-bold text-gray-700">Send via GHL</h2>
        {!webhookConfigured && (
          <span className="ml-auto text-[10px] font-bold uppercase tracking-wider text-portal-amber bg-portal-amber-lt px-2 py-0.5 rounded">
            Webhook not configured
          </span>
        )}
      </div>

      {!webhookConfigured && (
        <div className="px-5 py-3 bg-portal-amber-lt border-b border-amber-200">
          <p className="text-xs text-amber-900 leading-relaxed">
            Set <code className="bg-portal-amber-lt px-1 rounded">GHL_NEWSLETTER_WEBHOOK_URL</code> in <code className="bg-portal-amber-lt px-1 rounded">.env.local</code> with the webhook URL from your GHL workflow trigger. Then restart the dev server.
          </p>
        </div>
      )}

      <div className="p-5 space-y-3">
        <div>
          <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Subject line</label>
          <input type="text" value={subject} onChange={e => setSubject(e.target.value)} className={cls} />
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">GHL list / tag</label>
            <input type="text" value={listTag} onChange={e => setListTag(e.target.value)} placeholder="weekly-scoop" className={cls} />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Picks ready</label>
            <p className="text-sm font-semibold text-gray-900 pt-2">{picksCount} event(s)</p>
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
              <Clock size={11} /> Schedule
            </button>
          </div>
          {scheduleMode === 'later' && (
            <input type="datetime-local" value={scheduledFor} onChange={e => setScheduledFor(e.target.value)} className={cls} />
          )}
        </div>

        <div className="pt-2">
          <button type="button" onClick={send} disabled={sending || !webhookConfigured || picksCount === 0 || !subject.trim()}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-bold bg-portal-navy text-portal-blue-foreground rounded-lg hover:bg-portal-navy/90 disabled:opacity-40">
            {sending ? <RefreshCw size={13} className="animate-spin" /> : <Send size={13} />}
            {scheduleMode === 'now' ? 'Send newsletter now' : 'Schedule send'}
          </button>
        </div>

        {result && (
          <div className={`rounded-lg border px-3 py-2 text-xs flex items-start gap-2 ${
            result.ok
              ? 'border-green-200 bg-green-50 text-green-800'
              : 'border-portal-red/30 bg-portal-red-lt text-portal-red'
          }`}>
            {result.ok ? <CheckCircle2 size={13} className="mt-0.5 shrink-0" /> : <AlertTriangle size={13} className="mt-0.5 shrink-0" />}
            <span>{result.msg}</span>
          </div>
        )}
      </div>
    </div>
  )
}
