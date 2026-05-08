import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, ChevronRight, CheckCircle } from 'lucide-react'
import { NewsletterSignup } from '@/components/newsletter/NewsletterSignup'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface StartCard {
  id: string
  eyebrow: string
  title: string
  summary: string | null
  ctaLabel: string
  ctaHref: string
  accentColor: string | null
}

export interface PlaybookItem {
  columnLabel: string
  items: string[]
}

export interface PlaybookSection {
  title: string
  subtitle: string | null
  items: PlaybookItem[]
}

export interface AnchorArticle {
  id: string
  slug: string
  title: string
  excerpt: string
  heroImageUrl: string | null
  category: string | null
  byline: string
  href: string
}

export interface GuidePageLayoutProps {
  guideSlug: string
  heroImageUrl: string | null
  heroEyebrow: string
  heroTitle: string
  heroSubtitle: string
  heroIssueLabel: string
  heroPrimaryCta: { label: string; href: string }
  heroSecondaryCta: { label: string; href: string }
  startCards: StartCard[]
  playbookSection?: PlaybookSection
  articles?: AnchorArticle[]
  directorySlot: React.ReactNode
  newsletter: { headline: string; subheadline: string; sourceTag: string }
  sponsorCta: { eyebrow: string; headline: string; subheadline: string; ctaLabel: string; ctaHref: string }
}

// ── Default accent colors for start cards (rotated if accentColor is null) ───
const CARD_ACCENTS = ['#fef3c7', '#e0f2fe', '#fce7f3']

// ── Article card sub-component ────────────────────────────────────────────────

function ArticleCard({ article }: { article: AnchorArticle }) {
  const hasImage = !!article.heroImageUrl
  return (
    <Link
      href={article.href}
      style={{ display: 'block', borderRadius: 16, overflow: 'hidden', backgroundColor: 'white', boxShadow: '0 1px 6px rgba(0,0,0,0.08)', textDecoration: 'none', transition: 'box-shadow 0.2s, transform 0.2s' }}
    >
      <div style={{ position: 'relative', aspectRatio: '16/9', overflow: 'hidden', backgroundColor: 'var(--fg-navy, #1a2744)', background: hasImage ? undefined : 'linear-gradient(135deg, var(--fg-cream, #faf8f5) 0%, var(--fg-sage-light, #edf5f0) 100%)' }}>
        {hasImage && (
          <Image
            src={article.heroImageUrl!}
            alt={article.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            style={{ objectFit: 'cover' }}
            unoptimized
          />
        )}
        {hasImage && (
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(26,39,68,0.85) 0%, rgba(26,39,68,0.15) 55%, transparent 100%)' }} />
        )}
        {article.category && (
          <span style={{ position: 'absolute', top: 10, left: 10, zIndex: 2, backgroundColor: 'var(--fg-terra, #c4622d)', color: 'white', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '3px 8px', borderRadius: 3 }}>
            {article.category}
          </span>
        )}
        <div style={{ position: 'absolute', bottom: 12, left: 14, right: 14, zIndex: 2 }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: hasImage ? 'var(--fg-gold, #d4a847)' : 'var(--fg-sage, #5a8a6a)', marginBottom: 4 }}>
            {article.byline}
          </p>
          <h3 style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 17, fontWeight: 700, color: hasImage ? 'white' : 'var(--fg-navy, #1a2744)', lineHeight: 1.25 }}>
            {article.title}
          </h3>
        </div>
      </div>
      <div style={{ padding: '10px 14px 14px', borderTop: '1px solid rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        {article.excerpt && (
          <p style={{ fontSize: 11, color: 'var(--fg-mid, #666)', lineHeight: 1.5, flex: 1, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>
            {article.excerpt}
          </p>
        )}
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--fg-sky, #4a90d9)', display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
          Read <ChevronRight size={12} />
        </span>
      </div>
    </Link>
  )
}

// ── Main layout component (server component) ──────────────────────────────────

export function GuidePageLayout({
  heroImageUrl,
  heroEyebrow,
  heroTitle,
  heroSubtitle,
  heroIssueLabel,
  heroPrimaryCta,
  heroSecondaryCta,
  startCards,
  playbookSection,
  articles,
  directorySlot,
  newsletter,
  sponsorCta,
}: GuidePageLayoutProps) {
  const hasHeroImage = !!heroImageUrl

  return (
    <div style={{ backgroundColor: 'var(--fg-cream, #faf8f5)', minHeight: '100vh', fontFamily: 'var(--font-dm-sans, sans-serif)' }}>

      {/* ── 1. HERO BAND ──────────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden flex flex-col justify-end min-h-[55vh] md:min-h-[70vh]"
        aria-label="Guide hero"
      >
        {hasHeroImage ? (
          <>
            {/* Hero image */}
            <Image
              src={heroImageUrl!}
              alt={heroTitle}
              fill
              priority
              sizes="100vw"
              style={{ objectFit: 'cover', objectPosition: 'center 40%' }}
              unoptimized
            />
            {/* Gradient overlay: transparent top → dark bottom */}
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.35) 45%, rgba(0,0,0,0.72) 100%)' }} />
          </>
        ) : (
          /* Gradient hero band — brand navy (top-left) to brand gold (bottom-right) */
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, var(--fg-navy, #1a2744) 0%, #2a4a7f 50%, var(--fg-gold, #d4a847) 100%)' }} />
        )}

        {/* Issue label chip — top left */}
        <div style={{ position: 'absolute', top: 24, left: 24, zIndex: 10 }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.75)', padding: '4px 10px', borderRadius: 4, border: '1px solid rgba(255,255,255,0.2)', backgroundColor: 'rgba(0,0,0,0.22)' }}>
            {heroIssueLabel}
          </span>
        </div>

        {/* Main content — bottom left, inside 1400px container */}
        <div style={{ position: 'relative', zIndex: 10, maxWidth: 1400, margin: '0 auto', width: '100%', padding: 'clamp(24px, 4vw, 56px) clamp(20px, 4vw, 40px) clamp(40px, 5vh, 72px)' }}>
          {/* Eyebrow */}
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--fg-gold, #d4a847)', marginBottom: 12 }}>
            {heroEyebrow}
          </p>
          {/* H1 */}
          <h1 style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 'clamp(34px, 6vw, 64px)', fontWeight: 900, fontStyle: 'italic', color: 'white', lineHeight: 1.1, marginBottom: 16, maxWidth: 640, letterSpacing: '-0.02em' }}>
            {heroTitle}
          </h1>
          {/* Subtitle */}
          <p style={{ fontSize: 'clamp(14px, 1.8vw, 17px)', color: 'rgba(255,255,255,0.88)', lineHeight: 1.6, maxWidth: 560, marginBottom: 32 }}>
            {heroSubtitle}
          </p>
          {/* CTAs */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <a
              href={heroPrimaryCta.href}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '13px 28px', borderRadius: 12, fontWeight: 700, fontSize: 14, backgroundColor: 'var(--fg-gold, #d4a847)', color: '#3d1f17', textDecoration: 'none', fontFamily: 'var(--font-dm-sans, sans-serif)' }}
            >
              {heroPrimaryCta.label} <ArrowRight size={15} />
            </a>
            <a
              href={heroSecondaryCta.href}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '13px 28px', borderRadius: 12, fontWeight: 600, fontSize: 14, border: '1.5px solid rgba(255,255,255,0.35)', color: 'white', textDecoration: 'none', backgroundColor: 'rgba(255,255,255,0.08)', fontFamily: 'var(--font-dm-sans, sans-serif)' }}
            >
              {heroSecondaryCta.label}
            </a>
          </div>
        </div>
      </section>

      {/* ── CONTENT WRAPPER ───────────────────────────────────────────────── */}
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 clamp(16px, 4vw, 40px)' }}>

        {/* ── 2. START HERE BAND ────────────────────────────────────────── */}
        {startCards.length > 0 && (
          <section id="start-here" style={{ paddingTop: 64, marginBottom: 64 }}>
            {/* Section header */}
            <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--fg-terra, #c4622d)', marginBottom: 6 }}>
              → Start Here
            </p>
            <h2 style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 'clamp(22px, 3.5vw, 32px)', fontWeight: 700, color: 'var(--fg-navy, #1a2744)', marginBottom: 8 }}>
              New to the River Region?
            </h2>
            <p style={{ fontSize: 14, color: 'var(--fg-mid, #666)', marginBottom: 32, maxWidth: 520 }}>
              These three reads will orient your whole family.
            </p>

            {/* Cards grid — 3 cols desktop, stacks mobile */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
              {startCards.map((card, idx) => {
                const bg = card.accentColor ?? CARD_ACCENTS[idx % CARD_ACCENTS.length]
                return (
                  <Link
                    key={card.id}
                    href={card.ctaHref}
                    style={{ display: 'flex', flexDirection: 'column', borderRadius: 20, overflow: 'hidden', textDecoration: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', transition: 'box-shadow 0.2s, transform 0.2s' }}
                  >
                    {/* Card top — tinted background */}
                    <div style={{ padding: '28px 24px 20px', backgroundColor: bg, flex: 1, display: 'flex', flexDirection: 'column' }}>
                      {/* Eyebrow chip */}
                      <span style={{ display: 'inline-block', fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--fg-navy, #1a2744)', backgroundColor: 'rgba(255,255,255,0.55)', padding: '3px 9px', borderRadius: 4, marginBottom: 14, alignSelf: 'flex-start' }}>
                        {card.eyebrow}
                      </span>
                      {/* Title */}
                      <h3 style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 'clamp(18px, 2.5vw, 22px)', fontWeight: 700, color: 'var(--fg-navy, #1a2744)', lineHeight: 1.25, marginBottom: 10, flex: 1 }}>
                        {card.title}
                      </h3>
                      {/* Summary */}
                      {card.summary && (
                        <p style={{ fontSize: 13, color: 'rgba(26,39,68,0.72)', lineHeight: 1.55 }}>
                          {card.summary}
                        </p>
                      )}
                    </div>
                    {/* Card footer */}
                    <div style={{ padding: '12px 24px', backgroundColor: 'white', borderTop: '1px solid rgba(0,0,0,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg-navy, #1a2744)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        {card.ctaLabel} <ArrowRight size={13} />
                      </span>
                    </div>
                  </Link>
                )
              })}
            </div>
          </section>
        )}

        {/* ── 3. PLAYBOOK BAND ──────────────────────────────────────────── */}
        {playbookSection && (
          <section id="first-30-days" style={{ marginBottom: 64 }}>
            {/* Section header */}
            <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--fg-terra, #c4622d)', marginBottom: 6 }}>
              Practical Checklist
            </p>
            <h2 style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 'clamp(22px, 3.5vw, 32px)', fontWeight: 700, color: 'var(--fg-navy, #1a2744)', marginBottom: 6 }}>
              {playbookSection.title}
            </h2>
            {playbookSection.subtitle && (
              <p style={{ fontSize: 14, color: 'var(--fg-mid, #666)', marginBottom: 28 }}>
                {playbookSection.subtitle}
              </p>
            )}

            {/* Playbook panel — cream/parchment background */}
            <div style={{ borderRadius: 20, border: '1.5px solid rgba(196,98,45,0.14)', backgroundColor: '#fffdf8', boxShadow: '0 2px 12px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
              <div style={{ padding: 'clamp(20px, 4vw, 36px)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'clamp(20px, 3vw, 32px)' }}>
                {playbookSection.items.map((col) => (
                  <div key={col.columnLabel}>
                    {/* Column label chip */}
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
                      <span style={{ fontFamily: 'var(--font-fraunces, serif)', fontWeight: 700, fontSize: 14, color: 'var(--fg-terra, #c4622d)', padding: '4px 12px', borderRadius: 6, backgroundColor: 'rgba(196,98,45,0.1)', border: '1px solid rgba(196,98,45,0.18)' }}>
                        {col.columnLabel}
                      </span>
                    </div>
                    {/* Checklist items */}
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {col.items.map((item, i) => (
                        <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, fontSize: 13, color: 'var(--fg-body, #374151)', lineHeight: 1.5 }}>
                          <CheckCircle size={14} style={{ color: 'var(--fg-gold, #d4a847)', flexShrink: 0, marginTop: 2 }} />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── 4. EDITORIAL ARTICLE GRID ─────────────────────────────────── */}
        {articles && articles.length > 0 && (
          <section style={{ marginBottom: 64 }}>
            <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--fg-terra, #c4622d)', marginBottom: 6 }}>
              Worth Reading
            </p>
            <h2 style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 'clamp(22px, 3.5vw, 32px)', fontWeight: 700, color: 'var(--fg-navy, #1a2744)', marginBottom: 28 }}>
              Reads to Get You Going
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
              {articles.map(a => <ArticleCard key={a.id} article={a} />)}
            </div>
          </section>
        )}

        {/* ── 5. DIRECTORY SLOT ─────────────────────────────────────────── */}
        <section id="directory" style={{ marginBottom: 64 }}>
          {directorySlot}
        </section>

        {/* ── 6. NEWSLETTER BAND ────────────────────────────────────────── */}
        <section style={{ marginBottom: 64 }}>
          <NewsletterSignup
            variant="inline"
            source={newsletter.sourceTag}
            headline={newsletter.headline}
            subheadline={newsletter.subheadline}
          />
        </section>

      </div>{/* end content wrapper */}

      {/* ── 7. SPONSOR CTA BAND — full width, outside content wrapper ────── */}
      <section style={{ backgroundColor: 'var(--fg-navy, #1a2744)', padding: 'clamp(40px, 6vw, 72px) clamp(20px, 4vw, 40px)' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', textAlign: 'center' }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--fg-gold, #d4a847)', marginBottom: 12 }}>
            {sponsorCta.eyebrow}
          </p>
          <h2 style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 'clamp(22px, 4vw, 36px)', fontWeight: 700, fontStyle: 'italic', color: 'white', lineHeight: 1.2, marginBottom: 14, maxWidth: 560, marginLeft: 'auto', marginRight: 'auto' }}>
            {sponsorCta.headline}
          </h2>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.72)', lineHeight: 1.65, maxWidth: 480, margin: '0 auto 32px' }}>
            {sponsorCta.subheadline}
          </p>
          <Link
            href={sponsorCta.ctaHref}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 34px', borderRadius: 12, fontSize: 14, fontWeight: 700, backgroundColor: 'var(--fg-gold, #d4a847)', color: '#3d1f17', textDecoration: 'none', fontFamily: 'var(--font-dm-sans, sans-serif)' }}
          >
            {sponsorCta.ctaLabel} <ArrowRight size={15} />
          </Link>
        </div>
      </section>

    </div>
  )
}
