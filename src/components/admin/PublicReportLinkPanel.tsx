'use client'

// Per-advertiser panel on /admin/advertisers/[id] for the public report URL.
// Lazy-loads the token on mount (mints one if there isn't one yet), shows
// view stats, lets admin copy or regenerate.
//
// "Regenerate" is destructive — the previous URL stops working immediately.
// Used when a link gets forwarded outside the advertiser org, or when a
// contract ends.

import { useEffect, useState } from 'react'
import {
  Link2, Copy, RefreshCw, ExternalLink, CheckCircle2, Eye, AlertTriangle,
} from 'lucide-react'

interface TokenInfo {
  token:           string
  view_count:      number
  last_viewed_at:  string | null
  created_at:      string
}

const SITE_BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.riverregionparents.com'

export function PublicReportLinkPanel({ advertiserId }: { advertiserId: string }) {
  const [info,        setInfo]        = useState<TokenInfo | null>(null)
  const [loading,     setLoading]     = useState(true)
  const [busy,        setBusy]        = useState<'regen' | null>(null)
  const [copied,      setCopied]      = useState(false)
  const [err,         setErr]         = useState<string | null>(null)

  async function load() {
    setLoading(true); setErr(null)
    try {
      const res = await fetch(`/api/admin/advertisers/${advertiserId}/report-token`, { cache: 'no-store' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { setErr(json?.error ?? `HTTP ${res.status}`); return }
      setInfo({
        token:          json.token,
        view_count:     json.view_count ?? 0,
        last_viewed_at: json.last_viewed_at,
        created_at:     json.created_at,
      })
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [advertiserId])

  async function regenerate() {
    if (!confirm('Regenerate the report link?\n\nThe previous URL stops working immediately. Anyone with the old link will see a not-found page until you send them the new one.')) return
    setBusy('regen'); setErr(null)
    try {
      const res = await fetch(`/api/admin/advertisers/${advertiserId}/report-token`, { method: 'POST' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { setErr(json?.error ?? `HTTP ${res.status}`); return }
      setInfo({
        token:          json.token,
        view_count:     json.view_count ?? 0,
        last_viewed_at: json.last_viewed_at,
        created_at:     json.created_at,
      })
    } finally { setBusy(null) }
  }

  function copyLink() {
    if (!info) return
    const url = `${SITE_BASE}/r/${info.token}`
    void navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    })
  }

  const url        = info ? `${SITE_BASE}/r/${info.token}` : ''
  const lastViewed = info?.last_viewed_at ? new Date(info.last_viewed_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : 'Never opened yet'

  return (
    <section className="bg-white rounded-lg border border-portal-border p-5 space-y-3 text-sm">
      <div className="flex items-center gap-2">
        <Link2 size={14} className="text-portal-blue" />
        <h2 className="text-xs font-bold uppercase tracking-wider text-portal-sub">Public report link</h2>
      </div>

      {loading ? (
        <p className="text-xs text-portal-muted inline-flex items-center gap-1.5">
          <RefreshCw size={11} className="animate-spin" /> Loading…
        </p>
      ) : err ? (
        <p className="text-xs text-portal-red font-semibold inline-flex items-center gap-1 bg-portal-red-lt border border-portal-red/30 rounded-lg px-2.5 py-1.5">
          <AlertTriangle size={11} /> {err}
        </p>
      ) : info ? (
        <>
          <p className="text-[11px] text-portal-sub leading-snug">
            Stable URL the advertiser can revisit anytime. Numbers update nightly. No login.
          </p>

          <div className="bg-portal-bg border border-portal-border rounded-lg px-2.5 py-2 font-mono text-[11px] text-portal-text break-all">
            {url}
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={copyLink}
              className="inline-flex items-center gap-1 text-xs px-2.5 py-1 font-semibold text-portal-text bg-white border border-portal-border rounded-lg hover:bg-portal-bg"
            >
              {copied ? <CheckCircle2 size={11} className="text-portal-green" /> : <Copy size={11} />}
              {copied ? 'Copied' : 'Copy link'}
            </button>
            <a
              href={`/r/${info.token}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs px-2.5 py-1 font-semibold text-portal-blue bg-portal-blue-lt border border-portal-blue/30 rounded-lg hover:bg-portal-blue-lt"
            >
              <ExternalLink size={11} /> Preview
            </a>
            <button
              type="button"
              onClick={regenerate}
              disabled={busy !== null}
              title="Revoke the current URL and mint a new one"
              className="ml-auto inline-flex items-center gap-1 text-xs px-2.5 py-1 font-semibold text-portal-amber bg-white border border-portal-amber/30 rounded-lg hover:bg-portal-amber-lt disabled:opacity-40"
            >
              {busy === 'regen' ? <RefreshCw size={11} className="animate-spin" /> : <RefreshCw size={11} />}
              Regenerate
            </button>
          </div>

          <div className="flex items-center gap-3 pt-1 text-[11px] text-portal-sub">
            <span className="inline-flex items-center gap-1">
              <Eye size={11} className="text-portal-muted" />
              <strong className="text-portal-text">{info.view_count.toLocaleString()}</strong> view{info.view_count === 1 ? '' : 's'}
            </span>
            <span>·</span>
            <span>Last opened: <strong className="text-portal-text">{lastViewed}</strong></span>
          </div>
        </>
      ) : null}
    </section>
  )
}
