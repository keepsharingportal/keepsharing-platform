// GrandsFeatureHero — top hero block of every Grands article. Full-width
// inside the article main area (above the article + sidebar grid).
//
// Desktop: 2-col grid with the column text on the left (logo → title →
// tagline → byline + social) and the photo card with tape on the right.
// A horizontal divider closes the left column under the byline row.
//
// Mobile: stacks logo → title → tagline → byline + social → photo card.
//
// The snapshot + pull quote no longer live here — they render below the
// hero inside the main column (via GrandsSnapshotQuote) so the sidebar
// can sit alongside them starting at the divider level, per the spec.

import { PhotoCardWithTape }    from '@/components/articles/grands/PhotoCardWithTape'
import { SocialShareButtons }    from '@/components/articles/grands/SocialShareButtons'

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
      <div className="grid gap-7 md:gap-10 lg:grid-cols-[1fr_1fr] lg:items-start">
        {/* LEFT — logo, title, tagline, byline + social, HR */}
        <div>
          {logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt="Grands Are The Greatest"
              className="mb-5 h-auto w-full max-w-md"
            />
          )}

          <h1 className="font-serif text-3xl font-bold leading-tight text-[#08264A] sm:text-4xl md:text-5xl">
            {title}
          </h1>

          {tagline && (
            <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-700 md:text-lg">
              {tagline}
            </p>
          )}

          {/* Byline on the left, share buttons on the right */}
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
              {authorName && <span>By {authorName}</span>}
              {authorName && publishedDate && <span>•</span>}
              {publishedDate && <span>{publishedDate}</span>}
              {(authorName || publishedDate) && readTimeMinutes !== undefined && <span>•</span>}
              {readTimeMinutes !== undefined && <span>{readTimeMinutes} min read</span>}
            </div>
            <SocialShareButtons shareUrl={shareUrl} />
          </div>

          <hr className="mt-5 border-[#E8D8EE]" />
        </div>

        {/* RIGHT — photo card with tape. Sits in its own cell so it doesn't
            push the title down. items-start at the grid level keeps the
            title at the top of the row. */}
        <PhotoCardWithTape src={heroImageUrl} alt={title} />
      </div>
    </section>
  )
}
