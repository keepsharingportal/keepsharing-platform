import Link from 'next/link'
import Image from 'next/image'
import { Badge } from '@/components/ui/badge'
import { getFallbackByContext } from '@/lib/image-fallbacks'
import { ArrowRight } from 'lucide-react'

interface ArticleData {
  id:              string
  title:           string
  slug:            string
  excerpt?:        string | null
  hero_image_url?: string | null
  category?:       string | null
  column_slug?:    string | null
  guide_slug?:     string | null
  author_name?:    string | null
  published_at?:   string | null
  created_at?:     string | null
}

const COLUMN_LABELS: Record<string, string> = {
  'school-bits':        'School Bits',
  'teacher-of-month':   'Teacher of the Month',
  'education-matters':  'Education Matters',
  'mom-to-mom':         'Mom to Mom',
  'grands-greatest':    'Grands are the Greatest',
  'dave-says':          'Dave Says',
  'teens-tweens-screens': 'Teens, Tweens & Screens',
  'meeting-kids':       'Meeting Kids Where They Are',
  'summer-fun':         'Summer Fun',
}

const COLUMN_BADGE_STYLE: Record<string, string> = {
  'school-bits':       'bg-blue-600/90 text-white',
  'teacher-of-month':  'bg-amber-500/90 text-white',
  'mom-to-mom':        'bg-rose-500/90 text-white',
  'summer-fun':        'bg-amber-400/90 text-white',
}

interface Props {
  article: ArticleData
  showAuthor?: boolean
  variant?: 'default' | 'compact'
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function ArticleCard({ article, showAuthor = true, variant = 'default' }: Props) {
  const url = article.column_slug === 'school-bits'
    ? `/articles/${article.slug}`
    : article.column_slug
      ? `/columns/${article.column_slug}/${article.slug.replace(new RegExp(`^${article.column_slug}-`), '')}`
      : `/articles/${article.slug}`

  const categoryLabel = article.column_slug
    ? (COLUMN_LABELS[article.column_slug] ?? article.column_slug)
    : article.guide_slug
      ? article.guide_slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
      : article.category ?? 'Feature'

  const badgeStyle = article.column_slug
    ? (COLUMN_BADGE_STYLE[article.column_slug] ?? 'bg-background/90 text-foreground backdrop-blur')
    : 'bg-background/90 text-foreground backdrop-blur'

  const heroSrc = article.hero_image_url || getFallbackByContext(
    article.column_slug ?? article.guide_slug ?? 'parenting',
    article.id,
  )

  const dateStr = fmtDate(article.published_at ?? article.created_at)

  const isNew = (() => {
    const d = article.published_at ?? article.created_at
    if (!d) return false
    return Date.now() - new Date(d).getTime() < 7 * 24 * 60 * 60 * 1000
  })()

  if (variant === 'compact') {
    return (
      <Link href={url} className="group flex gap-3 items-start">
        <div className="relative shrink-0 w-20 h-20 rounded-xl overflow-hidden bg-muted">
          <Image src={heroSrc} alt={article.title} fill style={{ objectFit: 'cover' }}
            className="group-hover:scale-105 transition-transform duration-500" sizes="80px" unoptimized />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm leading-snug line-clamp-2 group-hover:text-primary transition-colors">
            {article.title}
          </p>
          {dateStr && <p className="text-xs text-muted-foreground mt-1">{dateStr}</p>}
        </div>
      </Link>
    )
  }

  return (
    <Link href={url} className="group flex flex-col gap-2.5 cursor-pointer">
      {/* Image */}
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
        {/* Category badge */}
        <div className="absolute top-3 left-3">
          <span className={`text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full ${badgeStyle}`}>
            {categoryLabel}
          </span>
        </div>
        {/* New badge */}
        {isNew && (
          <div className="absolute top-3 right-3">
            <span className="text-[9px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full bg-green-500 text-white shadow-sm">
              New
            </span>
          </div>
        )}
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/8 transition-colors" />
      </div>

      {/* Content */}
      <h3 className="font-bold text-base leading-snug line-clamp-2 group-hover:text-primary transition-colors">
        {article.title}
      </h3>
      {article.excerpt && (
        <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed -mt-0.5">
          {article.excerpt}
        </p>
      )}

      {/* Meta row */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          {showAuthor && (
            <span className="font-medium text-foreground/70">
              {article.author_name ?? 'River Region Parents'}
            </span>
          )}
          {dateStr && <span>{dateStr}</span>}
        </div>
        <span className="flex items-center gap-1 font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
          Read <ArrowRight className="h-3 w-3" />
        </span>
      </div>
    </Link>
  )
}
