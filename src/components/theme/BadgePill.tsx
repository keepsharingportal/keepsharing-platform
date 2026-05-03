import { Badge } from '@/components/ui/badge'

type Pattern = 'featured' | 'sponsored' | 'category' | 'free' | 'edition'

interface Props {
  pattern: Pattern
  text: string
  className?: string
}

const PATTERN_CLASSES: Record<Pattern, { variant?: 'default' | 'secondary' | 'outline' | 'accent'; classes: string }> = {
  featured:  { variant: 'accent',   classes: '' },
  sponsored: { classes: 'bg-secondary/90 text-secondary-foreground text-[10px] uppercase tracking-widest' },
  category:  { variant: 'outline',  classes: 'text-xs' },
  free:      { classes: 'bg-primary text-primary-foreground text-xs' },
  edition:   { variant: 'secondary', classes: 'text-xs' },
}

export function BadgePill({ pattern, text, className = '' }: Props) {
  const config = PATTERN_CLASSES[pattern]
  return (
    <Badge variant={config.variant} className={`${config.classes} ${className}`}>
      {text}
    </Badge>
  )
}
