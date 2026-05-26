'use client'

// ShareButton — universal share affordance. Behavior:
//   - On devices that support navigator.share (most mobile, some desktop),
//     calling click opens the native OS share sheet — gives the reader
//     access to SMS, Messages, AirDrop, Slack, whatever they have.
//   - On devices that don't, falls back to a small popover with explicit
//     Facebook, X, Email, and Copy Link buttons.
//
// Backwards compatible with the original minimal version: passing only
// `title` continues to work (URL falls back to window.location.href).

import { useEffect, useRef, useState } from 'react'
import { Share2, Mail, Copy, Check, X as XIcon } from 'lucide-react'

// Inline SVGs for the social brands. lucide-react dropped Facebook/Twitter
// at one point due to trademark concerns — using small inline marks keeps
// the recognition without depending on a specific icon library version.
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

interface Props {
  /** Suggested title — used by native share + email subject. */
  title?:     string
  /** Absolute URL to share. Defaults to window.location.href. */
  url?:       string
  /** Longer text — used by native share + email body. */
  text?:      string
  /** Visual style. */
  variant?:   'primary' | 'ghost' | 'light' | 'legacy'
  /** Button label. Defaults to "Share". */
  label?:     string
  /** Icon-only mode (sr-only label). */
  iconOnly?:  boolean
  className?: string
}

export function ShareButton({
  title, url, text, variant = 'legacy', label = 'Share', iconOnly = false, className = '',
}: Props) {
  const [open, setOpen]     = useState(false)
  const [copied, setCopied] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)

  // Close the popover when clicking outside it
  useEffect(() => {
    if (!open) return
    function onDoc(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  function resolveUrl(): string {
    if (url) return url
    if (typeof window !== 'undefined') return window.location.href
    return ''
  }

  async function handleClick() {
    const shareUrl = resolveUrl()
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share({ url: shareUrl, title, text })
        return
      } catch {
        // user cancelled OR browser refused — fall through to popover
      }
    }
    setOpen(v => !v)
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(resolveUrl())
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // older browsers — FB/X/email links still work
    }
  }

  const shareUrl     = typeof window !== 'undefined' ? resolveUrl() : (url ?? '')
  const encodedUrl   = encodeURIComponent(shareUrl)
  const encodedTitle = encodeURIComponent(title ?? '')
  const encodedBody  = encodeURIComponent([title, text, shareUrl].filter(Boolean).join('\n\n'))
  const fbHref       = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`
  const xHref        = `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`
  const mailHref     = `mailto:?subject=${encodedTitle}&body=${encodedBody}`

  const variantCls =
    variant === 'primary' ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm'
    : variant === 'light'  ? 'bg-white text-foreground border border-border/40 hover:bg-muted shadow-sm'
    : variant === 'ghost'  ? 'bg-transparent text-foreground hover:bg-muted/60'
    : /* legacy */          'border border-gray-200 text-gray-600 hover:bg-gray-50'

  // Legacy variant keeps the original block-style button so existing
  // consumers (summer-fun-guide) don't suddenly get a chip.
  const isLegacy = variant === 'legacy'
  const sizingCls = isLegacy
    ? 'flex items-center gap-2 w-full py-2 px-3 rounded-xl text-sm font-medium'
    : iconOnly
      ? 'inline-flex items-center justify-center w-9 h-9 rounded-full text-xs font-bold transition-colors'
      : 'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-colors'

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={handleClick}
        className={`${sizingCls} ${variantCls} ${className}`}
        aria-label={iconOnly ? label : undefined}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {copied && isLegacy
          ? <Check size={15} className="text-green-600" />
          : <Share2 size={isLegacy ? 15 : 14} className={isLegacy && copied ? '' : ''} />
        }
        {!iconOnly && <span>{copied && isLegacy ? 'Link copied!' : label}</span>}
      </button>

      {open && (
        <div
          ref={popoverRef}
          role="menu"
          className="absolute right-0 top-full mt-2 z-30 w-56 rounded-2xl bg-card border border-border shadow-xl py-1.5"
        >
          <div className="flex items-center justify-between px-3 py-2 border-b border-border/40">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Share</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Close share menu"
            >
              <XIcon className="h-3.5 w-3.5" />
            </button>
          </div>

          <a
            href={fbHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted/60 transition-colors"
          >
            <span className="w-7 h-7 rounded-full bg-blue-600 text-white inline-flex items-center justify-center">
              <FacebookGlyph className="h-3.5 w-3.5" />
            </span>
            <span className="font-semibold text-foreground">Facebook</span>
          </a>

          <a
            href={xHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted/60 transition-colors"
          >
            <span className="w-7 h-7 rounded-full bg-black text-white inline-flex items-center justify-center">
              <XGlyph className="h-3.5 w-3.5" />
            </span>
            <span className="font-semibold text-foreground">X / Twitter</span>
          </a>

          <a
            href={mailHref}
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted/60 transition-colors"
          >
            <span className="w-7 h-7 rounded-full bg-muted text-foreground inline-flex items-center justify-center">
              <Mail className="h-3.5 w-3.5" />
            </span>
            <span className="font-semibold text-foreground">Email</span>
          </a>

          <button
            type="button"
            onClick={copyLink}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted/60 transition-colors"
          >
            <span className={`w-7 h-7 rounded-full inline-flex items-center justify-center ${
              copied ? 'bg-green-600 text-white' : 'bg-muted text-foreground'
            }`}>
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            </span>
            <span className="font-semibold text-foreground">{copied ? 'Copied!' : 'Copy link'}</span>
          </button>
        </div>
      )}
    </div>
  )
}
