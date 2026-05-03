import Link from 'next/link'
import Image from 'next/image'
import { Badge } from '@/components/ui/badge'
import { getFallbackByContext } from '@/lib/image-fallbacks'

interface ArticleData {
  id:               string
  title:            string
  slug:             string
  excerpt?:         string | null
  hero_image_url?:  string | null
  category?:        string | null
  column_slug?:     string | null
  guide_slug?:      string | null
  author_name?:     string | null
}

const COLUMN_LABELS: Record<string, string> = {
  'mom-to-mom':           'Mom to Mom',
  'grands-greatest':      'Grands are the Greatest',
  'teacher-of-month':     'Teacher of the Month',
  'meeting-kids':         'Meeting Kids Where They Are',
  'dave-says':            'Dave Says',
  'teens-tweens-screens': 'Teens, Tweens & Screens',
}

interface Props {
  article: ArticleData
  showAuthor?: boolean
}

export function ArticleCard({ article, showAuthor = true }: Props) {
  const url = article.column_slug
    ? `/columns/${article.column_slug}/${article.slug.replace(new RegExp(`^${article.column_slug}-`), '')}`
    : `/articles/${article.slug}`

  const categoryLabel = article.column_slug
    ? COLUMN_LABELS[article.column_slug] ?? article.column_slug
    : article.guide_slug ?? article.category ?? 'Feature'

  const heroSrc = article.hero_image_url || getFallbackByContext(
    article.column_slug ?? article.guide_slug ?? 'parenting',
    article.id,
  )

  return (
    <Link href={url} className="group flex flex-col gap-3 cursor-pointer">
      <div className="relative aspect-[3/2] rounded-2xl overflow-hidden bg-muted">
        <Image
          src={heroSrc}
          alt={article.title}
          fill
          style={{ objectFit: 'cover' }}
          className="group-hover:scale-105 transition-transform duration-500"
          sizes="(max-width: 640px) 100vw, 33vw"
          unoptimized
        />
        <div className="absolute top-3 left-3">
          <Badge variant="secondary" className="bg-background/90 text-foreground backdrop-blur text-xs">
            {categoryLabel}
          </Badge>
        </div>
      </div>
      <h3 className="font-bold text-lg leading-snug line-clamp-2 group-hover:text-primary transition-colors">
        {article.title}
      </h3>
      {article.excerpt && (
        <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
          {article.excerpt}
        </p>
      )}
      {showAuthor && article.author_name && (
        <p className="text-xs text-muted-foreground font-medium">By {article.author_name}</p>
      )}
    </Link>
  )
}
