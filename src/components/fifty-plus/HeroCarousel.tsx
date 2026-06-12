'use client'

// Hero carousel for the 50+ homepage. Embla + Autoplay client-side, with
// slide data computed server-side and passed in as plain JSON so the
// component itself stays brand-agnostic. Each slide can have its own
// background image, gradient overlay, eyebrow chip, headline, body copy,
// and CTA — used for the dynamic greeting (slot 1) and the editorial
// hero picks (slots 2-4 from article_hero_slots).
//
// Behavior:
//   - Auto-plays every 5s, pauses on hover/focus + when tab is hidden.
//   - Loops infinitely.
//   - Honors prefers-reduced-motion (autoplay disables, manual still works).
//   - Mobile: swipe + dot indicators. Desktop: dot indicators + side arrows.

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import useEmblaCarousel from 'embla-carousel-react'
import Autoplay from 'embla-carousel-autoplay'
import { Sun, MapPin, Brain, Trophy, Coffee, ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react'

export type HeroEyebrowIcon = 'sun' | 'map-pin' | 'brain' | 'trophy' | null
export type HeroCtaIcon     = 'coffee' | 'trophy' | 'arrow-right' | null
export type HeroCtaStyle    = 'amber' | 'tertiary' | 'white' | 'navy'

export interface HeroSlide {
  /** Stable key for React. */
  id:                string
  /** Small badge above the headline. */
  eyebrow:           string | null
  eyebrowIcon:       HeroEyebrowIcon
  /** Eyebrow chip style. 'amber-on-glass' is the greeting style; 'amber-solid'
   *  is the article style; 'tertiary' is the brighter highlight style. */
  eyebrowStyle:      'amber-on-glass' | 'amber-solid' | 'tertiary' | 'white'
  headline:          string
  description:       string | null
  ctaLabel:          string | null
  ctaHref:           string | null
  ctaIcon:           HeroCtaIcon
  ctaStyle:          HeroCtaStyle
  backgroundImageUrl: string | null
  alt:               string
}

interface Props {
  slides:      HeroSlide[]
  /** Delay between slides in ms. Defaults to 5000. */
  autoplayMs?: number
}

const EYEBROW_ICON: Record<NonNullable<HeroEyebrowIcon>, React.ComponentType<{ className?: string }>> = {
  'sun':      Sun,
  'map-pin':  MapPin,
  'brain':    Brain,
  'trophy':   Trophy,
}
const CTA_ICON: Record<NonNullable<HeroCtaIcon>, React.ComponentType<{ className?: string }>> = {
  'coffee':       Coffee,
  'trophy':       Trophy,
  'arrow-right':  ArrowRight,
}

function eyebrowClasses(style: HeroSlide['eyebrowStyle']): string {
  switch (style) {
    case 'amber-on-glass': return 'bg-secondary/20 text-secondary border border-secondary/30 backdrop-blur-sm'
    case 'amber-solid':    return 'bg-secondary text-secondary-foreground'
    case 'tertiary':       return 'bg-tertiary text-tertiary-foreground'
    case 'white':          return 'bg-white text-primary'
  }
}
function ctaClasses(style: HeroSlide['ctaStyle']): string {
  switch (style) {
    case 'amber':     return 'bg-secondary text-secondary-foreground hover:bg-secondary/90'
    case 'tertiary':  return 'bg-tertiary text-tertiary-foreground hover:bg-tertiary/90'
    case 'white':     return 'bg-white text-primary hover:bg-white/90'
    case 'navy':      return 'bg-primary text-primary-foreground hover:bg-primary/90'
  }
}

export function FiftyPlusHeroCarousel({ slides, autoplayMs = 5000 }: Props) {
  const prefersReducedMotion = useRef(false)
  if (typeof window !== 'undefined') {
    prefersReducedMotion.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }

  const autoplay = useRef(
    Autoplay({ delay: autoplayMs, stopOnInteraction: false, stopOnMouseEnter: true })
  )
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true }, prefersReducedMotion.current ? [] : [autoplay.current])
  const [selectedIndex, setSelectedIndex] = useState(0)

  useEffect(() => {
    if (!emblaApi) return
    const onSelect = () => setSelectedIndex(emblaApi.selectedScrollSnap())
    emblaApi.on('select', onSelect)
    onSelect()
    return () => { emblaApi.off('select', onSelect) }
  }, [emblaApi])

  // Pause autoplay when the tab is hidden — saves CPU + prevents the
  // carousel from racing through every slide when the user returns.
  useEffect(() => {
    if (prefersReducedMotion.current) return
    const onVis = () => {
      if (document.hidden) autoplay.current.stop()
      else                 autoplay.current.play()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  if (slides.length === 0) return null

  return (
    <div className="relative bg-primary text-primary-foreground shadow-md overflow-hidden">
      <div ref={emblaRef} className="overflow-hidden">
        <div className="flex">
          {slides.map(slide => (
            <SlideView key={slide.id} slide={slide} />
          ))}
        </div>
      </div>

      {/* Dot indicators */}
      {slides.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
          {slides.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => emblaApi?.scrollTo(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === selectedIndex ? 'bg-white w-6' : 'bg-white/40 hover:bg-white/60 w-1.5'
              }`}
              aria-label={`Slide ${i + 1} of ${slides.length}`}
            />
          ))}
        </div>
      )}

      {/* Arrows — desktop only, slides > 1 */}
      {slides.length > 1 && (
        <div className="absolute bottom-6 right-6 hidden md:flex gap-2 z-20">
          <button
            type="button"
            onClick={() => emblaApi?.scrollPrev()}
            className="h-11 w-11 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-sm flex items-center justify-center"
            aria-label="Previous slide"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => emblaApi?.scrollNext()}
            className="h-11 w-11 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-sm flex items-center justify-center"
            aria-label="Next slide"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  )
}

function SlideView({ slide }: { slide: HeroSlide }) {
  const EyebrowIcon = slide.eyebrowIcon ? EYEBROW_ICON[slide.eyebrowIcon] : null
  const CtaIcon     = slide.ctaIcon     ? CTA_ICON[slide.ctaIcon]         : null
  return (
    <div className="flex-[0_0_100%] min-w-0 relative">
      <div className="relative py-14 md:py-20 lg:py-24 overflow-hidden">
        {slide.backgroundImageUrl && (
          <div className="absolute inset-0 z-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={slide.backgroundImageUrl}
              className="w-full h-full object-cover object-center opacity-70"
              alt={slide.alt}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-primary/95 via-primary/70 to-transparent" />
          </div>
        )}
        <div className="container mx-auto px-4 relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex-1 min-w-0">
              {slide.eyebrow && (
                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full font-bold mb-4 text-sm shadow-sm ${eyebrowClasses(slide.eyebrowStyle)}`}>
                  {EyebrowIcon && <EyebrowIcon className="w-4 h-4" />}
                  <span>{slide.eyebrow}</span>
                </div>
              )}
              <h1 className="font-heading font-extrabold text-white text-3xl md:text-5xl lg:text-6xl drop-shadow-sm mb-3 leading-tight">
                {slide.headline}
              </h1>
              {slide.description && (
                <p className="text-primary-foreground/90 font-serif text-base md:text-xl max-w-xl">
                  {slide.description}
                </p>
              )}
            </div>
            {slide.ctaLabel && slide.ctaHref && (
              <div className="flex-shrink-0">
                <Link
                  href={slide.ctaHref}
                  className={`inline-flex items-center gap-2 font-bold shadow-lg hover:scale-105 transition-all text-base h-13 px-6 py-3 rounded-md ${ctaClasses(slide.ctaStyle)}`}
                >
                  {CtaIcon && <CtaIcon className="w-5 h-5" />}
                  <span>{slide.ctaLabel}</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
