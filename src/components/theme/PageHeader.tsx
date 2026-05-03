import { Badge } from '@/components/ui/badge'
import { ReactNode } from 'react'

type Variant = 'cream' | 'primary' | 'accent'

interface Props {
  title: string
  subtitle?: string
  badge?: { text: string; variant?: 'default' | 'secondary' | 'accent' }
  variant?: Variant
  align?: 'left' | 'center'
  withBlur?: boolean
  size?: 'md' | 'lg'
  children?: ReactNode
}

const VARIANT_BG: Record<Variant, string> = {
  cream:   'bg-secondary/10',
  primary: 'bg-primary/5',
  accent:  'bg-accent/10',
}

export function PageHeader({
  title, subtitle, badge,
  variant = 'cream',
  align = 'left',
  withBlur = false,
  size = 'md',
  children,
}: Props) {
  const titleClass = size === 'lg'
    ? 'text-4xl md:text-6xl font-bold mb-4 text-foreground leading-tight'
    : 'text-4xl md:text-5xl font-bold mb-4 text-foreground'

  const subtitleClass = size === 'lg'
    ? 'text-xl text-muted-foreground leading-relaxed'
    : 'text-xl text-muted-foreground max-w-2xl'

  return (
    <div className={`${VARIANT_BG[variant]} border-b border-border py-12 lg:py-16 relative overflow-hidden`}>
      {withBlur && (
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      )}
      <div className={`container relative z-10 ${align === 'center' ? 'text-center' : ''}`}>
        <div className={align === 'center' ? 'max-w-2xl mx-auto' : 'max-w-3xl'}>
          {badge && (
            <Badge
              variant={badge.variant === 'accent' ? 'accent' : badge.variant ?? 'default'}
              className="mb-4"
            >
              {badge.text}
            </Badge>
          )}
          <h1 className={titleClass}>{title}</h1>
          {subtitle && (
            <p className={align === 'center' ? `${subtitleClass} mx-auto` : subtitleClass}>{subtitle}</p>
          )}
          {children && <div className="mt-6">{children}</div>}
        </div>
      </div>
    </div>
  )
}
