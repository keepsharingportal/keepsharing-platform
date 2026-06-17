// Birthday Buzz — full-bleed rotating spotlight carousel. The big
// commercial. Editor loads it with vendor spotlights + the occasional
// real-mom shoutout / editor pick.
//
// Carousel behavior:
//   - Auto-advances every 6 seconds
//   - Pauses on hover
//   - Dots for indicator, arrows on hover
//   - Mobile-friendly — swipe via native scroll snap fallback
//   - Each slide is a clickable spotlight (vendor_id → /business/[slug],
//     or link_url for editor-picked external links)
//
// Vendor spotlights get premium visual treatment: big image, vendor
// name, headline, pitch, "Visit" CTA. Other kinds (tip, milestone,
// editor_pick, shoutout) render in the same layout but with a
// different "eyebrow" label.

'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Star, Megaphone, ThumbsUp, Trophy, Sparkles, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react'

interface Buzz {
  id:            string
  kind:          'shoutout' | 'tip' | 'milestone' | 'vendor_spotlight' | 'editor_pick'
  body:          string
  from_name:     string | null
  image_url:     string | null
  vendor_id:     string | null
  vendor_slug:   string | null
  vendor_name:   string | null
  link_url:      string | null
  posted_at:     string
}

const KIND_META: Record<Buzz['kind'], { label: string; icon: React.ComponentType<{ size?: number }>; color: string }> = {
  vendor_spotlight: { label: 'Local spotlight', icon: Star,      color: '#ff7a59' },
  shoutout:         { label: 'Birthday shoutout', icon: Megaphone, color: '#84cc16' },
  tip:              { label: 'Tip',              icon: ThumbsUp, color: '#0ea5e9' },
  milestone:        { label: 'Milestone',        icon: Trophy,   color: '#f59e0b' },
  editor_pick:      { label: 'Editor pick',      icon: Sparkles, color: '#a855f7' },
}

export function BirthdayBuzz({ buzz }: { buzz: Array<Record<string, unknown>> }) {
  const items: Buzz[] = buzz.map(b => ({
    id:           b.id           as string,
    kind:         (b.kind        as Buzz['kind']) ?? 'shoutout',
    body:         b.body         as string,
    from_name:    b.from_name    as string | null,
    image_url:    b.image_url    as string | null,
    vendor_id:    b.vendor_id    as string | null,
    vendor_slug:  b.vendor_slug  as string | null,
    vendor_name:  b.vendor_name  as string | null,
    link_url:     b.link_url     as string | null,
    posted_at:    b.posted_at    as string,
  }))

  const [activeIdx, setActiveIdx] = useState(0)
  const [paused,    setPaused]    = useState(false)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (items.length <= 1 || paused) return
    timer.current = setInterval(() => {
      setActiveIdx(i => (i + 1) % items.length)
    }, 6000)
    return () => { if (timer.current) clearInterval(timer.current) }
  }, [items.length, paused])

  if (items.length === 0) return null

  const active = items[activeIdx]
  const meta   = KIND_META[active.kind]
  const Icon   = meta.icon
  const href   = active.vendor_slug
    ? `/birthday-party-guide/business/${active.vendor_slug}`
    : active.link_url
    ? active.link_url
    : null

  // Determine headline + body split — first sentence becomes the headline,
  // remainder is the pitch. Falls back to using the whole body as pitch.
  const sentences = active.body.match(/[^.!?]+[.!?]+/g) ?? [active.body]
  const headline  = sentences[0]?.trim() ?? active.body
  const pitch     = sentences.slice(1).join(' ').trim()

  return (
    <div
      className="relative bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="grid lg:grid-cols-5">
        {/* Image */}
        <div className="lg:col-span-3 aspect-[16/10] lg:aspect-auto bg-slate-100 relative overflow-hidden">
          {active.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={active.id}
              src={active.image_url}
              alt={active.vendor_name ?? active.kind}
              className="w-full h-full object-cover animate-[fadeIn_500ms_ease-out]"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#fff0eb] via-[#ffe6dd] to-[#ffd9cc]" />
          )}
          {/* Gradient overlay for legibility on mobile */}
          <div className="absolute inset-0 lg:hidden bg-gradient-to-b from-transparent via-black/0 to-black/55" />

          {/* Eyebrow chip — overlays image */}
          <div className="absolute top-3 left-3">
            <span
              className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-white rounded-full shadow-md"
              style={{ backgroundColor: meta.color }}
            >
              <Icon size={11} /> {meta.label}
            </span>
          </div>
        </div>

        {/* Copy */}
        <div className="lg:col-span-2 p-5 sm:p-6 lg:p-8 flex flex-col justify-center">
          {active.vendor_name && (
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 mb-2">
              {active.vendor_name}
            </div>
          )}
          <h3 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 leading-[1.15]">
            {headline}
          </h3>
          {pitch && (
            <p className="text-[13px] sm:text-base text-slate-600 mt-3 leading-relaxed">
              {pitch}
            </p>
          )}
          {active.from_name && (
            <div className="text-[11px] text-slate-500 mt-3 italic">— {active.from_name}</div>
          )}

          {href && (
            href.startsWith('/')
              ? (
                <Link
                  href={href}
                  className="mt-5 inline-flex items-center gap-1.5 px-5 py-2.5 text-[13px] font-bold text-white rounded-lg hover:opacity-90 self-start"
                  style={{ backgroundColor: meta.color }}
                >
                  {active.kind === 'vendor_spotlight' ? 'See their packages' : 'Read more'} <ArrowRight size={12} />
                </Link>
              )
              : (
                <a
                  href={href} target="_blank" rel="noopener noreferrer"
                  className="mt-5 inline-flex items-center gap-1.5 px-5 py-2.5 text-[13px] font-bold text-white rounded-lg hover:opacity-90 self-start"
                  style={{ backgroundColor: meta.color }}
                >
                  Visit <ArrowRight size={12} />
                </a>
              )
          )}
        </div>
      </div>

      {/* Nav controls — only when there's more than one slide */}
      {items.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => setActiveIdx(i => (i - 1 + items.length) % items.length)}
            aria-label="Previous"
            className="absolute top-1/2 -translate-y-1/2 left-2 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm shadow-md text-slate-700 hover:bg-white flex items-center justify-center opacity-0 hover:opacity-100 focus:opacity-100 transition-opacity lg:opacity-100"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={() => setActiveIdx(i => (i + 1) % items.length)}
            aria-label="Next"
            className="absolute top-1/2 -translate-y-1/2 right-2 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm shadow-md text-slate-700 hover:bg-white flex items-center justify-center opacity-0 hover:opacity-100 focus:opacity-100 transition-opacity lg:opacity-100"
          >
            <ChevronRight size={16} />
          </button>

          {/* Dots */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
            {items.map((it, i) => (
              <button
                key={it.id}
                type="button"
                aria-label={`Show slide ${i + 1}`}
                onClick={() => setActiveIdx(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === activeIdx ? 'bg-white w-6 shadow-md' : 'bg-white/60 w-1.5 hover:bg-white/80'
                }`}
              />
            ))}
          </div>
        </>
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0.4; transform: scale(1.02); }
          to   { opacity: 1;   transform: scale(1); }
        }
      `}</style>
    </div>
  )
}
