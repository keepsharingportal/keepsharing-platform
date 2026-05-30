'use client'

// ── HeroImageUpload ───────────────────────────────────────────────────────────
// Reusable upload + URL field for article hero images. Posts to /api/admin/upload
// (Sharp-resized, WebP, public Supabase Storage URL returned).
//
// When `context === 'article-hero'`, the server also stashes a private copy
// of the original so the GravityPicker can re-crop without re-uploading.
// Pass `articleId` + `onOrigPathChange` to enable the picker UI.
//
// Big files: Vercel's serverless function body limit is ~4.5 MB, so we
// downscale anything bigger than ~3.5 MB in the browser before POSTing —
// max 3000px on the long edge, JPEG q90. That's still well above what Sharp
// needs for the 1600px web variant.

import { useRef, useState, useEffect } from 'react'
import {
  Upload, X, AlertTriangle, RefreshCw, ImageIcon, CheckCircle2, Crop,
} from 'lucide-react'

interface Props {
  value:    string
  onChange: (url: string) => void
  /** Which Sharp pipeline branch to run server-side. */
  context?: 'article' | 'article-hero' | 'listing' | 'asset'
  /** Required for the GravityPicker (re-crop endpoint needs the article id). */
  articleId?: string
  /** Set on upload when context='article-hero' so the parent can persist it. */
  origPath?: string | null
  onOrigPathChange?: (origPath: string | null) => void
}

function isSupabaseUrl(url: string): boolean {
  try { return /supabase\.(co|in)/.test(new URL(url).hostname) }
  catch { return false }
}

// ── Client-side compression ──────────────────────────────────────────────────
//
// Vercel serverless functions cap request bodies at ~4.5 MB. We downscale
// anything bigger than the trigger threshold before uploading so phone photos
// (often 8–12 MB) make it through. The result is still big enough that the
// server-side Sharp pipeline can produce a crisp 1600×900 hero.

const COMPRESS_TRIGGER_BYTES = 3.5 * 1024 * 1024   // resize files bigger than this
const COMPRESS_MAX_EDGE      = 3000                 // long-edge cap after resize
const COMPRESS_QUALITY       = 0.9                  // JPEG quality

async function compressIfLarge(file: File): Promise<File> {
  if (file.size <= COMPRESS_TRIGGER_BYTES) return file
  // Don't try to resize formats canvas can't faithfully encode back (GIF
  // would lose animation). Send those through as-is and let the server
  // either accept them or reject with a size error.
  if (file.type === 'image/gif') return file

  try {
    // createImageBitmap is the fastest path — uses GPU-backed decode on
    // most browsers. Falls back to <img> if unavailable (e.g. older mobile).
    const bitmap = await (typeof createImageBitmap === 'function'
      ? createImageBitmap(file)
      : loadViaImg(file))

    const longEdge = Math.max(bitmap.width, bitmap.height)
    const scale    = longEdge > COMPRESS_MAX_EDGE ? COMPRESS_MAX_EDGE / longEdge : 1
    const targetW  = Math.round(bitmap.width  * scale)
    const targetH  = Math.round(bitmap.height * scale)

    const canvas = document.createElement('canvas')
    canvas.width  = targetW
    canvas.height = targetH
    const ctx = canvas.getContext('2d')
    if (!ctx) return file

    ctx.drawImage(bitmap, 0, 0, targetW, targetH)
    if ('close' in bitmap && typeof bitmap.close === 'function') bitmap.close()

    const blob: Blob | null = await new Promise(res => canvas.toBlob(res, 'image/jpeg', COMPRESS_QUALITY))
    if (!blob) return file
    // If somehow the compressed version is larger (rare, tiny images), keep
    // the original — no point uploading bloat.
    if (blob.size >= file.size) return file

    const newName = file.name.replace(/\.[a-zA-Z0-9]+$/, '') + '.jpg'
    return new File([blob], newName, { type: 'image/jpeg', lastModified: Date.now() })
  } catch {
    // Compression best-effort — if anything goes wrong, fall back to the
    // raw file and let the server respond.
    return file
  }
}

function loadViaImg(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Could not decode image for compression.'))
    img.src = URL.createObjectURL(file)
  }) as Promise<unknown> as Promise<HTMLImageElement>
}

// ── Component ────────────────────────────────────────────────────────────────

export function HeroImageUpload({
  value, onChange, context = 'article',
  articleId, origPath, onOrigPathChange,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [compressing, setCompressing] = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [urlDraft, setUrlDraft] = useState(value)
  const [optimizing, setOptimizing] = useState(false)
  const [optimized, setOptimized]   = useState(false)

  // Track which gravity button is currently re-cropping so the picker can
  // show a spinner on the active button.
  const [recropBusy, setRecropBusy] = useState<string | null>(null)

  useEffect(() => { setUrlDraft(value) }, [value])

  async function handleFile(file: File) {
    setError(null)
    setUploading(true)
    try {
      // Compress > 3.5 MB before POST so Vercel's 4.5 MB function body cap
      // doesn't reject the upload.
      let toUpload = file
      if (file.size > COMPRESS_TRIGGER_BYTES) {
        setCompressing(true)
        toUpload = await compressIfLarge(file)
        setCompressing(false)
      }

      const fd = new FormData()
      fd.append('file', toUpload)
      fd.append('context', context)

      const res  = await fetch('/api/admin/upload', { method: 'POST', body: fd })
      const json = await res.json().catch(() => ({}))

      if (!res.ok) {
        setError(json?.error ?? `Upload failed (${res.status})`)
        return
      }
      if (!json?.url) {
        setError('Upload response missing URL')
        return
      }
      onChange(json.url)
      // Capture origPath for article-hero uploads so the gravity picker has
      // a source to re-crop from.
      if (context === 'article-hero' && onOrigPathChange) {
        onOrigPathChange(json.origPath ?? null)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setUploading(false)
      setCompressing(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) handleFile(f)
  }

  function clear() {
    onChange('')
    setUrlDraft('')
    setError(null)
    setOptimized(false)
    if (context === 'article-hero' && onOrigPathChange) onOrigPathChange(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function handleUrlBlur() {
    const u = urlDraft.trim()
    setError(null)
    setOptimized(false)
    if (!u || u === value) return
    if (!/^https?:\/\//i.test(u)) {
      onChange(u)
      return
    }
    if (isSupabaseUrl(u)) {
      onChange(u)
      setOptimized(true)
      return
    }
    setOptimizing(true)
    try {
      const res  = await fetch('/api/admin/upload', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ url: u, context }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json?.url) {
        setError(json?.error ?? 'Optimization failed — saving original URL.')
        onChange(u)
        return
      }
      onChange(json.url)
      setUrlDraft(json.url)
      setOptimized(true)
      if (context === 'article-hero' && onOrigPathChange) {
        onOrigPathChange(json.origPath ?? null)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Optimization failed.')
      onChange(u)
    } finally {
      setOptimizing(false)
    }
  }

  // ── Re-crop ─────────────────────────────────────────────────────────────
  async function recrop(gravity: string) {
    if (!articleId) {
      setError('Save the article first — re-crop needs an article ID.')
      return
    }
    if (!origPath) {
      setError('Re-crop needs a saved original — re-upload a fresh image first.')
      return
    }
    setRecropBusy(gravity)
    setError(null)
    try {
      const res  = await fetch(`/api/admin/articles/${articleId}/recrop-hero`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ gravity }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json?.hero_image_url) {
        setError(json?.error ?? `Re-crop failed (${res.status})`)
        return
      }
      // Cache-bust the preview so the new crop shows immediately.
      const busted = `${json.hero_image_url}?t=${Date.now()}`
      onChange(busted)
      setUrlDraft(busted)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Re-crop failed.')
    } finally {
      setRecropBusy(null)
    }
  }

  const canRecrop = context === 'article-hero' && !!articleId && !!origPath

  return (
    <div className="space-y-2">
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
        onChange={onPick}
        className="hidden"
      />

      {/* Preview */}
      {value ? (
        <div className="relative rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="Hero preview" className="w-full h-32 object-cover" />
          <button
            type="button"
            onClick={clear}
            disabled={uploading}
            title="Remove image"
            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/70 text-white hover:bg-black flex items-center justify-center disabled:opacity-40"
          >
            <X size={13} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="w-full flex flex-col items-center justify-center gap-2 py-6 rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 hover:border-blue-300 hover:bg-blue-50/40 transition-colors disabled:opacity-50"
        >
          {uploading ? (
            <>
              <RefreshCw size={18} className="text-blue-500 animate-spin" />
              <span className="text-xs font-semibold text-gray-600">
                {compressing ? 'Resizing large image…' : 'Uploading…'}
              </span>
            </>
          ) : (
            <>
              <ImageIcon size={18} className="text-gray-400" />
              <span className="text-xs font-semibold text-gray-600">Click to upload image</span>
              <span className="text-[10px] text-gray-400">JPEG, PNG, WebP, GIF · big files auto-resized</span>
            </>
          )}
        </button>
      )}

      {/* Replace controls + (for article-hero) GravityPicker */}
      {value && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50/40 disabled:opacity-50"
          >
            {uploading
              ? <><RefreshCw size={12} className="animate-spin" /> {compressing ? 'Resizing…' : 'Uploading…'}</>
              : <><Upload size={12} /> Replace</>}
          </button>
        </div>
      )}

      {context === 'article-hero' && value && (
        <GravityPicker
          enabled={canRecrop}
          busyGravity={recropBusy}
          onPick={recrop}
          hint={
            !articleId
              ? 'Save the article once to enable re-crop.'
              : !origPath
                ? 'Upload a fresh image to enable re-crop (legacy heroes have no saved original).'
                : null
          }
        />
      )}

      {/* Paste-URL fallback */}
      <div>
        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Or paste a URL</label>
        <div className="relative">
          <input
            type="url"
            value={urlDraft}
            onChange={e => { setUrlDraft(e.target.value); setOptimized(false) }}
            onBlur={handleUrlBlur}
            disabled={optimizing}
            placeholder="https://..."
            className="w-full px-3 py-2 pr-9 text-xs rounded-lg border border-gray-200 outline-none focus:border-blue-400 bg-white disabled:opacity-60"
          />
          {optimizing && (
            <RefreshCw size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-blue-500 animate-spin" />
          )}
          {!optimizing && optimized && (
            <CheckCircle2 size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-green-500" />
          )}
        </div>
        {optimizing && (
          <p className="text-[10px] text-blue-600 mt-1">Optimizing URL on server…</p>
        )}
        {optimized && !optimizing && (
          <p className="text-[10px] text-green-700 mt-1">Optimized + saved to Supabase Storage.</p>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-red-50 border border-red-200">
          <AlertTriangle size={13} className="text-red-500 shrink-0 mt-0.5" />
          <p className="text-[11px] text-red-700 leading-relaxed">{error}</p>
        </div>
      )}

      {!value && !uploading && !error && (
        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-orange-50 border border-orange-200">
          <AlertTriangle size={13} className="text-orange-500 shrink-0 mt-0.5" />
          <p className="text-[11px] text-orange-700 leading-relaxed">Missing image — articles without a hero photo look blank in listings.</p>
        </div>
      )}
    </div>
  )
}

// ── GravityPicker ─────────────────────────────────────────────────────────────
// 9-compass crop control — same pattern as the school bits / events admin.
// Re-runs Sharp on the saved original with the chosen position.

const COMPASS: { gravity: string; label: string }[] = [
  { gravity: 'northwest', label: '↖' },
  { gravity: 'north',     label: '↑' },
  { gravity: 'northeast', label: '↗' },
  { gravity: 'west',      label: '←' },
  { gravity: 'center',    label: '•' },
  { gravity: 'east',      label: '→' },
  { gravity: 'southwest', label: '↙' },
  { gravity: 'south',     label: '↓' },
  { gravity: 'southeast', label: '↘' },
]

function GravityPicker({
  enabled, busyGravity, onPick, hint,
}: {
  enabled:     boolean
  busyGravity: string | null
  onPick:      (gravity: string) => void
  hint:        string | null
}) {
  return (
    <div className="mt-2 p-2 rounded-lg border border-blue-100 bg-blue-50/40">
      <p className="text-[10px] font-bold uppercase tracking-wider text-blue-800 mb-1 inline-flex items-center gap-1">
        <Crop size={10} /> Re-crop hero (1600×900)
      </p>
      <div className="grid grid-cols-3 gap-0.5 w-full max-w-[140px]">
        {COMPASS.map(({ gravity, label }) => {
          const active = busyGravity === gravity
          return (
            <button
              key={gravity}
              type="button"
              onClick={() => onPick(gravity)}
              disabled={!enabled || busyGravity !== null}
              title={`Re-crop toward ${gravity}`}
              className={`aspect-square text-xs font-bold rounded transition-colors ${
                !enabled
                  ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                  : 'bg-white text-blue-700 border border-blue-200 hover:bg-blue-100 disabled:opacity-50'
              }`}
            >
              {active ? <RefreshCw size={10} className="animate-spin mx-auto" /> : label}
            </button>
          )
        })}
      </div>
      <div className="mt-1.5 flex gap-1">
        <button
          type="button"
          onClick={() => onPick('attention')}
          disabled={!enabled || busyGravity !== null}
          title="Re-run automatic attention crop"
          className={`flex-1 text-[10px] font-bold rounded px-2 py-1 ${
            !enabled
              ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
              : 'bg-white text-blue-700 border border-blue-200 hover:bg-blue-100 disabled:opacity-50'
          }`}
        >
          {busyGravity === 'attention' ? 'Re-cropping…' : 'Auto (attention)'}
        </button>
      </div>
      {hint && (
        <p className="text-[10px] text-blue-700/80 mt-1.5 leading-snug">{hint}</p>
      )}
    </div>
  )
}
