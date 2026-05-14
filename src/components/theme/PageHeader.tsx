import Image from 'next/image'
import { Badge } from '@/components/ui/badge'
import { ReactNode } from 'react'

type Variant = 'cream' | 'primary' | 'accent'

interface Props {
  title:    string
  subtitle?: string
  badge?:   { text: string; variant?: 'default' | 'secondary' | 'accent' }
  variant?: Variant
  align?:   'left' | 'center'
  withBlur?: boolean
  size?:    'md' | 'lg'
  children?: ReactNode
  /** Optional hero photo behind the text. Rendered with a dark gradient
      overlay so white text reads on bright OR dark images. When unset,
      falls back to the tinted background defined by `variant`. */
  heroImageUrl?: string | null
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
  heroImageUrl,
}: Props) {
  const hasImage = !!heroImageUrl

  // Text colors flip to white over an image so they read against the dark
  // overlay regardless of which guide / which photo is loaded.
  const titleClass = (
    size === 'lg'
      ? 'text-4xl md:text-6xl font-bold mb-4 leading-tight'
      : 'text-4xl md:text-5xl font-bold mb-4'
  ) + (hasImage ? ' text-white' : ' text-foreground')

  const subtitleClass = (
    size === 'lg'
      ? 'text-xl leading-relaxed'
      : 'text-xl max-w-2xl'
  ) + (hasImage ? ' text-white/85' : ' text-muted-foreground')

  // Min-height makes the image have presence even when text is short.
  // 16:5-ish ratio is generous without being a hero-takeover.
  const heightClass = hasImage
    ? (size === 'lg' ? 'min-h-[420px] py-16 lg:py-20' : 'min-h-[340px] py-12 lg:py-16')
    : (size === 'lg' ? 'py-12 lg:py-16'               : 'py-12')

  return (
    <div className={`${hasImage ? 'bg-black' : VARIANT_BG[variant]} border-b border-border ${heightClass} relative overflow-hidden`}>
      {/* Background image + dark overlay. The overlay has two layers:
            1. flat black/30 to dim the entire image, and
            2. a side gradient that's darker on the text side, fading away on
               the opposite side.
          Together they let any image (bright snow, dark teepee, glaring sun,
          backlit subjects) still hold white text with strong readability. */}
      {hasImage && heroImageUrl && (
        <>
          <Image
            src={heroImageUrl}
            alt=""
            fill
            sizes="100vw"
            priority
            unoptimized
            style={{ objectFit: 'cover', objectPosition: 'center' }}
          />
          <div className="absolute inset-0 bg-black/30" aria-hidden />
          <div
            className={`absolute inset-0 ${align === 'center'
              ? 'bg-gradient-to-t from-black/70 via-black/40 to-black/30'
              : 'bg-gradient-to-r from-black/70 via-black/45 to-black/15'}`}
            aria-hidden
          />
        </>
      )}

      {withBlur && !hasImage && (
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      )}

      <div className={`container relative z-10 ${align === 'center' ? 'text-center' : ''}`}>
        <div className={align === 'center' ? 'max-w-2xl mx-auto' : 'max-w-3xl'}>
          {badge && (
            <Badge
              variant={badge.variant === 'accent' ? 'accent' : badge.variant ?? 'default'}
              className={`mb-4 ${hasImage ? 'bg-white/15 text-white border-white/30 backdrop-blur-sm' : ''}`}
            >
              {badge.text}
            </Badge>
          )}
          <h1
            className={titleClass}
            style={hasImage ? { textShadow: '0 2px 8px rgba(0,0,0,0.45)' } : undefined}
          >
            {title}
          </h1>
          {subtitle && (
            <p
              className={align === 'center' ? `${subtitleClass} mx-auto` : subtitleClass}
              style={hasImage ? { textShadow: '0 1px 4px rgba(0,0,0,0.4)' } : undefined}
            >
              {subtitle}
            </p>
          )}
          {children && <div className="mt-6">{children}</div>}
        </div>
      </div>
    </div>
  )
}
