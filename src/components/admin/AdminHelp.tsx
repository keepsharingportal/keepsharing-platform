// AdminHelp.tsx
// Small, reusable inline-help primitives for admin forms.
//
//   <FieldHint>     — one-line gray hint below a field
//   <HelpTip>       — info circle that shows tooltip on hover/focus
//   <SectionHelp>   — pale blue banner for paragraph-level guidance at the
//                     top of a section or page
//   <FieldLabel>    — label + optional HelpTip + optional "required" star,
//                     so the common pattern is one line in markup

import { Info, Lightbulb } from 'lucide-react'
import { ReactNode } from 'react'

// ── FieldHint ──────────────────────────────────────────────────────────────
// One-line muted text under (or above) a field. Use for short clarifications
// that fit on a single line — "Used in meta description", "Max 60 characters".
export function FieldHint({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <p className={`text-[11px] text-gray-500 leading-relaxed ${className}`}>
      {children}
    </p>
  )
}

// ── HelpTip ────────────────────────────────────────────────────────────────
// An info icon that reveals a tooltip on hover. Use for context that isn't
// worth its own line — historical reasons, examples, gotchas. CSS-only so it
// works in server components.
export function HelpTip({ text, className = '' }: { text: string; className?: string }) {
  return (
    <span className={`group relative inline-flex items-center align-middle ${className}`}>
      <Info
        size={12}
        className="text-gray-400 hover:text-gray-600 cursor-help"
        aria-label={text}
      />
      <span
        role="tooltip"
        className="
          invisible opacity-0 group-hover:visible group-hover:opacity-100
          transition-opacity duration-150
          absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5
          z-50 pointer-events-none
          w-64 px-3 py-2
          text-[11px] leading-relaxed text-white
          bg-gray-900 rounded-lg shadow-lg
          whitespace-normal text-left
        "
      >
        {text}
      </span>
    </span>
  )
}

// ── SectionHelp ────────────────────────────────────────────────────────────
// Paragraph-level guidance — "Here's how this section works and why it
// matters." Use sparingly, only at the top of complex pages or unfamiliar
// flows. Two visual variants: 'tip' (yellow) for proactive coaching,
// 'info' (blue) for neutral context.
type SectionHelpVariant = 'tip' | 'info'

export function SectionHelp({
  variant  = 'info',
  title,
  children,
}: {
  variant?:  SectionHelpVariant
  title?:    string
  children:  ReactNode
}) {
  const styles = variant === 'tip'
    ? { wrap: 'bg-amber-50/60 border-amber-200', icon: 'text-amber-600', heading: 'text-amber-900' }
    : { wrap: 'bg-blue-50/60 border-blue-200',  icon: 'text-blue-600',  heading: 'text-blue-900' }

  const Icon = variant === 'tip' ? Lightbulb : Info

  return (
    <div className={`rounded-lg border ${styles.wrap} p-3 flex items-start gap-2.5`}>
      <Icon size={15} className={`${styles.icon} shrink-0 mt-0.5`} />
      <div className="min-w-0 flex-1">
        {title && (
          <p className={`text-xs font-bold ${styles.heading} mb-0.5`}>{title}</p>
        )}
        <div className="text-[12px] text-gray-700 leading-relaxed space-y-1">
          {children}
        </div>
      </div>
    </div>
  )
}

// ── FieldLabel ─────────────────────────────────────────────────────────────
// The common pattern: small uppercase label + optional HelpTip + optional
// required star. Replaces ad-hoc `<label className="...">` blocks.
export function FieldLabel({
  children,
  hint,
  required,
  htmlFor,
}: {
  children:  ReactNode
  hint?:     string
  required?: boolean
  htmlFor?:  string
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="flex items-center gap-1.5 text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5"
    >
      <span>{children}</span>
      {required && <span className="text-red-500 font-bold" aria-label="required">*</span>}
      {hint && <HelpTip text={hint} />}
    </label>
  )
}
