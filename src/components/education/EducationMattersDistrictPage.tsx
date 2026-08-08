// ── Education Matters — district landing / hub page ──────────────────
//
// Rendered when a reader lands on /columns/education-matters-<district>
// (e.g. clicking a district tab). Not a stripped-down archive — a
// magazine-style hub that tells the district story:
//
//   Masthead + district tabs (same chrome as the article page)
//   Superintendent card + This Month's Message preview (paired hero)
//   Sponsor strip (if a section_sponsor is active for this district)
//   Past Messages archive grid (older articles for this district)
//   More Education Matters — peer district cross-nav
//
// Every module either reuses the exports from EducationMattersLayout
// (chrome, tabs, superintendent card, sponsor strip) or is a small
// hub-specific piece defined here. No new tables, no new admin
// surface — the sponsor pulls from the same ad_placements row as
// the article page's sponsor strip.

import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, CalendarDays, Clock, UserRound, GraduationCap } from 'lucide-react'

import type { AuthorProfile } from '@/lib/seo/authors'
import type { SectionSponsor } from '@/lib/section-sponsors'
import type { DistrictConfig } from '@/lib/education-matters/districts'
import {
  EDUCATION_THEME as THEME,
  EducationMattersLogo,
  EducationDistrictTabs,
  SuperintendentCard,
  EducationSponsorStrip,
  resolveSuperintendent,
  type EducationSponsor,
} from './EducationMattersLayout'
import { MoreEducationMatters } from './MoreEducationMatters'
import { EducationMattersBrandedHero } from './EducationMattersBrandedHero'

export interface DistrictArticleCard {
  id:              string
  slug:            string
  title:           string
  excerpt:         string | null
  hero_image_url:  string | null
  author_name:     string | null
  published_at:    string | null
  read_time_minutes: number | null
}

export interface DistrictPageSidebarItem {
  slug:  string   // peer district column slug
  href:  string
  label: string
}

interface Props {
  district:              DistrictConfig
  superintendentProfile: AuthorProfile | null
  featured:              DistrictArticleCard | null
  pastArticles:          DistrictArticleCard[]
  sectionSponsor:        SectionSponsor | null
  peerItems:             DistrictPageSidebarItem[]
}

export function EducationMattersDistrictPage({
  district, superintendentProfile, featured, pastArticles, sectionSponsor, peerItems,
}: Props) {
  const superintendent = resolveSuperintendent(district, superintendentProfile)
  // Pass the DB-loaded superintendent photo down to every card on this
  // page. When present it drives the "photo layout" variant of the
  // branded hero (matches the article page superintendent card DNA).
  const supPhoto = superintendentProfile?.headshotUrl?.trim() || null

  // Map the shared SectionSponsor shape (fed by ad_placements
  // section_sponsor rows) into the richer EducationSponsor shape the
  // strip component expects. Same mapping the article page uses.
  const sponsor: EducationSponsor | null = sectionSponsor
    ? {
        name:        sectionSponsor.sponsor_name,
        url:         sectionSponsor.cta_url?.trim() || '#',
        logoUrl:     sectionSponsor.logo_url,
        imageUrl:    sectionSponsor.image_url,
        tagline:     sectionSponsor.sponsor_message,
        description: sectionSponsor.description,
        buttonText:  sectionSponsor.cta_label,
      }
    : null

  return (
    <main className="mx-auto max-w-7xl px-5 py-8" style={{ color: THEME.text }}>

      {/* Masthead + district tabs */}
      <section className="mb-8 grid gap-6 lg:grid-cols-[1fr_0.95fr] lg:items-start">
        <EducationMattersLogo />
        <EducationDistrictTabs activeSlug={district.slug} />
      </section>

      {/* Superintendent card + This Month's Message (paired hero) */}
      <section className="mb-10 grid gap-8 lg:grid-cols-[0.85fr_1fr] lg:items-center">
        <SuperintendentCard district={district} superintendent={superintendent} />
        {featured
          ? <ThisMonthsMessage district={district} featured={featured} superintendentPhotoUrl={supPhoto} />
          : <NoMessageYet district={district} />}
      </section>

      {/* Sponsor strip — only when a section_sponsor is active for this
          district's column. Same source of truth as the article page. */}
      {sponsor && (
        <section className="mb-10">
          <EducationSponsorStrip sponsor={sponsor} />
        </section>
      )}

      {/* Past Messages archive — everything except the featured article. */}
      {pastArticles.length > 0 && (
        <section className="mb-14">
          <div className="mb-5 flex items-baseline justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em]" style={{ color: THEME.teal }}>
                From the Archive
              </p>
              <h2 className="mt-1 text-2xl font-bold" style={{ color: THEME.navy }}>
                Past messages from {district.shortName}
              </h2>
            </div>
            <span className="text-xs font-semibold text-slate-500">
              {pastArticles.length} {pastArticles.length === 1 ? 'story' : 'stories'}
            </span>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {pastArticles.map(a => (
              <PastMessageCard key={a.id} article={a} district={district} superintendentPhotoUrl={supPhoto} />
            ))}
          </div>
        </section>
      )}

      {/* Peer district cross-nav — reuses the exact same module the
          article sidebar uses so the visual language is consistent. */}
      <section className="mb-6">
        <MoreEducationMatters activeSlug={district.slug} items={peerItems} />
      </section>
    </main>
  )
}

// ── This Month's Message (featured article panel) ────────────────────

function ThisMonthsMessage({
  district, featured, superintendentPhotoUrl,
}: {
  district: DistrictConfig
  featured: DistrictArticleCard
  superintendentPhotoUrl?: string | null
}) {
  const dateLabel = featured.published_at
    ? new Date(featured.published_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : ''
  const monthLabel = featured.published_at
    ? new Date(featured.published_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : ''
  const href = `/columns/${district.slug}/${stripColumnPrefix(featured.slug, district.slug)}`

  return (
    <article
      className="relative overflow-hidden rounded-2xl border shadow-[0_16px_40px_rgba(8,38,74,0.10)]"
      style={{ borderColor: THEME.border, backgroundColor: '#FFFFFF' }}
    >
      <div className="relative aspect-[16/10] w-full bg-slate-100">
        {featured.hero_image_url ? (
          <>
            <Image
              src={featured.hero_image_url}
              alt={featured.title}
              fill
              style={{ objectFit: 'cover' }}
              sizes="(max-width: 1024px) 100vw, 55vw"
              unoptimized
              priority
            />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/25 to-transparent" />
          </>
        ) : (
          <EducationMattersBrandedHero
            district={district}
            monthLabel={monthLabel}
            title={featured.title}
            superintendentPhotoUrl={superintendentPhotoUrl}
          />
        )}
        <span
          className="absolute left-4 top-4 inline-flex rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-white"
          style={{ backgroundColor: district.accent }}
        >
          This Month&apos;s Message
        </span>
      </div>
      <div className="p-5 md:p-6">
        <h3 className="font-serif text-2xl font-bold leading-snug md:text-[26px]" style={{ color: THEME.navy }}>
          <Link href={href} className="hover:underline underline-offset-2">
            {featured.title}
          </Link>
        </h3>
        {featured.excerpt && (
          <p className="mt-2.5 text-[15px] leading-relaxed text-slate-700 line-clamp-3">
            {featured.excerpt}
          </p>
        )}
        <div className="mt-3.5 flex flex-wrap items-center gap-3 text-xs text-slate-500">
          {featured.author_name && (
            <span className="inline-flex items-center gap-1.5">
              <UserRound className="h-3.5 w-3.5" strokeWidth={2.2} />
              {featured.author_name}
            </span>
          )}
          {dateLabel && (
            <>
              <span className="text-slate-300">•</span>
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" strokeWidth={2.2} />
                {dateLabel}
              </span>
            </>
          )}
          {featured.read_time_minutes && (
            <>
              <span className="text-slate-300">•</span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" strokeWidth={2.2} />
                {featured.read_time_minutes} min
              </span>
            </>
          )}
        </div>
        <Link
          href={href}
          className="mt-5 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
          style={{ backgroundColor: district.accent }}
        >
          Read this month&apos;s message
          <ArrowRight className="h-4 w-4" strokeWidth={2.4} />
        </Link>
      </div>
    </article>
  )
}

function NoMessageYet({ district }: { district: DistrictConfig }) {
  return (
    <article
      className="rounded-2xl border border-dashed p-8 text-center"
      style={{ borderColor: THEME.border, backgroundColor: THEME.cream }}
    >
      <div
        className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full"
        style={{ backgroundColor: district.softAccent, color: district.accent }}
      >
        <GraduationCap className="h-5 w-5" strokeWidth={2.3} />
      </div>
      <p className="text-sm font-black uppercase tracking-[0.14em]" style={{ color: THEME.teal }}>
        Coming soon
      </p>
      <h3 className="mt-1 font-serif text-xl font-bold" style={{ color: THEME.navy }}>
        {district.shortName}&apos;s first message is on its way
      </h3>
      <p className="mt-2 text-sm text-slate-600">
        Check back shortly — we&apos;ll publish {district.superintendent.name}&apos;s next update here.
      </p>
    </article>
  )
}

// ── Archive card ──────────────────────────────────────────────────────

function PastMessageCard({
  article, district, superintendentPhotoUrl,
}: {
  article: DistrictArticleCard
  district: DistrictConfig
  superintendentPhotoUrl?: string | null
}) {
  const href = `/columns/${district.slug}/${stripColumnPrefix(article.slug, district.slug)}`
  const dateLabel = article.published_at
    ? new Date(article.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : ''
  const monthLabel = article.published_at
    ? new Date(article.published_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : ''

  return (
    <Link href={href} className="group flex flex-col overflow-hidden rounded-2xl border bg-white transition hover:shadow-[0_12px_28px_rgba(8,38,74,0.10)]" style={{ borderColor: THEME.border }}>
      <div className="relative aspect-[3/2] bg-slate-100">
        {article.hero_image_url ? (
          <Image
            src={article.hero_image_url}
            alt={article.title}
            fill
            style={{ objectFit: 'cover' }}
            className="transition-transform duration-500 group-hover:scale-[1.03]"
            sizes="(max-width: 768px) 100vw, 33vw"
            unoptimized
          />
        ) : (
          <EducationMattersBrandedHero
            district={district}
            monthLabel={monthLabel}
            title={article.title}
            superintendentPhotoUrl={superintendentPhotoUrl}
            compact
          />
        )}
        <span
          className="absolute left-3 top-3 inline-flex rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-white shadow-sm"
          style={{ backgroundColor: district.accent }}
        >
          {district.countyLabel}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h4 className="font-serif text-lg font-bold leading-snug transition group-hover:opacity-80 line-clamp-2" style={{ color: THEME.navy }}>
          {article.title}
        </h4>
        {article.excerpt && (
          <p className="text-sm leading-relaxed text-slate-600 line-clamp-2">{article.excerpt}</p>
        )}
        <div className="mt-auto flex items-center gap-2 pt-1 text-xs text-slate-500">
          {article.author_name && <span className="font-semibold text-slate-700">{article.author_name}</span>}
          {article.author_name && dateLabel && <span className="text-slate-300">•</span>}
          {dateLabel && <span>{dateLabel}</span>}
        </div>
      </div>
    </Link>
  )
}

// Article slugs on this platform are stored with an optional column
// prefix ("education-matters-pike-road-may-2026"). Strip it so the
// canonical article URL is /columns/<column>/<bare-slug>. Idempotent
// when the slug is already bare.
function stripColumnPrefix(slug: string, columnSlug: string): string {
  return slug.replace(new RegExp(`^${columnSlug}-`), '')
}
