'use client'

// ShareRow — INLINE share affordance with all options visible.
//
// Four destinations: Facebook, X, Email, Copy link. (Instagram and
// TikTok don't have a web share intent — leaving them out for now;
// the OS share sheet on mobile covers those use cases.)
//
// Style: every icon uses the SAME chip treatment — primary-coral filled
// circle with a white brand glyph inside. The glyph shapes still carry
// platform recognition; the unified color carries our brand.
//
// Two sizes: 'default' for prominent placements, 'compact' for tucking
// alongside other header chrome.

import { useState } from 'react'
import { Mail, Copy, Check } from 'lucide-react'

interface Props {
  url:        string
  title?:     string
  text?:      string
  label?:     string
  /** 'default' (h-10 chips, label visible) or 'compact' (h-7 chips, no label). */
  size?:      'default' | 'compact'
  /** 'coral' (primary, prominent — for full-screen views like the lightbox)
   *  or 'tan' (muted stone — for tucked placements like card footers
   *  where the icons should blend with the page). Hover warms to coral
   *  in either tone so the action still reads as alive. */
  tone?:      'coral' | 'tan'
  className?: string
}

// ── Brand glyphs (inline SVG so we don't depend on a specific icon library) ─

function FacebookGlyph({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.99 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.99 22 12z" />
    </svg>
  )
}
function XGlyph({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2H21.5l-7.36 8.41L23 22h-6.79l-5.32-6.97L4.8 22H1.54l7.87-8.99L1 2h6.92l4.8 6.36L18.24 2zm-1.19 18h1.83L7.04 4H5.1l11.96 16z" />
    </svg>
  )
}
export function ShareRow({
  url, title, text, label = 'Share with others',
  size = 'default', tone = 'coral', className = '',
}: Props) {
  const isCompact = size === 'compact'
  const isTan     = tone === 'tan'
  // Single transient toast — message is set by the IG/TikTok/Copy actions
  // and clears after a short timeout. One slot is enough since the buttons
  // are mutually exclusive (you click one at a time).
  const [toast, setToast] = useState<string | null>(null)

  async function copyAndToast(message: string) {
    try {
      await navigator.clipboard.writeText(url)
      setToast(message)
      setTimeout(() => setToast(null), 3000)
    } catch {
      // Older browsers — at least the FB/X/email href links still work
    }
  }

  const encodedUrl   = encodeURIComponent(url)
  const encodedTitle = encodeURIComponent(title ?? '')
  const encodedBody  = encodeURIComponent([title, text, url].filter(Boolean).join('\n\n'))
  const fbHref       = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`
  const xHref        = `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`
  const mailHref     = `mailto:?subject=${encodedTitle}&body=${encodedBody}`

  // Unified chip style. Coral is the prominent treatment used on full-screen
  // surfaces (lightbox). Tan is a quieter variant used in tucked placements
  // like card footers so the icons don't compete with the page's coral CTAs.
  // Both tones warm to coral on hover so the action stays alive.
  const sizeCls = isCompact ? 'w-7 h-7' : 'w-10 h-10'
  const restingCls = isTan
    ? 'bg-stone-200 text-stone-700'
    : 'bg-primary text-primary-foreground'
  const hoverCls = isTan
    ? 'hover:bg-primary hover:text-primary-foreground'
    : 'hover:bg-primary/90'
  const shadowCls = isCompact ? '' : 'shadow-sm hover:shadow-md'
  const chip = `${sizeCls} ${restingCls} ${hoverCls} ${shadowCls} inline-flex items-center justify-center rounded-full transition-all hover:scale-110`
  const iconCls = isCompact ? 'h-3.5 w-3.5' : 'h-4 w-4'

  // Card-level wrapper — allows stopPropagation so the share buttons don't
  // fire the parent card's onClick when a bit card has its own click target.
  function stopProp(e: React.MouseEvent) { e.stopPropagation() }

  return (
    <div
      className={`relative inline-flex flex-col gap-1.5 ${className}`}
      onClick={stopProp}
    >
      <div className={`flex items-center flex-wrap ${isCompact ? 'gap-1.5' : 'gap-3'}`}>
        {!isCompact && (
          <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            {label}
          </span>
        )}
        <div className={`flex items-center flex-wrap ${isCompact ? 'gap-1' : 'gap-1.5'}`}>
          <a
            href={fbHref}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Share on Facebook"
            title="Share on Facebook"
            className={chip}
          >
            <FacebookGlyph className={iconCls} />
          </a>
          <a
            href={xHref}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Share on X"
            title="Share on X"
            className={chip}
          >
            <XGlyph className={iconCls} />
          </a>
          <a
            href={mailHref}
            aria-label="Share by email"
            title="Share by email"
            className={chip}
          >
            <Mail className={iconCls} />
          </a>
          <button
            type="button"
            onClick={() => copyAndToast('Link copied!')}
            aria-label="Copy link"
            title="Copy link"
            className={chip}
          >
            {toast === 'Link copied!' ? <Check className={iconCls} /> : <Copy className={iconCls} />}
          </button>
        </div>
      </div>

      {/* Toast — small confirmation message that appears under the row when
          the user uses Copy. Auto-dismisses. */}
      {toast && (
        <p className="text-[10px] font-semibold text-green-700 bg-green-50 border border-green-200 rounded-md px-2 py-0.5 inline-flex items-center gap-1 self-start">
          <Check className="h-3 w-3" />
          {toast}
        </p>
      )}
    </div>
  )
}
