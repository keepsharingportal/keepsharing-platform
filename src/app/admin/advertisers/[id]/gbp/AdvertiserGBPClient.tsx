'use client'

import { useState, useTransition } from 'react'
import { MapPin, CheckCircle2, Eye, EyeOff, RefreshCw, Trash2, AlertCircle, ExternalLink, Send } from 'lucide-react'
import {
  validateRefreshTokenAction, connectGBPAction, disconnectGBPAction,
  syncGBPNowAction, postToGBPAction,
} from '@/app/admin/integrations/google-business/actions'
import type { AdvertiserGBPIntegrationRow, InsightRow, PostRow } from './page'

interface Props {
  advertiserId:   string
  advertiserName: string
  row:            AdvertiserGBPIntegrationRow | null
  insights:       InsightRow[]
  posts:          PostRow[]
}

export function AdvertiserGBPClient(props: Props) {
  if (props.row) return <ConnectedView {...props} row={props.row} advertiserId={props.advertiserId} />
  return <ConnectView advertiserId={props.advertiserId} advertiserName={props.advertiserName} />
}

// ── Connect (refresh-token paste) ────────────────────────────────────────────

function ConnectView({ advertiserId, advertiserName }: { advertiserId: string; advertiserName: string }) {
  const [refreshToken, setRefreshToken] = useState('')
  const [showToken, setShowToken] = useState(false)
  const [options, setOptions] = useState<Array<{ accountResource: string; locationResource: string; label: string }> | null>(null)
  const [pick, setPick] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [pending, start] = useTransition()

  function validate() {
    setErr(null)
    start(async () => {
      const out = await validateRefreshTokenAction(refreshToken.trim())
      if (!out.ok) { setErr(out.error); return }
      setOptions(out.options)
      if (out.options.length === 1) setPick(out.options[0].locationResource)
    })
  }

  function connect() {
    if (!pick || !options) return
    const picked = options.find(o => o.locationResource === pick)
    if (!picked) return
    setErr(null)
    start(async () => {
      const out = await connectGBPAction({
        refreshToken:        refreshToken.trim(),
        accountResource:     picked.accountResource,
        locationResource:    picked.locationResource,
        locationName:        picked.label,
        advertiserAccountId: advertiserId,
      })
      if (!out.ok) setErr(out.error)
    })
  }

  return (
    <div className="bg-white border border-portal-border rounded-lg p-5 space-y-4">
      <div className="flex items-center gap-3">
        <div className="shrink-0 w-10 h-10 rounded-lg bg-portal-blue-lt flex items-center justify-center text-portal-blue">
          <MapPin size={20} />
        </div>
        <div>
          <h3 className="text-sm font-bold text-portal-text">Connect {advertiserName}&apos;s Google Business Profile</h3>
          <p className="text-[11px] text-portal-sub">The advertiser mints a refresh token from OAuth Playground; you paste it here.</p>
        </div>
      </div>

      <details className="bg-portal-bg border border-portal-border rounded-md p-3 text-xs text-portal-sub leading-relaxed">
        <summary className="text-portal-text font-bold cursor-pointer">Instructions to send to the advertiser</summary>
        <ol className="list-decimal pl-5 mt-2 space-y-1">
          <li>Open <a href="https://developers.google.com/oauthplayground" target="_blank" rel="noreferrer" className="text-portal-blue hover:underline inline-flex items-center gap-1">Google OAuth Playground <ExternalLink size={10} /></a></li>
          <li>Click the gear (top right) → check <strong>Use your own OAuth credentials</strong> → paste the publisher&apos;s Client ID + Client Secret (we&apos;ll share these)</li>
          <li>Step 1: paste this scope and Authorize:<br/>
            <code className="bg-white px-1 py-0.5 rounded border border-portal-border block mt-1 text-[10px]">https://www.googleapis.com/auth/business.manage</code>
          </li>
          <li>Sign in with the Google account that owns your Business Profile and grant access</li>
          <li>Step 2: Exchange authorization code for tokens — send the <strong>Refresh token</strong> back to the publisher</li>
        </ol>
        <p className="text-[11px] text-portal-muted mt-2">
          You (the publisher) can revoke this at any time, and the advertiser can revoke from their Google account security page at any time.
        </p>
      </details>

      {!options ? (
        <>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-portal-sub mb-1">Refresh token (from the advertiser)</label>
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
            <div className="bg-red-50 border border-red-200 rounded px-3 py-2 text-[11px] text-red-700 inline-flex items-start gap-2">
              <AlertCircle size={12} className="mt-0.5 shrink-0" />
              <pre className="whitespace-pre-wrap font-sans">{err}</pre>
            </div>
          )}
          <button
            onClick={validate}
            disabled={pending || !refreshToken.trim()}
            className="text-xs font-bold text-white bg-portal-blue hover:bg-portal-blue-dk px-3 py-1.5 rounded-md disabled:opacity-50"
          >
            {pending ? 'Validating…' : 'Validate token'}
          </button>
        </>
      ) : (
        <>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-portal-sub mb-1">Pick the location to connect</label>
            <div className="space-y-2">
              {options.map(o => (
                <label key={o.locationResource} className="flex items-center gap-2 p-2 border border-portal-border rounded-md hover:bg-portal-bg cursor-pointer text-xs">
                  <input
                    type="radio"
                    name="location"
                    value={o.locationResource}
                    checked={pick === o.locationResource}
                    onChange={() => setPick(o.locationResource)}
                  />
                  <span className="text-portal-text">{o.label}</span>
                </label>
              ))}
            </div>
          </div>
          {err && (
            <div className="bg-red-50 border border-red-200 rounded px-3 py-2 text-[11px] text-red-700 inline-flex items-start gap-2">
              <AlertCircle size={12} className="mt-0.5 shrink-0" />
              <pre className="whitespace-pre-wrap font-sans">{err}</pre>
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={connect}
              disabled={pending || !pick}
              className="text-xs font-bold text-white bg-portal-blue hover:bg-portal-blue-dk px-3 py-1.5 rounded-md disabled:opacity-50"
            >
              {pending ? 'Connecting…' : 'Connect this location'}
            </button>
            <button
              onClick={() => { setOptions(null); setPick(null) }}
              className="text-xs font-bold text-portal-sub hover:text-portal-text px-3 py-1.5 rounded-md"
            >
              Back
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ── Connected view ───────────────────────────────────────────────────────────

function ConnectedView({ row, insights, posts, advertiserName, advertiserId }: { row: AdvertiserGBPIntegrationRow; insights: InsightRow[]; posts: PostRow[]; advertiserName: string; advertiserId: string }) {
  const rollup = new Map<string, number>()
  for (const i of insights) rollup.set(i.metric, (rollup.get(i.metric) ?? 0) + i.value)
  const summaries: Array<{ label: string; metric: string }> = [
    { label: 'Search impressions', metric: 'BUSINESS_IMPRESSIONS_MOBILE_SEARCH' },
    { label: 'Direction requests', metric: 'BUSINESS_DIRECTION_REQUESTS' },
    { label: 'Call clicks',        metric: 'CALL_CLICKS' },
    { label: 'Website clicks',     metric: 'WEBSITE_CLICKS' },
  ]
  return (
    <div className="space-y-6">
      <ConnectionHeader row={row} insightCount={insights.length} advertiserName={advertiserName} />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {summaries.map(s => (
          <SummaryCard
            key={s.metric}
            label={s.label}
            value={(rollup.get(s.metric) ?? 0).toLocaleString()}
            sub="Last 30 days"
          />
        ))}
      </div>
      <PostComposer advertiserId={advertiserId} />
      {posts.length > 0 && <PostHistory posts={posts} />}
    </div>
  )
}

function ConnectionHeader({ row, insightCount, advertiserName }: { row: AdvertiserGBPIntegrationRow; insightCount: number; advertiserName: string }) {
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [pendingDis, startDis] = useTransition()
  function sync() {
    setMsg(null)
    start(async () => {
      const out = await syncGBPNowAction()
      setMsg(out.ok ? `Synced ${out.insightCount} insight rows across all GBPs.` : `Error: ${out.error}`)
    })
  }
  return (
    <div className="bg-white border border-portal-border rounded-lg overflow-hidden">
      <div className="flex items-start gap-4 px-5 py-4 border-b border-portal-border">
        <div className="shrink-0 w-10 h-10 rounded-lg bg-portal-blue-lt flex items-center justify-center text-portal-blue">
          <MapPin size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-bold text-portal-text">{row.location_name ?? row.location_id}</h3>
            <span className="text-[10px] font-bold uppercase tracking-wider text-portal-green bg-portal-green-lt border border-portal-green/30 px-1.5 py-0.5 rounded-full inline-flex items-center gap-1">
              <CheckCircle2 size={9} /> Connected (Phase 2)
            </span>
          </div>
          <p className="text-[11px] text-portal-sub mt-1">
            {advertiserName}&apos;s GBP · Connected {new Date(row.connected_at).toLocaleDateString()}
            {row.last_sync_at && ` · last sync ${new Date(row.last_sync_at).toLocaleString()}`}
          </p>
          {row.last_sync_status === 'error' && row.last_sync_error && (
            <p className="text-[11px] text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1 mt-2">
              Last sync error: {row.last_sync_error}
            </p>
          )}
        </div>
        <div className="shrink-0 text-right text-xs">
          <div className="text-portal-muted">Insight rows stored</div>
          <div className="text-portal-text font-bold">{insightCount.toLocaleString()}</div>
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
            <button onClick={() => setConfirming(true)} className="text-xs font-bold text-red-700 hover:text-red-900 inline-flex items-center gap-1">
              <Trash2 size={11} /> Disconnect
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-portal-sub">Disconnect?</span>
              <button
                onClick={() => startDis(async () => { await disconnectGBPAction(row.location_id) })}
                disabled={pendingDis}
                className="text-xs font-bold text-white bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded-md disabled:opacity-50"
              >
                {pendingDis ? 'Disconnecting…' : 'Yes'}
              </button>
              <button onClick={() => setConfirming(false)} className="text-xs font-bold text-portal-sub hover:text-portal-text">Cancel</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function SummaryCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="bg-white border border-portal-border rounded-lg p-4">
      <div className="text-[11px] font-bold uppercase tracking-wider text-portal-sub">{label}</div>
      <div className="text-2xl font-bold text-portal-text mt-1">{value}</div>
      <div className="text-[11px] text-portal-muted mt-0.5">{sub}</div>
    </div>
  )
}

const CTA_OPTIONS: Array<{ value: 'BOOK' | 'ORDER' | 'SHOP' | 'LEARN_MORE' | 'SIGN_UP' | 'CALL'; label: string; needsUrl: boolean }> = [
  { value: 'LEARN_MORE', label: 'Learn more', needsUrl: true  },
  { value: 'BOOK',       label: 'Book',       needsUrl: true  },
  { value: 'ORDER',      label: 'Order',      needsUrl: true  },
  { value: 'SHOP',       label: 'Shop',       needsUrl: true  },
  { value: 'SIGN_UP',    label: 'Sign up',    needsUrl: true  },
  { value: 'CALL',       label: 'Call',       needsUrl: false },
]

function PostComposer({ advertiserId }: { advertiserId: string }) {
  const [summary, setSummary] = useState('')
  const [cta, setCta] = useState<'BOOK' | 'ORDER' | 'SHOP' | 'LEARN_MORE' | 'SIGN_UP' | 'CALL' | ''>('LEARN_MORE')
  const [ctaUrl, setCtaUrl] = useState('')
  const [mediaUrl, setMediaUrl] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const ctaSpec = CTA_OPTIONS.find(o => o.value === cta)
  function submit() {
    setMsg(null)
    start(async () => {
      const out = await postToGBPAction({
        summary,
        ctaActionType:       cta || undefined,
        ctaUrl:              ctaUrl.trim() || undefined,
        mediaUrl:            mediaUrl.trim() || undefined,
        advertiserAccountId: advertiserId,
      })
      if (out.ok) {
        setMsg(`Posted live → ${out.postName}`)
        setSummary(''); setCtaUrl(''); setMediaUrl('')
      } else setMsg(`Error: ${out.error}`)
    })
  }
  return (
    <section className="bg-white border border-portal-border rounded-lg p-5">
      <h3 className="text-sm font-bold text-portal-text mb-3">Post an update on the advertiser&apos;s GBP</h3>
      <div className="space-y-3">
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-portal-sub mb-1">Summary</label>
          <textarea
            rows={4}
            value={summary}
            onChange={e => setSummary(e.target.value)}
            placeholder="What's new — a deal, a new product, a seasonal hook…"
            className="w-full text-xs px-3 py-2 border border-portal-border rounded-md bg-white text-portal-text focus:outline-none focus:border-portal-blue resize-y"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-portal-sub mb-1">Call to action</label>
            <select value={cta} onChange={e => setCta(e.target.value as typeof cta)} className="w-full text-xs px-2 py-1.5 border border-portal-border rounded-md bg-white">
              <option value="">— No CTA —</option>
              {CTA_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          {ctaSpec?.needsUrl && (
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-portal-sub mb-1">CTA URL</label>
              <input
                type="url"
                value={ctaUrl}
                onChange={e => setCtaUrl(e.target.value)}
                placeholder="https://..."
                className="w-full text-xs px-2 py-1.5 border border-portal-border rounded-md bg-white"
              />
            </div>
          )}
        </div>
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-portal-sub mb-1">Image URL (optional)</label>
          <input type="url" value={mediaUrl} onChange={e => setMediaUrl(e.target.value)} placeholder="https://..." className="w-full text-xs px-2 py-1.5 border border-portal-border rounded-md bg-white" />
        </div>
        {msg && <p className={`text-[11px] ${msg.startsWith('Error') ? 'text-red-700' : 'text-portal-green'}`}>{msg}</p>}
        <button
          onClick={submit}
          disabled={pending || summary.length < 10}
          className="text-xs font-bold text-white bg-portal-blue hover:bg-portal-blue-dk px-3 py-1.5 rounded-md disabled:opacity-50 inline-flex items-center gap-1.5"
        >
          <Send size={11} /> {pending ? 'Posting…' : 'Post to GBP'}
        </button>
      </div>
    </section>
  )
}

function PostHistory({ posts }: { posts: PostRow[] }) {
  return (
    <section className="bg-white border border-portal-border rounded-lg p-5">
      <h3 className="text-sm font-bold text-portal-text mb-3">Recent posts</h3>
      <ul className="space-y-3 text-xs">
        {posts.map(p => (
          <li key={p.id} className="border-l-2 pl-3" style={{ borderColor: p.status === 'live' ? '#10b981' : p.status === 'error' ? '#ef4444' : '#94a3b8' }}>
            <div className="flex items-center gap-2 flex-wrap text-[11px] text-portal-muted">
              <span>{new Date(p.created_at).toLocaleString()}</span>
              <span className="font-bold uppercase tracking-wider" style={{ color: p.status === 'live' ? '#059669' : p.status === 'error' ? '#dc2626' : '#64748b' }}>
                {p.status}
              </span>
              {p.cta_label && <span>· CTA: {p.cta_label}</span>}
            </div>
            <p className="text-portal-text mt-0.5 leading-snug">{p.summary}</p>
            {p.error && <p className="text-red-700 mt-1 break-all">{p.error}</p>}
          </li>
        ))}
      </ul>
    </section>
  )
}
