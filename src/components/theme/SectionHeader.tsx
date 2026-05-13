import { ReactNode } from 'react'
import { LucideIcon } from 'lucide-react'

interface Props {
  title: string
  /** Small uppercase label above the title — editorial guide style */
  eyebrow?: string
  /** Sentence below the title — editorial guide style */
  description?: string
  icon?: LucideIcon
  iconColor?: 'primary' | 'secondary' | 'accent'
  action?: ReactNode
  /** Only applies when size is 'sm' or 'md' */
  withDivider?: boolean
  /**
   * md  — homepage feed headers (text-2xl, border-b divider)
   * lg  — editorial section headers (text-4xl, eyebrow + description row)
   */
  size?: 'md' | 'lg'
  /** lg size only */
  align?: 'left' | 'center'
  /** Override bottom margin or add additional classes */
  className?: string
}

const ICON_COLOR: Record<string, string> = {
  primary:   'text-primary',
  secondary: 'text-secondary',
  accent:    'text-accent fill-accent',
}

export function SectionHeader({
  title, eyebrow, description,
  icon: Icon, iconColor = 'primary',
  action, withDivider = true,
  size = 'md', align = 'left',
  className = '',
}: Props) {

  // ── Editorial (lg) — guide section headers ────────────────────────────────
  if (size === 'lg') {
    return (
      <div className={`flex flex-col md:flex-row items-end justify-between gap-6 mb-12 ${align === 'center' ? 'items-center text-center' : ''} ${className}`}>
        <div className={align === 'center' ? 'max-w-2xl mx-auto' : ''}>
          {eyebrow && (
            <p className="text-xs font-bold uppercase tracking-widest text-primary mb-2">{eyebrow}</p>
          )}
          <h2 className="text-4xl font-bold text-foreground tracking-tight flex items-center gap-3">
            {Icon && <Icon className={`h-7 w-7 shrink-0 ${ICON_COLOR[iconColor]}`} />}
            {title}
          </h2>
          {description && (
            <p className="text-muted-foreground mt-2 text-base leading-relaxed max-w-2xl">{description}</p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    )
  }

  // ── Standard (md) — homepage feed headers ─────────────────────────────────
  return (
    <div className={`flex items-center justify-between mb-6 ${withDivider ? 'border-b border-border/50 pb-4' : ''} ${className}`}>
      <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
        {Icon && <Icon className={`h-6 w-6 ${ICON_COLOR[iconColor]}`} />}
        {title}
      </h2>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
