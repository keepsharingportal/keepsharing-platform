import type { ReactNode } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Heart, ArrowRight, MessageCircle } from 'lucide-react'
import { ArticleBody } from '@/components/articles/ArticleBody'
import { getFallbackByContext } from '@/lib/image-fallbacks'
import { NewsletterSignup } from '@/components/NewsletterSignup'

// Contributor column display label, used by the bottom "More from…" link.
const COLUMN_LABEL: Record<string, string> = {
  'mom-to-mom':          'Mom to Mom',
  'grumpy-but-grateful': 'Grumpy but Grateful',
  'grands-greatest':     'Grands are the Greatest',
  'dave-says':           'Dave Says',
  'meeting-kids':        'Meeting Kids Where They Are',
  'teens-tweens-screens':'Teens, Tweens & Screens',
}

interface Props {
  title: string
  excerpt?: string | null
  heroImageUrl?: string | null
  authorName?: string | null
  columnSlug: string
  body: string
  pullQuotes?: string[]
  inlineAd?: ReactNode
  articleId: string
}

export function ContributorArticleLayout({
  title, excerpt, heroImageUrl, authorName,
  columnSlug, body, pullQuotes, inlineAd, articleId,
}: Props) {
  const columnLabel = COLUMN_LABEL[columnSlug] ?? 'Contributor Column'
  const imgSrc      = heroImageUrl || getFallbackByContext(columnSlug, articleId)

  return (
    <div>
      {/* Hero image — favors faces (anchored to top, 3:2 mobile / 16:9 desktop). */}
      <div className="relative w-full aspect-[3/2] md:aspect-[16/9] rounded-2xl overflow-hidden mb-6 shadow-sm border border-border/50">
        <Image
          src={imgSrc}
          alt={title}
          fill
          style={{ objectFit: 'cover', objectPosition: 'center top' }}
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
          More from {columnLabel} <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  )
}
