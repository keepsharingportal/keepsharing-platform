// TeacherFeatureHero — top hero block of every Teacher of the Month
// article. Same magazine-feature pattern as Grands / Play Ball, but in
// the Teacher palette (navy / red / gold on cream) with two extras:
//
//   • A red+star eyebrow tagline between the logo and the title
//     ("★ Celebrating educators who inspire... ★").
//   • A circular navy/gold Thank You badge overlapping the bottom-right
//     corner of the photo card. Photo uses a red washi-tape strip.
//
// Desktop: 2-col — left col stacks logo → eyebrow → title → lede →
// byline+share (rows 1-5). Photo card spans rows 1-5 in the right col.
// Mobile: source order — logo → photo → eyebrow → title → lede →
// byline+share. Explicit row positions on lg keep the photo directly
// under the logo on mobile.

import { PhotoCardWithTape }      from '@/components/articles/grands/PhotoCardWithTape'
import { SocialShareButtons }     from '@/components/articles/grands/SocialShareButtons'
import { TeacherThankYouBadge }   from '@/components/articles/teacher/TeacherThankYouBadge'
import { Star }                    from 'lucide-react'

interface Props {
  logoUrl?:         string | null
  /** Brand-level tagline ("Celebrating educators...") — renders as the
   *  red+star eyebrow above the title. */
  tagline?:         string | null
  title:            string
  /** Article subtitle / lede paragraph — renders below the title. */
  subtitle?:        string | null
  authorName?:      string | null
  publishedDate?:   string
  readTimeMinutes?: number
  heroImageUrl:     string
  shareUrl:         string
}

// Red @ ~80% alpha so it reads as washi tape against the cream hero bg.
const TEACHER_TAPE = '#E4312BCC'

export function TeacherFeatureHero({
  logoUrl, tagline, title, subtitle, authorName, publishedDate, readTimeMinutes,
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
              alt="Teacher of the Month"
              className="h-auto w-full max-w-md"
            />
          )}
        </div>

        {/* 2. Photo card with red tape + Thank You badge overlap */}
        <div className="relative lg:col-start-2 lg:row-start-1 lg:row-span-5">
          <PhotoCardWithTape src={heroImageUrl} alt={title} tapeColor={TEACHER_TAPE} />
          <TeacherThankYouBadge />
        </div>

        {/* 3. Red eyebrow tagline with star + dash flanking */}
        {tagline && (
          <div className="lg:col-start-1 lg:row-start-2">
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-black uppercase tracking-[0.16em] text-[#E4312B] md:text-xs">
              <Star className="h-3.5 w-3.5 fill-[#D9A21B] text-[#D9A21B]" />
              <span className="h-px w-6 bg-[#D9A21B]" />
              <span className="flex-1 min-w-0">{tagline}</span>
              <span className="h-px w-6 bg-[#D9A21B]" />
              <Star className="h-3.5 w-3.5 fill-[#D9A21B] text-[#D9A21B]" />
            </div>
          </div>
        )}

        {/* 4. Title */}
        <h1 className="font-serif text-3xl font-bold leading-tight text-[#08264A] sm:text-4xl md:text-5xl lg:col-start-1 lg:row-start-3">
          {title}
        </h1>

        {/* 5. Lede / subtitle */}
        {subtitle && (
          <p className="max-w-xl text-base leading-relaxed text-slate-700 md:text-lg lg:col-start-1 lg:row-start-4">
            {subtitle}
          </p>
        )}

        {/* 6. Byline + share + HR */}
        <div className="lg:col-start-1 lg:row-start-5">
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
          <hr className="mt-5 border-[#D9A21B]/40" />
        </div>
      </div>
    </section>
  )
}
