'use client'

// Lead-magnet editor — one card per row. The Planning Timeline subscribe
// endpoint looks up the row by slug, interpolates {{first_name}} +
// {{file_url}} + {{party_date}}, and sends the email via Resend.
//
// Workflow:
//   1. Editor uploads the PDF → file_url populated by upload-pdf route.
//   2. Editor writes/tweaks the email subject + body.
//   3. Click "Save changes" → PATCH to lead-magnets/[slug].
//   4. Next mom who submits the Planning Timeline form receives the
//      saved email with the saved PDF attached as a download link.

import { useState } from 'react'
import { HeroImageUpload } from '@/components/admin/HeroImageUpload'
import { CrudInput, CrudTextarea, CrudActiveToggle } from '@/components/admin/BirthdayCrudHelpers'
import { Loader2, Save, Upload, FileText, ExternalLink, Mail, Eye } from 'lucide-react'

interface LeadMagnet {
  id:            string
  brand_slug:    string
  slug:          string
  title:         string
  description:   string | null
  file_url:      string | null
  preview_url:   string | null
  email_subject: string
  email_body:    string
  from_name:     string | null
  is_active:     boolean
}

export function LeadMagnetsClient({ initial }: { initial: LeadMagnet[] }) {
  return (
    <div className="space-y-6">
      {initial.length === 0 && (
        <div className="bg-white border border-portal-border rounded-lg p-6 text-center text-portal-sub text-[12px]">
          No lead magnets configured yet. Run migration 206 to seed the planner row.
        </div>
      )}
      {initial.map(row => <LeadMagnetCard key={row.id} initial={row} />)}
    </div>
  )
}

function LeadMagnetCard({ initial }: { initial: LeadMagnet }) {
  const [row, setRow]   = useState<LeadMagnet>(initial)
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const [err, setErr]   = useState<string | null>(null)
  const [pdfBusy, setPdfBusy] = useState(false)
  const [preview, setPreview] = useState(false)

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
          title:         row.title,
          description:   row.description,
          file_url:      row.file_url,
          preview_url:   row.preview_url,
          email_subject: row.email_subject,
          email_body:    row.email_body,
          from_name:     row.from_name,
          is_active:     row.is_active,
        }),
      })
      const j = await res.json()
      if (!res.ok) { setErr(j?.error ?? 'Save failed'); return }
      setRow(j as LeadMagnet)
      setSaved(true)
    } finally { setBusy(false) }
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
        <CrudActiveToggle active={row.is_active} onChange={() => update('is_active', !row.is_active)} />
      </div>

      <div className="p-4 grid lg:grid-cols-2 gap-4">
        {/* Left: identity + PDF */}
        <div className="space-y-3">
          <CrudInput
            label="Title"
            value={row.title}
            onChange={e => update('title', e.target.value)}
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
            <p className="text-[10px] text-portal-sub mb-1.5">
              Upload the printable. Public Supabase Storage URL — keep PDFs under 10 MB.
            </p>
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
            <p className="text-[10px] text-portal-sub mb-1.5">
              Shown on the Planning Timeline form when promoting the magnet. JPEG or PNG.
            </p>
            <HeroImageUpload
              value={row.preview_url ?? ''}
              onChange={url => update('preview_url', url || null)}
              context="asset"
              emptyWarning={false}
            />
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
            hint="Tokens: {{first_name}}, {{file_url}}, {{party_date}}. Use a {{file_url}} link/button so mom can download the PDF."
            rows={12}
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
