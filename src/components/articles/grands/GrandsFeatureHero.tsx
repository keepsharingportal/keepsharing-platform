// GrandsFeatureHero — top hero block of every Grands article. Full-width
// inside the article main area (above the article + sidebar grid).
//
// Desktop: 2-col layout — left col has logo (row 1) → title (row 2) →
// tagline (row 3) → byline + share (row 4) → HR. The photo card sits in
// the right col, spanning all 4 rows so it aligns top with the logo.
//
// Mobile: stacks in this order — logo → photo → title → tagline →
// byline + share → HR. The CSS row positions ensure the photo follows
// the logo (not the byline) when the grid collapses to one column, per
// the spec.

import { PhotoCardWithTape } from '@/components/articles/grands/PhotoCardWithTape'
import { SocialShareButtons } from '@/components/articles/grands/SocialShareButtons'
import { AuthorByline } from '@/components/articles/AuthorByline'

interface Props {
  logoUrl?:         string | null
  title:            string
  tagline?:         string | null
  authorName?:      string | null
  publishedDate?:   string
  readTimeMinutes?: number
  heroImageUrl:     string
  shareUrl:         string
}

export function GrandsFeatureHero({
  logoUrl, title, tagline, authorName, publishedDate, readTimeMinutes,
  heroImageUrl, shareUrl,
}: Props) {
  return (
    <section className="rounded-3xl bg-[#FFFDF8] px-5 py-7 md:px-8 md:py-9 mb-8">
      {/* Grid: single col on mobile (source order applies), 2-col on
          desktop with explicit row positions so the photo lives in col 2
          spanning rows 1-4 alongside the left-col text stack. */}
      <div className="grid gap-6 lg:grid-cols-[1fr_1fr] lg:gap-10 lg:items-start">
        {/* 1. Logo — top-left on desktop, FIRST on mobile */}
        <div className="lg:col-start-1 lg:row-start-1">
          {logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt="Grands Are The Greatest"
              className="h-auto w-full max-w-[33.6rem]"
            />
          )}
        </div>

        {/* 2. Photo card — right col spanning rows 1-4 on desktop, SECOND
              (right after logo) on mobile per the spec. */}
        <div className="lg:col-start-2 lg:row-start-1 lg:row-span-4">
          <PhotoCardWithTape src={heroImageUrl} alt={title} />
        </div>

        {/* 3. Title */}
        <h1 className="font-serif text-3xl font-bold leading-tight text-[#08264A] sm:text-4xl md:text-5xl lg:col-start-1 lg:row-start-2">
          {title}
        </h1>

        {/* 4. Tagline */}
        {tagline && (
          <p className="max-w-xl text-base leading-relaxed text-slate-700 md:text-lg lg:col-start-1 lg:row-start-3">
            {tagline}
          </p>
        )}

        {/* 5. Byline + share + HR */}
        <div className="lg:col-start-1 lg:row-start-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
              {authorName && <AuthorByline authorName={authorName} className="hover:underline" />}
              {authorName && publishedDate && <span>•</span>}
              {publishedDate && <span>{publishedDate}</span>}
              {(authorName || publishedDate) && readTimeMinutes !== undefined && <span>•</span>}
              {readTimeMinutes !== undefined && <span>{readTimeMinutes} min read</span>}
            </div>
            <SocialShareButtons shareUrl={shareUrl} />
          </div>
          <hr className="mt-5 border-[#E8D8EE]" />
        </div>
      </div>
    </section>
  )
}
