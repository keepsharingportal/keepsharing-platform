'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, RefreshCw, CheckCircle2, X, Upload, ArrowRight } from 'lucide-react'
import { SchoolTypeahead, type TypeaheadSchool } from '@/app/admin/school-news/SchoolTypeahead'
import type { Area } from '@/lib/school-news/areas'
import type { PublicSchoolOption } from './page'
import { compressIfLarge } from '@/lib/admin/compress-image'

interface Props {
  schools:           PublicSchoolOption[]
  prefilledSchoolId?: string | null
}

const MAX_BYTES   = 25 * 1024 * 1024  // 25 MB — server enforces too
const ALLOWED     = /^image\/(jpeg|jpg|png|webp|heic|heif|gif|avif)$/
const MAX_BLURB   = 600
const MAX_IMAGES  = 3

export function SubmitForm({ schools: initialSchools, prefilledSchoolId }: Props) {
  const router = useRouter()
  const schools = initialSchools.map(s => ({ ...s, area: s.area as Area })) as TypeaheadSchool[]

  const [selected,    setSelected]    = useState<TypeaheadSchool | null>(
    () => prefilledSchoolId ? schools.find(s => s.id === prefilledSchoolId) ?? null : null,
  )
  const [title,       setTitle]       = useState('')
  const [blurb,       setBlurb]       = useState('')
  const [name,        setName]        = useState('')
  const [email,       setEmail]       = useState('')
  // Up to 3 images. First is the hero (used as the feed-card cover); the
  // rest are visible in the per-bit lightbox/gallery and included in the
  // print export ZIP.
  const [images,      setImages]      = useState<File[]>([])
  const [previewUrls, setPreviewUrls] = useState<string[]>([])
  const [busy,        setBusy]        = useState(false)
  const [err,         setErr]         = useState<string | null>(null)
  const [submitted,   setSubmitted]   = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const ready = Boolean(selected && title.trim() && blurb.trim() && name.trim() && email.trim() && images.length > 0)

  function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    setErr(null)
    const incoming = Array.from(e.target.files ?? [])
    if (incoming.length === 0) return
    const slotsLeft = MAX_IMAGES - images.length
    if (slotsLeft <= 0) {
      setErr(`You can attach up to ${MAX_IMAGES} photos per bit. Remove one to add another.`)
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }
    const toAdd: File[] = []
    for (const f of incoming.slice(0, slotsLeft)) {
      if (!ALLOWED.test(f.type)) {
        setErr(`One file (${f.name}) isn't a supported image type. Use JPEG, PNG, HEIC, or WebP.`)
        continue
      }
      if (f.size > MAX_BYTES) {
        setErr(`"${f.name}" is too large (${(f.size / 1024 / 1024).toFixed(1)} MB). Max is 25 MB per photo.`)
        continue
      }
      toAdd.push(f)
    }
    if (toAdd.length === 0) return
    const newImages  = [...images,      ...toAdd]
    const newPreview = [...previewUrls, ...toAdd.map(f => URL.createObjectURL(f))]
    setImages(newImages)
    setPreviewUrls(newPreview)
    if (incoming.length > slotsLeft) {
      setErr(`Only added ${toAdd.length} — ${MAX_IMAGES} max per bit.`)
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function removeImage(idx: number) {
    const next        = images.filter((_, i) => i !== idx)
    const nextPreview = previewUrls.filter((_, i) => i !== idx)
    setImages(next)
    setPreviewUrls(nextPreview)
  }

  function moveToHero(idx: number) {
    if (idx === 0) return
    const reordered        = [images[idx],      ...images.filter((_, i) => i !== idx)]
    const reorderedPreview = [previewUrls[idx], ...previewUrls.filter((_, i) => i !== idx)]
    setImages(reordered)
    setPreviewUrls(reorderedPreview)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!ready || busy) return
    setBusy(true); setErr(null)
    try {
      // Compress each photo before building the multipart body — phone
      // camera originals are routinely 8–12 MB and Vercel caps API-route
      // bodies at ~4.5 MB total. Downscale to long-edge 3000px JPEG so
      // three photos in one submit still fit under the platform limit.
      const compressed = await Promise.all(images.map(compressIfLarge))
      const fd = new FormData()
      compressed.forEach((file, i) => {
        const key = i === 0 ? 'image' : `image${i + 1}`
        fd.append(key, file)
      })
      fd.append('school_id',          selected!.id)
      fd.append('title',              title.trim())
      fd.append('blurb',              blurb.trim())
      fd.append('submitted_by_name',  name.trim())
      fd.append('submitted_by_email', email.trim())
      fd.append('source_type',        'public_form')

      const res = await fetch('/api/school-bits/submit', { method: 'POST', body: fd })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { setErr(json?.error ?? `HTTP ${res.status}`); return }
      setSubmitted(true)
      router.refresh()
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally { setBusy(false) }
  }

  function resetForm() {
    setImages([])
    setPreviewUrls([])
    if (fileInputRef.current) fileInputRef.current.value = ''
    setSelected(null)
    setTitle(''); setBlurb(''); setName(''); setEmail('')
    setSubmitted(false); setErr(null)
  }

  if (submitted) {
    return (
      <div className="rounded-3xl border-2 border-primary/20 bg-card shadow-lg overflow-hidden text-center">
        <div className="bg-primary/5 px-6 py-10 border-b border-primary/10">
          <div className="w-16 h-16 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto mb-4 shadow-md">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-black text-foreground mb-2">Thanks — we got it!</h2>
          <p className="text-base text-muted-foreground">
            Our editor will review your submission and either approve it for publication or follow up with questions.
          </p>
        </div>
        <div className="px-6 py-6">
          <button
            type="button"
            onClick={resetForm}
            className="inline-flex items-center gap-1.5 px-5 py-2 text-sm font-bold rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Submit another <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="rounded-3xl border border-border/50 bg-card shadow-sm overflow-hidden">
      <div className="p-6 md:p-8 space-y-5">
        {/* School */}
        <div>
          <label className="block text-sm font-bold text-foreground mb-1.5">Your school *</label>
          <SchoolTypeahead
            schools={schools}
            value={selected?.id ?? null}
            onChange={setSelected}
            allowAdd={false}
            notListedNote={
              <>
                Don&apos;t see your school?{' '}
                <a href="mailto:editor@riverregionparents.com" className="text-primary hover:underline font-semibold">
                  Email editor@riverregionparents.com
                </a>{' '}
                and we&apos;ll add it.
              </>
            }
          />
        </div>

        {/* Headline */}
        <div>
          <label className="block text-sm font-bold text-foreground mb-1.5">Headline *</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g., Pine Level Elementary Named Purple Star School"
            maxLength={140}
            className="w-full px-4 py-2.5 text-base border border-border bg-background rounded-xl outline-none focus:border-primary"
            required
          />
        </div>

        {/* Blurb */}
        <div>
          <label className="block text-sm font-bold text-foreground mb-1.5">
            The story *
            <span className="ml-2 text-xs font-normal text-muted-foreground">{blurb.length}/{MAX_BLURB}</span>
          </label>
          <textarea
            value={blurb}
            onChange={e => setBlurb(e.target.value.slice(0, MAX_BLURB))}
            placeholder="2-4 sentences. Who, what, when, why it matters. You can paste from a Facebook post and we'll clean it up if needed."
            rows={5}
            className="w-full px-4 py-2.5 text-base border border-border bg-background rounded-xl outline-none focus:border-primary resize-y"
            required
          />
        </div>

        {/* Images — up to 3 */}
        <div>
          <label className="block text-sm font-bold text-foreground mb-1.5">
            Photos *
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              {images.length}/{MAX_IMAGES} added
              {images.length > 1 && ' · first one is the cover'}
            </span>
          </label>

          {images.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mb-2">
              {previewUrls.map((url, i) => (
                <div key={i} className="relative rounded-xl border-2 border-border bg-muted/40 overflow-hidden aspect-square">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                  {i === 0 && (
                    <span className="absolute top-1.5 left-1.5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest rounded-full bg-primary text-primary-foreground shadow-sm">
                      Cover
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute top-1.5 right-1.5 w-6 h-6 inline-flex items-center justify-center rounded-full bg-white/90 hover:bg-white text-rose-700 shadow-sm"
                    aria-label="Remove photo"
                  >
                    <X size={12} />
                  </button>
                  {i > 0 && (
                    <button
                      type="button"
                      onClick={() => moveToHero(i)}
                      className="absolute bottom-1.5 left-1.5 right-1.5 px-2 py-1 text-[10px] font-bold rounded bg-black/60 hover:bg-black/80 text-white"
                    >
                      Use as cover
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {images.length < MAX_IMAGES && (
            <label className="flex flex-col items-center justify-center px-6 py-8 border-2 border-dashed border-border rounded-xl bg-muted/30 cursor-pointer hover:bg-muted/40 hover:border-primary/40 transition-colors">
              <Camera className="h-7 w-7 text-muted-foreground mb-2" />
              <p className="text-sm font-semibold text-foreground">
                {images.length === 0 ? 'Click to upload — pick up to 3 photos' : 'Add another photo'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">JPEG / PNG / HEIC / WebP · up to 25 MB each</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFiles}
                className="hidden"
              />
            </label>
          )}

          <p className="text-xs text-muted-foreground mt-1.5">
            The first photo is the cover that appears on the feed. Readers see all photos when they click the bit.
            We use your originals for the print magazine and web-optimized copies for the site.
          </p>
        </div>

        {/* Submitter info */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-foreground mb-1.5">Your name *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Jane Smith"
              className="w-full px-4 py-2.5 text-base border border-border bg-background rounded-xl outline-none focus:border-primary"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-foreground mb-1.5">Your email *</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="jane@example.com"
              className="w-full px-4 py-2.5 text-base border border-border bg-background rounded-xl outline-none focus:border-primary"
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              Only used if our editor needs to follow up. Not shared or added to any list.
            </p>
          </div>
        </div>

        {err && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-800">
            {err}
          </div>
        )}
      </div>

      <div className="px-6 md:px-8 py-5 bg-muted/40 border-t border-border/50 flex items-center justify-between gap-4 flex-wrap">
        <p className="text-xs text-muted-foreground leading-relaxed flex-1 min-w-[200px]">
          By submitting, you confirm you have permission to share the photo + content.
          We may lightly edit for clarity and tone.
        </p>
        <button
          type="submit"
          disabled={!ready || busy}
          className="inline-flex items-center gap-1.5 px-6 py-3 text-base font-bold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
        >
          {busy ? <RefreshCw size={16} className="animate-spin" /> : <Upload size={16} />}
          {busy ? 'Submitting…' : 'Submit'}
        </button>
      </div>
    </form>
  )
}
