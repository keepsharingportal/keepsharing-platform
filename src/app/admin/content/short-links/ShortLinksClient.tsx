'use client'

// ShortLinksClient — full QR code management tool.
// Replaces the external QR Code Studio subscription.

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Plus, Copy, Check, ExternalLink, RefreshCw, Trash2, QrCode,
  MousePointer, AlertTriangle, Download, Link2, Phone, Mail, MessageSquare,
  FileText, Calendar, User, Pencil,
} from 'lucide-react'
import type { ShortLinkRow, AdvertiserOption } from './page'

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

export function ShortLinksClient({ initialRows, advertisers }: Props) {
  const router = useRouter()
  const [rows, setRows]     = useState<ShortLinkRow[]>(initialRows)
  const [addOpen, setAddOpen] = useState(false)

  function onCreated(row: ShortLinkRow) {
    setRows(prev => [row, ...prev])
    setAddOpen(false)
    router.refresh()
  }
  function onRemoved(id: string) {
    setRows(prev => prev.filter(r => r.id !== id))
  }

  return (
    <div className="flex flex-col">
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 inline-flex items-center gap-2">
            <QrCode size={18} className="text-primary" /> QR Codes & Short Links
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Create QR codes for print — URLs, phone numbers, vCards, events. Every scan is tracked and linked to advertisers.
          </p>
        </div>
        <button
          onClick={() => setAddOpen(v => !v)}
          className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold text-white bg-primary rounded-lg hover:bg-primary/90"
        >
          <Plus size={14} /> New QR Code
        </button>
      </div>

      {addOpen && (
        <AddPanel
          advertisers={advertisers}
          onCancel={() => setAddOpen(false)}
          onCreated={onCreated}
        />
      )}

      <div className="bg-[#f4f5f7] px-4 py-3">
        {rows.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
            <QrCode size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No QR codes yet. Create one for your first magazine QR.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
            {rows.map(r => <LinkRow key={r.id} row={r} onRemoved={onRemoved} />)}
          </div>
        )}
      </div>
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
          <label className={lbl}>UTM Campaign</label>
          <input value={utmCampaign} onChange={e => setUtmCampaign(e.target.value)} className={inp} />
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
function AddPanel({
  advertisers, onCancel, onCreated,
}: {
  advertisers: AdvertiserOption[]
  onCancel:    () => void
  onCreated:   (r: ShortLinkRow) => void
}) {
  const [contentType, setContentType] = useState<string>('url')
  const [shortcode,   setShortcode]   = useState('')
  const [destination, setDestination] = useState('')
  const [label,       setLabel]       = useState('')
  const [advertiserId, setAdvertiserId] = useState('')
  const [utmSource,   setUtmSource]   = useState('magazine')
  const [utmMedium,   setUtmMedium]   = useState('qr')
  const [utmCampaign, setUtmCampaign] = useState('')
  const [primaryColor, setPrimaryColor] = useState('#ef6442')

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
    if (!shortcode.trim()) { setErr('Shortcode is required'); return }
    const dest = resolveDestination()
    if (!dest) { setErr('Please fill in the required content fields'); return }

    setBusy(true)
    try {
      const res = await fetch('/api/admin/short-links', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          shortcode:             shortcode.trim().toLowerCase().replace(/[^a-z0-9-]/g, ''),
          destination:           dest,
          content_type:          contentType,
          content_data:          buildContentData(),
          label:                 label.trim() || null,
          utm_source:            utmSource.trim() || 'magazine',
          utm_medium:            utmMedium.trim() || 'qr',
          utm_campaign:          utmCampaign.trim() || null,
          advertiser_account_id: advertiserId || null,
          qr_primary_color:      primaryColor,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { setErr(json?.error ?? `HTTP ${res.status}`); return }
      onCreated(json.link as ShortLinkRow)
    } finally { setBusy(false) }
  }

  const inp = 'w-full text-sm border border-blue-200 rounded-lg px-3 py-2 outline-none focus:border-blue-500 bg-white'
  const lbl = 'block text-[10px] font-bold uppercase tracking-wider text-blue-800 mb-1'

  return (
    <form onSubmit={submit} className="bg-blue-50/40 border-b border-blue-100 px-6 py-5">
      <h2 className="text-sm font-bold text-blue-900 inline-flex items-center gap-2 mb-4">
        <QrCode size={14} /> New QR Code
      </h2>

      {/* Content type selector */}
      <div className="flex flex-wrap gap-2 mb-4">
        {CONTENT_TYPES.map(ct => {
          const I = ct.icon
          const active = contentType === ct.value
          return (
            <button
              key={ct.value}
              type="button"
              onClick={() => setContentType(ct.value)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ring-1 ${
                active
                  ? 'bg-primary text-white ring-primary'
                  : 'bg-white text-gray-700 ring-gray-200 hover:bg-gray-50'
              }`}
            >
              <I size={12} /> {ct.label}
            </button>
          )
        })}
      </div>

      <div className="grid lg:grid-cols-[1fr_200px] gap-6">
        <div className="space-y-3">
          {/* Shortcode + label */}
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Shortcode <span className="text-rose-600">*</span></label>
              <div className="flex items-center">
                <span className="text-xs text-gray-500 bg-gray-100 border border-r-0 border-blue-200 rounded-l-lg px-2 py-2">/go/</span>
                <input value={shortcode} onChange={e => setShortcode(e.target.value)} required autoFocus placeholder="playball-jun26" className={`${inp} rounded-l-none`} />
              </div>
            </div>
            <div>
              <label className={lbl}>Label (internal)</label>
              <input value={label} onChange={e => setLabel(e.target.value)} placeholder="Play Ball June 2026 QR" className={inp} />
            </div>
          </div>

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

          {/* UTM + advertiser + color */}
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className={lbl}>UTM Campaign</label>
              <input value={utmCampaign} onChange={e => setUtmCampaign(e.target.value)} placeholder="jun2026" className={inp} />
            </div>
            <div>
              <label className={lbl}>Advertiser (optional)</label>
              <select
                value={advertiserId}
                onChange={e => {
                  const v = e.target.value
                  if (v === '__add_new__') {
                    setShowAddAdv(true)
                    setAdvertiserId('')
                  } else {
                    setAdvertiserId(v)
                    setShowAddAdv(false)
                    // Auto-fill destination with their website when picking an advertiser
                    if (v && contentType === 'url' && !destination) {
                      const match = localAdvertisers.find(a => a.id === v)
                      if (match && 'business_url' in match) {
                        setDestination(String((match as Record<string, unknown>).business_url ?? ''))
                      }
                    }
                  }
                }}
                className={`${inp} cursor-pointer`}
              >
                <option value="">— None (internal) —</option>
                {localAdvertisers.map(a => (
                  <option key={a.id} value={a.id}>{a.business_name}</option>
                ))}
                <option value="__add_new__">+ Add New Advertiser…</option>
              </select>
            </div>
            <div>
              <label className={lbl}>QR Color</label>
              <div className="flex items-center gap-2">
                <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0" />
                <input value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} className={`${inp} font-mono text-xs`} />
              </div>
            </div>
            <div>
              <label className={lbl}>UTM Source / Medium</label>
              <div className="flex gap-1">
                <input value={utmSource} onChange={e => setUtmSource(e.target.value)} placeholder="magazine" className={`${inp} text-xs`} />
                <input value={utmMedium} onChange={e => setUtmMedium(e.target.value)} placeholder="qr" className={`${inp} text-xs`} />
              </div>
            </div>
          </div>

          {/* Inline quick-add advertiser form */}
          {showAddAdv && (
            <div className="rounded-xl bg-white ring-1 ring-blue-200 p-4 space-y-3">
              <p className="text-xs font-bold text-blue-900 inline-flex items-center gap-1.5">
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
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40"
                >
                  {advBusy ? <RefreshCw size={11} className="animate-spin" /> : <Check size={11} />}
                  {advBusy ? 'Creating…' : 'Create & Select'}
                </button>
                <button type="button" onClick={() => setShowAddAdv(false)} className="text-xs text-gray-500 hover:text-gray-900">
                  Cancel
                </button>
              </div>
            </div>
          )}

          {err && (
            <p className="text-xs text-rose-700 font-semibold inline-flex items-center gap-1">
              <AlertTriangle size={12} /> {err}
            </p>
          )}

          <div className="flex items-center gap-2 pt-1">
            <button type="submit" disabled={busy} className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-40">
              {busy ? <RefreshCw size={12} className="animate-spin" /> : <Plus size={12} />}
              {busy ? 'Creating…' : 'Create QR Code'}
            </button>
            <button type="button" onClick={onCancel} className="px-3 py-2 text-xs text-blue-800 hover:text-blue-950">Cancel</button>
          </div>
        </div>

        {/* QR Preview */}
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
      </div>
    </form>
  )
}
