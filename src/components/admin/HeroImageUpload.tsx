'use client'

// ── HeroImageUpload ───────────────────────────────────────────────────────────
// Reusable upload + URL field for article hero images. Posts to /api/admin/upload
// (Sharp-resized, WebP, public Supabase Storage URL returned).
//
// Usage:
//   <HeroImageUpload
//     value={form.hero_image_url}
//     onChange={url => setField('hero_image_url', url)}
//   />

import { useRef, useState, useEffect } from 'react'
import { Upload, X, AlertTriangle, RefreshCw, ImageIcon, CheckCircle2 } from 'lucide-react'

interface Props {
  value:    string
  onChange: (url: string) => void
  /** Forwarded to the upload endpoint so it knows the storage prefix to use. */
  context?: 'article' | 'listing' | 'asset'
}

function isSupabaseUrl(url: string): boolean {
  try { return /supabase\.(co|in)/.test(new URL(url).hostname) }
  catch { return false }
}

export function HeroImageUpload({ value, onChange, context = 'article' }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError]         = useState<string | null>(null)
  // Local edit buffer for the URL field. We don't fire onChange or
  // optimize until the user blurs, so they can paste freely without us
  // hitting the network on every keystroke.
  const [urlDraft, setUrlDraft] = useState(value)
  const [optimizing, setOptimizing] = useState(false)
  const [optimized, setOptimized]   = useState(false)

  // Keep the URL field in sync when value changes from outside (e.g. after
  // a file upload via the picker, or when the parent form loads initial data
  // asynchronously).
  useEffect(() => { setUrlDraft(value) }, [value])

  async function handleFile(file: File) {
    setError(null)
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
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
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setUploading(false)
      // Reset so the same file can be re-selected after a clear
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
    if (fileRef.current) fileRef.current.value = ''
  }

  // Send a pasted URL through /api/admin/upload for Sharp-reprocessing. Runs
  // on blur of the URL input — the user pastes, we wait until they leave the
  // field, then optimize. URLs already on Supabase Storage skip the round
  // trip server-side.
  async function handleUrlBlur() {
    const u = urlDraft.trim()
    setError(null)
    setOptimized(false)
    if (!u || u === value) return                  // no change
    if (!/^https?:\/\//i.test(u)) {                // not a URL — accept as-is
      onChange(u)
      return
    }
    if (isSupabaseUrl(u)) {                        // already optimized
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
        onChange(u)                                // fall back to raw URL
        return
      }
      onChange(json.url)
      setUrlDraft(json.url)
      setOptimized(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Optimization failed.')
      onChange(u)                                  // fall back
    } finally {
      setOptimizing(false)
    }
  }

  return (
    <div className="space-y-2">
      {/* Hidden native input */}
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
              <span className="text-xs font-semibold text-gray-600">Uploading…</span>
            </>
          ) : (
            <>
              <ImageIcon size={18} className="text-gray-400" />
              <span className="text-xs font-semibold text-gray-600">Click to upload image</span>
              <span className="text-[10px] text-gray-400">JPEG, PNG, WebP, GIF · max 15 MB</span>
            </>
          )}
        </button>
      )}

      {/* Replace / paste-URL controls (visible whenever an image is set) */}
      {value && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50/40 disabled:opacity-50"
          >
            {uploading
              ? <><RefreshCw size={12} className="animate-spin" /> Uploading…</>
              : <><Upload size={12} /> Replace</>}
          </button>
        </div>
      )}

      {/* Paste-URL fallback — pasted URLs are auto-optimized on blur.
          External URLs get downloaded, Sharp-resized to 1600px, encoded as
          WebP, and stored on Supabase. Supabase URLs are accepted as-is. */}
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
