'use client'

import { useState, useTransition } from 'react'
import { Search, CheckCircle2, AlertCircle, Eye, EyeOff, RefreshCw, Trash2, ExternalLink } from 'lucide-react'
import type { GSCIntegrationRow } from './page'
import {
  connectSearchConsoleAction, disconnectSearchConsoleAction, syncNowAction,
} from './actions'

interface Props {
  row:              GSCIntegrationRow | null
  recentQueryRows:  number
}

export function SearchConsoleClient({ row, recentQueryRows }: Props) {
  if (row) return <ConnectedView row={row} recentQueryRows={recentQueryRows} />
  return <ConnectView />
}

function ConnectedView({ row, recentQueryRows }: { row: GSCIntegrationRow; recentQueryRows: number }) {
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [pendingDis, startDis] = useTransition()

  function sync() {
    setMsg(null)
    start(async () => {
      const out = await syncNowAction()
      setMsg(out.ok
        ? `Synced — ${out.queryCount} query rows, ${out.pageCount} page rows.`
        : `Error: ${out.error}`)
    })
  }

  return (
    <div className="bg-white border border-portal-border rounded-lg overflow-hidden">
      <div className="flex items-start gap-4 px-5 py-4 border-b border-portal-border">
        <div className="shrink-0 w-10 h-10 rounded-lg bg-portal-blue-lt flex items-center justify-center text-portal-blue">
          <Search size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-bold text-portal-text">{row.property_url}</h3>
            <span className="text-[10px] font-bold uppercase tracking-wider text-portal-green bg-portal-green-lt border border-portal-green/30 px-1.5 py-0.5 rounded-full inline-flex items-center gap-1">
              <CheckCircle2 size={9} /> Connected
            </span>
          </div>
          <p className="text-[11px] text-portal-sub mt-1">
            Connected {new Date(row.connected_at).toLocaleDateString()}
            {row.last_sync_at && ` — last sync ${new Date(row.last_sync_at).toLocaleString()}`}
          </p>
          {row.last_sync_status === 'error' && row.last_sync_error && (
            <p className="text-[11px] text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1 mt-2">
              Last sync error: {row.last_sync_error}
            </p>
          )}
        </div>
        <div className="shrink-0 text-right text-xs">
          <div className="text-portal-muted">Query rows stored</div>
          <div className="text-portal-text font-bold">{recentQueryRows.toLocaleString()}</div>
          <div className="text-[10px] text-portal-muted">90-day window</div>
        </div>
      </div>

      <div className="px-5 py-4 flex items-center gap-3 flex-wrap">
        <button
          onClick={sync}
          disabled={pending}
          className="text-xs font-bold text-white bg-portal-blue hover:bg-portal-blue-dk px-3 py-1.5 rounded-md disabled:opacity-50 inline-flex items-center gap-1.5"
        >
          <RefreshCw size={11} className={pending ? 'animate-spin' : ''} />
          {pending ? 'Syncing…' : 'Sync now'}
        </button>
        {msg && <span className="text-[11px] text-portal-sub">{msg}</span>}
        <div className="ml-auto">
          {!confirming ? (
            <button
              onClick={() => setConfirming(true)}
              className="text-xs font-bold text-red-700 hover:text-red-900 inline-flex items-center gap-1"
            >
              <Trash2 size={11} /> Disconnect
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-portal-sub">Remove token + stored data?</span>
              <button
                onClick={() => startDis(async () => { await disconnectSearchConsoleAction(row.property_url) })}
                disabled={pendingDis}
                className="text-xs font-bold text-white bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded-md disabled:opacity-50"
              >
                {pendingDis ? 'Disconnecting…' : 'Yes, disconnect'}
              </button>
              <button onClick={() => setConfirming(false)} className="text-xs font-bold text-portal-sub hover:text-portal-text">
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ConnectView() {
  const [propertyUrl, setPropertyUrl] = useState('sc-domain:riverregionparents.com')
  const [refreshToken, setRefreshToken] = useState('')
  const [showToken, setShowToken] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [pending, start] = useTransition()

  function submit() {
    setErr(null)
    start(async () => {
      const out = await connectSearchConsoleAction({
        propertyUrl:  propertyUrl.trim(),
        refreshToken: refreshToken.trim(),
      })
      if (!out.ok) setErr(out.error)
    })
  }

  return (
    <div className="bg-white border border-portal-border rounded-lg p-5 space-y-4">
      <div className="flex items-center gap-3">
        <div className="shrink-0 w-10 h-10 rounded-lg bg-portal-blue-lt flex items-center justify-center text-portal-blue">
          <Search size={20} />
        </div>
        <div>
          <h3 className="text-sm font-bold text-portal-text">Connect Google Search Console</h3>
          <p className="text-[11px] text-portal-sub">Refresh-token paste — see walkthrough below.</p>
        </div>
      </div>

      <details className="bg-portal-bg border border-portal-border rounded-md p-3 text-xs text-portal-sub leading-relaxed">
        <summary className="text-portal-text font-bold cursor-pointer">How to get a refresh token (3 minutes)</summary>
        <ol className="list-decimal pl-5 mt-2 space-y-1">
          <li>Open <a href="https://developers.google.com/oauthplayground" target="_blank" rel="noreferrer" className="text-portal-blue hover:underline inline-flex items-center gap-1">OAuth Playground <ExternalLink size={10} /></a></li>
          <li>Click the gear icon (top right) → check <strong>Use your own OAuth credentials</strong> → paste your Client ID + Client Secret</li>
          <li>In Step 1 — paste this scope and click <strong>Authorize APIs</strong>:<br/>
            <code className="bg-white px-1 py-0.5 rounded border border-portal-border block mt-1 text-[10px]">https://www.googleapis.com/auth/webmasters.readonly</code>
          </li>
          <li>Sign in with the Google account that owns the Search Console property; grant access</li>
          <li>In Step 2 — click <strong>Exchange authorization code for tokens</strong></li>
          <li>Copy the <strong>Refresh token</strong> (NOT the access token) and paste below</li>
        </ol>
      </details>

      <div>
        <label className="block text-[11px] font-bold uppercase tracking-wider text-portal-sub mb-1">Property URL</label>
        <input
          type="text"
          value={propertyUrl}
          onChange={e => setPropertyUrl(e.target.value)}
          placeholder="sc-domain:riverregionparents.com"
          className="w-full text-xs font-mono px-3 py-2 border border-portal-border rounded-md bg-white text-portal-text focus:outline-none focus:border-portal-blue"
        />
        <p className="text-[10px] text-portal-muted mt-1">
          For a domain property, use <code className="bg-portal-bg px-1 rounded">sc-domain:yoursite.com</code>. For a URL prefix property, use the full URL with trailing slash.
        </p>
      </div>

      <div>
        <label className="block text-[11px] font-bold uppercase tracking-wider text-portal-sub mb-1">Refresh token</label>
        <div className="relative">
          <input
            type={showToken ? 'text' : 'password'}
            value={refreshToken}
            onChange={e => setRefreshToken(e.target.value)}
            placeholder="1//0a..."
            className="w-full text-xs font-mono px-3 py-2 pr-9 border border-portal-border rounded-md bg-white text-portal-text focus:outline-none focus:border-portal-blue"
          />
          <button
            type="button"
            onClick={() => setShowToken(s => !s)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-portal-muted hover:text-portal-text"
          >
            {showToken ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
      </div>

      {err && (
        <div className="bg-red-50 border border-red-200 rounded px-3 py-2 text-[11px] text-red-700 leading-relaxed inline-flex items-start gap-2">
          <AlertCircle size={12} className="mt-0.5 shrink-0" />
          <pre className="whitespace-pre-wrap font-sans">{err}</pre>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={submit}
          disabled={pending || !propertyUrl.trim() || !refreshToken.trim()}
          className="text-xs font-bold text-white bg-portal-blue hover:bg-portal-blue-dk px-3 py-1.5 rounded-md disabled:opacity-50"
        >
          {pending ? 'Connecting…' : 'Connect'}
        </button>
      </div>
    </div>
  )
}
