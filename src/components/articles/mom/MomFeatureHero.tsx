// MomFeatureHero — top hero block of every Mom to Mom feature article.
// Same magazine-feature shape as Grands / Play Ball / Teacher, but in
// the Mom palette (cream + blush + coral, navy text) with a soft blush
// washi-tape strip on the photo card.
//
// Desktop: 2-col — left col stacks logo → title → subtitle → byline+share
// (rows 1-4). Photo card spans rows 1-4 in the right col.
// Mobile: source order — logo → photo → title → subtitle → byline+share.

import { PhotoCardWithTape }  from '@/components/articles/grands/PhotoCardWithTape'
import { SocialShareButtons } from '@/components/articles/grands/SocialShareButtons'

interface Props {
  logoUrl?:         string | null
  title:            string
  subtitle?:        string | null
  authorName?:      string | null
  publishedDate?:   string
  readTimeMinutes?: number
  heroImageUrl:     string
  shareUrl:         string
}

// Soft blush @ ~75% alpha — sits on the cream hero bg like a torn-paper
// washi strip without feeling heavy.
const MOM_TAPE = '#F7E3E1BF'

export function MomFeatureHero({
  logoUrl, title, subtitle, authorName, publishedDate, readTimeMinutes,
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
              alt="Mom to Mom"
              className="h-auto w-full max-w-md"
            />
          )}
        </div>

        {/* 2. Photo card with blush tape */}
        <div className="lg:col-start-2 lg:row-start-1 lg:row-span-4">
          <PhotoCardWithTape src={heroImageUrl} alt={title} tapeColor={MOM_TAPE} />
        </div>

        {/* 3. Title */}
        <h1 className="font-serif text-3xl font-bold leading-tight text-[#08264A] sm:text-4xl md:text-5xl lg:col-start-1 lg:row-start-2">
          {title}
        </h1>

        {/* 4. Subtitle / standfirst */}
        {subtitle && (
          <p className="max-w-xl text-base leading-relaxed text-slate-700 md:text-lg lg:col-start-1 lg:row-start-3">
            {subtitle}
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
          <hr className="mt-5 border-[#E8C9C6]" />
        </div>
      </div>
    </section>
  )
}
