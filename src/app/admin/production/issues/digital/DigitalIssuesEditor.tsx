'use client'

// Client UI for the Digital Issues admin page. Three concerns:
//   - Render the list of existing issues with cover thumbnail + actions
//   - "Add issue" form (label, tagline, month, Issuu URL, cover upload)
//   - Per-row "Make Current" / Edit / Delete
//
// All writes hit /api/admin/magazine-issues; the server route revalidates
// the homepage so changes show up immediately.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Plus, Star, Trash2, ExternalLink, Loader2, Pencil, X, Check, Upload } from 'lucide-react'

export interface MagazineIssue {
  id:           string
  market:       string
  label:        string
  tagline:      string | null
  issue_month:  string                 // YYYY-MM-DD
  cover_url:    string | null
  issuu_url:    string
  is_current:   boolean
  sort_order:   number | null
  published_at: string | null
  created_at:   string
  updated_at:   string
}

function monthDisplay(d: string): string {
  if (!d) return ''
  const dt = new Date(d.slice(0, 10) + 'T12:00:00')
  return dt.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

function thisMonthFirstDay(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

interface Props {
  initial: MagazineIssue[]
  market:  string
}

export function DigitalIssuesEditor({ initial, market }: Props) {
  const router = useRouter()
  const [issues, setIssues] = useState<MagazineIssue[]>(initial)
  const [, startTransition]  = useTransition()

  function refresh() {
    // Re-pull server state so the list reflects what got written.
    startTransition(() => router.refresh())
  }

  async function patchRow(id: string, body: Record<string, unknown>) {
    const res = await fetch('/api/admin/magazine-issues', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ id, ...body }),
    })
    if (!res.ok) {
      const j = await res.json().catch(() => ({})) as { error?: string }
      alert(j.error ?? 'Update failed')
      return false
    }
    return true
  }

  async function handleSetCurrent(id: string) {
    const ok = await patchRow(id, { action: 'set-current' })
    if (ok) {
      // Optimistic local update so the star moves immediately.
      setIssues(prev => prev.map(i => ({ ...i, is_current: i.id === id })))
      refresh()
    }
  }

  async function handleDelete(id: string, label: string) {
    if (!confirm(`Delete "${label}"? This can't be undone.`)) return
    const res = await fetch(`/api/admin/magazine-issues?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
    if (!res.ok) {
      const j = await res.json().catch(() => ({})) as { error?: string }
      alert(j.error ?? 'Delete failed')
      return
    }
    setIssues(prev => prev.filter(i => i.id !== id))
    refresh()
  }

  function handleCreated(row: MagazineIssue) {
    setIssues(prev => [row, ...prev])
    refresh()
  }

  function handleSaved(row: MagazineIssue) {
    setIssues(prev => prev.map(i => i.id === row.id ? row : i))
    refresh()
  }

  return (
    <div className="space-y-6">
      <AddIssueForm market={market} onCreated={handleCreated} />

      {issues.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center bg-white">
          <p className="text-sm text-gray-500">No issues yet.</p>
          <p className="text-xs text-gray-400 mt-1">Add your first issue above.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {issues.map(issue => (
            <IssueRow
              key={issue.id}
              issue={issue}
              onSetCurrent={() => handleSetCurrent(issue.id)}
              onDelete={() => handleDelete(issue.id, issue.label)}
              onSaved={handleSaved}
            />
          ))}
        </ul>
      )}
    </div>
  )
}

// ── Row ──────────────────────────────────────────────────────────────────────

interface RowProps {
  issue:        MagazineIssue
  onSetCurrent: () => void
  onDelete:     () => void
  onSaved:      (row: MagazineIssue) => void
}

function IssueRow({ issue, onSetCurrent, onDelete, onSaved }: RowProps) {
  const [editing, setEditing] = useState(false)

  if (editing) {
    return (
      <EditIssueForm
        issue={issue}
        onCancel={() => setEditing(false)}
        onSaved={(row) => { setEditing(false); onSaved(row) }}
      />
    )
  }

  return (
    <li className={`rounded-xl border bg-white p-4 flex gap-4 ${issue.is_current ? 'border-amber-300 ring-1 ring-amber-200' : 'border-gray-200'}`}>
      <div className="w-16 h-20 shrink-0 rounded-md overflow-hidden bg-gray-100 relative">
        {issue.cover_url ? (
          <Image src={issue.cover_url} alt={`${issue.label} cover`} fill style={{ objectFit: 'cover' }} unoptimized sizes="64px" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-400 text-center px-1">No cover</div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-bold text-gray-900 truncate">{issue.label}</p>
          {issue.is_current && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-portal-amber bg-portal-amber-lt rounded-full px-2 py-0.5">
              <Star size={9} fill="currentColor" /> Current
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-0.5">{monthDisplay(issue.issue_month)}</p>
        {issue.tagline && <p className="text-xs text-gray-700 mt-1 line-clamp-2">{issue.tagline}</p>}
        <a
          href={issue.issuu_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[11px] text-portal-blue hover:underline mt-1 truncate max-w-full"
        >
          <ExternalLink size={10} /> <span className="truncate">{issue.issuu_url}</span>
        </a>
      </div>

      <div className="flex flex-col gap-1.5 shrink-0">
        {!issue.is_current && (
          <button
            onClick={onSetCurrent}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-md bg-portal-amber-lt0 text-white hover:bg-amber-600"
            title="Make this the current issue"
          >
            <Star size={11} /> Make Current
          </button>
        )}
        <button
          onClick={() => setEditing(true)}
          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-md border border-gray-200 text-gray-700 hover:bg-gray-50"
        >
          <Pencil size={11} /> Edit
        </button>
        <button
          onClick={onDelete}
          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-md border border-red-200 text-red-600 hover:bg-red-50"
        >
          <Trash2 size={11} /> Delete
        </button>
      </div>
    </li>
  )
}

// ── Add form ─────────────────────────────────────────────────────────────────

interface AddProps {
  market:    string
  onCreated: (row: MagazineIssue) => void
}

function AddIssueForm({ market, onCreated }: AddProps) {
  const [open,    setOpen]    = useState(false)
  const [label,   setLabel]   = useState('')
  const [tagline, setTagline] = useState('')
  const [month,   setMonth]   = useState(thisMonthFirstDay())
  const [issuu,   setIssuu]   = useState('')
  const [cover,   setCover]   = useState<string | null>(null)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [makeCurrent, setMakeCurrent] = useState(true)
  const [busy,    setBusy]    = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  if (!open) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-white p-4">
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-portal-navy text-white rounded-lg hover:opacity-90"
        >
          <Plus size={12} /> Add Issue
        </button>
        <p className="text-xs text-gray-500 mt-2">Adds a digital edition to this market.</p>
      </div>
    )
  }

  async function uploadCoverIfNeeded(): Promise<string | null> {
    if (!coverFile) return cover
    const form = new FormData()
    form.append('file', coverFile)
    form.append('context', 'magazine-cover')
    const res = await fetch('/api/admin/upload', { method: 'POST', body: form })
    if (!res.ok) {
      const j = await res.json().catch(() => ({})) as { error?: string }
      throw new Error(j.error ?? 'Cover upload failed')
    }
    const j = await res.json() as { url?: string }
    return j.url ?? null
  }

  async function handleSubmit() {
    setBusy(true)
    setError(null)
    try {
      const coverUrl = await uploadCoverIfNeeded()
      const res = await fetch('/api/admin/magazine-issues', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          market,
          label:       label.trim(),
          tagline:     tagline.trim() || null,
          issue_month: month,
          cover_url:   coverUrl,
          issuu_url:   issuu.trim(),
          is_current:  makeCurrent,
        }),
      })
      const j = await res.json() as { issue?: MagazineIssue; error?: string }
      if (!res.ok || !j.issue) throw new Error(j.error ?? 'Could not create issue')
      onCreated(j.issue)
      // Reset for next entry
      setLabel(''); setTagline(''); setIssuu(''); setCover(null); setCoverFile(null)
      setMakeCurrent(false); setMonth(thisMonthFirstDay())
      setOpen(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-xl border border-blue-200 bg-portal-blue-lt/40 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-gray-900">New Issue</p>
        <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
          <X size={14} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <FieldText label="Label" value={label} onChange={setLabel} placeholder="May 2026 Issue" />
        <FieldDate label="Issue Month" value={month} onChange={setMonth} />
        <FieldText label="Tagline" value={tagline} onChange={setTagline} placeholder="Summer Fun Issue: 100+ camps…" className="md:col-span-2" />
        <FieldEmbed value={issuu} onChange={setIssuu} />
        <CoverField cover={cover} coverFile={coverFile} setCover={setCover} setCoverFile={setCoverFile} />
        <label className="flex items-center gap-2 text-xs text-gray-700 mt-2 md:mt-0 self-start">
          <input type="checkbox" checked={makeCurrent} onChange={e => setMakeCurrent(e.target.checked)} />
          Make this the current issue
        </label>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex items-center gap-2">
        <button
          onClick={handleSubmit}
          disabled={busy || !label.trim() || !issuu.trim() || !month}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-portal-navy text-white rounded-lg hover:opacity-90 disabled:opacity-50"
        >
          {busy ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
          {busy ? 'Saving…' : 'Save Issue'}
        </button>
        <button
          onClick={() => setOpen(false)}
          className="px-3 py-1.5 text-xs font-semibold text-gray-600 rounded-lg hover:bg-gray-100"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

// ── Edit form (inline) ───────────────────────────────────────────────────────

interface EditProps {
  issue:    MagazineIssue
  onCancel: () => void
  onSaved:  (row: MagazineIssue) => void
}

function EditIssueForm({ issue, onCancel, onSaved }: EditProps) {
  const [label,   setLabel]   = useState(issue.label)
  const [tagline, setTagline] = useState(issue.tagline ?? '')
  const [month,   setMonth]   = useState(issue.issue_month.slice(0, 10))
  const [issuu,   setIssuu]   = useState(issue.issuu_url)
  const [cover,   setCover]   = useState<string | null>(issue.cover_url)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [busy,    setBusy]    = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  async function uploadCoverIfNeeded(): Promise<string | null> {
    if (!coverFile) return cover
    const form = new FormData()
    form.append('file', coverFile)
    form.append('context', 'magazine-cover')
    const res = await fetch('/api/admin/upload', { method: 'POST', body: form })
    if (!res.ok) {
      const j = await res.json().catch(() => ({})) as { error?: string }
      throw new Error(j.error ?? 'Cover upload failed')
    }
    const j = await res.json() as { url?: string }
    return j.url ?? null
  }

  async function handleSave() {
    setBusy(true)
    setError(null)
    try {
      const coverUrl = await uploadCoverIfNeeded()
      const res = await fetch('/api/admin/magazine-issues', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          id:          issue.id,
          label:       label.trim(),
          tagline:     tagline.trim() || null,
          issue_month: month,
          cover_url:   coverUrl,
          issuu_url:   issuu.trim(),
        }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(j.error ?? 'Save failed')
      }
      onSaved({
        ...issue,
        label:       label.trim(),
        tagline:     tagline.trim() || null,
        issue_month: month,
        cover_url:   coverUrl,
        issuu_url:   issuu.trim(),
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <li className="rounded-xl border border-blue-200 bg-portal-blue-lt/40 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-gray-900">Edit Issue</p>
        <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
          <X size={14} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <FieldText label="Label" value={label} onChange={setLabel} />
        <FieldDate label="Issue Month" value={month} onChange={setMonth} />
        <FieldText label="Tagline" value={tagline} onChange={setTagline} className="md:col-span-2" />
        <FieldEmbed value={issuu} onChange={setIssuu} />
        <CoverField cover={cover} coverFile={coverFile} setCover={setCover} setCoverFile={setCoverFile} />
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex items-center gap-2">
        <button
          onClick={handleSave}
          disabled={busy}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-portal-navy text-white rounded-lg hover:opacity-90 disabled:opacity-50"
        >
          {busy ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
          {busy ? 'Saving…' : 'Save Changes'}
        </button>
        <button onClick={onCancel} className="px-3 py-1.5 text-xs font-semibold text-gray-600 rounded-lg hover:bg-gray-100">
          Cancel
        </button>
      </div>
    </li>
  )
}

// ── Small field components ───────────────────────────────────────────────────

function FieldText({ label, value, onChange, placeholder, className }: {
  label: string; value: string; onChange: (s: string) => void; placeholder?: string; className?: string
}) {
  return (
    <label className={`block ${className ?? ''}`}>
      <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">{label}</span>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-portal-blue/30"
      />
    </label>
  )
}

function FieldEmbed({ value, onChange }: {
  value: string; onChange: (s: string) => void
}) {
  return (
    <label className="block md:col-span-2">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Issuu Embed Code</span>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={'Paste either the publication URL (https://issuu.com/…) or Issuu\'s full <iframe …> embed code'}
        rows={3}
        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-portal-blue/30"
      />
      <p className="text-[11px] text-gray-500 mt-1 leading-snug">
        Paste whatever Issuu gives you — the publication URL, the embed <code className="px-1 bg-gray-100 rounded">src</code> URL,
        or the full <code className="px-1 bg-gray-100 rounded">&lt;iframe&gt;</code> snippet. We&apos;ll parse it and build the
        sidebar embed + the &ldquo;Open in New Tab&rdquo; link from the same value.
      </p>
    </label>
  )
}

function FieldDate({ label, value, onChange }: {
  label: string; value: string; onChange: (s: string) => void
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">{label}</span>
      <input
        type="date"
        value={value.slice(0, 10)}
        onChange={e => onChange(e.target.value)}
        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-portal-blue/30"
      />
    </label>
  )
}

function CoverField({ cover, coverFile, setCover, setCoverFile }: {
  cover: string | null
  coverFile: File | null
  setCover: (v: string | null) => void
  setCoverFile: (f: File | null) => void
}) {
  // The visible preview box is also the click target. <label> wraps the
  // hidden file input so clicking anywhere on the dashed card opens
  // the file picker — clearer than a raw 'Choose File' button.
  const hasCover = !!(cover || coverFile)
  return (
    <div>
      <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
        Cover Image <span className="text-gray-400 normal-case font-normal">(optional)</span>
      </span>
      <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">
        Used as the thumbnail in the homepage &ldquo;Recent Issues&rdquo; carousel for past issues. The current issue&apos;s sidebar uses the embed instead, so this is optional for the current month.
      </p>
      <div className="mt-2 flex items-start gap-4">
        {/* Click-to-upload preview card. 3:4 aspect matches the magazine
            cover so what shows here = what shows on the homepage. */}
        <label
          className={`relative shrink-0 w-28 aspect-[3/4] rounded-lg overflow-hidden cursor-pointer transition-colors group ${
            hasCover
              ? 'ring-1 ring-gray-300 bg-white shadow-sm hover:ring-gray-400'
              : 'border-2 border-dashed border-gray-300 bg-gray-50 hover:border-portal-blue hover:bg-portal-blue-lt'
          }`}
        >
          {coverFile ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={URL.createObjectURL(coverFile)} alt="preview" className="w-full h-full object-cover" />
          ) : cover ? (
            <Image src={cover} alt="cover" fill style={{ objectFit: 'cover' }} unoptimized sizes="112px" />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 px-2 text-center">
              <Upload size={18} className="text-gray-400 group-hover:text-portal-blue transition-colors" />
              <span className="text-[10px] font-bold text-gray-500 group-hover:text-portal-blue uppercase tracking-wider transition-colors">Click to upload</span>
              <span className="text-[9px] text-gray-400 leading-tight">3:4 ratio · PNG / JPG</span>
            </div>
          )}
          {hasCover && (
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
              <span className="text-[10px] font-bold text-white uppercase tracking-wider bg-black/60 px-2 py-1 rounded">Replace</span>
            </div>
          )}
          <input
            type="file"
            accept="image/*"
            onChange={e => setCoverFile(e.target.files?.[0] ?? null)}
            className="sr-only"
          />
        </label>
        <div className="flex flex-col gap-2 pt-1">
          <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white text-xs font-bold rounded-lg hover:bg-gray-700 cursor-pointer">
            <Upload size={12} /> {hasCover ? 'Replace cover' : 'Choose cover image'}
            <input
              type="file"
              accept="image/*"
              onChange={e => setCoverFile(e.target.files?.[0] ?? null)}
              className="sr-only"
            />
          </label>
          {hasCover && (
            <button
              onClick={() => { setCover(null); setCoverFile(null) }}
              type="button"
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-gray-500 hover:text-red-600 text-left"
            >
              <Trash2 size={11} /> Remove cover
            </button>
          )}
          <p className="text-[10px] text-gray-400 leading-snug max-w-[180px]">
            Click the preview tile or this button — both open the file picker.
          </p>
        </div>
      </div>
    </div>
  )
}
