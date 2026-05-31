// GrandsFeatureHero — the magazine-style feature package that wraps the
// top of every Grands Are The Greatest article.
//
// Layout:
//   Desktop:  2-column grid (text left / PhotoCardWithTape right) above
//             a 2-column grid below (GrandparentSnapshot + PullQuote)
//   Mobile:   Stacked — logo → title → deck → byline → photo card →
//             snapshot → pull quote
//
// The whole section sits on a cream wash so the column theme is contained
// inside the feature package and doesn't bleed into the rest of the site.

import { PhotoCardWithTape }  from '@/components/articles/grands/PhotoCardWithTape'
import { GrandparentSnapshot } from '@/components/articles/grands/GrandparentSnapshot'
import { PullQuote }           from '@/components/articles/grands/PullQuote'

interface Props {
  logoUrl?:        string | null
  title:           string
  tagline?:        string | null
  authorName?:     string | null
  publishedDate?:  string
  readTimeMinutes?: number
  heroImageUrl:    string
  /** Spotlight data fields used to populate the snapshot. */
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
  return (
    <section className="rounded-3xl bg-[#FFFDF8] px-5 py-8 md:px-8 md:py-10 mb-8">
      {/* Top — 2-column hero (text left, photo right) */}
      <div className="grid gap-8 lg:grid-cols-[1fr_1.05fr] lg:items-center">
        <div>
          {logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt="Grands Are The Greatest"
              className="mb-5 h-auto w-full max-w-md"
            />
          )}

          <h1 className="max-w-2xl font-serif text-3xl font-bold leading-tight text-[#08264A] sm:text-4xl md:text-5xl">
            {title}
          </h1>

          {tagline && (
            <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-700 md:text-lg">
              {tagline}
            </p>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-slate-600">
            {authorName && <span>By {authorName}</span>}
            {authorName && publishedDate && <span>•</span>}
            {publishedDate && <span>{publishedDate}</span>}
            {(authorName || publishedDate) && readTimeMinutes !== undefined && <span>•</span>}
            {readTimeMinutes !== undefined && <span>{readTimeMinutes} min read</span>}
          </div>
        </div>

        <PhotoCardWithTape src={heroImageUrl} alt={title} />
      </div>

      {/* Below — snapshot + pull quote in a 2-column grid (desktop) */}
      {(snapshot.grandkids || snapshot.nickname || snapshot.traditions || pullQuote) && (
        <div className="mt-8 grid gap-6 lg:grid-cols-[0.85fr_1.6fr]">
          <GrandparentSnapshot
            grandkids={snapshot.grandkids}
            nickname={snapshot.nickname}
            traditions={snapshot.traditions}
          />
          {pullQuote && (
            <PullQuote quote={pullQuote.quote} attribution={pullQuote.attribution} />
          )}
        </div>
      )}
    </section>
  )
}
