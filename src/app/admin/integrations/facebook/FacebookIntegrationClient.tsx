'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Megaphone, CheckCircle2, AlertCircle, RefreshCw, Plug, PlugZap,
  Copy, ExternalLink, ChevronDown, ChevronUp, Search,
} from 'lucide-react'
import type {
  FacebookIntegrationRow, FacebookCampaignRow, AdvertiserOption, SyncLogRow,
} from './page'

interface Props {
  integration: FacebookIntegrationRow | null
  campaigns:   FacebookCampaignRow[]
  advertisers: AdvertiserOption[]
  recentSyncs: SyncLogRow[]
}

export function FacebookIntegrationClient({ integration, campaigns, advertisers, recentSyncs }: Props) {
  const connected = !!integration?.is_active

  return (
    <div className="space-y-5">
      {!connected ? (
        <SetupCard />
      ) : (
        <ConnectedCard integration={integration!} />
      )}

      {!connected && <ConnectForm />}

      <NamingConventionCard />

      {connected && (
        <CampaignMappings campaigns={campaigns} advertisers={advertisers} />
      )}

      {connected && recentSyncs.length > 0 && (
        <SyncLogCard recentSyncs={recentSyncs} />
      )}
    </div>
  )
}

// ── Setup walkthrough (shown when not connected) ─────────────────────────────

function SetupCard() {
  return (
    <div className="bg-white border border-portal-border rounded-lg overflow-hidden">
      <div className="px-5 py-4 border-b border-portal-border">
        <div className="flex items-center gap-2">
          <Plug size={16} className="text-portal-blue" />
          <h2 className="text-sm font-bold text-portal-text">Connect your Meta ad account</h2>
        </div>
        <p className="text-xs text-portal-sub mt-1">
          One-time setup. Generates a long-lived <strong>system user token</strong> with read-only access — never expires, no spend permission.
        </p>
      </div>
      <ol className="px-5 py-4 space-y-4 text-sm text-portal-text">
        <Step n={1} title="Open Meta Business Settings">
          Go to{' '}
          <a href="https://business.facebook.com/settings" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-portal-blue hover:underline font-semibold">
            business.facebook.com/settings <ExternalLink size={11} />
          </a>{' '}
          and pick the business that owns the ad account.
        </Step>
        <Step n={2} title="Create a System User">
          In the left sidebar under <strong>Users → System Users</strong>, click <strong>Add</strong>. Name it something obvious like <em>&ldquo;Keep Sharing Sync&rdquo;</em>. Role: <strong>Employee</strong>.
        </Step>
        <Step n={3} title="Assign the ad account to the system user">
          Open the system user you just created, click <strong>Add Assets → Ad Accounts</strong>, pick your ad account, and grant <strong>View performance</strong> access (NOT manage — read-only).
        </Step>
        <Step n={4} title="Generate a token">
          On the system user page, click <strong>Generate Token</strong>. Pick the Meta app (any one you control), then select these permissions only:
          <CopyChip label="ads_read" />
          <CopyChip label="business_management" />
          <span className="text-xs text-portal-sub block mt-1.5">
            Set token expiry to <strong>Never</strong> if offered. Copy the token immediately — you can&apos;t view it again.
          </span>
        </Step>
        <Step n={5} title="Grab your Ad Account ID">
          Back in Business Settings → <strong>Accounts → Ad Accounts</strong>. The ID is the number under your ad account, usually formatted <code className="bg-portal-bg border border-portal-border px-1 rounded text-[11px]">act_1234567890</code>.
        </Step>
        <Step n={6} title="Paste both below">
          Drop the token + ad account ID into the form. We verify them against Meta before saving.
        </Step>
      </ol>
    </div>
  )
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="shrink-0 w-6 h-6 rounded-full bg-portal-blue-lt text-portal-blue text-xs font-bold inline-flex items-center justify-center">
        {n}
      </span>
      <div className="flex-1">
        <p className="font-semibold text-portal-text mb-0.5">{title}</p>
        <div className="text-xs text-portal-sub leading-relaxed">{children}</div>
      </div>
    </li>
  )
}

function CopyChip({ label }: { label: string }) {
  return (
    <button
      type="button"
      onClick={() => navigator.clipboard.writeText(label).catch(() => {})}
      className="inline-flex items-center gap-1 px-2 py-0.5 mr-1 mt-1 text-[10px] font-mono font-bold bg-portal-bg border border-portal-border rounded hover:bg-portal-row-hover"
      title="Click to copy"
    >
      {label} <Copy size={9} className="text-portal-muted" />
    </button>
  )
}

// ── Connected status card ───────────────────────────────────────────────────

function ConnectedCard({ integration }: { integration: FacebookIntegrationRow }) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [busy, setBusy] = useState<'sync' | 'disconnect' | null>(null)
  const [msg,  setMsg]  = useState<{ text: string; ok: boolean } | null>(null)

  async function sync() {
    setBusy('sync'); setMsg(null)
    try {
      const res = await fetch('/api/admin/integrations/facebook/sync', { method: 'POST' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { setMsg({ text: json?.error ?? `HTTP ${res.status}`, ok: false }); return }
      setMsg({
        text: `Pulled ${json.campaign_count ?? 0} campaign${json.campaign_count === 1 ? '' : 's'} · ${json.metric_count ?? 0} metric rows`,
        ok: json.status !== 'error',
      })
      startTransition(() => router.refresh())
    } finally { setBusy(null) }
  }

  async function disconnect() {
    if (!confirm('Disconnect Facebook? Historical metrics stay — but the nightly sync will stop until you reconnect.')) return
    setBusy('disconnect'); setMsg(null)
    try {
      const res = await fetch('/api/admin/integrations/facebook', { method: 'DELETE' })
      if (!res.ok) { const j = await res.json().catch(() => ({})); setMsg({ text: j?.error ?? `HTTP ${res.status}`, ok: false }); return }
      setMsg({ text: 'Disconnected', ok: true })
      startTransition(() => router.refresh())
    } finally { setBusy(null) }
  }

  const lastSync = integration.last_sync_at
    ? new Date(integration.last_sync_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
    : 'Never'
  const lastStatusColor =
    integration.last_sync_status === 'ok'      ? 'text-portal-green'
    : integration.last_sync_status === 'partial' ? 'text-portal-amber'
    : integration.last_sync_status === 'error'   ? 'text-portal-red'
    : 'text-portal-muted'

  return (
    <div className="bg-white border border-portal-border rounded-lg overflow-hidden">
      <div className="px-5 py-4 border-b border-portal-border flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="shrink-0 w-10 h-10 rounded-lg bg-portal-blue-lt flex items-center justify-center text-portal-blue">
            <Megaphone size={20} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-portal-text inline-flex items-center gap-2">
              {integration.ad_account_name ?? 'Connected'}
              <span className="text-[10px] font-bold uppercase tracking-wider text-portal-green bg-portal-green-lt border border-portal-green/30 px-1.5 py-0.5 rounded-full inline-flex items-center gap-1">
                <CheckCircle2 size={9} /> Connected
              </span>
            </h2>
            <p className="text-xs text-portal-sub mt-0.5 font-mono">{integration.ad_account_id}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={sync}
            disabled={busy !== null}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-portal-navy text-white rounded-lg hover:bg-portal-navy/90 disabled:opacity-40"
          >
            {busy === 'sync' ? <RefreshCw size={11} className="animate-spin" /> : <RefreshCw size={11} />}
            {busy === 'sync' ? 'Syncing…' : 'Sync now'}
          </button>
          <button
            type="button"
            onClick={disconnect}
            disabled={busy !== null}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-portal-red/30 text-portal-red bg-white rounded-lg hover:bg-portal-red-lt disabled:opacity-40"
          >
            <PlugZap size={11} /> Disconnect
          </button>
        </div>
      </div>
      <div className="px-5 py-3 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
        <Stat label="Last sync"        value={lastSync} />
        <Stat label="Status"           value={integration.last_sync_status ?? '—'} valueClass={lastStatusColor} />
        <Stat label="Campaigns synced" value={integration.last_sync_campaign_count?.toLocaleString() ?? '—'} />
        <Stat label="Metric rows"      value={integration.last_sync_metric_count?.toLocaleString() ?? '—'} />
      </div>
      {integration.last_sync_error && (
        <div className="px-5 py-3 border-t border-portal-border bg-portal-red-lt/30 text-xs text-portal-red">
          <strong>Last error:</strong> {integration.last_sync_error}
        </div>
      )}
      {msg && (
        <div className={`px-5 py-2.5 border-t border-portal-border text-xs font-medium ${msg.ok ? 'text-portal-green bg-portal-green-lt/40' : 'text-portal-red bg-portal-red-lt/40'}`}>
          {msg.text}
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-portal-muted">{label}</p>
      <p className={`text-sm font-bold mt-0.5 ${valueClass ?? 'text-portal-text'}`}>{value}</p>
    </div>
  )
}

// ── Connect form ────────────────────────────────────────────────────────────

function ConnectForm() {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [token, setToken]   = useState('')
  const [acct,  setAcct]    = useState('')
  const [busy,  setBusy]    = useState(false)
  const [err,   setErr]     = useState<string | null>(null)

  async function connect(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setErr(null)
    try {
      const res = await fetch('/api/admin/integrations/facebook', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ access_token: token.trim(), ad_account_id: acct.trim() }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { setErr(json?.error ?? `HTTP ${res.status}`); return }
      startTransition(() => router.refresh())
    } finally { setBusy(false) }
  }

  return (
    <form onSubmit={connect} className="bg-white border border-portal-border rounded-lg p-5 space-y-3">
      <div>
        <label className="block text-xs font-bold text-portal-text mb-1">System user access token</label>
        <input
          type="password"
          value={token}
          onChange={e => setToken(e.target.value)}
          placeholder="EAAB…"
          className="w-full px-3 py-2 text-sm font-mono border border-portal-border rounded-lg outline-none focus:border-portal-blue"
        />
        <p className="text-[11px] text-portal-muted mt-1">Stored encrypted. Never displayed back.</p>
      </div>
      <div>
        <label className="block text-xs font-bold text-portal-text mb-1">Ad account ID</label>
        <input
          type="text"
          value={acct}
          onChange={e => setAcct(e.target.value)}
          placeholder="act_1234567890"
          className="w-full px-3 py-2 text-sm font-mono border border-portal-border rounded-lg outline-none focus:border-portal-blue"
        />
      </div>
      {err && <p className="text-xs text-portal-red font-semibold">{err}</p>}
      <button
        type="submit"
        disabled={busy || !token.trim() || !acct.trim()}
        className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-portal-navy text-white rounded-lg hover:bg-portal-navy/90 disabled:opacity-40"
      >
        {busy ? <RefreshCw size={13} className="animate-spin" /> : <Plug size={13} />}
        {busy ? 'Verifying…' : 'Connect'}
      </button>
    </form>
  )
}

// ── Naming convention guide (always visible) ────────────────────────────────

function NamingConventionCard() {
  return (
    <div className="bg-portal-blue-lt/40 border border-portal-blue/30 rounded-lg p-5">
      <h2 className="text-sm font-bold text-portal-navy mb-1">Campaign naming convention</h2>
      <p className="text-xs text-portal-text leading-relaxed mb-3">
        For each campaign you create in Meta Ads Manager, prefix the name with the advertiser&apos;s slug in square brackets.
        We use this to auto-bind the campaign to its advertiser on every sync. Anything that doesn&apos;t follow the convention
        shows up below as <strong>Unmapped</strong> — you can pick the advertiser manually and the override survives renames.
      </p>
      <div className="bg-white border border-portal-blue/20 rounded p-3 space-y-1.5 text-xs">
        <p className="font-bold text-portal-text">Format</p>
        <code className="block text-portal-blue bg-portal-blue-lt px-2 py-1 rounded font-mono">[advertiser-slug] Description — Month Year</code>
        <p className="font-bold text-portal-text mt-3">Examples</p>
        <code className="block text-portal-text bg-portal-bg px-2 py-1 rounded font-mono">[wetumpka-smiles] New Patients — May 2026</code>
        <code className="block text-portal-text bg-portal-bg px-2 py-1 rounded font-mono">[mountain-brook-pediatrics] Summer Wellness — Jun 2026</code>
        <p className="text-portal-sub mt-3 leading-relaxed">
          Slugs are forgiving: <code className="bg-portal-bg px-1 rounded">[Wetumpka Smiles]</code> and{' '}
          <code className="bg-portal-bg px-1 rounded">[WETUMPKA_SMILES]</code> both normalize to{' '}
          <code className="bg-portal-bg px-1 rounded">wetumpka-smiles</code>. The slug must match an existing advertiser&apos;s
          slug in our system.
        </p>
      </div>
    </div>
  )
}

// ── Campaign → advertiser mappings ──────────────────────────────────────────

function CampaignMappings({ campaigns, advertisers }: { campaigns: FacebookCampaignRow[]; advertisers: AdvertiserOption[] }) {
  const [filter, setFilter] = useState<'all' | 'unmapped' | 'mapped' | 'manual'>('all')
  const [search, setSearch] = useState('')

  const filtered = campaigns.filter(c => {
    if (filter === 'unmapped' && c.advertiser_id !== null) return false
    if (filter === 'mapped'   && c.advertiser_id === null) return false
    if (filter === 'manual'   && c.advertiser_mapping_source !== 'manual') return false
    if (search) {
      const q = search.toLowerCase()
      if (!c.name.toLowerCase().includes(q) && !(c.parsed_slug ?? '').includes(q)) return false
    }
    return true
  })

  const counts = {
    all:      campaigns.length,
    unmapped: campaigns.filter(c => c.advertiser_id === null).length,
    mapped:   campaigns.filter(c => c.advertiser_id !== null).length,
    manual:   campaigns.filter(c => c.advertiser_mapping_source === 'manual').length,
  }

  if (campaigns.length === 0) {
    return (
      <div className="bg-white border border-portal-border rounded-lg p-8 text-center text-sm text-portal-muted">
        No campaigns synced yet. Click <strong className="text-portal-text">Sync now</strong> above to pull them from Meta.
      </div>
    )
  }

  return (
    <div className="bg-white border border-portal-border rounded-lg overflow-hidden">
      <div className="px-5 py-3 border-b border-portal-border flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-sm font-bold text-portal-text">Campaign mappings</h2>
        <div className="flex items-center gap-1.5">
          {(['all', 'unmapped', 'mapped', 'manual'] as const).map(f => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border transition-colors ${
                filter === f
                  ? 'bg-portal-navy text-white border-portal-navy'
                  : 'bg-white text-portal-sub border-portal-border hover:bg-portal-bg'
              }`}
            >
              {f} <span className="ml-1 opacity-70">{counts[f]}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="px-5 py-2.5 border-b border-portal-border">
        <div className="relative max-w-sm">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-portal-muted pointer-events-none" />
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Filter campaigns…"
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-portal-border rounded-lg outline-none focus:border-portal-blue"
          />
        </div>
      </div>
      <div className="divide-y divide-portal-border">
        {filtered.map(c => (
          <CampaignRow key={c.id} campaign={c} advertisers={advertisers} />
        ))}
        {filtered.length === 0 && (
          <div className="px-5 py-8 text-center text-xs text-portal-muted">No campaigns match this filter.</div>
        )}
      </div>
    </div>
  )
}

function CampaignRow({ campaign, advertisers }: { campaign: FacebookCampaignRow; advertisers: AdvertiserOption[] }) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [busy, setBusy] = useState(false)
  const [err,  setErr]  = useState<string | null>(null)

  async function setAdvertiser(advertiserId: string | null) {
    setBusy(true); setErr(null)
    try {
      const res = await fetch(`/api/admin/integrations/facebook/campaigns/${campaign.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ advertiser_id: advertiserId }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { setErr(json?.error ?? `HTTP ${res.status}`); return }
      startTransition(() => router.refresh())
    } finally { setBusy(false) }
  }

  const statusColor =
    campaign.effective_status === 'ACTIVE'    ? 'text-portal-green'
    : campaign.effective_status === 'PAUSED'  ? 'text-portal-amber'
    : 'text-portal-muted'

  return (
    <div className="px-5 py-3 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-start">
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-portal-text truncate">{campaign.name}</p>
          <span className={`text-[10px] font-bold uppercase tracking-wider ${statusColor}`}>
            {campaign.effective_status ?? '—'}
          </span>
          {campaign.advertiser_mapping_source === 'manual' && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-portal-blue bg-portal-blue-lt border border-portal-blue/30 px-1.5 py-0.5 rounded-full">
              Manual
            </span>
          )}
          {campaign.advertiser_id === null && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-portal-amber bg-portal-amber-lt border border-portal-amber/30 px-1.5 py-0.5 rounded-full inline-flex items-center gap-1">
              <AlertCircle size={9} /> Unmapped
            </span>
          )}
        </div>
        <p className="text-[11px] text-portal-muted mt-0.5 font-mono">
          {campaign.fb_campaign_id} {campaign.parsed_slug && <>· parsed [<span className="text-portal-text">{campaign.parsed_slug}</span>]</>}
        </p>
        {err && <p className="text-[11px] text-portal-red font-semibold mt-1">{err}</p>}
      </div>
      <div className="flex items-center gap-2">
        <select
          value={campaign.advertiser_id ?? ''}
          onChange={e => setAdvertiser(e.target.value || null)}
          disabled={busy}
          className="text-xs px-2.5 py-1.5 border border-portal-border rounded-lg bg-white cursor-pointer outline-none focus:border-portal-blue max-w-[220px]"
        >
          <option value="">— Unmapped —</option>
          {advertisers.map(a => (
            <option key={a.id} value={a.id}>{a.business_name}</option>
          ))}
        </select>
        {campaign.advertiser_mapping_source === 'manual' && (
          <button
            type="button"
            onClick={() => setAdvertiser(null)}
            disabled={busy}
            className="text-[11px] text-portal-sub hover:text-portal-text underline"
            title="Clear manual override; falls back to auto-mapping on next sync"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  )
}

// ── Recent sync log ─────────────────────────────────────────────────────────

function SyncLogCard({ recentSyncs }: { recentSyncs: SyncLogRow[] }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="bg-white border border-portal-border rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full px-5 py-3 flex items-center justify-between hover:bg-portal-bg"
      >
        <h2 className="text-sm font-bold text-portal-text">Recent sync history</h2>
        {open ? <ChevronUp size={14} className="text-portal-muted" /> : <ChevronDown size={14} className="text-portal-muted" />}
      </button>
      {open && (
        <div className="divide-y divide-portal-border text-xs">
          {recentSyncs.map(s => {
            const started = new Date(s.started_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
            const statusColor =
              s.status === 'ok'      ? 'text-portal-green'
              : s.status === 'partial' ? 'text-portal-amber'
              : s.status === 'error'   ? 'text-portal-red'
              : 'text-portal-muted'
            return (
              <div key={s.id} className="px-5 py-2.5 flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <p className="text-portal-text font-semibold">{started}</p>
                  {s.error && <p className="text-[11px] text-portal-red">{s.error}</p>}
                </div>
                <div className="flex items-center gap-3 text-portal-sub">
                  <span>{s.campaign_count ?? 0} campaigns · {s.metric_count ?? 0} metrics</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-portal-bg border border-portal-border">
                    {s.triggered_by ?? '—'}
                  </span>
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${statusColor}`}>{s.status ?? '—'}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
