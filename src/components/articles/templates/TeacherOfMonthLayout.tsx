import type { ReactNode } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Trophy, GraduationCap, ArrowRight, Heart } from 'lucide-react'
import { ArticleBody } from '@/components/articles/ArticleBody'
import { getFallback } from '@/lib/image-fallbacks'

interface Props {
  title: string
  excerpt?: string | null
  heroImageUrl?: string | null
  authorName?: string | null
  publishedAt?: string | null
  body: string
  pullQuotes?: string[]
  inlineAd?: ReactNode
  articleId: string
}

export function TeacherOfMonthLayout({
  title, excerpt, heroImageUrl, authorName, publishedAt,
  body, pullQuotes, inlineAd, articleId,
}: Props) {
  const imgSrc = heroImageUrl || getFallback('person_woman', articleId)
  const dateLabel = publishedAt
    ? new Date(publishedAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : ''

  return (
    <div>
      {/* Award banner strip */}
      <div className="flex items-center gap-3 mb-6 px-5 py-3.5 bg-amber-50 border border-amber-200 rounded-2xl">
        <div className="w-9 h-9 rounded-full bg-amber-400 flex items-center justify-center shrink-0">
          <Trophy className="h-4.5 w-4.5 text-white" style={{ height: '1.125rem', width: '1.125rem' }} />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-widest text-amber-700">Teacher of the Month</p>
          {dateLabel && (
            <p className="text-xs text-amber-600 font-medium mt-0.5">{dateLabel} Edition</p>
          )}
        </div>
        <Link
          href="/nominate"
          className="ml-auto shrink-0 text-xs font-semibold text-amber-700 hover:text-amber-900 flex items-center gap-1 transition-colors"
        >
          Nominate <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {/* Portrait hero — taller ratio for a person photo */}
      <div className="relative w-full aspect-[3/2] md:aspect-[16/7] rounded-2xl overflow-hidden mb-6 shadow-sm border border-amber-100">
        <Image
          src={imgSrc}
          alt={title}
          fill
          style={{ objectFit: 'cover', objectPosition: 'center top' }}
          sizes="(max-width: 1024px) 100vw, 66vw"
          priority
          unoptimized
        />
        {/* Amber gradient overlay at bottom */}
        <div className="absolute inset-0 bg-gradient-to-t from-amber-950/30 via-transparent to-transparent" />
      </div>

      {/* Excerpt if available */}
      {excerpt && (
        <p className="text-lg font-medium text-foreground/85 leading-relaxed mb-6 italic border-l-4 border-amber-400 pl-4">
          {excerpt}
        </p>
      )}

      {/* Article body */}
      <ArticleBody body={body} pullQuotes={pullQuotes} inlineAd={inlineAd} />

      {/* Bottom nomination CTA */}
      <div className="mt-10 p-6 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-amber-400 flex items-center justify-center shrink-0">
          <GraduationCap className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-amber-900">Know an Outstanding Educator?</p>
          <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
            We celebrate one River Region teacher each month. Nominations are open year-round.
          </p>
        </div>
        <Link
          href="/nominate/teacher"
          className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 text-white rounded-full text-sm font-bold hover:bg-amber-600 transition-colors shadow-sm"
        >
          <Heart className="h-3.5 w-3.5" /> Nominate a Teacher
        </Link>
      </div>

      {/* School Zone link */}
      <div className="mt-6">
        <Link
          href="/school-zone"
          className="text-sm font-semibold text-primary hover:text-primary/80 transition-colors flex items-center gap-1.5"
        >
          <GraduationCap className="h-4 w-4" />
          Back to School Zone
        </Link>
      </div>
    </div>
  )
}
