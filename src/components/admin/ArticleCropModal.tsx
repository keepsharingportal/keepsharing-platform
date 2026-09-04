'use client'

// ── ArticleCropModal ──────────────────────────────────────────────────────────
// Interactive cropper for article hero (16:9) + profile (1:1) images.
//
// The 9-direction GravityPicker only nudges *which* part of the original
// Sharp uses for its cover-crop — it doesn't change the zoom level. So when
// the subject is too far away in the source (long shot of an athlete on the
// court), gravity buttons can't fix it.
//
// This modal solves that by letting an editor draw a tight crop box on the
// real source. The box reports its position + size as fractions of the
// displayed image, the server applies those fractions to the actual original
// (which can be 3000+px), extracts that region, and resizes to the target
// shape (800×800 profile / 1600×900 hero).
//
// UX:
//   - Drag the box to pan
//   - Drag the SE corner handle to resize (aspect-locked)
//   - Wheel / pinch over the image also zooms toward cursor (nice-to-have)
//   - Apply sends the region to /recrop-{hero|profile}
//
// No external dependencies — plain pointer events + CSS.

import { useEffect, useRef, useState } from 'react'
import { X, RefreshCw, Check, Crop } from 'lucide-react'

interface Props {
  articleId:    string
  type:         'hero' | 'profile'
  /**
   * Which record the id belongs to. Listings crop to the same 16:9 as an
   * article hero but live in advertiser_accounts behind their own routes, so
   * the entity has to be explicit rather than inferred from `type`.
   */
  entity?:      'article' | 'advertiser'
  /**
   * The image the editor currently has selected, which may not be saved to
   * the row yet. Without it the modal asks the server for an image the server
   * has never heard of and shows 'Could not load the saved original'.
   */
  srcUrl?:      string | null
  origPath?:    string | null
  /** Called with the new public URL on success so the parent can update its preview + form. */
  onApply:      (newUrl: string) => void
  onClose:      () => void
}

interface Box {
  x: number   // top-left, in displayed image pixels
  y: number
  w: number   // box size in displayed pixels (aspect-locked)
  h: number
}

const ASPECT = { hero: 16 / 9, profile: 1 } as const

export function ArticleCropModal({ articleId, type, entity = 'article', srcUrl, origPath, onApply, onClose }: Props) {
  // Base path for both the source-image GET and the re-crop POST.
  const apiBase = entity === 'advertiser'
    ? `/api/admin/advertisers/${articleId}`
    : `/api/admin/articles/${articleId}`
  const imgRef       = useRef<HTMLImageElement | null>(null)
  const containerRef = useRef<HTMLDivElement  | null>(null)

  // Source image — fetched from the private bucket via our admin endpoint.
  // `?t=` cache-busts when the modal reopens after a save.
  // Tell the server what we're looking at, so an unsaved pick still loads.
  const sourceQs = new URLSearchParams({ type })
  if (srcUrl)   sourceQs.set('src', srcUrl)
  if (origPath) sourceQs.set('origPath', origPath)
  const imageUrl = `${apiBase}/original-image?${sourceQs.toString()}`

  const [imageReady, setImageReady] = useState(false)
  const [imageError, setImageError] = useState<string | null>(null)
  const [displayW, setDisplayW]     = useState(0)
  const [displayH, setDisplayH]     = useState(0)

  const [box, setBox] = useState<Box>({ x: 0, y: 0, w: 0, h: 0 })

  const [applying, setApplying]     = useState(false)
  const [applyError, setApplyError] = useState<string | null>(null)

  // Drag / resize state tracking. Refs because we don't want re-renders on
  // every pointermove.
  const dragRef = useRef<{
    mode:    'pan' | 'resize' | null
    startX:  number
    startY:  number
    boxAtStart: Box
  }>({ mode: null, startX: 0, startY: 0, boxAtStart: box })

  // Initialize the crop box once the image has loaded — center it, sized to
  // ~70% of the smaller axis. Gives users a sane starting point that they
  // can tighten.
  useEffect(() => {
    if (!imageReady) return
    const img = imgRef.current
    if (!img) return
    const W = img.clientWidth
    const H = img.clientHeight
    setDisplayW(W)
    setDisplayH(H)
    const aspect = ASPECT[type]
    let w = Math.min(W, H * aspect) * 0.7
    let h = w / aspect
    // Center
    const x = (W - w) / 2
    const y = (H - h) / 2
    setBox({ x, y, w, h })
  }, [imageReady, type])

  // ── Pointer event handlers ──────────────────────────────────────────────
  function onPointerDown(e: React.PointerEvent, mode: 'pan' | 'resize') {
    e.preventDefault()
    e.stopPropagation()
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    dragRef.current = {
      mode,
      startX:     e.clientX,
      startY:     e.clientY,
      boxAtStart: box,
    }
  }

  function onPointerMove(e: React.PointerEvent) {
    const d = dragRef.current
    if (!d.mode) return
    const dx = e.clientX - d.startX
    const dy = e.clientY - d.startY
    const aspect = ASPECT[type]

    if (d.mode === 'pan') {
      const nx = Math.max(0, Math.min(displayW - d.boxAtStart.w, d.boxAtStart.x + dx))
      const ny = Math.max(0, Math.min(displayH - d.boxAtStart.h, d.boxAtStart.y + dy))
      setBox({ x: nx, y: ny, w: d.boxAtStart.w, h: d.boxAtStart.h })
    } else {
      // Resize from SE corner — keep aspect by using the largest of the two
      // deltas. Clamp to the displayed image bounds and a 40px floor.
      const proposedW = Math.max(40, d.boxAtStart.w + dx)
      const proposedH = Math.max(40 / aspect, d.boxAtStart.h + dy)
      const useW = proposedW > proposedH * aspect ? proposedW : proposedH * aspect
      const useH = useW / aspect
      const maxW = displayW - d.boxAtStart.x
      const maxH = displayH - d.boxAtStart.y
      let finalW = Math.min(useW, maxW)
      let finalH = finalW / aspect
      if (finalH > maxH) {
        finalH = maxH
        finalW = finalH * aspect
      }
      setBox({ x: d.boxAtStart.x, y: d.boxAtStart.y, w: finalW, h: finalH })
    }
  }

  function onPointerUp(e: React.PointerEvent) {
    dragRef.current.mode = null
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId) } catch { /* noop */ }
  }

  // ── Apply ───────────────────────────────────────────────────────────────
  async function apply() {
    if (!displayW || !displayH) return
    setApplying(true)
    setApplyError(null)

    // Convert box → percentage coords of the displayed image. Server applies
    // these to the actual original (possibly much larger) for the extract.
    const region = type === 'profile'
      ? { x: box.x / displayW, y: box.y / displayH, size: box.w / displayW }
      : { x: box.x / displayW, y: box.y / displayH, w: box.w / displayW, h: box.h / displayH }

    try {
      const endpoint = type === 'profile' ? 'recrop-profile' : 'recrop-hero'
      const urlKey   = entity === 'advertiser'
        ? 'hero_photo_url'
        : type === 'profile' ? 'profile_image_url' : 'hero_image_url'
      const res  = await fetch(`${apiBase}/${endpoint}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ region, src: srcUrl ?? undefined, origPath: origPath ?? undefined }),
      })
      const json   = await res.json().catch(() => ({}))
      const newUrl = json?.[urlKey] as string | undefined
      if (!res.ok || !newUrl) {
        setApplyError(json?.error ?? `Apply failed (${res.status})`)
        return
      }
      onApply(`${newUrl}?t=${Date.now()}`)
      onClose()
    } catch (e) {
      setApplyError(e instanceof Error ? e.message : 'Apply failed')
    } finally {
      setApplying(false)
    }
  }

  // Escape closes
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handler)
      document.body.style.overflow = prev
    }
  }, [onClose])

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-[100] bg-black/85 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-lg shadow-md w-full max-w-3xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-portal-border">
          <div className="flex items-center gap-2">
            <Crop size={16} className="text-portal-blue" />
            <h3 className="text-sm font-bold text-portal-text">
              Zoom &amp; adjust — {type === 'profile' ? 'Profile (1:1)' : 'Hero (16:9)'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 hover:bg-portal-row-hover transition-colors"
            aria-label="Close cropper"
          >
            <X size={16} />
          </button>
        </div>

        {/* Image stage */}
        <div
          ref={containerRef}
          className="relative bg-portal-bg flex items-center justify-center p-4 select-none"
          style={{ minHeight: 320 }}
        >
          {imageError && (
            <p className="text-sm text-red-700 py-12">{imageError}</p>
          )}

          {!imageError && (
            <div className="relative inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                ref={imgRef}
                src={imageUrl}
                alt="Crop source"
                className="block max-h-[60vh] max-w-full"
                onLoad={() => setImageReady(true)}
                onError={() => setImageError('Could not load the saved original. Re-upload the image and try again.')}
                draggable={false}
              />

              {imageReady && box.w > 0 && (
                <>
                  {/* Darkened "outside" using 4 absolute overlays. Avoids
                       trying to maintain a single complex backdrop with cutouts. */}
                  <div className="absolute top-0 left-0 right-0 bg-black/60 pointer-events-none" style={{ height: box.y }} />
                  <div className="absolute left-0 right-0 bottom-0 bg-black/60 pointer-events-none" style={{ top: box.y + box.h }} />
                  <div className="absolute bg-black/60 pointer-events-none" style={{ top: box.y, left: 0, width: box.x, height: box.h }} />
                  <div className="absolute bg-black/60 pointer-events-none" style={{ top: box.y, left: box.x + box.w, right: 0, height: box.h }} />

                  {/* The crop box — draggable to pan */}
                  <div
                    onPointerDown={(e) => onPointerDown(e, 'pan')}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    onPointerCancel={onPointerUp}
                    className="absolute border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.6)] cursor-move touch-none"
                    style={{ left: box.x, top: box.y, width: box.w, height: box.h }}
                  >
                    {/* Rule-of-thirds guide lines for framing */}
                    <div className="absolute inset-0 pointer-events-none">
                      <div className="absolute top-0 bottom-0 border-l border-white/30" style={{ left: '33.33%' }} />
                      <div className="absolute top-0 bottom-0 border-l border-white/30" style={{ left: '66.66%' }} />
                      <div className="absolute left-0 right-0 border-t border-white/30" style={{ top: '33.33%' }} />
                      <div className="absolute left-0 right-0 border-t border-white/30" style={{ top: '66.66%' }} />
                    </div>

                    {/* SE corner resize handle */}
                    <div
                      onPointerDown={(e) => onPointerDown(e, 'resize')}
                      onPointerMove={onPointerMove}
                      onPointerUp={onPointerUp}
                      onPointerCancel={onPointerUp}
                      className="absolute -right-1.5 -bottom-1.5 w-4 h-4 rounded-sm bg-white border border-gray-800 cursor-se-resize touch-none"
                      title="Drag to resize (aspect locked)"
                    />
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-portal-border bg-portal-bg">
          <p className="text-[11px] text-portal-sub leading-snug max-w-[60%]">
            Drag the box to pan · drag the corner to resize · aspect locked to {type === 'profile' ? '1:1' : '16:9'}.
            {applyError && (
              <span className="block text-portal-red mt-1">{applyError}</span>
            )}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={applying}
              className="px-3 py-1.5 text-xs font-semibold text-portal-text bg-white border border-portal-border rounded-lg hover:bg-portal-bg disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={apply}
              disabled={applying || !imageReady || box.w === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-portal-navy rounded-lg hover:opacity-90 disabled:opacity-50"
            >
              {applying
                ? <><RefreshCw size={12} className="animate-spin" /> Cropping…</>
                : <><Check size={12} /> Apply crop</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
