'use client'

// Lead-magnet editor — one PDF + welcome email per row, slug-keyed,
// trigger-source matched at delivery time. Dropdown picks the magnet
// being edited; "New" button creates a fresh row.
//
// Workflow per magnet:
//   1. Editor picks (or creates) the magnet from the dropdown.
//   2. Sets the trigger source — the value /api/birthday/subscribe must
//      receive to fire this magnet (e.g. 'timeline-checklist').
//   3. Uploads the PDF, writes the email subject + body, sets GHL tags
//      and (optional) workflow ID.
//   4. Save. Next subscribe matching that source gets:
//        a. row in birthday_planning_subscribers
//        b. Resend email with the PDF link
//        c. GHL contact upsert with the tags + workflow trigger

import { useEffect, useState } from 'react'
import { HeroImageUpload } from '@/components/admin/HeroImageUpload'
import { CrudInput, CrudTextarea, CrudActiveToggle } from '@/components/admin/BirthdayCrudHelpers'
import { Loader2, Save, Upload, FileText, ExternalLink, Mail, Eye, Plus, Trash2, ChevronDown, Tag, X } from 'lucide-react'

export interface LeadMagnet {
  id:              string
  brand_slug:      string
  slug:            string
  title:           string
  description:     string | null
  source:          string | null
  file_url:        string | null
  preview_url:     string | null
  email_subject:   string
  email_body:      string
  from_name:       string | null
  ghl_tags:        string[]
  ghl_workflow_id: string | null
  is_active:       boolean
}

export function LeadMagnetsClient({ initial }: { initial: LeadMagnet[] }) {
  const [rows, setRows]   = useState<LeadMagnet[]>(initial)
  const [activeId, setActiveId] = useState<string | null>(initial[0]?.id ?? null)
  const [creating, setCreating] = useState(false)

  const active = rows.find(r => r.id === activeId) ?? null

  function onUpdated(updated: LeadMagnet) {
    setRows(rs => rs.map(r => r.id === updated.id ? updated : r))
  }
  function onCreated(created: LeadMagnet) {
    setRows(rs => [...rs, created].sort((a, b) => a.slug.localeCompare(b.slug)))
    setActiveId(created.id)
    setCreating(false)
  }
  function onDeleted(id: string) {
    setRows(rs => {
      const next = rs.filter(r => r.id !== id)
      if (activeId === id) setActiveId(next[0]?.id ?? null)
      return next
    })
  }

  return (
    <div className="space-y-4">
      {/* Picker */}
      <div className="bg-white border border-portal-border rounded-lg p-3 flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[220px]">
          <label className="block text-[11px] font-bold text-portal-text mb-1">Editing lead magnet</label>
          <div className="relative">
            <select
              value={activeId ?? ''}
              onChange={e => setActiveId(e.target.value || null)}
              disabled={rows.length === 0}
              className="w-full appearance-none px-3 py-2 pr-8 text-[13px] border border-portal-border-2 rounded bg-white outline-none focus:border-portal-blue"
            >
              {rows.length === 0 && <option value="">— none yet —</option>}
              {rows.map(r => (
                <option key={r.id} value={r.id}>
                  {r.title} {r.is_active ? '' : '(paused)'}{r.source ? `  ·  source: ${r.source}` : '  ·  no source set'}
                </option>
              ))}
            </select>
            <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-portal-sub pointer-events-none" />
          </div>
        </div>
        <button type="button" onClick={() => setCreating(true)}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-[12px] font-bold text-white bg-portal-navy rounded hover:opacity-90">
          <Plus size={12} /> New lead magnet
        </button>
      </div>

      {/* Editor */}
      {active
        ? <LeadMagnetCard row={active} onUpdated={onUpdated} onDeleted={onDeleted} />
        : <div className="bg-white border border-portal-border rounded-lg p-6 text-center text-portal-sub text-[12px]">
            Create a lead magnet to get started.
          </div>}

      {creating && <NewLeadMagnetModal onClose={() => setCreating(false)} onCreated={onCreated} existing={rows} />}
    </div>
  )
}

function NewLeadMagnetModal({ onClose, onCreated, existing }: {
  onClose:   () => void
  onCreated: (row: LeadMagnet) => void
  existing:  LeadMagnet[]
}) {
  const [title, setTitle]   = useState('')
  const [slug, setSlug]     = useState('')
  const [source, setSource] = useState('')
  const [busy, setBusy]     = useState(false)
  const [err, setErr]       = useState<string | null>(null)
  const [slugTouched, setSlugTouched] = useState(false)

  // Auto-derive slug from title until the editor types one explicitly.
  useEffect(() => {
    if (slugTouched) return
    const auto = title.toLowerCase().normalize('NFKD').replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '').slice(0, 64)
    setSlug(auto)
  }, [title, slugTouched])

  async function submit() {
    if (!title.trim() || !slug.trim()) return
    if (existing.some(r => r.slug === slug.trim())) { setErr(`Slug '${slug}' already exists.`); return }
    setBusy(true); setErr(null)
    try {
      const res = await fetch('/api/admin/birthday/lead-magnets', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ title: title.trim(), slug: slug.trim(), source: source.trim() || null }),
      })
      const j = await res.json()
      if (!res.ok) { setErr(j?.error ?? 'Create failed'); return }
      onCreated(j as LeadMagnet)
    } finally { setBusy(false) }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-lg max-w-md w-full" onClick={e => e.stopPropagation()}>
        <div className="border-b border-portal-border px-4 py-3 flex items-center justify-between">
          <div className="text-[14px] font-bold text-portal-text">New lead magnet</div>
          <button type="button" onClick={onClose} className="text-portal-sub hover:text-portal-text"><X size={14} /></button>
        </div>
        <div className="p-4 space-y-3">
          <CrudInput
            label="Title"
            placeholder="Goody-bag essentials checklist"
            value={title} onChange={e => setTitle(e.target.value)}
          />
          <CrudInput
            label="Slug"
            hint="URL-safe identifier. Auto-filled from title — edit if needed."
            value={slug}
            onChange={e => { setSlugTouched(true); setSlug(e.target.value) }}
          />
          <CrudInput
            label="Trigger source"
            hint="Value sent to /api/birthday/subscribe when this magnet should fire. Use kebab-case, e.g. 'goody-bag-block'. Leave blank to wire later."
            placeholder="e.g. goody-bag-block"
            value={source} onChange={e => setSource(e.target.value)}
          />
          {err && <div className="text-[11px] text-portal-red">{err}</div>}
        </div>
        <div className="border-t border-portal-border px-4 py-3 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-3 py-1.5 text-[12px] font-bold text-portal-sub hover:text-portal-text">Cancel</button>
          <button type="button" onClick={submit} disabled={busy || !title.trim() || !slug.trim()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-bold text-white bg-portal-navy rounded hover:opacity-90 disabled:opacity-50">
            {busy ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />} Create
          </button>
        </div>
      </div>
    </div>
  )
}

function LeadMagnetCard({ row: initial, onUpdated, onDeleted }: {
  row:       LeadMagnet
  onUpdated: (row: LeadMagnet) => void
  onDeleted: (id: string) => void
}) {
  const [row, setRow]     = useState<LeadMagnet>(initial)
  useEffect(() => { setRow(initial) }, [initial.id]) // eslint-disable-line react-hooks/exhaustive-deps
  const [busy, setBusy]   = useState(false)
  const [saved, setSaved] = useState(false)
  const [err, setErr]     = useState<string | null>(null)
  const [pdfBusy, setPdfBusy] = useState(false)
  const [preview, setPreview] = useState(false)
  const [tagDraft, setTagDraft] = useState('')

  function update<K extends keyof LeadMagnet>(key: K, value: LeadMagnet[K]) {
    setRow(r => ({ ...r, [key]: value }))
    setSaved(false)
  }

  async function uploadPdf(file: File) {
    setErr(null); setPdfBusy(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/admin/birthday/upload-pdf', { method: 'POST', body: fd })
      const j = await res.json()
      if (!res.ok) { setErr(j?.error ?? 'Upload failed'); return }
      update('file_url', j.url)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setPdfBusy(false)
    }
  }

  async function save() {
    setBusy(true); setErr(null); setSaved(false)
    try {
      const res = await fetch(`/api/admin/birthday/lead-magnets/${row.slug}?brand=${row.brand_slug}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          title:           row.title,
          description:     row.description,
          source:          row.source,
          file_url:        row.file_url,
          preview_url:     row.preview_url,
          email_subject:   row.email_subject,
          email_body:      row.email_body,
          from_name:       row.from_name,
          ghl_tags:        row.ghl_tags,
          ghl_workflow_id: row.ghl_workflow_id,
          is_active:       row.is_active,
        }),
      })
      const j = await res.json()
      if (!res.ok) { setErr(j?.error ?? 'Save failed'); return }
      setRow(j as LeadMagnet)
      onUpdated(j as LeadMagnet)
      setSaved(true)
    } finally { setBusy(false) }
  }

  async function remove() {
    if (!confirm(`Delete '${row.title}'? This can't be undone.`)) return
    const res = await fetch(`/api/admin/birthday/lead-magnets/${row.slug}?brand=${row.brand_slug}`, { method: 'DELETE' })
    if (res.ok) onDeleted(row.id)
  }

  function addTag() {
    const t = tagDraft.trim()
    if (!t) return
    if (row.ghl_tags.includes(t)) { setTagDraft(''); return }
    update('ghl_tags', [...row.ghl_tags, t])
    setTagDraft('')
  }
  function removeTag(t: string) {
    update('ghl_tags', row.ghl_tags.filter(x => x !== t))
  }

  return (
    <div className="bg-white border border-portal-border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-portal-bg border-b border-portal-border">
        <div className="flex items-center gap-2">
          <FileText size={14} className="text-portal-navy" />
          <div>
            <div className="text-[13px] font-bold text-portal-text">{row.title}</div>
            <div className="text-[10px] uppercase tracking-wider text-portal-sub">slug: {row.slug}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <CrudActiveToggle active={row.is_active} onChange={() => update('is_active', !row.is_active)} />
          <button type="button" onClick={remove} title="Delete this lead magnet"
            className="p-1.5 text-portal-red hover:bg-red-50 rounded">
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      <div className="p-4 grid lg:grid-cols-2 gap-4">
        {/* Left: identity + PDF + GHL */}
        <div className="space-y-3">
          <CrudInput
            label="Title"
            value={row.title}
            onChange={e => update('title', e.target.value)}
          />
          <CrudInput
            label="Trigger source"
            hint="The 'source' value /api/birthday/subscribe receives to fire this magnet. e.g. timeline-checklist."
            value={row.source ?? ''}
            onChange={e => update('source', e.target.value || null)}
            placeholder="timeline-checklist"
          />
          <CrudTextarea
            label="Internal description"
            hint="Notes for the editor team — not shown to subscribers."
            rows={2}
            value={row.description ?? ''}
            onChange={e => update('description', e.target.value || null)}
          />

          {/* PDF upload */}
          <div>
            <label className="block text-[11px] font-bold text-portal-text mb-1">PDF file</label>
            <p className="text-[10px] text-portal-sub mb-1.5">Up to 10 MB. Stored in public Supabase Storage.</p>
            {row.file_url ? (
              <div className="flex items-center gap-2 p-2 border border-portal-border rounded bg-portal-bg">
                <FileText size={14} className="text-portal-blue shrink-0" />
                <a href={row.file_url} target="_blank" rel="noopener noreferrer"
                  className="flex-1 text-[11px] text-portal-blue hover:underline truncate inline-flex items-center gap-1">
                  Preview current PDF <ExternalLink size={10} />
                </a>
                <label className="text-[10px] font-bold text-portal-blue cursor-pointer hover:underline">
                  Replace
                  <input type="file" accept="application/pdf" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) uploadPdf(f) }} />
                </label>
              </div>
            ) : (
              <label className="w-full flex flex-col items-center justify-center gap-2 py-6 rounded-lg border-2 border-dashed border-portal-border bg-portal-bg hover:border-portal-blue/40 cursor-pointer">
                {pdfBusy ? (
                  <>
                    <Loader2 size={18} className="text-portal-blue animate-spin" />
                    <span className="text-[11px] font-semibold text-portal-sub">Uploading PDF…</span>
                  </>
                ) : (
                  <>
                    <Upload size={18} className="text-portal-muted" />
                    <span className="text-[11px] font-semibold text-portal-sub">Click to upload PDF</span>
                    <span className="text-[10px] text-portal-muted">Up to 10 MB</span>
                  </>
                )}
                <input type="file" accept="application/pdf" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) uploadPdf(f) }} />
              </label>
            )}
          </div>

          {/* Optional thumbnail */}
          <div>
            <label className="block text-[11px] font-bold text-portal-text mb-1">Preview thumbnail (optional)</label>
            <HeroImageUpload
              value={row.preview_url ?? ''}
              onChange={url => update('preview_url', url || null)}
              context="asset"
              emptyWarning={false}
            />
          </div>

          {/* GHL section */}
          <div className="pt-3 border-t border-portal-border">
            <div className="flex items-center gap-2 text-[12px] font-bold text-portal-text mb-2">
              <Tag size={13} className="text-portal-navy" /> GHL sync
            </div>
            <p className="text-[10px] text-portal-sub mb-2">
              Every subscribe also upserts the contact in GoHighLevel with these tags. A GHL workflow ID (optional) fires after the upsert — use it for drip series, SMS reminders, etc.
            </p>
            <div>
              <label className="block text-[11px] font-bold text-portal-text mb-1">Tags</label>
              <div className="flex flex-wrap gap-1 mb-1.5 min-h-[28px] p-1.5 border border-portal-border-2 rounded bg-white">
                {row.ghl_tags.length === 0 && (
                  <span className="text-[10px] text-portal-muted italic px-1">No tags. Add one below.</span>
                )}
                {row.ghl_tags.map(t => (
                  <span key={t} className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold bg-portal-blue-lt text-portal-blue rounded">
                    {t}
                    <button type="button" onClick={() => removeTag(t)} className="hover:text-portal-text"><X size={9} /></button>
                  </span>
                ))}
              </div>
              <div className="flex gap-1">
                <input
                  type="text"
                  value={tagDraft}
                  onChange={e => setTagDraft(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
                  placeholder="birthday-insider"
                  className="flex-1 px-2 py-1 text-[11px] border border-portal-border-2 rounded bg-white outline-none focus:border-portal-blue"
                />
                <button type="button" onClick={addTag}
                  className="px-2 py-1 text-[11px] font-bold text-white bg-portal-navy rounded hover:opacity-90">Add</button>
              </div>
            </div>
            <div className="mt-2">
              <CrudInput
                label="Workflow ID (optional)"
                hint="GHL workflow to trigger after contact upsert."
                value={row.ghl_workflow_id ?? ''}
                onChange={e => update('ghl_workflow_id', e.target.value || null)}
                placeholder="e.g. abc123-workflow-id"
              />
            </div>
          </div>
        </div>

        {/* Right: email */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-[12px] font-bold text-portal-text">
            <Mail size={13} className="text-portal-navy" /> Delivery email
          </div>
          <CrudInput
            label="From name"
            hint="Defaults to 'River Region Parents' if left blank."
            value={row.from_name ?? ''}
            onChange={e => update('from_name', e.target.value || null)}
            placeholder="River Region Parents"
          />
          <CrudInput
            label="Subject"
            value={row.email_subject}
            onChange={e => update('email_subject', e.target.value)}
            placeholder="Your Big Birthday Bash Planner is here"
          />
          <CrudTextarea
            label="Email body (HTML)"
            hint="Tokens: {{first_name}}, {{file_url}}, {{party_date}}. Use {{file_url}} in a link/button so mom can download the PDF."
            rows={16}
            value={row.email_body}
            onChange={e => update('email_body', e.target.value)}
          />
          <button type="button" onClick={() => setPreview(true)}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-portal-blue hover:underline">
            <Eye size={11} /> Preview rendered email
          </button>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 px-4 py-3 bg-portal-bg border-t border-portal-border">
        {err   && <span className="text-[11px] text-portal-red">{err}</span>}
        {saved && <span className="text-[11px] text-portal-green">Saved.</span>}
        <button type="button" onClick={save} disabled={busy}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-[12px] font-bold text-white bg-portal-navy rounded hover:opacity-90 disabled:opacity-50">
          {busy ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Save changes
        </button>
      </div>

      {preview && (
        <EmailPreviewModal row={row} onClose={() => setPreview(false)} />
      )}
    </div>
  )
}

function EmailPreviewModal({ row, onClose }: { row: LeadMagnet; onClose: () => void }) {
  const html = row.email_body
    .replaceAll('{{first_name}}', 'Sarah')
    .replaceAll('{{file_url}}',   row.file_url ?? 'https://example.com/your-planner.pdf')
    .replaceAll('{{party_date}}', 'Saturday, July 12')
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="border-b border-portal-border px-4 py-3 bg-portal-bg">
          <div className="text-[10px] uppercase tracking-wider text-portal-sub">Preview</div>
          <div className="text-[13px] font-bold text-portal-text">{row.email_subject || '(no subject)'}</div>
          <div className="text-[10px] text-portal-sub mt-0.5">
            From: {row.from_name || 'River Region Parents'} • Tokens filled with sample values.
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 text-[13px] text-slate-800 leading-relaxed" dangerouslySetInnerHTML={{ __html: html }} />
        <div className="border-t border-portal-border px-4 py-2 text-right">
          <button type="button" onClick={onClose}
            className="text-[11px] font-bold text-portal-sub hover:text-portal-text">Close</button>
        </div>
      </div>
    </div>
  )
}
