import Link from 'next/link'

interface Props {
  size?: 'sm' | 'md' | 'lg'
  withTagline?: boolean
  href?: string | null
  className?: string
  variant?: 'default' | 'footer'
}

const SIZE_CLASSES = {
  sm: { wordmark: 'text-lg', tagline: 'text-[10px]' },
  md: { wordmark: 'text-xl', tagline: 'text-xs' },
  lg: { wordmark: 'text-3xl md:text-4xl', tagline: 'text-sm' },
}

export function BrandLogo({ size = 'md', withTagline = false, href = '/', className = '', variant = 'default' }: Props) {
  const sizes = SIZE_CLASSES[size]
  const isFooter = variant === 'footer'

  const content = (
    <div className={`inline-flex flex-col ${className}`}>
      <span className={`${sizes.wordmark} font-black tracking-tight leading-none`}>
        <span className={isFooter ? 'text-white' : 'text-foreground'}>River Region </span>
        <span className="text-primary">Parents</span>
      </span>
      {withTagline && (
        <span className={`${sizes.tagline} font-medium tracking-wide mt-1 ${isFooter ? 'text-white/60' : 'text-muted-foreground'}`}>
          The Go-To Resource for River Region Families
        </span>
      )}
    </div>
  )

  if (!href) return content
  return <Link href={href} className="inline-block hover:opacity-90 transition-opacity">{content}</Link>
}
