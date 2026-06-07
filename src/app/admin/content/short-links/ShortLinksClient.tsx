'use client'

// ShortLinksClient — tracked-link management tool.
// Three use cases share one redirect mechanism (see ./link-taxonomy):
//   1. QR codes (printable)
//   2. Ad links (on-site CTA, minted by the ad editor)
//   3. Campaign links (external — Facebook ads, Instagram, email, etc.)
// Replaces the external QR Code Studio subscription.

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Plus, Copy, Check, ExternalLink, RefreshCw, Trash2, QrCode,
  MousePointer, AlertTriangle, Download, Link2, Phone, Mail, MessageSquare,
  FileText, Calendar, User, Pencil, Search, X,
} from 'lucide-react'
import type { ShortLinkRow, AdvertiserOption } from './page'
import {
  PURPOSE_LIST, purposeOf, type Purpose,
  CHANNEL_LIST, CHANNELS, channelOf, channelsForPurpose, type Channel,
} from './link-taxonomy'

const SITE_ORIGIN = typeof window !== 'undefined' ? window.location.origin : 'https://riverregionparents.com'

const CONTENT_TYPES = [
  { value: 'url',    label: 'URL / Website',  icon: Link2,          desc: 'Link to any page on our site or an external URL' },
  { value: 'phone',  label: 'Phone Call',      icon: Phone,          desc: 'Opens the phone dialer when scanned' },
  { value: 'email',  label: 'Email',           icon: Mail,           desc: 'Opens an email compose window' },
  { value: 'sms',    label: 'SMS / Text',      icon: MessageSquare,  desc: 'Opens a text message to a number' },
  { value: 'vcard',  label: 'vCard / Contact',  icon: User,          desc: 'Downloads a contact card to their phone' },
  { value: 'text',   label: 'Text Message',    icon: FileText,       desc: 'Shows a branded text page when scanned' },
  { value: 'event',  label: 'Calendar Event',  icon: Calendar,       desc: 'Adds an event to their calendar' },
] as const

interface Props {
  initialRows: ShortLinkRow[]
  advertisers: AdvertiserOption[]
}

// Resolve a row's effective purpose. Reads the column first; falls back
// to legacy heuristic (ad_placement_id IS NOT NULL = ad) so pre-migration
// rows still partition correctly across the filter chips.
function purposeFor(row: ShortLinkRow): Purpose {
  if (row.purpose === 'ad' || row.purpose === 'qr' || row.purpose === 'campaign') {
    return row.purpose
  }
  return row.ad_placement_id ? 'ad' : 'qr'
}

// Audience filter — derived from advertiser_account_id presence. No
// new column needed.
type Audience = 'all' | 'in_house' | 'client'
type SortKey  = 'newest' | 'oldest' | 'clicks' | 'recent'

const SORT_LABELS: Record<SortKey, string> = {
  newest: 'Newest first',
  oldest: 'Oldest first',
  clicks: 'Most clicks',
  recent: 'Most recently clicked',
}

export function ShortLinksClient({ initialRows, advertisers }: Props) {
  const [rows, setRows] = useState<ShortLinkRow[]>(initialRows)

  // Filter state
  const [tab, setTab]                       = useState<'all' | Purpose>('all')
  const [search, setSearch]                 = useState('')
  const [channelFilter, setChannelFilter]   = useState<'all' | Channel>('all')
  const [audienceFilter, setAudienceFilter] = useState<Audience>('all')
  const [contentTypeFilter, setContentTypeFilter] = useState<string>('all')
  const [advertiserFilter, setAdvertiserFilter]   = useState<string>('all')
  const [sortKey, setSortKey]               = useState<SortKey>('newest')

  function onRemoved(id: string) {
    setRows(prev => prev.filter(r => r.id !== id))
  }

  // Apply all filters + sort.
  const visibleRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    const advLookup = new Map(advertisers.map(a => [a.id, a.business_name.toLowerCase()]))
    let out = rows.filter(r => {
      if (tab !== 'all' && purposeFor(r) !== tab) return false
      if (channelFilter !== 'all' && (r.channel ?? '') !== channelFilter) return false
      if (audienceFilter === 'in_house' && r.advertiser_account_id) return false
      if (audienceFilter === 'client'   && !r.advertiser_account_id) return false
      if (contentTypeFilter !== 'all' && r.content_type !== contentTypeFilter) return false
      if (advertiserFilter !== 'all' && r.advertiser_account_id !== advertiserFilter) return false
      if (q) {
        const advName = r.advertiser_account_id ? (advLookup.get(r.advertiser_account_id) ?? '') : ''
        const hay = [
          r.shortcode, r.destination, r.label ?? '', r.utm_campaign ?? '', advName,
        ].join(' ').toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })

    // Sort
    out = [...out]
    switch (sortKey) {
      case 'newest':
        out.sort((a, b) => b.created_at.localeCompare(a.created_at))
        break
      case 'oldest':
        out.sort((a, b) => a.created_at.localeCompare(b.created_at))
        break
      case 'clicks':
        out.sort((a, b) => b.click_count - a.click_count)
        break
      case 'recent':
        out.sort((a, b) => (b.last_clicked_at ?? '').localeCompare(a.last_clicked_at ?? ''))
        break
    }
    return out
  }, [rows, tab, channelFilter, audienceFilter, contentTypeFilter, advertiserFilter, search, sortKey, advertisers])

  const anyFilterActive = tab !== 'all' || channelFilter !== 'all' || audienceFilter !== 'all'
    || contentTypeFilter !== 'all' || advertiserFilter !== 'all' || search.trim() !== ''

  function clearAllFilters() {
    setTab('all')
    setChannelFilter('all')
    setAudienceFilter('all')
    setContentTypeFilter('all')
    setAdvertiserFilter('all')
    setSearch('')
  }


  return (
    <div className="flex flex-col">
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 inline-flex items-center gap-2">
            <QrCode size={18} className="text-primary" /> Tracked Links
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            QR codes, on-site ad CTAs, and external campaign links. Every click is tracked, UTMs auto-append on redirect, and rows tie back to advertisers for measurement.
          </p>
        </div>
        <Link
          href="/admin/content/short-links/new"
          className="inline-flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold text-white bg-primary rounded-lg hover:bg-primary/90"
        >
          <Plus size={14} /> New Tracked Link
        </Link>
      </div>

      {/* ── Search + filter bar ─────────────────────────────────── */}
      {rows.length > 0 && (
        <div className="bg-white border-b border-gray-200 px-6 py-3 grid sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
          {/* Search — lg:col-span-2 to give it visual priority. */}
          <div className="lg:col-span-2">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Search</label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Label, shortcode, destination, advertiser…"
                className="w-full text-sm pl-9 pr-9 py-2 border border-gray-200 rounded-lg outline-none focus:border-gray-400"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
          {/* Purpose dropdown — replaces the old stat tiles. Single
              source of filter chrome instead of cards + chips. */}
          <FilterSelect
            label="Type"
            value={tab}
            onChange={v => setTab(v as 'all' | Purpose)}
            options={[
              { value: 'all',      label: 'All types' },
              { value: 'qr',       label: 'QR codes' },
              { value: 'ad',       label: 'Ad links' },
              { value: 'campaign', label: 'Campaign links' },
            ]}
          />
          <FilterSelect
            label="Channel"
            value={channelFilter}
            onChange={v => setChannelFilter(v as 'all' | Channel)}
            options={[
              { value: 'all', label: 'All channels' },
              ...CHANNEL_LIST.map(c => ({ value: c.value, label: c.label })),
            ]}
          />
          <FilterSelect
            label="Audience"
            value={audienceFilter}
            onChange={v => setAudienceFilter(v as Audience)}
            options={[
              { value: 'all',      label: 'All' },
              { value: 'in_house', label: 'In-house' },
              { value: 'client',   label: 'Client' },
            ]}
          />
          <FilterSelect
            label="Sort"
            value={sortKey}
            onChange={v => setSortKey(v as SortKey)}
            options={(Object.entries(SORT_LABELS) as Array<[SortKey, string]>).map(([v, l]) => ({ value: v, label: l }))}
          />
        </div>
      )}

      {/* Clear-filters chip — only when something is filtered. No
          'Showing X of Y' line; that's just count clutter. */}
      {rows.length > 0 && anyFilterActive && (
        <div className="bg-white border-b border-gray-200 px-6 py-2 flex items-center gap-2 text-xs flex-wrap">
          <button
            onClick={clearAllFilters}
            className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-900 font-semibold"
          >
            <X size={12} /> Clear all filters
          </button>
        </div>
      )}

      <div className="bg-[#f4f5f7] px-4 py-3">
        {rows.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
            <QrCode size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No tracked links yet. Create one for your first QR or campaign.</p>
          </div>
        ) : visibleRows.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
            <p className="text-sm">No rows match these filters.</p>
            <button onClick={clearAllFilters} className="mt-2 text-xs font-semibold text-primary hover:underline">Clear all filters</button>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
            {visibleRows.map(r => <LinkRow key={r.id} row={r} onRemoved={onRemoved} />)}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Small filter UI bits ────────────────────────────────────────────────────

function FilterSelect({ label, value, onChange, options }: {
  label:    string
  value:    string
  onChange: (v: string) => void
  options:  Array<{ value: string; label: string }>
}) {
  return (
    <div>
      <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg bg-white outline-none focus:border-gray-400 cursor-pointer"
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

// ── QR preview + download hook ──────────────────────────────────────────────
function useQrPreview(text: string, primaryColor: string, bgColor: string) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [loading, setLoading]     = useState(false)

  const generate = useCallback(async () => {
    if (!text.trim()) { setQrDataUrl(null); return }
    setLoading(true)
    try {
      const res = await fetch('/api/admin/qr/generate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ text, size: 800, primaryColor, bgColor }),
      })
      if (res.ok) {
        const json = await res.json()
        setQrDataUrl(json.dataUrl)
      }
    } finally { setLoading(false) }
  }, [text, primaryColor, bgColor])

  return { qrDataUrl, loading, generate }
}

// ── Row ─────────────────────────────────────────────────────────────────────
function LinkRow({ row, onRemoved }: { row: ShortLinkRow; onRemoved: (id: string) => void }) {
  const [copied, setCopied]   = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showQr, setShowQr]     = useState(false)
  const [editing, setEditing]   = useState(false)
  // Local copy of the editable fields so the row reflects edits without a refetch
  const [local, setLocal]       = useState(row)

  const goUrl   = `${SITE_ORIGIN}/go/${local.shortcode}`
  const printUrl = `riverregionparents.com/go/${local.shortcode}`
  const typeDef  = CONTENT_TYPES.find(t => t.value === local.content_type) ?? CONTENT_TYPES[0]
  const Icon     = typeDef.icon

  const { qrDataUrl, loading: qrLoading, generate: genQr } = useQrPreview(
    goUrl,
    local.qr_primary_color ?? '#ef6442',
    local.qr_bg_color ?? '#ffffff',
  )

  function copy() {
    navigator.clipboard.writeText(goUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  async function remove() {
    if (!confirm(`Delete "${local.shortcode}"?`)) return
    setDeleting(true)
    const res = await fetch(`/api/admin/short-links/${local.id}`, { method: 'DELETE' })
    if (res.ok) onRemoved(local.id)
    setDeleting(false)
  }
  function toggleQr() {
    if (!showQr && !qrDataUrl) genQr()
    setShowQr(v => !v)
  }
  function downloadQr() {
    if (!qrDataUrl) return
    const a = document.createElement('a')
    a.href = qrDataUrl
    a.download = `qr-${local.shortcode}.png`
    a.click()
  }
  function onEdited(patch: Partial<ShortLinkRow>) {
    setLocal(prev => ({ ...prev, ...patch }))
    setEditing(false)
  }

  return (
    <div className={`${local.is_active ? '' : 'opacity-50'}`}>
      <div className="px-4 py-3 flex items-start gap-3">
        <div className="shrink-0 w-10 h-10 rounded-lg bg-primary/5 flex items-center justify-center">
          <Icon size={18} className="text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap mb-0.5">
            <p className="text-sm font-bold text-gray-900">/go/{local.shortcode}</p>
            {/* Purpose badge — color-coded by qr/ad/campaign so the
                editor can scan the list at a glance. */}
            {(() => {
              const p = purposeOf(purposeFor(local))
              return (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black uppercase tracking-wider ${p.badgeClass}`}>
                  {p.label}
                </span>
              )
            })()}
            {/* Channel badge — soft-tinted, only renders when the row
                has a channel pinned. Tells the editor where the link
                actually lives without opening the row. */}
            {(() => {
              const ch = channelOf(local.channel)
              if (!ch) return null
              const ChIcon = ch.icon
              return (
                <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${ch.badgeClass}`}>
                  <ChIcon size={9} /> {ch.label}
                </span>
              )
            })()}
            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-gray-100 text-gray-600 ring-1 ring-gray-200">
              {typeDef.label}
            </span>
            {local.label && <span className="text-xs text-gray-500">{local.label}</span>}
          </div>
          <p className="text-xs text-gray-600 truncate mb-1">→ {local.destination}</p>
          <div className="flex items-center gap-3 flex-wrap text-[11px] text-gray-500">
            <span className="font-mono bg-gray-50 px-1.5 py-0.5 rounded text-[10px]">{printUrl}</span>
            {local.utm_campaign && <span>campaign={local.utm_campaign}</span>}
          </div>
        </div>

        <div className="shrink-0 flex items-center gap-2">
          <span className="inline-flex items-center gap-1 text-xs font-bold text-gray-700">
            <MousePointer size={11} /> {local.click_count.toLocaleString()} scans
          </span>
          <button onClick={() => setEditing(v => !v)} title="Edit destination" className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700">
            <Pencil size={14} />
          </button>
          <button onClick={toggleQr} title="Show QR code" className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700">
            <QrCode size={14} />
          </button>
          <button onClick={copy} title="Copy URL" className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700">
            {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
          </button>
          <a href={goUrl} target="_blank" rel="noreferrer" title="Test" className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700">
            <ExternalLink size={14} />
          </a>
          <button onClick={remove} disabled={deleting} title="Delete" className="p-1.5 rounded-lg hover:bg-rose-50 text-gray-400 hover:text-rose-600 disabled:opacity-40">
            {deleting ? <RefreshCw size={14} className="animate-spin" /> : <Trash2 size={14} />}
          </button>
        </div>
      </div>

      {showQr && (
        <div className="px-4 pb-4 pl-[calc(2.5rem+0.75rem+1rem)] flex items-start gap-4">
          <div className="w-40 h-40 rounded-xl bg-white ring-1 ring-gray-200 flex items-center justify-center overflow-hidden">
            {qrLoading ? (
              <RefreshCw size={20} className="text-gray-300 animate-spin" />
            ) : qrDataUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={qrDataUrl} alt="QR code" className="w-full h-full" />
            ) : (
              <QrCode size={24} className="text-gray-200" />
            )}
          </div>
          <div className="space-y-2">
            <p className="text-xs text-gray-600">
              High-res PNG — ready for InDesign. Right-click to save or use the download button.
            </p>
            <button
              onClick={downloadQr}
              disabled={!qrDataUrl}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-40"
            >
              <Download size={12} /> Download for Print
            </button>
            <button
              onClick={genQr}
              disabled={qrLoading}
              className="ml-2 inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40"
            >
              <RefreshCw size={11} className={qrLoading ? 'animate-spin' : ''} /> Regenerate
            </button>
          </div>
        </div>
      )}

      {editing && <EditRow row={local} onCancel={() => setEditing(false)} onSaved={onEdited} />}
    </div>
  )
}

// ── Inline edit form ──────────────────────────────────────────────────────────
// Edits the destination + metadata — NOT the shortcode. The whole value of a
// dynamic QR is that you reprint nothing: change where /go/playball-jun26
// points and every magazine already in mailboxes follows instantly.
function EditRow({
  row, onCancel, onSaved,
}: {
  row:      ShortLinkRow
  onCancel: () => void
  onSaved:  (patch: Partial<ShortLinkRow>) => void
}) {
  const [destination, setDestination] = useState(row.destination)
  const [label,       setLabel]       = useState(row.label ?? '')
  const [utmCampaign, setUtmCampaign] = useState(row.utm_campaign ?? '')
  const [active,      setActive]      = useState(row.is_active)
  const [busy,        setBusy]        = useState(false)
  const [err,         setErr]         = useState<string | null>(null)

  async function save() {
    setErr(null)
    if (!destination.trim()) { setErr('Destination is required'); return }
    setBusy(true)
    try {
      const patch = {
        destination:  destination.trim(),
        label:        label.trim() || null,
        utm_campaign: utmCampaign.trim() || null,
        is_active:    active,
      }
      const res = await fetch(`/api/admin/short-links/${row.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(patch),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { setErr(json?.error ?? `HTTP ${res.status}`); return }
      onSaved(patch as Partial<ShortLinkRow>)
    } finally { setBusy(false) }
  }

  const inp = 'w-full text-sm border border-blue-200 rounded-lg px-3 py-2 outline-none focus:border-blue-500 bg-white'
  const lbl = 'block text-[10px] font-bold uppercase tracking-wider text-blue-800 mb-1'

  return (
    <div className="bg-blue-50/40 border-t border-blue-100 px-4 py-4">
      <p className="text-xs font-bold text-blue-900 mb-3 inline-flex items-center gap-1.5">
        <Pencil size={12} /> Editing /go/{row.shortcode}
        <span className="font-normal text-blue-700">— shortcode &amp; printed QR stay the same; just change where it points</span>
      </p>
      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
        <div className="md:col-span-2">
          <label className={lbl}>Destination <span className="text-rose-600">*</span></label>
          <input value={destination} onChange={e => setDestination(e.target.value)} className={inp} />
        </div>
        <div>
          <label className={lbl}>Label</label>
          <input value={label} onChange={e => setLabel(e.target.value)} className={inp} />
        </div>
        <div>
          <label className={lbl}>Campaign Tag</label>
          <input value={utmCampaign} onChange={e => setUtmCampaign(e.target.value)} placeholder="jun2026 · summer-promo" className={inp} />
        </div>
        <div className="flex items-end">
          <label className="inline-flex items-center gap-2 text-xs text-blue-900 cursor-pointer pb-2">
            <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} className="rounded" />
            Active (QR works)
          </label>
        </div>
      </div>
      {err && <p className="mt-2 text-xs text-rose-700 font-semibold">{err}</p>}
      <div className="mt-3 flex items-center gap-2">
        <button onClick={save} disabled={busy} className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-40">
          {busy ? <RefreshCw size={12} className="animate-spin" /> : <Check size={12} />}
          {busy ? 'Saving…' : 'Save changes'}
        </button>
        <button onClick={onCancel} className="px-3 py-2 text-xs text-blue-800 hover:text-blue-950">Cancel</button>
      </div>
    </div>
  )
}

// ── Add panel ───────────────────────────────────────────────────────────────
// Exported so the dedicated /admin/content/short-links/new route can mount
// the same form on its own page (where save/cancel both router.push back).
export function AddPanel({
  advertisers, initialAdvertiserId, onCancel, onCreated,
}: {
  advertisers:          AdvertiserOption[]
  initialAdvertiserId?: string
  onCancel:             () => void
  onCreated:            (r: ShortLinkRow) => void
}) {
  // Purpose drives the whole form view. Null until the editor picks
  // a card — progressive disclosure: the form starts collapsed and
  // expands as choices are made.
  const [purpose, setPurpose]         = useState<Purpose | null>(null)
  // Step 2 (Advertiser) gate. Step 3 doesn't show until the editor
  // has either picked an advertiser OR explicitly clicked the
  // 'Continue without advertiser' button. Pre-completed when the
  // page was opened from an advertiser profile.
  const [step2Done, setStep2Done]     = useState(!!initialAdvertiserId)
  // Channel — UTM source + medium auto-fill when this changes. The
  // editor can still tweak source/medium manually after the change.
  const [channel, setChannel]         = useState<Channel | ''>('')
  const [contentType, setContentType] = useState<string>('url')
  const [shortcode,   setShortcode]   = useState('')
  const [destination, setDestination] = useState('')
  const [label,       setLabel]       = useState('')
  const [advertiserId, setAdvertiserId] = useState(initialAdvertiserId ?? '')
  const [utmSource,   setUtmSource]   = useState('magazine')
  const [utmMedium,   setUtmMedium]   = useState('qr')
  const [utmCampaign, setUtmCampaign] = useState('')
  // QR default is black — readable on any background and matches the
  // print convention. Editor can still tweak before generating.
  const [primaryColor, setPrimaryColor] = useState('#000000')

  const compatibleChannels = useMemo(
    () => purpose ? channelsForPurpose(purpose) : [],
    [purpose],
  )

  // When channel changes, auto-fill UTM source/medium with the
  // curated defaults. Skip if the editor has already typed something
  // custom — we don't want to clobber their work.
  function applyChannel(next: Channel | '') {
    setChannel(next)
    if (!next) return
    const def = CHANNELS[next]
    // Only overwrite when the current value matches a previously
    // auto-filled default — preserves manual edits.
    const knownSources = new Set(CHANNEL_LIST.map(c => c.utmSource))
    const knownMediums = new Set(CHANNEL_LIST.map(c => c.utmMedium))
    if (knownSources.has(utmSource) || utmSource === '') setUtmSource(def.utmSource)
    if (knownMediums.has(utmMedium) || utmMedium === '') setUtmMedium(def.utmMedium)
  }

  // When the editor swaps purpose, snap the channel + UTMs to the
  // first compatible channel of the new purpose. Doing this on click
  // (not in a useEffect) avoids the cascading-render lint warning
  // and gives the editor a deterministic 'reset' moment.
  // Also auto-pick a sensible content type: QR keeps multi-type
  // options, but Ad + Campaign are always URL (the only sensible
  // form for clickable distribution).
  function pickPurpose(next: Purpose) {
    setPurpose(next)
    // Reset Step 2 gate when purpose changes so the editor goes
    // through the advertiser pick fresh.
    setStep2Done(false)
    if (next !== 'qr') setContentType('url')
    const compat = channelsForPurpose(next)
    const stillValid = channel && compat.some(c => c.value === channel)
    if (!stillValid) {
      const first = (compat[0]?.value ?? '') as Channel | ''
      applyChannel(first)
    }
  }

  function pickAdvertiser(idValue: string) {
    if (idValue === '__add_new__') {
      setShowAddAdv(true)
      setAdvertiserId('')
      return
    }
    setAdvertiserId(idValue)
    setShowAddAdv(false)
    // Picking an advertiser counts as completing Step 2 — Step 3
    // can now reveal with auto-filled details.
    if (idValue) setStep2Done(true)
    if (!idValue) return
    const match = localAdvertisers.find(a => a.id === idValue)
    if (!match) return
    // Auto-fill destination from business website if URL type + empty.
    if (contentType === 'url' && !destination && 'business_url' in match) {
      const url = String((match as Record<string, unknown>).business_url ?? '')
      if (url) setDestination(url)
    }
    // Auto-fill label with business name if empty.
    if (!label) setLabel(`${match.business_name}${utmCampaign ? ` — ${utmCampaign}` : ''}`)
    // Auto-suggest a shortcode for Ad + Campaign purposes only. Ad +
    // Campaign shortcodes are invisible to readers (they only see the
    // destination after the redirect), so a deterministic 'advertiser-
    // channel-suffix' pattern saves the editor inventing one. QR codes
    // skip this — editors typically want a memorable printed handle.
    if (purpose && purpose !== 'qr' && !shortcode) {
      const slug   = match.business_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24)
      const chPart = channel ? channel.replace('_', '').slice(0, 4) : ''
      // eslint-disable-next-line react-hooks/purity
      const r      = Date.now().toString(36).slice(-4)
      setShortcode([slug, chPart, r].filter(Boolean).join('-'))
    }
  }

  // Quick-add advertiser inline form
  const [showAddAdv, setShowAddAdv] = useState(false)
  const [newAdvName, setNewAdvName] = useState('')
  const [newAdvEmail, setNewAdvEmail] = useState('')
  const [newAdvPhone, setNewAdvPhone] = useState('')
  const [newAdvUrl, setNewAdvUrl]     = useState('')
  const [advBusy, setAdvBusy]         = useState(false)
  const [localAdvertisers, setLocalAdvertisers] = useState(advertisers)

  async function createAdvertiser() {
    if (!newAdvName.trim()) return
    setAdvBusy(true)
    try {
      const slug = newAdvName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60)
      const res = await fetch('/api/admin/advertisers/quick-add', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          business_name: newAdvName.trim(),
          slug,
          contact_email: newAdvEmail.trim() || null,
          contact_phone: newAdvPhone.trim() || null,
          business_url:  newAdvUrl.trim() || null,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (res.ok && json.id) {
        const newAdv = { id: json.id, business_name: newAdvName.trim() }
        setLocalAdvertisers(prev => [...prev, newAdv].sort((a, b) => a.business_name.localeCompare(b.business_name)))
        setAdvertiserId(json.id)
        // Quick-adding an advertiser counts as completing Step 2.
        setStep2Done(true)
        // If the advertiser has a website, auto-fill the destination for URL type
        if (newAdvUrl.trim() && contentType === 'url' && !destination) {
          setDestination(newAdvUrl.trim())
        }
        setShowAddAdv(false)
        setNewAdvName(''); setNewAdvEmail(''); setNewAdvPhone(''); setNewAdvUrl('')
      } else {
        setErr(json?.error ?? 'Could not create advertiser')
      }
    } finally { setAdvBusy(false) }
  }

  // vCard fields
  const [vcName, setVcName]     = useState('')
  const [vcOrg, setVcOrg]       = useState('')
  const [vcPhone, setVcPhone]   = useState('')
  const [vcEmail, setVcEmail]   = useState('')
  const [vcUrl, setVcUrl]       = useState('')
  const [vcAddress, setVcAddress] = useState('')
  const [vcTitle, setVcTitle]   = useState('')

  // Email fields
  const [emailSubject, setEmailSubject] = useState('')
  const [emailBody, setEmailBody]       = useState('')

  // Event fields
  const [evTitle, setEvTitle]   = useState('')
  const [evStart, setEvStart]   = useState('')
  const [evEnd, setEvEnd]       = useState('')
  const [evLocation, setEvLocation] = useState('')
  const [evDesc, setEvDesc]     = useState('')

  const [busy, setBusy] = useState(false)
  const [err, setErr]   = useState<string | null>(null)

  // QR preview
  const previewCode = shortcode.trim().toLowerCase().replace(/[^a-z0-9-]/g, '') || 'shortcode'
  const goUrl = `${SITE_ORIGIN}/go/${previewCode}`
  const { qrDataUrl, loading: qrLoading, generate: genQr } = useQrPreview(goUrl, primaryColor, '#ffffff')
  useEffect(() => { if (previewCode !== 'shortcode') genQr() }, [previewCode, primaryColor, genQr])

  function buildContentData(): Record<string, unknown> {
    if (contentType === 'vcard') return { name: vcName, org: vcOrg, phone: vcPhone, email: vcEmail, url: vcUrl, address: vcAddress, title: vcTitle }
    if (contentType === 'email') return { subject: emailSubject, body: emailBody }
    if (contentType === 'sms')   return { body: destination }
    if (contentType === 'event') return { title: evTitle, start: evStart, end: evEnd, location: evLocation, description: evDesc }
    return {}
  }

  function resolveDestination(): string {
    if (contentType === 'vcard') return vcName || vcOrg || 'Contact'
    if (contentType === 'event') return evTitle || 'Event'
    return destination.trim()
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    // QR codes need a manual shortcode (it gets printed). Ad + Campaign
    // links don't show the shortcode in the UI, so we auto-generate
    // one when missing — same pattern pickAdvertiser uses but as a
    // submit-time safety net for the Internal path where no
    // advertiser was picked.
    let resolvedShortcode = shortcode.trim().toLowerCase().replace(/[^a-z0-9-]/g, '')
    if (!resolvedShortcode) {
      if (purpose === 'qr') { setErr('Shortcode is required'); return }
      const labelSlug = label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24)
      const chPart    = channel ? channel.replace('_', '').slice(0, 4) : (purpose ?? 'link')
      const r         = Date.now().toString(36).slice(-5)
      resolvedShortcode = [labelSlug || purpose, chPart, r].filter(Boolean).join('-')
    }
    const dest = resolveDestination()
    if (!dest) { setErr('Please fill in the required content fields'); return }

    setBusy(true)
    try {
      const res = await fetch('/api/admin/short-links', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          shortcode:             resolvedShortcode,
          destination:           dest,
          content_type:          contentType,
          content_data:          buildContentData(),
          label:                 label.trim() || null,
          utm_source:            utmSource.trim() || 'magazine',
          utm_medium:            utmMedium.trim() || 'qr',
          utm_campaign:          utmCampaign.trim() || null,
          advertiser_account_id: advertiserId || null,
          qr_primary_color:      primaryColor,
          purpose,
          channel:               channel || null,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { setErr(json?.error ?? `HTTP ${res.status}`); return }
      onCreated(json.link as ShortLinkRow)
    } finally { setBusy(false) }
  }

  // Neutral form chrome — was blue-tinted everywhere which fought with
  // the orange brand color for attention. Inputs and labels now sit
  // on white with gray-200 hairlines; the only orange in the form is
  // the final Create button.
  const inp = 'w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-gray-400 bg-white'
  const lbl = 'block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1.5'

  return (
    <form onSubmit={submit} className="bg-gray-50 border-b border-gray-200 px-6 py-6">
      {/* Header — step-numbered sequence so editors know how the form
          flows top-to-bottom. */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-gray-900 inline-flex items-center gap-2">
            {purpose
              ? (() => { const Icon = purposeOf(purpose).icon; return <Icon size={18} className="text-gray-700" /> })()
              : <Plus size={18} className="text-gray-700" />}
            New {purpose ? purposeOf(purpose).label : 'Tracked Link'}
          </h2>
          <p className="text-xs text-gray-500 mt-1">Start by picking what kind of link you&apos;re building — the rest of the form opens up after that.</p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="text-gray-400 hover:text-gray-700 p-1"
          aria-label="Close form"
          title="Cancel"
        >
          <X size={16} />
        </button>
      </div>

      {/* ── Step 1 — Purpose ────────────────────────────────────────
          The three cards drive the rest of the form. Active card uses
          a neutral dark border + soft tint instead of orange, so the
          orange "Create" button later is unambiguously the action. */}
      <StepSection step={1} title="Pick what this link is for" hint="Determines which channels are available and whether a QR gets generated.">
        <div className="grid sm:grid-cols-3 gap-3">
          {PURPOSE_LIST.map(p => {
            const PIcon  = p.icon
            const active = purpose === p.value
            return (
              <button
                key={p.value}
                type="button"
                onClick={() => pickPurpose(p.value)}
                className={`text-left rounded-xl border p-3.5 transition-all ${
                  active
                    ? 'border-2 border-gray-900 bg-white shadow-sm'
                    : 'border-gray-200 bg-white hover:border-gray-400'
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg ${p.badgeClass}`}>
                    <PIcon size={14} />
                  </span>
                  <span className="text-sm font-bold text-gray-900">{p.label}</span>
                </div>
                <p className="text-[11px] text-gray-500 leading-snug">{p.hint}</p>
              </button>
            )
          })}
        </div>
      </StepSection>

      {/* Steps 2+ progressively reveal once the editor has picked
          a purpose — keeps the form digestible. */}
      {purpose && (
      <>

      {/* ── Step 2 — Who's it for? (Advertiser) ───────────────────
          Promoted to its own step because picking an advertiser
          auto-fills the rest: destination URL (their website),
          shortcode (for ad+campaign — slug-based), and the label.
          'Internal' is an explicit option for in-house QR codes
          that don't tie back to a paying client. */}
      <StepSection step={2} title="Who's this link for?" hint="Pick a client to auto-fill the destination URL + suggest a shortcode. Use 'Internal' for in-house QR codes that don't tie back to an advertiser.">
        <div className="space-y-3">
          <div className="grid sm:grid-cols-[1fr_auto] gap-3 items-end">
            <div>
              <label className={lbl}>Advertiser</label>
              <select
                value={advertiserId}
                onChange={e => pickAdvertiser(e.target.value)}
                className={`${inp} cursor-pointer`}
              >
                <option value="">— Internal / In-house —</option>
                {localAdvertisers.map(a => (
                  <option key={a.id} value={a.id}>{a.business_name}</option>
                ))}
                <option value="__add_new__">+ Add new advertiser…</option>
              </select>
            </div>
            {advertiserId && (
              <button
                type="button"
                onClick={() => { setAdvertiserId(''); setStep2Done(false) }}
                className="text-xs font-semibold text-gray-500 hover:text-gray-900 px-3 py-2"
              >
                Clear
              </button>
            )}
          </div>

          {/* 'Continue as Internal' — explicit confirmation for the
              in-house path. Without it, Step 3 would never reveal
              for internal links because the dropdown's default value
              ('') doesn't count as a user action. Hidden once Step 2
              is acknowledged so the editor doesn't see a stale CTA. */}
          {!advertiserId && !step2Done && !showAddAdv && (
            <button
              type="button"
              onClick={() => setStep2Done(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-bold bg-gray-900 text-white rounded-lg hover:bg-gray-700"
            >
              <Check size={14} /> Continue as Internal Link
            </button>
          )}

          {/* Inline quick-add advertiser — moved here from Step 3
              so the editor adds the missing client before doing
              anything else. */}
          {showAddAdv && (
            <div className="rounded-xl bg-gray-50 ring-1 ring-gray-200 p-4 space-y-3">
              <p className="text-xs font-bold text-gray-900 inline-flex items-center gap-1.5">
                <Plus size={12} /> Quick-Add Advertiser
              </p>
              <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className={lbl}>Business Name <span className="text-rose-600">*</span></label>
                  <input value={newAdvName} onChange={e => setNewAdvName(e.target.value)} placeholder="Dentistry for Children" className={inp} />
                </div>
                <div>
                  <label className={lbl}>Contact Email</label>
                  <input type="email" value={newAdvEmail} onChange={e => setNewAdvEmail(e.target.value)} placeholder="info@business.com" className={inp} />
                </div>
                <div>
                  <label className={lbl}>Phone</label>
                  <input value={newAdvPhone} onChange={e => setNewAdvPhone(e.target.value)} placeholder="334-555-1234" className={inp} />
                </div>
                <div>
                  <label className={lbl}>Website</label>
                  <input value={newAdvUrl} onChange={e => setNewAdvUrl(e.target.value)} placeholder="https://business.com" className={inp} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={createAdvertiser}
                  disabled={advBusy || !newAdvName.trim()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-gray-900 text-white rounded-lg hover:bg-gray-700 disabled:opacity-40"
                >
                  {advBusy ? <RefreshCw size={11} className="animate-spin" /> : <Check size={11} />}
                  {advBusy ? 'Saving…' : 'Save & Associate'}
                </button>
                <button type="button" onClick={() => setShowAddAdv(false)} className="text-xs text-gray-500 hover:text-gray-900">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </StepSection>

      {/* Steps 3+ progressively reveal once Step 2 is acknowledged
          (advertiser picked, quick-added, or 'Continue as Internal'
          clicked). Keeps the form feeling guided one decision at
          a time instead of dropping everything below at once. */}
      {step2Done && (
      <>

      {/* ── Step 3 (QR only) — Content type ───────────────────────
          What the destination IS. URL is the default; the rest are
          QR-specific scan behaviors (phone dialer, vCard download,
          calendar event, etc.). Hidden for Ad + Campaign purposes
          because they always point to a URL. */}
      {purpose === 'qr' && (
        <StepSection step={3} title="What kind of destination?" hint="URL is the default. The other types are mainly useful for QR codes (dialer, contact card, calendar event).">
          <div className="flex flex-wrap gap-2">
            {CONTENT_TYPES.map(ct => {
              const I = ct.icon
              const active = contentType === ct.value
              return (
                <button
                  key={ct.value}
                  type="button"
                  onClick={() => setContentType(ct.value)}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ring-1 ${
                    active
                      ? 'bg-gray-900 text-white ring-gray-900'
                      : 'bg-white text-gray-700 ring-gray-200 hover:bg-gray-50 hover:ring-gray-300'
                  }`}
                >
                  <I size={12} /> {ct.label}
                </button>
              )
            })}
          </div>
        </StepSection>
      )}

      {/* ── Step (3 or 4) — Shortcode + destination + distribution ──
          Step number flexes based on whether Content Type was shown. */}
      <StepSection step={purpose === 'qr' ? 4 : 3} title="Fill in the details" hint={
        purpose === 'qr'
          ? 'Shortcode is what becomes /go/<this>. Once printed, the shortcode is permanent — only the destination can be edited later.'
          : 'Shortcode auto-fills from the advertiser since readers never see it — feel free to keep or override.'
      }>
      {/* Layout — drop the QR preview column when the editor is
          creating a non-QR link, since they don't need a QR for it. */}
      <div className={`grid gap-6 ${purpose === 'qr' ? 'lg:grid-cols-[1fr_220px]' : 'lg:grid-cols-1'}`}>
        <div className="space-y-5">
          {/* Shortcode (QR only) + label. Shortcode is what gets
              printed on a QR code, so QR editors need to see + edit it.
              For Ad + Campaign links the shortcode is invisible to
              readers (only the destination matters), so we hide the
              field entirely and auto-generate it on submit. Less to
              think about, less chance of typing a typo into a URL
              nobody will ever type. */}
          {purpose === 'qr' ? (
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Shortcode <span className="text-rose-600">*</span></label>
                <div className="flex items-center">
                  <span className="text-xs text-gray-500 bg-gray-100 border border-r-0 border-gray-200 rounded-l-lg px-2.5 py-2">/go/</span>
                  <input value={shortcode} onChange={e => setShortcode(e.target.value)} required autoFocus placeholder="playball-jun26" className={`${inp} rounded-l-none`} />
                </div>
              </div>
              <div>
                <label className={lbl}>Label (internal)</label>
                <input value={label} onChange={e => setLabel(e.target.value)} placeholder="Play Ball June 2026 QR" className={inp} />
              </div>
            </div>
          ) : (
            <div>
              <label className={lbl}>Label (internal — for your reference only)</label>
              <input value={label} onChange={e => setLabel(e.target.value)} placeholder="YMCA Summer Push — June Facebook ad" className={inp} />
              <p className="mt-1 text-[10px] text-gray-500">
                A shortcode will be generated automatically. Readers only see the destination URL after the redirect, not the /go/&lt;code&gt; link.
              </p>
            </div>
          )}

          {/* Content fields — change by type */}
          {contentType === 'url' && (
            <div>
              <label className={lbl}>Destination URL <span className="text-rose-600">*</span></label>
              <input value={destination} onChange={e => setDestination(e.target.value)} required placeholder="/calendar/events/play-ball-jun26 or https://..." className={inp} />
            </div>
          )}
          {contentType === 'phone' && (
            <div>
              <label className={lbl}>Phone Number <span className="text-rose-600">*</span></label>
              <input type="tel" value={destination} onChange={e => setDestination(e.target.value)} required placeholder="334-555-1234" className={inp} />
            </div>
          )}
          {contentType === 'email' && (
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Email Address <span className="text-rose-600">*</span></label>
                <input type="email" value={destination} onChange={e => setDestination(e.target.value)} required placeholder="info@business.com" className={inp} />
              </div>
              <div>
                <label className={lbl}>Subject Line</label>
                <input value={emailSubject} onChange={e => setEmailSubject(e.target.value)} placeholder="I saw your ad in the magazine" className={inp} />
              </div>
            </div>
          )}
          {contentType === 'sms' && (
            <div>
              <label className={lbl}>Phone Number <span className="text-rose-600">*</span></label>
              <input type="tel" value={destination} onChange={e => setDestination(e.target.value)} required placeholder="334-555-1234" className={inp} />
            </div>
          )}
          {contentType === 'text' && (
            <div>
              <label className={lbl}>Text Content <span className="text-rose-600">*</span></label>
              <textarea value={destination} onChange={e => setDestination(e.target.value)} required rows={4} placeholder="The message shown when they scan..." className={`${inp} resize-y`} />
            </div>
          )}
          {contentType === 'vcard' && (
            <div className="grid sm:grid-cols-2 gap-3">
              <div><label className={lbl}>Full Name <span className="text-rose-600">*</span></label><input value={vcName} onChange={e => setVcName(e.target.value)} required className={inp} /></div>
              <div><label className={lbl}>Organization</label><input value={vcOrg} onChange={e => setVcOrg(e.target.value)} className={inp} /></div>
              <div><label className={lbl}>Job Title</label><input value={vcTitle} onChange={e => setVcTitle(e.target.value)} className={inp} /></div>
              <div><label className={lbl}>Phone</label><input value={vcPhone} onChange={e => setVcPhone(e.target.value)} className={inp} /></div>
              <div><label className={lbl}>Email</label><input value={vcEmail} onChange={e => setVcEmail(e.target.value)} className={inp} /></div>
              <div><label className={lbl}>Website</label><input value={vcUrl} onChange={e => setVcUrl(e.target.value)} className={inp} /></div>
              <div className="sm:col-span-2"><label className={lbl}>Address</label><input value={vcAddress} onChange={e => setVcAddress(e.target.value)} className={inp} /></div>
            </div>
          )}
          {contentType === 'event' && (
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2"><label className={lbl}>Event Title <span className="text-rose-600">*</span></label><input value={evTitle} onChange={e => setEvTitle(e.target.value)} required className={inp} /></div>
              <div><label className={lbl}>Start (YYYYMMDDTHHMMSS)</label><input value={evStart} onChange={e => setEvStart(e.target.value)} placeholder="20260601T100000" className={inp} /></div>
              <div><label className={lbl}>End</label><input value={evEnd} onChange={e => setEvEnd(e.target.value)} placeholder="20260601T160000" className={inp} /></div>
              <div><label className={lbl}>Location</label><input value={evLocation} onChange={e => setEvLocation(e.target.value)} className={inp} /></div>
              <div><label className={lbl}>Description</label><input value={evDesc} onChange={e => setEvDesc(e.target.value)} className={inp} /></div>
            </div>
          )}

          {/* Channel + UTM campaign + (QR color, qr-only) + UTM
              source/medium. Advertiser moved to Step 2. 4 cols when
              QR (channel/campaign/qr-color/source-medium), 3 cols
              otherwise (channel/campaign/source-medium). */}
          <div className={`grid sm:grid-cols-2 gap-3 ${purpose === 'qr' ? 'md:grid-cols-4' : 'md:grid-cols-3'}`}>
            <div>
              <label className={lbl}>Channel (where it lives)</label>
              <select
                value={channel}
                onChange={e => applyChannel(e.target.value as Channel | '')}
                className={`${inp} cursor-pointer`}
              >
                <option value="">— Not specified —</option>
                {compatibleChannels.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
              {channel && (
                <p className="mt-1 text-[10px] text-gray-500">
                  Auto-fills UTM source &amp; medium — override below if needed.
                </p>
              )}
            </div>
            <div>
              <label className={lbl}>Campaign Tag</label>
              <input value={utmCampaign} onChange={e => setUtmCampaign(e.target.value)} placeholder="jun2026 · summer-promo" className={inp} />
              <p className="mt-1 text-[10px] text-gray-500 leading-snug">
                Groups related links in reports. Use a month code (jun2026) for ongoing efforts or a name (back-to-school) for one-offs.
              </p>
            </div>
            {purpose === 'qr' && (
              <div>
                <label className={lbl}>QR Color</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0" />
                  <input value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} className={`${inp} font-mono text-xs`} />
                </div>
              </div>
            )}
            <div>
              <label className={lbl}>UTM Source / Medium</label>
              <div className="flex gap-1">
                <input value={utmSource} onChange={e => setUtmSource(e.target.value)} placeholder="magazine" className={`${inp} text-xs`} />
                <input value={utmMedium} onChange={e => setUtmMedium(e.target.value)} placeholder="qr" className={`${inp} text-xs`} />
              </div>
            </div>
          </div>

          {/* (Advertiser block + Quick-Add form moved up to Step 2.
              Selecting an advertiser there auto-fills shortcode +
              destination URL + label before this step opens.) */}

          {err && (
            <p className="text-xs text-rose-700 font-semibold inline-flex items-center gap-1">
              <AlertTriangle size={12} /> {err}
            </p>
          )}

          {/* Footer actions — bigger, breathing room, only orange in
              the form so the Create CTA is unambiguous. */}
          <div className="flex items-center gap-3 pt-3 border-t border-gray-100 mt-2">
            <button type="submit" disabled={busy} className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold bg-primary text-white rounded-full hover:bg-primary/90 disabled:opacity-40 shadow-sm">
              {busy ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={14} />}
              {busy ? 'Creating…' : `Create ${purposeOf(purpose).label}`}
            </button>
            <button type="button" onClick={onCancel} className="px-4 py-2.5 text-sm font-semibold text-gray-600 hover:text-gray-900">Cancel</button>
          </div>
        </div>

        {/* QR Preview — only relevant for printable QR codes. Ad
            and Campaign links don't need a scannable visual since
            they're used as plain URLs in browsers / Facebook fields. */}
        {purpose === 'qr' && (
        <div className="flex flex-col items-center">
          <p className={lbl}>QR Preview</p>
          <div className="w-[180px] h-[180px] rounded-xl bg-white ring-1 ring-gray-200 flex items-center justify-center overflow-hidden mb-2">
            {qrLoading ? (
              <RefreshCw size={20} className="text-gray-300 animate-spin" />
            ) : qrDataUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={qrDataUrl} alt="QR preview" className="w-full h-full" />
            ) : (
              <QrCode size={32} className="text-gray-200" />
            )}
          </div>
          {qrDataUrl && (
            <a
              href={qrDataUrl}
              download={`qr-${previewCode}.png`}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline"
            >
              <Download size={10} /> Download PNG
            </a>
          )}
          <p className="mt-2 text-[10px] text-gray-500 text-center">
            riverregionparents.com<br />/go/{previewCode}
          </p>
        </div>
        )}
      </div>
      </StepSection>

      </>
      )}
      {/* end step2Done && */}

      </>
      )}
      {/* end purpose && */}
    </form>
  )
}

// ── StepSection — visual scaffold for a numbered form step ────────────────
function StepSection({ step, title, hint, children }: {
  step:     number
  title:    string
  hint?:    string
  children: React.ReactNode
}) {
  return (
    <section className="bg-white rounded-2xl border border-gray-200 p-5 md:p-6 mb-5 last:mb-0">
      <header className="flex items-start gap-3 mb-4">
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gray-900 text-white text-xs font-black shrink-0">
          {step}
        </span>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-gray-900 leading-tight">{title}</h3>
          {hint && <p className="text-xs text-gray-500 mt-0.5 leading-snug">{hint}</p>}
        </div>
      </header>
      <div className="pl-0 md:pl-10">{children}</div>
    </section>
  )
}
