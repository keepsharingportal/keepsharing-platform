import type { ReactNode } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Heart, ArrowRight, MessageCircle } from 'lucide-react'
import { ArticleBody } from '@/components/articles/ArticleBody'
import { getFallbackByContext } from '@/lib/image-fallbacks'
import { NewsletterSignup } from '@/components/NewsletterSignup'

// Contributor column display names and descriptions
const COLUMN_META: Record<string, { label: string; desc: string; color: string }> = {
  'mom-to-mom':         { label: 'Mom to Mom',            desc: 'Real stories from River Region moms',                color: 'rose'   },
  'grumpy-but-grateful':{ label: 'Grumpy but Grateful',   desc: 'An honest take on family life',                      color: 'orange' },
  'grands-greatest':    { label: 'Grands are the Greatest',desc: 'Life as seen through a grandparent\'s eyes',        color: 'purple' },
  'dave-says':          { label: 'Dave Says',              desc: 'Faith, family, and finances',                        color: 'blue'   },
  'meeting-kids':       { label: 'Meeting Kids Where They Are', desc: 'A mental health column for families',           color: 'teal'   },
  'teens-tweens-screens':{ label: 'Teens, Tweens & Screens', desc: 'Navigating digital life with kids',               color: 'indigo' },
}

const COLOR_CLASSES: Record<string, { badge: string; bg: string; border: string; heading: string }> = {
  rose:   { badge: 'bg-rose-500 text-white',    bg: 'bg-rose-50',   border: 'border-rose-200',   heading: 'text-rose-800'   },
  orange: { badge: 'bg-orange-500 text-white',  bg: 'bg-orange-50', border: 'border-orange-200', heading: 'text-orange-800' },
  purple: { badge: 'bg-purple-600 text-white',  bg: 'bg-purple-50', border: 'border-purple-200', heading: 'text-purple-800' },
  blue:   { badge: 'bg-blue-600 text-white',    bg: 'bg-blue-50',   border: 'border-blue-200',   heading: 'text-blue-800'   },
  teal:   { badge: 'bg-teal-600 text-white',    bg: 'bg-teal-50',   border: 'border-teal-200',   heading: 'text-teal-800'   },
  indigo: { badge: 'bg-indigo-600 text-white',  bg: 'bg-indigo-50', border: 'border-indigo-200', heading: 'text-indigo-800' },
}

interface Props {
  title: string
  excerpt?: string | null
  heroImageUrl?: string | null
  authorName?: string | null
  authorBio?: string | null
  authorAvatarUrl?: string | null
  publishedAt?: string | null
  columnSlug: string
  body: string
  pullQuotes?: string[]
  inlineAd?: ReactNode
  articleId: string
}

export function ContributorArticleLayout({
  title, excerpt, heroImageUrl, authorName, authorBio,
  publishedAt, columnSlug, body, pullQuotes, inlineAd, articleId,
}: Props) {
  const meta   = COLUMN_META[columnSlug] ?? { label: 'Contributor Column', desc: '', color: 'rose' }
  const colors = COLOR_CLASSES[meta.color] ?? COLOR_CLASSES.rose
  const imgSrc = heroImageUrl || getFallbackByContext(columnSlug, articleId)

  const initials = authorName
    ? authorName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : 'RRP'

  const dateLabel = publishedAt
    ? new Date(publishedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : ''

  return (
    <div>
      {/* Column identity band */}
      <div className={`flex items-center gap-3 mb-5 px-4 py-3 rounded-2xl border ${colors.bg} ${colors.border}`}>
        <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full ${colors.badge}`}>
          {meta.label}
        </span>
        {meta.desc && (
          <p className="text-xs text-muted-foreground hidden sm:block">{meta.desc}</p>
        )}
      </div>

      {/* Prominent author card — contributor gets front stage */}
      {authorName && (
        <div className="flex items-start gap-4 mb-6 p-4 rounded-xl border border-border/50 bg-card">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-base font-black shrink-0 ${colors.badge}`}>
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-base text-foreground leading-tight">{authorName}</p>
            <p className={`text-xs font-semibold mt-0.5 ${colors.heading}`}>{meta.label}</p>
            {authorBio && (
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed line-clamp-2">{authorBio}</p>
            )}
          </div>
          {dateLabel && (
            <p className="text-xs text-muted-foreground shrink-0 hidden sm:block mt-0.5">{dateLabel}</p>
          )}
        </div>
      )}

      {/* Hero image */}
      <div className="relative w-full aspect-video md:aspect-[21/9] rounded-2xl overflow-hidden mb-6 shadow-sm border border-border/50">
        <Image
          src={imgSrc}
          alt={title}
          fill
          style={{ objectFit: 'cover' }}
          sizes="(max-width: 1024px) 100vw, 66vw"
          priority
          unoptimized
        />
      </div>

      {/* Lede / excerpt in a warm serif style */}
      {excerpt && (
        <p className="text-xl font-medium leading-relaxed text-foreground mb-6 italic">
          {excerpt}
        </p>
      )}

      {/* Article body */}
      <ArticleBody body={body} pullQuotes={pullQuotes} inlineAd={inlineAd} />

      {/* Inline newsletter CTA — contributor articles drive subscriptions */}
      <div className="mt-10 p-6 rounded-2xl bg-primary/5 border border-primary/20">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
            <MessageCircle className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="font-bold text-sm text-foreground">Enjoyed this column?</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Get new stories from {authorName ?? 'our contributors'} and more River Region families every Thursday.
            </p>
          </div>
        </div>
        <NewsletterSignup variant="inline" source={`contributor-article-${columnSlug}`} />
      </div>

      {/* More from this column */}
      <div className="mt-8">
        <Link
          href={`/columns/${columnSlug}`}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
        >
          <Heart className="h-4 w-4" />
          More from {meta.label} <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  )
}
