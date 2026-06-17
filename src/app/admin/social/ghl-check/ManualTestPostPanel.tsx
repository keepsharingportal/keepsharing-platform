'use client'

// Manual test post — used when our /accounts listing returns empty
// but the editor knows accounts ARE connected in GHL. They paste the
// GHL account IDs directly (one per platform) and we fire a real
// scheduled post against those IDs. GHL responds with a clear error
// if the IDs are wrong, which is useful diagnostic info too.

import { useState } from 'react'
import { Send, Loader2, CheckCircle2, AlertTriangle, ExternalLink, Info } from 'lucide-react'

export function ManualTestPostPanel({ brand }: { brand: string }) {
  const [open,        setOpen]        = useState(false)
  const [fbId,        setFbId]        = useState('')
  const [igId,        setIgId]        = useState('')
  const [caption,     setCaption]     = useState('Test post from the AI Social Media Manager — please ignore.')
  const [imageUrl,    setImageUrl]    = useState('')
  const [busy,        setBusy]        = useState(false)
  const [result,      setResult]      = useState<null | { ok: boolean; details: string }>(null)

  async function run() {
    setBusy(true); setResult(null)
    const ids = [fbId.trim(), igId.trim()].filter(Boolean)
    if (ids.length === 0) {
      setResult({ ok: false, details: 'Paste at least one account ID.' })
      setBusy(false)
      return
    }
    try {
      const res = await fetch('/api/admin/social/ghl-test-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand,
          accountIds:   ids,
          caption,
          imageUrl:     imageUrl.trim() || undefined,
          scheduleDate: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        }),
      })
      const j = await res.json()
      if (res.ok && j.ok) {
        setResult({ ok: true, details: `Scheduled in GHL. Post ID: ${j.postId ?? '(none returned)'}` })
      } else {
        setResult({ ok: false, details: j.error ?? `HTTP ${res.status} — check the IDs against your GHL Social Planner.` })
      }
    } catch (e) {
      setResult({ ok: false, details: e instanceof Error ? e.message : String(e) })
    } finally { setBusy(false) }
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)}
        className="text-[11px] font-bold text-portal-blue hover:underline">
        + I know accounts are connected — send a manual test post
      </button>
    )
  }

  return (
    <div className="bg-white border border-portal-border rounded p-3 space-y-3 mt-2">
      <div className="bg-portal-blue-lt text-portal-text p-2 rounded text-[11px] leading-relaxed flex items-start gap-2">
        <Info size={12} className="text-portal-blue shrink-0 mt-0.5" />
        <div>
          <strong className="text-portal-text">Where to find the account IDs:</strong>
          <ol className="list-decimal pl-4 mt-1 space-y-0.5">
            <li>Open GHL → switch to the brand&apos;s sub-account.</li>
            <li>Marketing → Social Planner → Settings (gear) → Social Accounts.</li>
            <li>Each connected account row has a small <code>...</code> menu — click <strong>Copy ID</strong> (or hover the row; the ID is usually visible).</li>
            <li>Some GHL versions show the ID in the URL when you click the account. The ID is a 24-char alphanumeric string.</li>
          </ol>
          <p className="mt-1">
            Paste them below. We fire a scheduled-+10-minutes post to each. Real post = real cost (free for FB/IG; just zero impact since it&apos;s scheduled for 10 min out — delete it from GHL after confirming the entry landed).
          </p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-2">
        <div>
          <label className="block text-[11px] font-bold text-portal-text mb-1">Facebook Page account ID</label>
          <input type="text" value={fbId} onChange={e => setFbId(e.target.value)}
            placeholder="e.g. 65f3a... (24 chars)"
            className="w-full px-2 py-1.5 text-[12px] font-mono border border-portal-border-2 rounded" />
        </div>
        <div>
          <label className="block text-[11px] font-bold text-portal-text mb-1">Instagram Business account ID</label>
          <input type="text" value={igId} onChange={e => setIgId(e.target.value)}
            placeholder="optional — paste if testing IG too"
            className="w-full px-2 py-1.5 text-[12px] font-mono border border-portal-border-2 rounded" />
        </div>
      </div>

      <div>
        <label className="block text-[11px] font-bold text-portal-text mb-1">Test caption</label>
        <textarea rows={2} value={caption} onChange={e => setCaption(e.target.value)}
          className="w-full px-2 py-1.5 text-[12px] border border-portal-border-2 rounded" />
      </div>

      <div>
        <label className="block text-[11px] font-bold text-portal-text mb-1">Image URL (required for Instagram)</label>
        <input type="url" value={imageUrl} onChange={e => setImageUrl(e.target.value)}
          placeholder="https://..."
          className="w-full px-2 py-1.5 text-[12px] border border-portal-border-2 rounded" />
      </div>

      <div className="flex items-center gap-2">
        <button type="button" onClick={run} disabled={busy || (!fbId.trim() && !igId.trim()) || !caption.trim()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-bold text-white bg-portal-navy rounded hover:opacity-90 disabled:opacity-50">
          {busy ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
          {busy ? 'Sending…' : 'Send test post'}
        </button>
        <button type="button" onClick={() => setOpen(false)}
          className="text-[11px] text-portal-sub hover:underline">cancel</button>
        <a href="https://app.gohighlevel.com/" target="_blank" rel="noopener noreferrer"
          className="ml-auto text-[11px] font-bold text-portal-blue hover:underline inline-flex items-center gap-1">
          Open GHL <ExternalLink size={10} />
        </a>
      </div>

      {result && (
        <div className={`rounded p-2 text-[11px] inline-flex items-start gap-1.5 ${
          result.ok ? 'bg-portal-green-lt text-portal-green' : 'bg-portal-red-lt text-portal-red'
        }`}>
          {result.ok ? <CheckCircle2 size={12} className="mt-0.5" /> : <AlertTriangle size={12} className="mt-0.5" />}
          <div className="whitespace-pre-line">{result.details}</div>
        </div>
      )}
    </div>
  )
}
