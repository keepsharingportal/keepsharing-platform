'use client'

// Onboarding Step — Photo Gallery
// advertiser_accounts.gallery_image_urls TEXT[] of public Supabase
// Storage URLs. We upload via the existing /api/admin/upload endpoint,
// which is Sharp-resized + cached. Drag-to-reorder + delete supported.

import { useState, useEffect, useRef } from 'react'
import { Upload, X, Loader2, Image as ImageIcon } from 'lucide-react'

type Advertiser = Record<string, unknown> & {
  gallery_image_urls?: string[] | null
}

interface Props {
  advertiser: Advertiser
  onSave:     (patch: Partial<Advertiser>) => void
}

const MAX = 8

export function GalleryStep({ advertiser, onSave }: Props) {
  const initial = (advertiser.gallery_image_urls ?? []) as string[]
  const [list, setList]     = useState<string[]>(initial)
  const [busy, setBusy]     = useState(false)
  const [error, setError]   = useState<string | null>(null)
  const fileRef             = useRef<HTMLInputElement>(null)
  useEffect(() => setList(initial), [JSON.stringify(initial)]) // eslint-disable-line react-hooks/exhaustive-deps

  function commit(next: string[]) {
    setList(next)
    onSave({ gallery_image_urls: next })
  }

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return
    setError(null); setBusy(true)
    const next = [...list]
    try {
      for (const f of files) {
        if (next.length >= MAX) { setError(`Gallery caps at ${MAX} photos — remove one to add more.`); break }
        const fd = new FormData()
        fd.append('file', f)
        fd.append('context', 'asset')
        const res = await fetch('/api/admin/upload', { method: 'POST', body: fd })
        const j = await res.json().catch(() => ({}))
        if (!res.ok || !j?.url) {
          setError(j?.error ?? `Upload failed (${res.status})`)
          break
        }
        next.push(j.url)
      }
      commit(next)
    } finally {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  function remove(i: number) {
    commit(list.filter((_, ix) => ix !== i))
  }

  function move(i: number, dir: -1 | 1) {
    const j = i + dir
    if (j < 0 || j >= list.length) return
    const next = [...list]
    ;[next[i], next[j]] = [next[j], next[i]]
    commit(next)
  }

  return (
    <div className="space-y-5">
      <header>
        <h2 className="text-[20px] font-bold text-portal-text">Photo gallery</h2>
        <p className="text-[12px] text-portal-sub mt-1">
          Up to {MAX} photos that show what your space / experience feels like.
          The hero (Step 3) is the headline; these support it.
        </p>
      </header>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {list.map((url, i) => (
          <div key={url + i} className="relative aspect-square rounded-lg overflow-hidden border border-portal-border bg-portal-bg group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0}
                className="h-7 w-7 rounded-full bg-white/95 text-portal-text text-[11px] font-bold disabled:opacity-30 mx-0.5">←</button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === list.length - 1}
                className="h-7 w-7 rounded-full bg-white/95 text-portal-text text-[11px] font-bold disabled:opacity-30 mx-0.5">→</button>
              <button type="button" onClick={() => remove(i)}
                className="h-7 w-7 rounded-full bg-portal-red text-white mx-0.5 inline-flex items-center justify-center">
                <X size={12} />
              </button>
            </div>
          </div>
        ))}
        {list.length < MAX && (
          <button type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="aspect-square rounded-lg border-2 border-dashed border-portal-border-2 bg-portal-bg hover:bg-portal-blue-lt/40 flex flex-col items-center justify-center gap-1 text-portal-sub disabled:opacity-50"
          >
            {busy ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
            <span className="text-[11px] font-semibold">{busy ? 'Uploading…' : 'Add photo'}</span>
          </button>
        )}
        {list.length === 0 && !busy && (
          <div className="col-span-3 aspect-square rounded-lg border-2 border-dashed border-portal-border bg-portal-bg flex flex-col items-center justify-center text-portal-muted">
            <ImageIcon size={28} className="mb-2" />
            <span className="text-[12px] font-semibold">No photos yet</span>
          </div>
        )}
      </div>

      <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={onPick} />

      {error && (
        <div className="text-[11px] text-portal-red">{error}</div>
      )}

      <p className="text-[10px] text-portal-muted leading-relaxed">
        {list.length}/{MAX} photos. Drag-to-reorder coming soon; for now use the hover arrows.
      </p>
    </div>
  )
}
