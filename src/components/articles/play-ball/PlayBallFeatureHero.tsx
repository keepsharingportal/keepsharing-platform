// PlayBallFeatureHero — top hero block of every Play Ball article. Same
// magazine-feature pattern as GrandsFeatureHero, but in the Play Ball
// palette (navy + gold) with a yellow washi-tape strip on the photo.
//
// Desktop: 2-col layout — left col stacks logo (row 1) → title (row 2) →
// tagline (row 3) → byline + share (row 4). Photo spans rows 1-4 in the
// right col so it aligns top with the logo.
//
// Mobile: single column in source order — logo → photo → title → tagline
// → byline + share → HR. Explicit row positions on lg keep the photo
// directly under the logo on mobile.

import { PhotoCardWithTape }   from '@/components/articles/grands/PhotoCardWithTape'
import { SocialShareButtons }  from '@/components/articles/grands/SocialShareButtons'

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

// Play Ball gold @ ~80% alpha — slightly more saturated than the Grands
// purple tape so it reads on the cream hero bg.
const PLAY_BALL_TAPE = '#F3BF24CC'

export function PlayBallFeatureHero({
  logoUrl, title, tagline, authorName, publishedDate, readTimeMinutes,
  heroImageUrl, shareUrl,
}: Props) {
  return (
    <section className="rounded-3xl bg-[#FFFDF8] px-5 py-7 md:px-8 md:py-9 mb-8">
      <div className="grid gap-6 lg:grid-cols-[1fr_1fr] lg:gap-10 lg:items-start">
        {/* 1. Logo */}
        <div className="lg:col-start-1 lg:row-start-1">
          {logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt="Play Ball"
              className="h-auto w-full max-w-[33.6rem]"
            />
          )}
        </div>

        {/* 2. Photo card with YELLOW tape */}
        <div className="lg:col-start-2 lg:row-start-1 lg:row-span-4">
          <PhotoCardWithTape src={heroImageUrl} alt={title} tapeColor={PLAY_BALL_TAPE} />
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
              {authorName && <span>By {authorName}</span>}
              {authorName && publishedDate && <span>•</span>}
              {publishedDate && <span>{publishedDate}</span>}
              {(authorName || publishedDate) && readTimeMinutes !== undefined && <span>•</span>}
              {readTimeMinutes !== undefined && <span>{readTimeMinutes} min read</span>}
            </div>
            <SocialShareButtons shareUrl={shareUrl} />
          </div>
          <hr className="mt-5 border-[#EADBA5]" />
        </div>
      </div>
    </section>
  )
}
