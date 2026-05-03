import { Card, CardContent } from '@/components/ui/card'
import { ReactNode } from 'react'

type Variant = 'default' | 'feature' | 'tinted' | 'dark'

interface Props {
  variant?: Variant
  size?: 'md' | 'lg'
  children: ReactNode
  className?: string
  id?: string
}

const VARIANT_CLASSES: Record<Variant, string> = {
  default: '',
  feature: 'border-accent/30 shadow-sm',
  tinted:  'border-primary/20 bg-primary/5',
  dark:    'bg-foreground text-background border-none',
}

export function ContentCard({ variant = 'default', size = 'md', children, className = '', id }: Props) {
  return (
    <Card id={id} className={`${VARIANT_CLASSES[variant]} ${className}`}>
      <CardContent className={size === 'lg' ? 'p-6 md:p-8' : 'p-6'}>
        {children}
      </CardContent>
    </Card>
  )
}
