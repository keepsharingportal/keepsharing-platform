'use client'

// ── /admin/column-branding ───────────────────────────────────────────────────
// Per-column editorial branding manager.
//
// Every editorial column on the site (Grands, Mom to Mom, Dave Says,
// Education Matters, Teens Tweens & Screens, Counselor Corner, etc.) gets
// its own card here. Editors upload a logo PNG/SVG + a tagline, save, and
// every article in that column picks up the new identity automatically.
//
// Colors + structural config (icons, soft palette, watermark) still live
// in src/lib/articles/column-brand.ts — that's the design system.
// This admin only edits the EDITORIAL bits.

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Upload, RefreshCw, X, Save, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { COLUMNS } from '@/lib/content-taxonomy'

interface Branding {
  column_slug: string
  logo_url:    string | null
  tagline:     string | null
}

// Only editorial columns with their own visual identity show up here.
// Content types (school news roundups, student profile pages, generic
// feature articles) don't get logos — they're routing buckets, not
// branded columns. Adjust this list when adding/removing branded columns.
const BRANDABLE_COLUMN_SLUGS = new Set([
  // School Zone — Education Matters is split per-county (each
  // superintendent gets their own logo + tagline + identity). The
  // generic 'education-matters' is intentionally NOT brandable.
  'teacher-of-month',
  'education-matters-montgomery',
  'education-matters-elmore',
  'education-matters-autauga',
  'counselor-corner',
  // Mom Life
  'mom-knows-best',
  'mom-to-mom',
  'grumpy-but-grateful',
  // Family
  'grands-greatest',
  'play-ball',
  'dave-says',
  'teens-tweens-screens',
  // Health
  'meeting-kids',
  'ask-the-doctor',
])

export default function ColumnBrandingPage() {
  const [branding, setBranding] = useState<Record<string, Branding>>({})
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/column-branding')
      const json = await res.json()
      if (!res.ok) { setError(json?.error ?? 'Load failed'); return }
      const map: Record<string, Branding> = {}
      for (const b of (json.branding ?? []) as Branding[]) {
        map[b.column_slug] = b
      }
      setBranding(map)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Load failed')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  return (
    /* h-full + overflow-y-auto so the page scrolls inside the admin
       layout's overflow-hidden wrapper. Using h-full instead of flex-1
       prevents the double-scroll situation where the parent layout's
       flex causes an outer scroll AND this wrapper scrolls. max-w cap
       stays inside an inner wrapper. */
    <div className="h-full overflow-y-auto">
    <div className="p-6 md:p-8 max-w-6xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin" className="text-portal-sub hover:text-portal-text">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-2xl font-black text-portal-text">Column Branding</h1>
      </div>

      <p className="text-sm text-portal-sub leading-relaxed mb-8 max-w-2xl">
        Upload a logo + tagline for any column. Each one becomes the article eyebrow
        and the column-identity line under the title. Color palettes and structural
        layout still come from the code defaults — this just gives each column its
        own visual identity. Leave blank to use the code default.
      </p>

      {error && (
        <div className="mb-6 flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
          <AlertTriangle size={14} className="text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 leading-relaxed">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-portal-sub"><RefreshCw size={14} className="animate-spin" /> Loading…</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {COLUMNS.filter(c => BRANDABLE_COLUMN_SLUGS.has(c.slug)).map(col => (
            <ColumnCard
              key={col.slug}
              column={col}
              branding={branding[col.slug] ?? { column_slug: col.slug, logo_url: null, tagline: null }}
              onSaved={(updated) => {
                setBranding(b => ({ ...b, [updated.column_slug]: updated }))
              }}
            />
          ))}
        </div>
      )}
    </div>
    </div>
  )
}

// ── ColumnCard ──────────────────────────────────────────────────────────────

function ColumnCard({
  column, branding, onSaved,
}: {
  column:   { slug: string; label: string; vertical: string; description?: string }
  branding: Branding
  onSaved:  (b: Branding) => void
}) {
  const [logoUrl, setLogoUrl] = useState(branding.logo_url ?? '')
  const [tagline, setTagline] = useState(branding.tagline ?? '')
  const [saving,  setSaving]  = useState(false)
  const [savedOk, setSavedOk] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function handleUpload(file: File) {
    setErr(null)
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('context', 'asset')
      const res  = await fetch('/api/admin/upload', { method: 'POST', body: fd })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json?.url) {
        setErr(json?.error ?? `Upload failed (${res.status})`)
        return
      }
      setLogoUrl(json.url)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  async function save() {
    setSaving(true)
    setSavedOk(false)
    setErr(null)
    try {
      const res = await fetch('/api/admin/column-branding', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          column_slug: column.slug,
          logo_url:    logoUrl.trim() || null,
          tagline:     tagline.trim() || null,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setErr(json?.error ?? `Save failed (${res.status})`)
        return
      }
      onSaved({ column_slug: column.slug, logo_url: logoUrl.trim() || null, tagline: tagline.trim() || null })
      setSavedOk(true)
      setTimeout(() => setSavedOk(false), 2500)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-xl border border-portal-border bg-white overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 bg-portal-bg">
        <p className="text-xs font-bold text-portal-sub uppercase tracking-wider">{column.vertical}</p>
        <h3 className="font-black text-portal-text mt-0.5">{column.label}</h3>
        {column.description && (
          <p className="text-[11px] text-portal-sub mt-0.5 line-clamp-2">{column.description}</p>
        )}
      </div>

      <div className="p-4 space-y-3">
        {/* Logo upload + preview */}
        <div>
          <label className="block text-[11px] font-bold text-portal-sub uppercase tracking-wider mb-1.5">Column Logo</label>
          {logoUrl ? (
            <div className="rounded-md border border-portal-border bg-portal-bg p-2 flex items-center gap-3 mb-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logoUrl} alt={column.label} className="h-12 w-auto max-w-[200px] object-contain" />
              <button
                type="button"
                onClick={() => setLogoUrl('')}
                className="ml-auto text-xs font-semibold text-portal-red hover:text-red-700 flex items-center gap-1"
              >
                <X size={11} /> Remove
              </button>
            </div>
          ) : null}
          <label className="block">
            <span className="sr-only">Upload logo</span>
            <input
              type="file"
              accept="image/png,image/svg+xml,image/webp,image/jpeg"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f) }}
            />
            <span
              role="button"
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md cursor-pointer ${uploading ? 'bg-gray-100 text-portal-muted' : 'bg-portal-blue-lt text-portal-blue hover:bg-portal-blue-lt'}`}
            >
              {uploading
                ? <><RefreshCw size={12} className="animate-spin" /> Uploading…</>
                : <><Upload size={12} /> {logoUrl ? 'Replace logo' : 'Upload logo'}</>}
            </span>
          </label>
          <p className="text-[10px] text-portal-muted mt-1">PNG or SVG. Transparent background recommended.</p>
        </div>

        {/* Tagline */}
        <div>
          <label className="block text-[11px] font-bold text-portal-sub uppercase tracking-wider mb-1">Tagline</label>
          <textarea
            value={tagline}
            onChange={e => setTagline(e.target.value)}
            placeholder="One-line column identity (e.g. Celebrating the love, legacy…)"
            rows={2}
            className="w-full px-3 py-2 text-sm rounded-md border border-portal-border outline-none focus:border-portal-blue bg-white resize-y"
          />
        </div>

        {err && (
          <div className="flex items-start gap-2 p-2 rounded-md bg-red-50 border border-red-200">
            <AlertTriangle size={11} className="text-red-500 shrink-0 mt-0.5" />
            <p className="text-[11px] text-red-700">{err}</p>
          </div>
        )}

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md bg-portal-navy hover:opacity-90 text-white disabled:opacity-50"
          >
            {saving ? <><RefreshCw size={11} className="animate-spin" /> Saving…</> : <><Save size={11} /> Save</>}
          </button>
          {savedOk && (
            <span className="inline-flex items-center gap-1 text-xs text-green-700 font-semibold">
              <CheckCircle2 size={12} /> Saved
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
