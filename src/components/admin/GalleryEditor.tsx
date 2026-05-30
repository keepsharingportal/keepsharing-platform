'use client'

// ── GalleryEditor ─────────────────────────────────────────────────────────────
// Multi-image manager for the article gallery (migration 099 → gallery_images).
//
// Each row carries: thumbnail preview, alt text input, optional caption,
// reorder controls (↑ ↓), and remove. Multi-select on the file picker so an
// editor can drop in 4–10 photos in one shot — each goes through the same
// Sharp pipeline as the hero image (/api/admin/upload).
//
// Storage shape (mirrors GalleryImage in ArticleGallery.tsx):
//   { url, thumbnail_url?, alt?, caption?, width?, height? }

import { useRef, useState } from 'react'
import {
  Upload, X, RefreshCw, ImageIcon, AlertTriangle,
  ArrowUp, ArrowDown,
} from 'lucide-react'

export interface GalleryImage {
  url:            string
  thumbnail_url?: string | null
  alt?:           string | null
  caption?:       string | null
  width?:         number | null
  height?:        number | null
}

interface Props {
  value:    GalleryImage[]
  onChange: (next: GalleryImage[]) => void
}

const MAX_IMAGES = 20

export function GalleryEditor({ value, onChange }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress]   = useState<{ done: number; total: number } | null>(null)
  const [error, setError]         = useState<string | null>(null)

  const safeValue = Array.isArray(value) ? value : []

  function patchAt(i: number, patch: Partial<GalleryImage>) {
    const next = safeValue.map((img, idx) => idx === i ? { ...img, ...patch } : img)
    onChange(next)
  }
  function removeAt(i: number) {
    onChange(safeValue.filter((_, idx) => idx !== i))
  }
  function move(i: number, dir: -1 | 1) {
    const j = i + dir
    if (j < 0 || j >= safeValue.length) return
    const next = [...safeValue]
    ;[next[i], next[j]] = [next[j], next[i]]
    onChange(next)
  }

  async function handleFiles(files: FileList) {
    setError(null)
    const list = Array.from(files)
    if (safeValue.length + list.length > MAX_IMAGES) {
      setError(`Max ${MAX_IMAGES} images per gallery. You tried to add ${list.length} on top of ${safeValue.length}.`)
      return
    }

    setUploading(true)
    setProgress({ done: 0, total: list.length })

    // Sequential uploads — keeps per-file errors visible and prevents
    // saturating Sharp on bigger drops. For 4–10 photos this is plenty fast.
    const accepted: GalleryImage[] = []
    let firstErr: string | null = null
    for (let i = 0; i < list.length; i++) {
      const f = list[i]
      try {
        const fd = new FormData()
        fd.append('file', f)
        fd.append('context', 'article')
        const res  = await fetch('/api/admin/upload', { method: 'POST', body: fd })
        const json = await res.json().catch(() => ({}))
        if (!res.ok || !json?.url) {
          firstErr ??= json?.error ?? `Upload failed for ${f.name}`
        } else {
          accepted.push({
            url:           json.url,
            thumbnail_url: json.thumbnailUrl ?? null,
            alt:           '',
            caption:       '',
            width:         json.width  ?? null,
            height:        json.height ?? null,
          })
        }
      } catch (e) {
        firstErr ??= e instanceof Error ? e.message : 'Upload failed'
      }
      setProgress({ done: i + 1, total: list.length })
    }

    if (accepted.length > 0) onChange([...safeValue, ...accepted])
    if (firstErr) setError(firstErr)
    setUploading(false)
    setProgress(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) handleFiles(e.target.files)
  }

  return (
    <div className="space-y-3">
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
        multiple
        onChange={onPick}
        className="hidden"
      />

      {/* Image list — vertical so alt + caption inputs have room to breathe */}
      {safeValue.length > 0 && (
        <ul className="space-y-2">
          {safeValue.map((img, i) => (
            <li key={`${img.url}-${i}`} className="flex gap-3 p-2.5 rounded-lg border border-gray-200 bg-white">
              {/* Thumb */}
              <div className="relative w-24 h-24 rounded-md overflow-hidden bg-gray-100 shrink-0 ring-1 ring-gray-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.thumbnail_url || img.url} alt={img.alt ?? ''} className="w-full h-full object-cover" />
                <span className="absolute top-1 left-1 text-[10px] font-bold text-white bg-black/70 rounded px-1.5 py-0.5">
                  {i + 1}
                </span>
              </div>

              {/* Fields */}
              <div className="flex-1 min-w-0 space-y-1.5">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Alt text (for screen readers + SEO)</label>
                  <input
                    type="text"
                    value={img.alt ?? ''}
                    onChange={e => patchAt(i, { alt: e.target.value })}
                    placeholder="Harper Love serving at state semifinals"
                    className="w-full px-2 py-1.5 text-xs rounded-md border border-gray-200 outline-none focus:border-blue-400 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Caption (optional, shown in lightbox)</label>
                  <input
                    type="text"
                    value={img.caption ?? ''}
                    onChange={e => patchAt(i, { caption: e.target.value })}
                    placeholder="Spring 2025 sectional semifinal"
                    className="w-full px-2 py-1.5 text-xs rounded-md border border-gray-200 outline-none focus:border-blue-400 bg-white"
                  />
                </div>
              </div>

              {/* Controls */}
              <div className="flex flex-col gap-1 shrink-0">
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0}
                  className="w-7 h-7 inline-flex items-center justify-center rounded-md bg-gray-50 hover:bg-gray-100 text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Move up">
                  <ArrowUp size={13} />
                </button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === safeValue.length - 1}
                  className="w-7 h-7 inline-flex items-center justify-center rounded-md bg-gray-50 hover:bg-gray-100 text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Move down">
                  <ArrowDown size={13} />
                </button>
                <button type="button" onClick={() => removeAt(i)}
                  className="w-7 h-7 inline-flex items-center justify-center rounded-md bg-red-50 hover:bg-red-100 text-red-600"
                  title="Remove image">
                  <X size={13} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Add button — always visible until MAX_IMAGES reached */}
      {safeValue.length < MAX_IMAGES && (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="w-full flex flex-col items-center justify-center gap-1.5 py-5 rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 hover:border-blue-300 hover:bg-blue-50/40 transition-colors disabled:opacity-50"
        >
          {uploading ? (
            <>
              <RefreshCw size={16} className="text-blue-500 animate-spin" />
              <span className="text-xs font-semibold text-gray-600">
                Uploading {progress ? `${progress.done} of ${progress.total}` : '…'}
              </span>
            </>
          ) : (
            <>
              <ImageIcon size={16} className="text-gray-400" />
              <span className="text-xs font-semibold text-gray-600">
                {safeValue.length === 0 ? 'Add photos to the gallery' : '+ Add more photos'}
              </span>
              <span className="text-[10px] text-gray-400">Multi-select supported · JPEG, PNG, WebP · max 15 MB each</span>
            </>
          )}
        </button>
      )}

      {safeValue.length >= MAX_IMAGES && (
        <p className="text-xs text-gray-500 italic">Gallery cap reached ({MAX_IMAGES} images). Remove one to add another.</p>
      )}

      {error && (
        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-red-50 border border-red-200">
          <AlertTriangle size={13} className="text-red-500 shrink-0 mt-0.5" />
          <p className="text-[11px] text-red-700 leading-relaxed">{error}</p>
        </div>
      )}

      {/* Helper text — explains how this fits with the body editor */}
      <p className="text-[11px] text-gray-500 leading-relaxed">
        Gallery photos appear in a grid below the article body and pop up in a branded lightbox when clicked.
        Use this for supporting photos that don&apos;t need to live inside the story — the rich text editor still handles inline images that wrap with the prose.
      </p>
    </div>
  )
}
