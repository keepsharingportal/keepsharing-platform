import { ReactNode } from 'react'
import { LucideIcon } from 'lucide-react'

interface Props {
  title: string
  icon?: LucideIcon
  iconColor?: 'primary' | 'secondary' | 'accent'
  action?: ReactNode
  withDivider?: boolean
}

const ICON_COLOR: Record<string, string> = {
  primary:   'text-primary',
  secondary: 'text-secondary',
  accent:    'text-accent fill-accent',
}

export function SectionHeader({ title, icon: Icon, iconColor = 'primary', action, withDivider = true }: Props) {
  return (
    <div className={`flex items-center justify-between mb-6 ${withDivider ? 'border-b pb-4' : ''}`}>
      <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
        {Icon && <Icon className={`h-6 w-6 ${ICON_COLOR[iconColor]}`} />}
        {title}
      </h2>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
