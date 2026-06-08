'use client'

// Lightbox modal for viewing School Bits in full-screen.
//
// Design intent: feels like a magazine spread, not a black overlay.
// The bit content lives inside a "page" card (light background, rounded
// corners, soft shadow) floating on a darker gallery-wall backdrop. Card
// holds the branded header, the framed image, the caption, and the
// thumbnail strip. Prev/next BIT nav sits OUTSIDE the card on the
// backdrop edges so it feels like flipping between mounted prints.
//
// Keyboard: Esc closes. ←/→ navigate photos within the current bit.
//           [ / ] navigate between bits.

import { useEffect, useState, useCallback } from 'react'
import Image from 'next/image'
import { X, ChevronLeft, ChevronRight, Camera } from 'lucide-react'
import { splitBlurbParagraphs, normalizeUnicodeText } from '@/lib/school-news/text'
import { trackBitClick } from '@/lib/school-bits/track'
import { SchoolBitsLogo } from '@/components/school-zone/SchoolBitsLogo'
import { ShareRow } from '@/components/ShareRow'

interface BitImage {
  position:  number
  is_hero:   boolean
  web_url:   string
  card_url:  string | null
  width:     number | null
  height:    number | null
}

/** Subset of PublicSchoolBit fields the lightbox needs. Loosened so the
 *  lightbox doesn't depend on the page module. */
export interface LightboxBit {
  id:           string
  school_name:  string
  title:        string
  blurb:        string
  published_at: string | null
  created_at:   string
}

interface Props {
  bits:           LightboxBit[]
  /** Index into `bits` for the open bit. null = closed. */
  index:          number | null
  onClose:        () => void
  onIndexChange:  (next: number) => void
  /** Build the absolute share URL for a given bit id. Optional — when
   *  omitted, the share button is hidden. */
  buildShareUrl?: (bitId: string) => string
}

export function SchoolBitLightbox({ bits, index, onClose, onIndexChange, buildShareUrl }: Props) {
  const [images, setImages]       = useState<BitImage[] | null>(null)
  const [photoIdx, setPhotoIdx]   = useState(0)
  const [loading,  setLoading]    = useState(false)

  const bit   = index !== null ? bits[index] ?? null : null
  const bitId = bit?.id ?? null
  const isOpen = bitId !== null

  useEffect(() => {
    if (!bitId) { setImages(null); setPhotoIdx(0); return }
    setImages(null)
    setPhotoIdx(0)
    setLoading(true)
    // Track this open. trackBitClick dedupes per-session so paging next →
    // prev → next on the same bit only counts once.
    trackBitClick(bitId)
    fetch(`/api/school-bits/${bitId}/images`)
      .then(r => r.ok ? r.json() : { images: [] })
      .then(json => setImages((json.images ?? []) as BitImage[]))
      .catch(() => setImages([]))
      .finally(() => setLoading(false))
  }, [bitId])

  const canPrevBit = index !== null && index > 0
  const canNextBit = index !== null && index < bits.length - 1
  const gotoPrevBit = useCallback(() => { if (canPrevBit) onIndexChange(index! - 1) }, [canPrevBit, index, onIndexChange])
  const gotoNextBit = useCallback(() => { if (canNextBit) onIndexChange(index! + 1) }, [canNextBit, index, onIndexChange])

  const handleKey = useCallback((e: KeyboardEvent) => {
    if (!isOpen) return
    if (e.key === 'Escape')     { onClose(); return }
    if (e.key === 'ArrowRight') setPhotoIdx(i => images ? Math.min(i + 1, images.length - 1) : i)
    if (e.key === 'ArrowLeft')  setPhotoIdx(i => Math.max(i - 1, 0))
    if (e.key === ']')          gotoNextBit()
    if (e.key === '[')          gotoPrevBit()
  }, [isOpen, images, onClose, gotoNextBit, gotoPrevBit])

  useEffect(() => {
    if (!isOpen) return
    window.addEventListener('keydown', handleKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [isOpen, handleKey])

  if (!isOpen || !bit) return null

  const active = images && images.length > 0 ? images[photoIdx] : null
  const total  = images?.length ?? 0
  const dateLabel = (() => {
    const iso = bit.published_at ?? bit.created_at
    return iso
      ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : null
  })()
  const paragraphs = splitBlurbParagraphs(bit.blurb)

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      // Gallery-wall backdrop — neutral-900 with a faint dotted pattern so it
      // doesn't read as a flat overlay. The card "page" floats on top.
      className="fixed inset-0 z-50 bg-neutral-900/95 flex items-center justify-center p-3 md:p-8 overflow-y-auto"
      style={{
        backgroundImage:
          'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.04) 1px, transparent 0)',
        backgroundSize: '24px 24px',
      }}
    >
      {/* ── CARD + ATTACHED NAV ──
            Wrap the card and the prev/next BIT buttons in one relative
            container sized to the card. That way the buttons hug the card
            edges on any screen size — close on a wide monitor, snug to
            the card on mobile. Labels appear on desktop; mobile shows
            icon-only with sr-only labels. */}
      <div className="relative w-full max-w-4xl my-auto">

        {canPrevBit && (
          <button
            type="button"
            onClick={e => { e.stopPropagation(); gotoPrevBit() }}
            // Mobile: sits at the card's left edge inside the image area
            // (image has its own padding so the overlap reads as deliberate).
            // Desktop: pushed OUTSIDE the card with a pill-shaped label.
            className="absolute top-1/2 -translate-y-1/2 z-20
                       left-2 md:-left-3 md:-translate-x-full
                       inline-flex items-center gap-2
                       rounded-full bg-white hover:bg-white text-foreground
                       shadow-lg border border-border/40
                       transition-all hover:scale-105
                       px-3 py-3 md:pl-4 md:pr-5 md:py-3"
            aria-label="Previous School Bit"
          >
            <ChevronLeft className="h-5 w-5 md:h-5 md:w-5 text-primary" />
            <span className="sr-only md:not-sr-only md:inline text-[10px] font-bold uppercase tracking-[0.15em] leading-none">
              Previous<br/>School Bit
            </span>
          </button>
        )}

        {canNextBit && (
          <button
            type="button"
            onClick={e => { e.stopPropagation(); gotoNextBit() }}
            className="absolute top-1/2 -translate-y-1/2 z-20
                       right-2 md:-right-3 md:translate-x-full
                       inline-flex items-center gap-2
                       rounded-full bg-white hover:bg-white text-foreground
                       shadow-lg border border-border/40
                       transition-all hover:scale-105
                       px-3 py-3 md:pl-5 md:pr-4 md:py-3"
            aria-label="Next School Bit"
          >
            <span className="sr-only md:not-sr-only md:inline text-[10px] font-bold uppercase tracking-[0.15em] leading-none text-right">
              Next<br/>School Bit
            </span>
            <ChevronRight className="h-5 w-5 md:h-5 md:w-5 text-primary" />
          </button>
        )}

      {/* ── THE CARD — the actual "page". Stopping click-through here means
            the backdrop is the only place a click closes the modal. */}
      <article
        onClick={e => e.stopPropagation()}
        className="relative bg-card rounded-3xl shadow-2xl w-full overflow-hidden border border-white/10"
      >
        {/* Card header — publication eyebrow + SchoolBits logo, position
             chip, close X. All on the light card surface so the brand
             colors look like themselves. */}
        <header className="flex items-center justify-between gap-3 px-5 md:px-7 py-4 border-b border-border/50">
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] md:text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground leading-none mb-1.5">
              River Region <span className="text-primary">Parents</span>
            </span>
            <SchoolBitsLogo size="md" />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {buildShareUrl && (
              <ShareRow
                url={buildShareUrl(bit.id)}
                title={normalizeUnicodeText(bit.title)}
                text={`${bit.school_name} — on River Region Parents`}
                size="compact"
              />
            )}
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-full bg-muted text-muted-foreground">
              {index! + 1} of {bits.length}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 inline-flex items-center justify-center rounded-full bg-muted hover:bg-muted/70 text-foreground"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* Image plate — soft inset frame so the image has structure
             instead of bleeding to the card edges. */}
        <div className="px-5 md:px-7 pt-5 md:pt-6">
          <div className="relative rounded-2xl overflow-hidden bg-muted/40 ring-1 ring-border/40 flex items-center justify-center min-h-[200px]">
            {loading ? (
              <p className="text-muted-foreground text-sm py-20">Loading…</p>
            ) : active ? (
              <>
                <Image
                  src={active.web_url}
                  alt={bit.title}
                  width={active.width  ?? 1200}
                  height={active.height ?? 800}
                  className="max-h-[55vh] w-auto h-auto object-contain"
                  priority
                />

                {/* Within-bit photo nav (only when this bit has multiple photos) */}
                {total > 1 && (
                  <>
                    {photoIdx > 0 && (
                      <button
                        type="button"
                        onClick={() => setPhotoIdx(i => i - 1)}
                        className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 inline-flex items-center justify-center rounded-full bg-black/55 hover:bg-black/75 text-white"
                        aria-label="Previous photo"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                    )}
                    {photoIdx < total - 1 && (
                      <button
                        type="button"
                        onClick={() => setPhotoIdx(i => i + 1)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 inline-flex items-center justify-center rounded-full bg-black/55 hover:bg-black/75 text-white"
                        aria-label="Next photo"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    )}
                  </>
                )}
              </>
            ) : (
              <div className="text-center text-muted-foreground py-16">
                <Camera className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No photos for this bit.</p>
              </div>
            )}
          </div>
        </div>

        {/* Caption — structured editorial block. Tracked eyebrow line, big
             serif title, hairline divider, paragraphs. Treats the content
             like the inside of a printed page. */}
        <div className="px-5 md:px-7 py-5 md:py-7">
          <p className="text-[10px] md:text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground mb-2 flex items-center gap-2 flex-wrap">
            <span className="text-foreground">{bit.school_name}</span>
            {dateLabel && (
              <>
                <span className="text-muted-foreground/40">•</span>
                <span>{dateLabel}</span>
              </>
            )}
          </p>
          <h2 className="font-serif text-2xl md:text-3xl font-black text-foreground leading-tight mb-3">
            {normalizeUnicodeText(bit.title)}
          </h2>
          <div className="h-px bg-border/60 mb-4" />
          {paragraphs.length > 0 && (
            <div className="text-sm md:text-base text-foreground/85 leading-relaxed space-y-3 max-h-[28vh] overflow-y-auto pr-1">
              {paragraphs.map((p, i) => <p key={i}>{p}</p>)}
            </div>
          )}

          {/* Thumbnail strip */}
          {total > 1 && (
            <div className="mt-5 flex items-center gap-2 flex-wrap pt-4 border-t border-border/40">
              {images!.map((img, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setPhotoIdx(i)}
                  className={`relative w-14 h-14 rounded-lg overflow-hidden border-2 ring-1 ring-border/40 ${
                    i === photoIdx ? 'border-primary' : 'border-transparent opacity-65 hover:opacity-100'
                  }`}
                  aria-label={`Photo ${i + 1}`}
                >
                  <Image src={img.card_url ?? img.web_url} alt="" fill className="object-cover" sizes="56px" />
                </button>
              ))}
              <span className="text-[11px] text-muted-foreground ml-1">{photoIdx + 1} / {total}</span>
            </div>
          )}

        </div>
      </article>
      </div>{/* /relative wrapper around card + nav */}
    </div>
  )
}
