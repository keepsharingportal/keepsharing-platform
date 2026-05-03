import { Card, CardContent } from '@/components/ui/card'
import { ReactNode } from 'react'
import { LucideIcon } from 'lucide-react'

type Variant = 'default' | 'tinted' | 'dark' | 'accent'

interface Props {
  title?: string
  icon?: LucideIcon
  iconColor?: 'primary' | 'secondary' | 'accent'
  variant?: Variant
  children: ReactNode
  footer?: ReactNode
  className?: string
}

const VARIANT_CLASSES: Record<Variant, string> = {
  default: '',
  tinted:  'border-primary/20 bg-primary/5',
  dark:    'bg-foreground text-background border-none relative overflow-hidden',
  accent:  'bg-accent/10 border-accent/20',
}

const ICON_COLOR: Record<string, string> = {
  primary:   'text-primary',
  secondary: 'text-secondary',
  accent:    'text-accent',
}

export function SidebarWidget({ title, icon: Icon, iconColor = 'primary', variant = 'default', children, footer, className = '' }: Props) {
  return (
    <Card className={`${VARIANT_CLASSES[variant]} ${className}`}>
      {variant === 'dark' && (
        <div className="absolute bottom-0 right-0 w-24 h-24 bg-primary/20 rounded-full blur-2xl translate-x-1/2 translate-y-1/2 pointer-events-none" />
      )}
      <CardContent className="p-5 relative">
        {title && (
          <h3 className={`font-bold mb-3 flex items-center gap-2 ${variant === 'dark' ? 'text-background' : 'text-foreground'}`}>
            {Icon && <Icon className={`h-4 w-4 ${ICON_COLOR[iconColor]}`} />}
            {title}
          </h3>
        )}
        <div className={variant === 'dark' ? 'text-background/80 text-sm' : ''}>
          {children}
        </div>
        {footer && <div className="mt-4">{footer}</div>}
      </CardContent>
    </Card>
  )
}
