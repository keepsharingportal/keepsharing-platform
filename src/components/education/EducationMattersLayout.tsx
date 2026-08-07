// ── Education Matters — reusable monthly superintendent column layout ────
//
// Renders when the article's column_slug is one of the four Education
// Matters districts (see src/lib/education-matters/districts.ts). The
// district identity + superintendent bio/photo/title/location are
// looked up from that constant, so the editor only fills in the
// per-month fields (title, body, optional pull quote, optional sponsor,
// optional photos).
//
// Composition order matches the mockup and the mobile stacking rules
// the user specified:
//   Masthead + district tabs
//   Hero (title / deck / date + superintendent card)
//   Sponsor strip (optional)
//   At a Glance
//   Pull quote (optional)
//   Article body (paragraphs 1..N/2) with drop cap
//   Community Partner inline mention (optional, mirrors sponsor)
//   Article body (remaining paragraphs)
//   From the District photo gallery (optional)
//   Superintendent bio card
//   Sidebar: Weekly Scoop / More Education Matters / Trending / Ad slot

import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowRight, CalendarDays, Clock, Coffee, GraduationCap, MapPin,
  School, ShieldCheck, Star, UserRound, ImageIcon,
} from 'lucide-react'

import { EDUCATION_DISTRICTS, districtColumnUrl, type DistrictConfig } from '@/lib/education-matters/districts'
import type { AuthorProfile } from '@/lib/seo/authors'

// Resolve the display name / title / photo / bio from the DB profile
// (editor-managed in /admin/seo/authors) with a fallback to the code-
// embedded district config for any field the DB row leaves empty.
function resolveSuperintendent(district: DistrictConfig, profile: AuthorProfile | null) {
  return {
    name:     profile?.displayName?.trim()     || district.superintendent.name,
    title:    profile?.jobTitle?.trim()        || district.superintendent.title,
    photoUrl: profile?.headshotUrl?.trim()     || district.superintendent.photoUrl,
    bio:      profile?.bio?.trim()             || district.superintendent.bio,
  }
}

// ── Theme (mirrors the user-supplied palette) ────────────────────────────
const THEME = {
  navy:      '#08264A',
  deepNavy:  '#041A36',
  teal:      '#138F8F',
  gold:      '#F4C21B',
  cream:     '#FFFDF8',
  softTeal:  '#E8F5F4',
  softNavy:  '#EDF3F8',
  border:    '#D8E5E5',
  text:      '#1F2933',
} as const

// ── Types the layout consumes ────────────────────────────────────────────

export interface EducationSponsor {
  name:        string
  url:         string
  logoUrl?:    string | null
  imageUrl?:   string | null
  tagline?:    string | null
  description?: string | null
  buttonText?: string | null
}

export interface EducationGalleryPhoto {
  url:      string
  alt?:     string | null
  caption?: string | null
}

export interface EducationMattersArticle {
  title:              string
  deck?:              string | null   // subtitle line under the title
  publishedLabel:     string          // e.g. "May 30, 2026"
  readTimeMinutes:    number
  authorByline:       string          // "By River Region Parents" default
  focusOverride?:     string | null   // "This month's focus" for At a Glance
  monthLabel:         string          // "May 2026" — shown in At a Glance
  bodyHtml:           string          // sanitized HTML (paragraphs)
  pullQuote?:         string | null
  sponsor?:           EducationSponsor | null
  gallery?:           EducationGalleryPhoto[]
}

interface Props {
  article:         EducationMattersArticle
  district:        DistrictConfig
  /** Editor-managed superintendent profile (seo_authors row). When
   *  set, its fields win over the code-embedded fallback in the
   *  district config. Missing fields fall through per-field. */
  superintendentProfile?: AuthorProfile | null
  /** Slot for the shared right rail (Weekly Scoop / More Education
   *  Matters / Trending Now / AdSlot). Rendered as-is so we don't lock
   *  the layout to a specific sidebar composition. */
  sidebar:         React.ReactNode
}

// ── Layout ───────────────────────────────────────────────────────────────

export function EducationMattersLayout({ article, district, superintendentProfile, sidebar }: Props) {
  const { paragraphs, driftedPullQuote } = splitBodyForLayout(article.bodyHtml, !!article.pullQuote)
  const pullQuote = article.pullQuote ?? driftedPullQuote
  const midpoint  = Math.max(1, Math.min(paragraphs.length - 1, Math.ceil(paragraphs.length / 2)))
  const firstHalf  = paragraphs.slice(0, midpoint)
  const secondHalf = paragraphs.slice(midpoint)
  const superintendent = resolveSuperintendent(district, superintendentProfile ?? null)

  return (
    <main className="mx-auto max-w-7xl px-5 py-8" style={{ color: THEME.text }}>

      {/* Masthead + tabs */}
      <section className="mb-8 grid gap-6 lg:grid-cols-[1fr_0.95fr] lg:items-start">
        <EducationMattersLogo />
        <EducationDistrictTabs activeSlug={district.slug} />
      </section>

      {/* Hero: title/deck/date + superintendent card */}
      <section className="mb-8 grid gap-8 lg:grid-cols-[1fr_0.9fr] lg:items-center">
        <div>
          <span
            className="inline-flex rounded-full px-4 py-1 text-xs font-black uppercase tracking-[0.12em] text-white"
            style={{ backgroundColor: district.accent }}
          >
            {district.countyLabel}
          </span>
          <h1 className="mt-5 max-w-2xl font-serif text-4xl font-bold leading-tight md:text-5xl" style={{ color: THEME.navy }}>
            {article.title}
          </h1>
          {article.deck && (
            <p className="mt-4 max-w-2xl text-lg leading-relaxed text-slate-700">
              {article.deck}
            </p>
          )}
          <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-slate-600">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4" strokeWidth={2.2} /> {article.publishedLabel}
            </span>
            <span className="text-slate-400">•</span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-4 w-4" strokeWidth={2.2} /> {article.readTimeMinutes} min read
            </span>
            <span className="text-slate-400">•</span>
            <span className="inline-flex items-center gap-1.5">
              <UserRound className="h-4 w-4" strokeWidth={2.2} /> {article.authorByline}
            </span>
          </div>
        </div>
        <SuperintendentCard district={district} superintendent={superintendent} />
      </section>

      {/* Main + sidebar */}
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <article className="space-y-8 min-w-0">
          {article.sponsor && <EducationSponsorStrip sponsor={article.sponsor} />}
          {pullQuote && (
            <EducationPullQuote quote={pullQuote} attribution={superintendent.name} />
          )}

          <EducationArticleBody paragraphs={firstHalf} showDropCap />

          {article.sponsor && (
            <CommunityPartnerInline sponsor={article.sponsor} />
          )}

          {secondHalf.length > 0 && <EducationArticleBody paragraphs={secondHalf} />}

          {article.gallery && article.gallery.length > 0 && (
            <EducationPhotoGallery photos={article.gallery} accent={district.accent} />
          )}

          <SuperintendentBio superintendent={superintendent} />
        </article>

        {/* Right rail — Weekly Scoop / More Education Matters / Trending
            / AdSlot come from the caller. No separate sponsor ad here. */}
        <aside className="space-y-6">
          {sidebar}
        </aside>
      </div>
    </main>
  )
}

// ── Sub-components ───────────────────────────────────────────────────────

function EducationMattersLogo() {
  return (
    <div className="inline-flex flex-col">
      <div className="flex items-center gap-3">
        <GraduationCap className="h-10 w-10" style={{ color: THEME.navy }} strokeWidth={2.4} />
        <div>
          <p className="text-3xl font-black uppercase tracking-[0.08em] md:text-5xl" style={{ color: THEME.navy }}>
            Education Matters
          </p>
          <p className="mt-2 text-xs font-black uppercase tracking-[0.14em]" style={{ color: THEME.teal }}>
            Monthly Updates From Our River Region School Superintendents
          </p>
        </div>
      </div>
    </div>
  )
}

function EducationDistrictTabs({ activeSlug }: { activeSlug: string }) {
  return (
    <nav
      aria-label="Education Matters districts"
      className="grid overflow-hidden rounded-2xl border bg-white shadow-[0_8px_24px_rgba(8,38,74,0.06)] sm:grid-cols-2 lg:grid-cols-4"
      style={{ borderColor: THEME.border }}
    >
      {EDUCATION_DISTRICTS.map(d => {
        const isActive = d.slug === activeSlug
        return (
          <Link
            key={d.slug}
            href={districtColumnUrl(d)}
            className={`group border-b p-4 text-center transition last:border-b-0 sm:border-r sm:last:border-r-0 lg:border-b-0 ${isActive ? '' : 'bg-white hover:bg-[#FFFDF8]'}`}
            style={{
              borderColor:     THEME.border,
              borderTop:       isActive ? `5px solid ${d.accent}` : '5px solid transparent',
              backgroundColor: isActive ? d.softAccent : undefined,
            }}
          >
            <div
              className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-full text-white"
              style={{ backgroundColor: d.accent }}
            >
              <ShieldCheck className="h-5 w-5" strokeWidth={2.4} />
            </div>
            <p className="text-sm font-black leading-tight" style={{ color: THEME.navy }}>
              {d.fullName}
            </p>
            {isActive && (
              <p className="mt-2 text-[10px] font-black uppercase tracking-[0.14em]" style={{ color: THEME.teal }}>
                Current Message
              </p>
            )}
          </Link>
        )
      })}
    </nav>
  )
}

function SuperintendentCard({
  district, superintendent,
}: {
  district: DistrictConfig
  superintendent: ReturnType<typeof resolveSuperintendent>
}) {
  const { fullName, location } = district
  return (
    <aside
      className="overflow-hidden rounded-2xl border bg-white shadow-[0_14px_34px_rgba(8,38,74,0.14)]"
      style={{ borderColor: THEME.border }}
    >
      <div className="grid md:grid-cols-[0.9fr_1fr]">
        <div
          className="p-6 text-white"
          style={{ background: `linear-gradient(135deg, ${THEME.navy} 0%, ${THEME.deepNavy} 100%)` }}
        >
          <p className="text-xs font-black uppercase tracking-[0.16em]" style={{ color: '#5FCFCF' }}>
            This Month’s Superintendent
          </p>
          <h3 className="mt-5 font-serif text-3xl font-bold leading-tight">
            {superintendent.name}
          </h3>
          <div className="mt-4 h-1 w-12" style={{ backgroundColor: THEME.gold }} />
          <p className="mt-5 text-base font-bold" style={{ color: '#5FCFCF' }}>
            {superintendent.title}
          </p>
          <p className="mt-1 text-sm text-white/85">{fullName}</p>
          <p className="mt-4 flex items-center gap-2 text-sm text-white/80">
            <MapPin className="h-4 w-4" style={{ color: '#5FCFCF' }} />
            {location}
          </p>
        </div>
        <div
          className="relative min-h-[260px] flex items-center justify-center text-slate-300"
          style={{ backgroundColor: '#F1F5F9' }}
        >
          {superintendent.photoUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={superintendent.photoUrl}
              alt={superintendent.name}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            /* No photo → show generic icon. When a photoUrl exists we
               render only the <img>; the icon-and-background-image
               approach painted the icon on TOP of the loaded photo
               because CSS backgrounds sit BEHIND children. */
            <UserRound className="h-24 w-24" strokeWidth={1.2} />
          )}
        </div>
      </div>
    </aside>
  )
}

function EducationSponsorStrip({ sponsor }: { sponsor: EducationSponsor }) {
  return (
    <section
      className="relative overflow-hidden rounded-2xl border shadow-[0_12px_30px_rgba(8,38,74,0.08)]"
      style={{ borderColor: THEME.border, backgroundColor: THEME.cream }}
    >
      <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full blur-2xl" style={{ backgroundColor: 'rgba(244,194,27,0.25)' }} />
      <div className="pointer-events-none absolute -bottom-12 -left-12 h-36 w-36 rounded-full blur-2xl" style={{ backgroundColor: 'rgba(19,143,143,0.10)' }} />

      <div className="relative grid gap-4 p-5 md:grid-cols-[1fr_250px] md:items-center">
        <div className="flex items-start gap-4">
          <div
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full ring-1"
            style={{ backgroundColor: THEME.softNavy, color: THEME.navy, boxShadow: `inset 0 0 0 1px ${THEME.border}` }}
          >
            <Coffee className="h-7 w-7" strokeWidth={2.4} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: THEME.teal }}>Presented By</p>
            <h3 className="mt-1 font-serif text-3xl font-bold leading-tight" style={{ color: THEME.navy }}>
              {sponsor.name}
            </h3>
            {sponsor.tagline && (
              <p className="mt-2 text-sm font-semibold text-slate-700">{sponsor.tagline}</p>
            )}
            {sponsor.description && (
              <p className="mt-1 text-sm leading-relaxed text-slate-600">{sponsor.description}</p>
            )}
            <a
              href={sponsor.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-2 rounded-xl px-5 py-3 text-xs font-black uppercase tracking-[0.12em] text-white shadow-[0_10px_24px_rgba(8,38,74,0.20)] transition hover:opacity-90"
              style={{ backgroundColor: THEME.navy }}
            >
              {sponsor.buttonText?.trim() || 'Learn More'}
              <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
            </a>
          </div>
        </div>
        <div className="hidden items-center justify-end gap-4 md:flex">
          {sponsor.logoUrl && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={sponsor.logoUrl} alt={`${sponsor.name} logo`} className="max-h-24 max-w-[150px] object-contain" />
          )}
          {sponsor.imageUrl && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={sponsor.imageUrl} alt={`${sponsor.name} sponsor image`} className="h-32 w-40 rounded-xl object-cover shadow-md" />
          )}
        </div>
      </div>
    </section>
  )
}

function EducationAtAGlance({
  district, monthLabel, readTimeMinutes, focus,
}: {
  district: DistrictConfig
  monthLabel: string
  readTimeMinutes: number
  focus: string
}) {
  const items = [
    { icon: School,       label: 'District',           value: district.fullName },
    { icon: UserRound,    label: 'Superintendent',     value: district.superintendent.name },
    { icon: CalendarDays, label: 'Month',              value: monthLabel },
    { icon: Clock,        label: 'Read Time',          value: `${readTimeMinutes} min read` },
    { icon: Star,         label: 'This Month’s Focus', value: focus },
  ]
  return (
    <section className="rounded-2xl border bg-white p-5 shadow-[0_10px_28px_rgba(8,38,74,0.06)]" style={{ borderColor: THEME.border }}>
      <div className="mb-5 flex items-center gap-3">
        <h2 className="text-sm font-black uppercase tracking-[0.16em]" style={{ color: THEME.teal }}>
          At a Glance
        </h2>
        <span className="h-px w-14" style={{ backgroundColor: THEME.teal }} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {items.map(item => (
          <div key={item.label} className="text-center lg:border-r lg:last:border-r-0" style={{ borderColor: THEME.border }}>
            <div
              className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full ring-1"
              style={{ backgroundColor: THEME.softTeal, color: THEME.teal, boxShadow: `inset 0 0 0 1px ${THEME.border}` }}
            >
              <item.icon className="h-5 w-5" strokeWidth={2.3} />
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.12em]" style={{ color: THEME.teal }}>
              {item.label}
            </p>
            <p className="mt-2 text-sm font-bold leading-snug" style={{ color: THEME.navy }}>
              {item.value}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}

function EducationPullQuote({ quote, attribution }: { quote: string; attribution?: string }) {
  return (
    <figure
      className="relative overflow-hidden rounded-2xl border p-6 shadow-[0_12px_30px_rgba(8,38,74,0.08)]"
      style={{ borderColor: THEME.border, backgroundColor: THEME.cream }}
    >
      <div className="absolute left-0 top-0 h-full w-1.5" style={{ backgroundColor: THEME.teal }} />
      <div className="pointer-events-none absolute -bottom-8 -right-6 h-28 w-28 rounded-full blur-2xl" style={{ backgroundColor: 'rgba(244,194,27,0.20)' }} />
      <div className="relative mb-3 text-6xl font-black leading-none" style={{ color: THEME.gold }}>“</div>
      <blockquote className="relative font-serif text-xl font-bold italic leading-snug md:text-2xl" style={{ color: THEME.navy }}>
        {quote}
      </blockquote>
      {attribution && (
        <figcaption className="relative mt-4 text-sm font-bold" style={{ color: THEME.teal }}>
          — {attribution}
        </figcaption>
      )}
    </figure>
  )
}

function EducationArticleBody({ paragraphs, showDropCap = false }: { paragraphs: string[]; showDropCap?: boolean }) {
  return (
    <section className="rounded-2xl" style={{ backgroundColor: THEME.cream }}>
      <div className="max-w-none space-y-6 text-base leading-8 text-slate-700 education-body">
        {paragraphs.map((html, i) => (
          <div
            key={i}
            className={showDropCap && i === 0 ? 'education-body-first' : ''}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        ))}
      </div>
      <style>{`
        .education-body p          { margin: 0; }
        .education-body a          { color: ${THEME.teal}; text-decoration: underline; }
        .education-body strong     { color: ${THEME.navy}; font-weight: 700; }
        .education-body-first p:first-of-type::first-letter {
          float: left;
          font-family: Georgia, 'Times New Roman', serif;
          font-size: 4rem;
          font-weight: 700;
          line-height: 0.9;
          padding: 0.3rem 0.75rem 0 0;
          margin: 0.35rem 0 0 0;
          color: ${THEME.teal};
        }
      `}</style>
    </section>
  )
}

function CommunityPartnerInline({ sponsor }: { sponsor: EducationSponsor }) {
  return (
    <aside
      className="rounded-2xl border p-4 shadow-[0_8px_22px_rgba(8,38,74,0.06)]"
      style={{ borderColor: THEME.border, backgroundColor: THEME.softNavy }}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4 min-w-0">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-white"
            style={{ backgroundColor: THEME.navy }}
          >
            <Coffee className="h-6 w-6" strokeWidth={2.4} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: THEME.teal }}>
              Community Partner
            </p>
            <p className="mt-1 text-sm font-semibold leading-relaxed" style={{ color: THEME.navy }}>
              This Education Matters message is presented by{' '}
              <span className="font-black">{sponsor.name}</span>, a local
              business committed to supporting our schools and families.
            </p>
          </div>
        </div>
        <a
          href={sponsor.url}
          target="_blank"
          rel="noopener noreferrer"
          className="edu-partner-btn inline-flex shrink-0 items-center justify-center rounded-lg border px-4 py-2 text-xs font-black uppercase tracking-[0.12em] transition"
          style={{ borderColor: THEME.navy, color: THEME.navy }}
        >
          Learn More
        </a>
        <style>{`
          .edu-partner-btn:hover {
            background-color: ${THEME.navy};
            color: #fff;
          }
        `}</style>
      </div>
    </aside>
  )
}

function SuperintendentBio({
  superintendent,
}: {
  superintendent: ReturnType<typeof resolveSuperintendent>
}) {
  return (
    <aside className="rounded-2xl border p-5" style={{ borderColor: THEME.border, backgroundColor: THEME.softNavy }}>
      <div className="flex items-start gap-4">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white ring-1"
          style={{ color: THEME.navy, boxShadow: `inset 0 0 0 1px ${THEME.border}` }}
        >
          <UserRound className="h-5 w-5" strokeWidth={2.3} />
        </div>
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em]" style={{ color: THEME.teal }}>
            About {superintendent.name}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-slate-700">
            {superintendent.bio}
          </p>
        </div>
      </div>
    </aside>
  )
}

function EducationPhotoGallery({ photos, accent }: { photos: EducationGalleryPhoto[]; accent: string }) {
  const valid = photos.filter(p => !!p?.url)
  if (valid.length === 0) return null
  return (
    <section>
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: THEME.softTeal, color: accent }}>
          <ImageIcon className="h-4 w-4" strokeWidth={2.3} />
        </div>
        <p className="text-xs font-black uppercase tracking-[0.16em]" style={{ color: THEME.teal }}>
          From the District
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {valid.map((p, i) => (
          <figure
            key={i}
            className="overflow-hidden rounded-xl border bg-white shadow-sm"
            style={{ borderColor: THEME.border }}
          >
            <div className="relative aspect-[4/3] bg-slate-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt={p.alt ?? ''} className="absolute inset-0 h-full w-full object-cover" />
            </div>
            {p.caption && (
              <figcaption className="p-3 text-xs leading-snug text-slate-700">
                {p.caption}
              </figcaption>
            )}
          </figure>
        ))}
      </div>
    </section>
  )
}

// ── Body helpers ─────────────────────────────────────────────────────────
// Split sanitized body HTML into an ordered list of top-level chunks
// (paragraphs, headings, quotes) that the layout can walk. If the editor
// didn't set a pull quote explicitly and the body contains a <blockquote>,
// we lift its first one out for the styled pull-quote block.

function splitBodyForLayout(html: string, pullQuoteSetExplicitly: boolean): {
  paragraphs:        string[]
  driftedPullQuote:  string | null
} {
  let working = html || ''
  let driftedPullQuote: string | null = null
  if (!pullQuoteSetExplicitly) {
    const bqMatch = working.match(/<blockquote\b[^>]*>([\s\S]*?)<\/blockquote>/i)
    if (bqMatch) {
      driftedPullQuote = bqMatch[1].replace(/<[^>]+>/g, '').trim() || null
      working = working.replace(bqMatch[0], '')
    }
  }
  const chunks = working.match(/<(?:p|h2|h3|ul|ol|blockquote)\b[^>]*>[\s\S]*?<\/(?:p|h2|h3|ul|ol|blockquote)>/gi) ?? []
  // If nothing parsed (plain-text body), fall back to double-newline split
  // wrapped in <p> so the drop-cap CSS still hooks the first one.
  if (chunks.length === 0 && working.trim()) {
    return {
      paragraphs: working
        .split(/\n{2,}/)
        .map(s => s.trim())
        .filter(Boolean)
        .map(p => `<p>${p.replace(/\n/g, '<br />')}</p>`),
      driftedPullQuote,
    }
  }
  return { paragraphs: chunks, driftedPullQuote }
}
