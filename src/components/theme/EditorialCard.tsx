import Link from 'next/link'
import Image from 'next/image'
import { Badge } from '@/components/ui/badge'
import { ArrowRight } from 'lucide-react'

interface Props {
  href: string
  title: string
  excerpt?: string | null
  imageSrc?: string | null
  category?: string | null
  /** Shown when imageSrc is null */
  fallbackSrc?: string
  cta?: string
}

/**
 * AI Studio-style editorial article card.
 * Used in guide pages for the editorial section (aspect-[16/10], no card box, text below).
 * Distinct from ArticleCard (feed style, aspect-[3/2], card box).
 */
export function EditorialCard({
  href, title, excerpt, imageSrc, category,
  fallbackSrc, cta = 'Read the Article',
}: Props) {
  const src = imageSrc ?? fallbackSrc

  return (
    <Link href={href} className="group block">
      <div className="relative aspect-[16/10] rounded-[2rem] overflow-hidden mb-6 bg-muted">
        {src && (
          <Image
            src={src}
            alt={title}
            fill
            className="object-cover group-hover:scale-110 transition-transform duration-700"
            unoptimized
          />
        )}
        {category && (
          <div className="absolute top-4 left-4">
            <Badge className="bg-white/90 text-foreground backdrop-blur border-none font-bold">
              {category}
            </Badge>
          </div>
        )}
      </div>
      <h3 className="text-2xl font-bold mb-3 group-hover:text-primary transition-colors leading-tight">
        {title}
      </h3>
      {excerpt && (
        <p className="text-muted-foreground text-sm line-clamp-2 mb-4 leading-relaxed">{excerpt}</p>
      )}
      <div className="flex items-center gap-2 text-xs font-bold text-primary">
        {cta} <ArrowRight className="h-3 w-3" />
      </div>
    </Link>
  )
}
