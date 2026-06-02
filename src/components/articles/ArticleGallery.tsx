'use client'

import { useEffect, useState, useCallback } from 'react'
import Image from 'next/image'
import { X, ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react'
import { buildLightboxEyebrow } from '@/lib/articles/column-brand'

// Matches the JSONB shape from migration 099. All non-url fields are
// optional so the renderer survives partial admin entries.
export interface GalleryImage {
  url:            string
  thumbnail_url?: string | null
  alt?:           string | null
  caption?:       string | null
  width?:         number | null
  height?:        number | null
}

interface Props {
  images:           GalleryImage[]
  columnSlug:       string | null
  /** Right-side of the eyebrow for Play Ball ("PLAYER SPOTLIGHT" etc).
   *  Ignored when columnLogoUrl is set — the lightbox shows the logo
   *  image instead of the text eyebrow in that case. */
  spotlightEyebrow?: string | null
  /** Optional column-branded header override. When provided, replaces
   *  the default "Photo Gallery" h3 with an eyebrow + title pair so
   *  feature pages (e.g. Grands "Family Moments / The memories they're
   *  making") can frame the gallery in their own voice. */
  headerEyebrow?:   string | null
  headerTitle?:     string | null
  /** Custom color for the eyebrow text. Defaults to muted-foreground. */
  headerEyebrowColor?: string | null
  /** Column branding logo. When present, the lightbox header renders the
   *  logo IMAGE instead of the "BRAND | EYEBROW" text pair — cleaner
   *  branding and avoids generic / misleading labels like "WINNER". */
  columnLogoUrl?:   string | null
}

// ── Public component ─────────────────────────────────────────────────────────
//
// Renders the gallery grid below the article body. Only shows up when there
// are 2+ images — a single supporting photo should be a hero replacement,
// not a 1-cell gallery.

export function ArticleGallery({
  images, columnSlug, spotlightEyebrow,
  headerEyebrow, headerTitle, headerEyebrowColor,
  columnLogoUrl,
}: Props) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const valid = images.filter(img => !!img?.url)
  if (valid.length < 2) return null

  const brand = buildLightboxEyebrow(columnSlug, spotlightEyebrow)

  // Show the first 4 thumbs. If there are more, overlay "+N more" on the 4th.
  const visible = valid.slice(0, 4)
  const overflow = Math.max(0, valid.length - 4)

  return (
    <>
      {/* Tight top spacing so the gallery reads as a continuation of the
          article body, not a new section. Previously had mt-12 + pt-8 +
          border-t, which made it feel like a teaser block belonging to a
          different article. */}
      <section className="mt-6" aria-label="Photo gallery">
        <div className="flex items-end justify-between mb-4 gap-4">
          {headerEyebrow || headerTitle ? (
            <div className="min-w-0">
              {headerEyebrow && (
                <p
                  className="text-xs font-black uppercase tracking-[0.18em]"
                  style={{ color: headerEyebrowColor ?? '#6F2C8F' }}
                >
                  {headerEyebrow}
                </p>
              )}
              {headerTitle && (
                <h3 className="font-serif text-2xl font-bold text-[#08264A] leading-tight">
                  {headerTitle}
                </h3>
              )}
            </div>
          ) : (
            <h3 className="text-lg md:text-xl font-bold tracking-wide uppercase text-foreground">
              Photo Gallery
            </h3>
          )}
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {valid.length} photo{valid.length === 1 ? '' : 's'} · tap to expand
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
          {visible.map((img, i) => {
            const isLast = i === visible.length - 1 && overflow > 0
            return (
              <button
                key={i}
                type="button"
                onClick={() => setOpenIndex(i)}
                className="group relative aspect-square overflow-hidden rounded-lg bg-muted ring-1 ring-border/50 hover:ring-foreground/30 transition-all"
                aria-label={`Open photo ${i + 1} of ${valid.length}`}
              >
                <Image
                  src={img.thumbnail_url || img.url}
                  alt={img.alt ?? ''}
                  fill
                  sizes="(max-width: 768px) 50vw, 25vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                  unoptimized
                />
                {/* Zoom hint on hover */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                  <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                </div>
                {/* "+N more" overlay on the last visible tile if we're truncating */}
                {isLast && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center pointer-events-none">
                    <span className="text-white text-2xl md:text-3xl font-black">+{overflow}</span>
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </section>

      {openIndex !== null && (
        <ArticleGalleryLightbox
          images={valid}
          startIndex={openIndex}
          onClose={() => setOpenIndex(null)}
          brand={{ ...brand, logoUrl: columnLogoUrl ?? null }}
        />
      )}
    </>
  )
}

// ── Lightbox ─────────────────────────────────────────────────────────────────

interface LightboxProps {
  images:     GalleryImage[]
  startIndex: number
  onClose:    () => void
  brand:      {
    primary: string
    accent:  string
    left:    string
    right:   string | null
    /** When present, replaces the BRAND | EYEBROW text with the logo image. */
    logoUrl: string | null
  }
}

function ArticleGalleryLightbox({ images, startIndex, onClose, brand }: LightboxProps) {
  const [index, setIndex] = useState(startIndex)

  const next = useCallback(() => setIndex(i => (i + 1) % images.length), [images.length])
  const prev = useCallback(() => setIndex(i => (i - 1 + images.length) % images.length), [images.length])

  // Keyboard + body scroll lock. Esc closes, arrows navigate.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowRight') next()
      else if (e.key === 'ArrowLeft') prev()
    }
    window.addEventListener('keydown', handler)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handler)
      document.body.style.overflow = prevOverflow
    }
  }, [onClose, next, prev])

  // Touch swipe support — captures horizontal drags > 50px as next/prev.
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const onTouchStart = (e: React.TouchEvent) => setTouchStart(e.touches[0].clientX)
  const onTouchEnd   = (e: React.TouchEvent) => {
    if (touchStart === null) return
    const delta = e.changedTouches[0].clientX - touchStart
    if (Math.abs(delta) > 50) (delta < 0 ? next : prev)()
    setTouchStart(null)
  }

  const img = images[index]

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/95 flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-label="Photo gallery"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Branded header — site brand line + section eyebrow + counter + close */}
      <div
        className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4 text-white"
        style={{ backgroundColor: brand.primary }}
      >
        <div className="flex items-center gap-3 min-w-0">
          {brand.logoUrl ? (
            // Logo image — replaces the "BRAND | EYEBROW" text pair when
            // the column has uploaded a branded wordmark. Looks cleaner
            // and avoids generic / misleading labels like "WINNER" on
            // columns where the subject isn't a contest winner (Grands,
            // Mom to Mom).
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={brand.logoUrl}
              alt={brand.left}
              className="h-8 md:h-10 w-auto max-w-[260px] object-contain"
            />
          ) : (
            <>
              <span className="text-xs md:text-sm font-black uppercase tracking-[0.16em] truncate">
                {brand.left}
              </span>
              {brand.right && (
                <>
                  <span className="text-base" style={{ color: brand.accent }}>|</span>
                  <span className="text-xs md:text-sm font-black uppercase tracking-[0.16em] truncate" style={{ color: brand.accent }}>
                    {brand.right}
                  </span>
                </>
              )}
            </>
          )}
        </div>

        <div className="flex items-center gap-4 md:gap-6 shrink-0">
          <span className="text-xs md:text-sm font-semibold tabular-nums opacity-80">
            {index + 1} of {images.length}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 hover:bg-white/15 transition-colors"
            aria-label="Close gallery"
          >
            <X className="w-5 h-5 md:w-6 md:h-6" />
          </button>
        </div>
      </div>

      {/* Image stage — image centered, with side arrow controls. */}
      <div
        className="flex-1 flex items-center justify-center relative px-2 md:px-12 py-4"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {images.length > 1 && (
          <button
            type="button"
            onClick={prev}
            className="absolute left-2 md:left-6 top-1/2 -translate-y-1/2 z-10 rounded-full bg-white/10 hover:bg-white/20 text-white p-2 md:p-3 transition-colors"
            aria-label="Previous photo"
          >
            <ChevronLeft className="w-6 h-6 md:w-7 md:h-7" />
          </button>
        )}

        <div className="relative max-h-full max-w-full flex items-center justify-center">
          {/* Plain <img> so the browser shows the natural aspect ratio without
              the Next/Image fill wrapper constraints. unoptimized URLs are
              already WebP-optimized by our pipeline. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={img.url}
            src={img.url}
            alt={img.alt ?? ''}
            className="max-h-[75vh] md:max-h-[80vh] max-w-full object-contain"
          />
        </div>

        {images.length > 1 && (
          <button
            type="button"
            onClick={next}
            className="absolute right-2 md:right-6 top-1/2 -translate-y-1/2 z-10 rounded-full bg-white/10 hover:bg-white/20 text-white p-2 md:p-3 transition-colors"
            aria-label="Next photo"
          >
            <ChevronRight className="w-6 h-6 md:w-7 md:h-7" />
          </button>
        )}
      </div>

      {/* Caption strip — only render when there's something to say. */}
      {(img.caption || img.alt) && (
        <div className="px-4 md:px-8 py-3 md:py-4 text-center text-white/90 text-sm md:text-base max-w-3xl mx-auto">
          {img.caption || img.alt}
        </div>
      )}
    </div>
  )
}
