'use client'

// ── GalleryUpload ─────────────────────────────────────────────────────────────
// Multi-photo uploader for advertiser_accounts.gallery_image_urls. Posts to
// /api/admin/upload (Sharp-resized, WebP, public Supabase Storage URL), same
// pipeline as hero and article images.
//
// Extracted from the onboarding GalleryStep so the guide listing editor can use
// the identical control. Before this, gallery photos could only be added by
// walking an advertiser through the onboarding wizard — there was no way to add
// one to an existing listing, which is most of them.
//
// Two things the onboarding version was missing and this fixes for both:
//   1. Client-side compression. Vercel caps a serverless request body at about
//      4.5 MB, so a straight-from-the-phone photo failed with an opaque error.
//      compressIfLarge is what HeroImageUpload has always used.
//   2. Per-file error reporting. The old loop stopped at the first failure and
//      said nothing about which file, so one bad image in a batch of six looked
//      like the whole upload had silently stopped.

import { useState, useEffect, useRef } from 'react'
import { Upload, X, Loader2, Image as ImageIcon, AlertTriangle } from 'lucide-react'
import { compressIfLarge } from '@/lib/admin/compress-image'

interface Props {
  value:    string[]
  onChange: (next: string[]) => void
  /** Cap on stored photos. The public listing page renders the first 4. */
  max?:     number
  disabled?: boolean
}

export function GalleryUpload({ value, onChange, max = 8, disabled = false }: Props) {
  const [list,  setList]  = useState<string[]>(value)
  const [busy,  setBusy]  = useState(false)
  const [note,  setNote]  = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // Keep in step when the parent reloads the record after a save.
  useEffect(() => { setList(value) }, [JSON.stringify(value)])  // eslint-disable-line react-hooks/exhaustive-deps

  function commit(next: string[]) {
    setList(next)
    onChange(next)
  }

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return
    setError(null); setNote(null); setBusy(true)

    const next = [...list]
    const failed: string[] = []
    let skipped = 0

    try {
      for (const file of files) {
        if (next.length >= max) { skipped++; continue }
        try {
          // Downscale before POSTing — see note at top about the body limit.
          const prepared = await compressIfLarge(file)
          const fd = new FormData()
          fd.append('file', prepared)
          fd.append('context', 'listing')
          const res = await fetch('/api/admin/upload', { method: 'POST', body: fd })
          const j   = await res.json().catch(() => ({}))
          if (!res.ok || !j?.url) { failed.push(`${file.name}: ${j?.error ?? `HTTP ${res.status}`}`); continue }
          next.push(j.url as string)
        } catch (err) {
          failed.push(`${file.name}: ${err instanceof Error ? err.message : 'upload failed'}`)
        }
      }
      // Commit whatever succeeded rather than discarding the batch.
      commit(next)
      if (failed.length) setError(`${failed.length} of ${files.length} failed — ${failed.join('; ')}`)
      if (skipped)       setNote(`${skipped} skipped: the gallery holds ${max} photos. Remove one to add more.`)
    } finally {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  function remove(i: number) { commit(list.filter((_, ix) => ix !== i)) }

  function move(i: number, dir: -1 | 1) {
    const j = i + dir
    if (j < 0 || j >= list.length) return
    const next = [...list]
    ;[next[i], next[j]] = [next[j], next[i]]
    commit(next)
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {list.map((url, i) => (
          <div key={url + i} className="relative aspect-square rounded-lg overflow-hidden border border-portal-border bg-portal-bg group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
            {/* First photo is labelled — the public gallery renders in this
                order, so position is a decision, not an accident. */}
            {i === 0 && (
              <span className="absolute top-1.5 left-1.5 text-[9px] font-bold uppercase tracking-wider bg-black/60 text-white rounded px-1.5 py-0.5">
                First
              </span>
            )}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0 || disabled}
                aria-label="Move earlier"
                className="h-7 w-7 rounded-full bg-white/95 text-portal-text text-[11px] font-bold disabled:opacity-30 mx-0.5">←</button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === list.length - 1 || disabled}
                aria-label="Move later"
                className="h-7 w-7 rounded-full bg-white/95 text-portal-text text-[11px] font-bold disabled:opacity-30 mx-0.5">→</button>
              <button type="button" onClick={() => remove(i)} disabled={disabled}
                aria-label="Remove photo"
                className="h-7 w-7 rounded-full bg-portal-red text-white mx-0.5 inline-flex items-center justify-center disabled:opacity-30">
                <X size={12} />
              </button>
            </div>
          </div>
        ))}

        {list.length < max && (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy || disabled}
            className="aspect-square rounded-lg border-2 border-dashed border-portal-border bg-portal-bg hover:bg-portal-blue-lt/40 flex flex-col items-center justify-center gap-1 text-portal-sub disabled:opacity-50"
          >
            {busy ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
            <span className="text-[11px] font-semibold">{busy ? 'Uploading…' : 'Add photos'}</span>
          </button>
        )}

        {list.length === 0 && !busy && (
          <div className="col-span-1 sm:col-span-3 aspect-square sm:aspect-auto rounded-lg border-2 border-dashed border-portal-border bg-portal-bg flex flex-col items-center justify-center text-portal-muted p-4">
            <ImageIcon size={26} className="mb-2" />
            <span className="text-[12px] font-semibold">No photos yet</span>
          </div>
        )}
      </div>

      <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={onPick} />

      {error && (
        <p className="flex items-start gap-1.5 text-[11px] text-portal-red font-semibold">
          <AlertTriangle size={12} className="shrink-0 mt-0.5" /> {error}
        </p>
      )}
      {note && <p className="text-[11px] text-portal-amber font-semibold">{note}</p>}

      <p className="text-[10px] text-portal-muted leading-relaxed">
        {list.length}/{max} photos. The listing page shows the first four, hero first.
        Hover a photo to reorder or remove it. Large files are resized before upload.
      </p>
    </div>
  )
}
