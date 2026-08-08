import Link from 'next/link'
import Image from 'next/image'
import { Badge } from '@/components/ui/badge'
import { getFallbackByContext } from '@/lib/image-fallbacks'
import { shouldSkipNextOptimizer } from '@/lib/images'
import { articleHref } from '@/lib/articles/slug'
import { ArrowRight } from 'lucide-react'
import { isEducationMattersColumn, getDistrictForColumn } from '@/lib/education-matters/districts'
import { EducationMattersBrandedHero } from '@/components/education/EducationMattersBrandedHero'

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
  /** Optional lookup {column_slug → superintendent photo URL} used
   *  ONLY when the article is an Education Matters column and has no
   *  uploaded hero. Pages that render many EM cards (homepage Latest
   *  Stories, district hub) pre-fetch this once and pass it down so
   *  the branded card shows the real superintendent's face instead
   *  of the district logo fallback. Undefined → cards fall back to
   *  the logo layout gracefully. */
  emSuperintendentPhotos?: Record<string, { photoUrl: string | null }>
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function ArticleCard({ article, showAuthor = true, variant = 'default', emSuperintendentPhotos }: Props) {
  const url = articleHref(article)

  // Education Matters articles carry a district-specific column slug
  // (education-matters-<district>). When no hero is uploaded we render
  // a branded district card in place of the generic stock fallback —
  // reader sees the district's real brand color + logo (or district
  // name typography if the logo file isn't in the repo yet) and
  // recognizes which district this message is from before reading the
  // title. Real uploaded hero still wins.
  const emDistrict = isEducationMattersColumn(article.column_slug ?? null)
    ? getDistrictForColumn(article.column_slug ?? null)
    : null
  const isBrandedEmCard = !!emDistrict && !article.hero_image_url

  const categoryLabel = emDistrict
    ? `${emDistrict.shortName} Schools`
    : article.column_slug
      ? (COLUMN_LABELS[article.column_slug] ?? article.column_slug)
      : article.guide_slug
        ? article.guide_slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
        : article.category ?? 'Feature'

  const badgeStyle = emDistrict
    ? 'text-white'  // background comes from inline style below (district accent)
    : article.column_slug
      ? (COLUMN_BADGE_STYLE[article.column_slug] ?? 'bg-background/90 text-foreground backdrop-blur')
      : 'bg-background/90 text-foreground backdrop-blur'

  const heroSrc = article.hero_image_url || getFallbackByContext(
    article.column_slug ?? article.guide_slug ?? 'parenting',
    article.id,
  )

  const emMonthLabel = article.published_at
    ? new Date(article.published_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : undefined

  const emSupPhotoUrl = emDistrict && emSuperintendentPhotos
    ? emSuperintendentPhotos[emDistrict.slug]?.photoUrl ?? null
    : null

  const dateStr = fmtDate(article.published_at ?? article.created_at)

  const isNew = (() => {
    const d = article.published_at ?? article.created_at
    if (!d) return false
    return Date.now() - new Date(d).getTime() < 7 * 24 * 60 * 60 * 1000
  })()

  if (variant === 'compact') {
    return (
      <Link href={url} className="group flex gap-3.5 items-start">
        <div className="relative shrink-0 w-24 h-24 md:w-28 md:h-28 rounded-xl overflow-hidden bg-muted">
          {isBrandedEmCard && emDistrict ? (
            <EducationMattersBrandedHero
              district={emDistrict}
              superintendentPhotoUrl={emSupPhotoUrl}
              compact
            />
          ) : (
            <Image src={heroSrc} alt={article.title} fill style={{ objectFit: 'cover', objectPosition: 'center top' }}
              className="group-hover:scale-105 transition-transform duration-500" sizes="(max-width: 768px) 96px, 112px" unoptimized={shouldSkipNextOptimizer(article.hero_image_url)} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm md:text-base leading-snug line-clamp-3 group-hover:text-primary transition-colors">
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
        {isBrandedEmCard && emDistrict ? (
          <EducationMattersBrandedHero
            district={emDistrict}
            monthLabel={emMonthLabel}
            title={article.title}
            superintendentPhotoUrl={emSupPhotoUrl}
            compact
          />
        ) : (
          <Image
            src={heroSrc}
            alt={article.title}
            fill
            style={{ objectFit: 'cover', objectPosition: 'center top' }}
            className="group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 640px) 100vw, 33vw"
            unoptimized={shouldSkipNextOptimizer(article.hero_image_url)}
          />
        )}
        {/* Category badge — hidden when branded EM card renders since
            the whole card IS the district identity; the badge would be
            redundant and cluttery on top of the logo. */}
        {!isBrandedEmCard && (
          <div className="absolute top-3 left-3">
            <span
              className={`text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full ${badgeStyle}`}
              style={emDistrict ? { backgroundColor: emDistrict.accent } : undefined}
            >
              {categoryLabel}
            </span>
          </div>
        )}
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
