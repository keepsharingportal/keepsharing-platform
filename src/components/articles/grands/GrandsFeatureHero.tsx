// GrandsFeatureHero — magazine feature package that sits at the top of
// every Grands Are The Greatest article. Lives INSIDE the article col so
// the right sidebar (sponsor + newsletter + trending) renders alongside.
//
// Layout (single column inside main article col):
//   1. Logo (Grands wordmark)
//   2. Photo card with washi tape (rotated polaroid)
//   3. Title
//   4. Tagline
//   5. Byline (author · date · read time)
//   6. Snapshot + Pull quote (2-col grid on desktop, stacked mobile)
//
// Whole package sits on a soft cream wash so the column theme is
// contained inside the feature, not bleeding into the site chrome.

import { PhotoCardWithTape }   from '@/components/articles/grands/PhotoCardWithTape'
import { GrandparentSnapshot } from '@/components/articles/grands/GrandparentSnapshot'
import { PullQuote }            from '@/components/articles/grands/PullQuote'

interface Props {
  logoUrl?:         string | null
  title:            string
  tagline?:         string | null
  authorName?:      string | null
  publishedDate?:   string
  readTimeMinutes?: number
  heroImageUrl:     string
  snapshot: {
    grandkids?:  string | null
    nickname?:   string | null
    traditions?: string | null
  }
  pullQuote?: {
    quote:       string
    attribution: string
  } | null
}

export function GrandsFeatureHero({
  logoUrl, title, tagline, authorName, publishedDate, readTimeMinutes,
  heroImageUrl, snapshot, pullQuote,
}: Props) {
  const hasSnapshot = snapshot.grandkids || snapshot.nickname || snapshot.traditions

  return (
    <section className="rounded-3xl bg-[#FFFDF8] px-5 py-7 md:px-8 md:py-9 mb-8">
      {/* 1. Logo */}
      {logoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl}
          alt="Grands Are The Greatest"
          className="mb-6 h-auto w-full max-w-md"
        />
      )}

      {/* 2. Photo card with tape (rotated polaroid). Sits between the
          logo and title in the main column. */}
      <div className="mb-7 md:mb-8">
        <PhotoCardWithTape src={heroImageUrl} alt={title} />
      </div>

      {/* 3. Title */}
      <h1 className="font-serif text-3xl font-bold leading-tight text-[#08264A] sm:text-4xl md:text-5xl">
        {title}
      </h1>

      {/* 4. Tagline */}
      {tagline && (
        <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-700 md:text-lg">
          {tagline}
        </p>
      )}

      {/* 5. Byline */}
      <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-slate-600">
        {authorName && <span>By {authorName}</span>}
        {authorName && publishedDate && <span>•</span>}
        {publishedDate && <span>{publishedDate}</span>}
        {(authorName || publishedDate) && readTimeMinutes !== undefined && <span>•</span>}
        {readTimeMinutes !== undefined && <span>{readTimeMinutes} min read</span>}
      </div>

      {/* 6. Snapshot + Pull quote — 2-col on desktop, stacked mobile */}
      {(hasSnapshot || pullQuote) && (
        <div className="mt-7 md:mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.4fr]">
          {hasSnapshot ? (
            <GrandparentSnapshot
              grandkids={snapshot.grandkids}
              nickname={snapshot.nickname}
              traditions={snapshot.traditions}
            />
          ) : <div />}
          {pullQuote && (
            <PullQuote quote={pullQuote.quote} attribution={pullQuote.attribution} />
          )}
        </div>
      )}
    </section>
  )
}
