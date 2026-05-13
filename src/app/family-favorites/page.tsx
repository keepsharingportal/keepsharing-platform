// ── /family-favorites ─────────────────────────────────────────────────────────
// Phase-aware public page for the annual Family Favorites recognition program.
// Adapts its content and CTAs based on the active season's status field.
// Pre-launch state shown when no active season exists.

import type { Metadata }   from 'next'
import Link                 from 'next/link'
import { createClient }     from '@/lib/supabase/server'
import { FF_GROUPS, FF_ANNUAL_CALENDAR, PHASE_CONFIG, type FFPhase } from '@/lib/family-favorites'

export const metadata: Metadata = {
  title: 'Family Favorites — River Region Parents',
  description: 'River Region\'s annual family-voted recognition program. Nominate and celebrate the local businesses that make family life in the River Region extraordinary.',
}

// ── Design tokens ─────────────────────────────────────────────────────────────
const N    = '#1a2744'
const T    = '#c4622d'
const GOLD = '#b8860b'
const C    = '#fdf8f3'
const W    = '#ffffff'

const serif = 'var(--font-fraunces, serif)'
const sans  = 'var(--font-dm-sans, sans-serif)'

// ── Data types ────────────────────────────────────────────────────────────────
interface Season {
  id:     string; year: number; name: string; status: FFPhase
  nomination_opens_at?: string; nomination_closes_at?: string
  voting_opens_at?: string;     voting_closes_at?: string
  winners_announced_at?: string
  tagline?: string
}

// ── Phase-adaptive CTA config ─────────────────────────────────────────────────
function phaseCTA(phase: FFPhase, year: number): { headline: string; sub: string; cta: string; ctaUrl: string; ctaSecondary?: string; ctaSecondaryUrl?: string } {
  switch (phase) {
    case 'nominations':
      return { headline: `Nominate Your ${year} River Region Favorites`, sub: 'Tell us which local businesses have made your family life extraordinary. Nominations close soon.', cta: 'Nominate Now', ctaUrl: '/family-favorites/nominate', ctaSecondary: 'See categories', ctaSecondaryUrl: '#categories' }
    case 'finalist-review':
      return { headline: 'Finalists Are Being Chosen', sub: 'The River Region Parents editorial team is reviewing nominations. Finalists will be announced soon — stay tuned.', cta: 'Get Notified', ctaUrl: '#notify' }
    case 'voting':
      return { headline: `Vote for Your ${year} Family Favorites`, sub: 'The finalists have been chosen. Now it\'s time to vote. Every River Region family gets one vote per category.', cta: 'Vote Now', ctaUrl: '/family-favorites/vote', ctaSecondary: 'See finalists', ctaSecondaryUrl: '#categories' }
    case 'announcing':
      return { headline: `The ${year} Family Favorites Winners Are Here`, sub: 'River Region has spoken. Congratulations to this year\'s most celebrated local businesses.', cta: 'See the Winners', ctaUrl: '/family-favorites/winners' }
    case 'complete':
      return { headline: `${year} Family Favorites Winners`, sub: 'Chosen by River Region families. Recognized across the ecosystem.', cta: 'See All Winners', ctaUrl: '/family-favorites/winners', ctaSecondary: 'Nominate for next year', ctaSecondaryUrl: '#notify' }
    default: // planning — pre-launch
      return { headline: 'Family Favorites Is Coming.', sub: 'The River Region\'s annual celebration of the local businesses that make family life extraordinary. Nominations open soon.', cta: 'Get Notified', ctaUrl: '#notify', ctaSecondary: 'See categories', ctaSecondaryUrl: '#categories' }
  }
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function FamilyFavoritesPage() {
  const supabase = await createClient()

  // Load active season (if any)
  const { data: seasonData } = await supabase
    .from('ff_seasons')
    .select('id, year, name, status, tagline, nomination_opens_at, nomination_closes_at, voting_opens_at, voting_closes_at, winners_announced_at')
    .eq('is_active', true)
    .single()

  const season = seasonData as Season | null
  const phase  = (season?.status ?? 'planning') as FFPhase
  const year   = season?.year ?? new Date().getFullYear() + 1
  const cta    = phaseCTA(phase, year)
  const phaseInfo = PHASE_CONFIG[phase]

  const isPreLaunch = !season || phase === 'planning'

  return (
    <div style={{ backgroundColor: C, color: '#3a2c1e', fontFamily: sans }}>

      {/* ─────────────────────────────────── HERO ──────────────────────────── */}
      <section style={{ backgroundColor: N, padding: '96px 24px 88px', position: 'relative', overflow: 'hidden' }}>
        {/* Decorative radial glows */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(ellipse at 75% 25%, rgba(212,168,67,0.15) 0%, transparent 48%), radial-gradient(ellipse at 15% 70%, rgba(196,98,45,0.12) 0%, transparent 44%)', pointerEvents: 'none' }} />

        <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center', position: 'relative' }}>

          {/* Phase badge */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, backgroundColor: `${phaseInfo.color}20`, border: `1px solid ${phaseInfo.color}40`, borderRadius: 100, padding: '5px 18px', fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: phaseInfo.color === '#9ca3af' ? 'rgba(255,255,255,0.5)' : '#fde68a', marginBottom: 32 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: phaseInfo.color, display: 'inline-block', flexShrink: 0 }} />
            {phaseInfo.publicLabel}
          </div>

          {/* Gold star cluster */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 24, fontSize: 24 }}>
            <span style={{ opacity: 0.4 }}>⭐</span>
            <span style={{ opacity: 0.7 }}>⭐</span>
            <span>⭐</span>
            <span style={{ opacity: 0.7 }}>⭐</span>
            <span style={{ opacity: 0.4 }}>⭐</span>
          </div>

          <h1 style={{ fontFamily: serif, fontSize: 'clamp(32px, 6vw, 62px)', fontWeight: 900, color: W, lineHeight: 1.06, letterSpacing: '-0.02em', marginBottom: 22 }}>
            {cta.headline}
          </h1>

          <p style={{ fontFamily: serif, fontSize: 18, fontStyle: 'italic', color: '#d4a843', marginBottom: 16 }}>
            {season?.tagline ?? 'Nominated by the community. Trusted by River Region families.'}
          </p>

          <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.68)', lineHeight: 1.8, maxWidth: 560, margin: '0 auto 40px' }}>
            {cta.sub}
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 14, flexWrap: 'wrap' }}>
            <Link
              href={cta.ctaUrl}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, backgroundColor: GOLD, color: N, padding: '15px 36px', borderRadius: 100, fontWeight: 800, fontSize: 16, textDecoration: 'none', boxShadow: `0 6px 28px rgba(184,134,11,0.4)` }}
            >
              {cta.cta}
            </Link>
            {cta.ctaSecondary && cta.ctaSecondaryUrl && (
              <Link
                href={cta.ctaSecondaryUrl}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, backgroundColor: 'transparent', color: 'rgba(255,255,255,0.75)', padding: '15px 28px', borderRadius: 100, fontWeight: 600, fontSize: 15, textDecoration: 'none', border: '1.5px solid rgba(255,255,255,0.2)' }}
              >
                {cta.ctaSecondary}
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* ─────────────────── WHAT IS FAMILY FAVORITES (pre-launch) ─────────── */}
      {isPreLaunch && (
        <section style={{ backgroundColor: W, padding: '80px 24px' }}>
          <div style={{ maxWidth: 900, margin: '0 auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 56, alignItems: 'center' }}>
              <div>
                <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: T, marginBottom: 14 }}>What Is Family Favorites</p>
                <h2 style={{ fontFamily: serif, fontSize: 'clamp(24px, 4vw, 40px)', fontWeight: 900, color: N, lineHeight: 1.1, marginBottom: 20 }}>
                  River Region&apos;s Most Trusted Local Recognition.
                </h2>
                <p style={{ fontSize: 15, color: '#5a4a3e', lineHeight: 1.85, marginBottom: 20 }}>
                  Family Favorites is not a click contest. It is the River Region&apos;s annual celebration of the local businesses that River Region <em>families</em> actually trust, use, and love.
                </p>
                <p style={{ fontSize: 15, color: '#5a4a3e', lineHeight: 1.85, marginBottom: 20 }}>
                  Nominated by the community. Reviewed by our editorial team. Voted on by families across the River Region. Recognized in print, digital, and across the entire River Region Parents ecosystem.
                </p>
                <div style={{ padding: '18px 20px', backgroundColor: C, border: `1px solid rgba(184,134,11,0.25)`, borderRadius: 14 }}>
                  <p style={{ fontFamily: serif, fontSize: 15, fontWeight: 700, color: N, fontStyle: 'italic', lineHeight: 1.65 }}>
                    &ldquo;A Family Favorites badge means families chose you. That&apos;s different from any award money can buy.&rdquo;
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {[
                  { icon: '🏘️', title: 'Community-Nominated', desc: 'Every nomination comes from a River Region family — not a committee, not paid placement, not algorithmic selection.' },
                  { icon: '✍️', title: 'Editorially Reviewed', desc: 'Our team curates the finalists from all nominations, ensuring quality and fairness before voting opens.' },
                  { icon: '🗳️', title: 'Community-Voted', desc: 'Finalists are voted on by the River Region community — one vote per family per category.' },
                  { icon: '🎖️', title: 'Recognized All Year', desc: 'Winners carry the Family Favorites badge across listings, print, social, and the entire RRP ecosystem.' },
                ].map(item => (
                  <div key={item.title} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                    <span style={{ fontSize: 22, flexShrink: 0 }}>{item.icon}</span>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 700, color: N, marginBottom: 4 }}>{item.title}</p>
                      <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.65 }}>{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ───────────────────────── HOW IT WORKS ────────────────────────────── */}
      <section style={{ backgroundColor: C, padding: '80px 24px' }}>
        <div style={{ maxWidth: 960, margin: '0 auto', textAlign: 'center' }}>
          <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: T, marginBottom: 14 }}>The Process</p>
          <h2 style={{ fontFamily: serif, fontSize: 'clamp(24px, 4vw, 40px)', fontWeight: 900, color: N, lineHeight: 1.1, marginBottom: 14 }}>
            How Family Favorites Works
          </h2>
          <p style={{ fontSize: 15, color: '#6b7280', lineHeight: 1.8, maxWidth: 520, margin: '0 auto 52px' }}>
            From nomination to recognition — a process designed for integrity, community, and celebration.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
            {[
              { step: '01', icon: '⭐', month: 'November',     label: 'Nominate',          desc: 'River Region families nominate their favorite local businesses.' },
              { step: '02', icon: '🔍', month: 'December',     label: 'We Review',         desc: 'Our editorial team curates 5 finalists per category.' },
              { step: '03', icon: '📣', month: 'January',      label: 'Finalists Named',   desc: 'Finalists are announced — a meaningful moment for every nominee.' },
              { step: '04', icon: '🗳️', month: 'January',     label: 'Community Votes',   desc: 'Families vote across the region. One vote per family per category.' },
              { step: '05', icon: '🏆', month: 'February',     label: 'Winners Revealed',  desc: 'Winners announced in a community celebration moment.' },
              { step: '06', icon: '🎖️', month: 'Year-round', label: 'Badge Lives On',    desc: 'Winner badges appear on listings, in print, and across the ecosystem.' },
            ].map(s => (
              <div key={s.step} style={{ backgroundColor: W, border: '1px solid rgba(0,0,0,0.07)', borderRadius: 16, padding: '22px 18px', textAlign: 'center' }}>
                <span style={{ fontSize: 28, display: 'block', marginBottom: 12 }}>{s.icon}</span>
                <p style={{ fontSize: 10, fontWeight: 800, color: GOLD, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>{s.month}</p>
                <p style={{ fontFamily: serif, fontSize: 15, fontWeight: 800, color: N, marginBottom: 8 }}>{s.label}</p>
                <p style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.6 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────────────── CATEGORIES ────────────────────────────── */}
      <section id="categories" style={{ backgroundColor: W, padding: '80px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: T, marginBottom: 14 }}>{FF_GROUPS.reduce((s, g) => s + g.categories.length, 0)} Award Categories</p>
            <h2 style={{ fontFamily: serif, fontSize: 'clamp(24px, 4vw, 40px)', fontWeight: 900, color: N, lineHeight: 1.1, marginBottom: 14 }}>
              Categories for {year}
            </h2>
            <p style={{ fontSize: 15, color: '#6b7280', lineHeight: 1.8, maxWidth: 520, margin: '0 auto' }}>
              {isPreLaunch
                ? 'Nominations will be open in November. Browse the categories and think about who deserves recognition in your community.'
                : 'Browse all categories. Every River Region business that families love is eligible.'}
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            {FF_GROUPS.map(group => (
              <div key={group.slug}>
                {/* Group header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, paddingBottom: 12, borderBottom: '1.5px solid rgba(0,0,0,0.07)' }}>
                  <span style={{ fontSize: 22 }}>{group.emoji}</span>
                  <h3 style={{ fontFamily: serif, fontSize: 20, fontWeight: 900, color: N }}>{group.name}</h3>
                  <span style={{ fontSize: 12, color: '#aaa' }}>{group.categories.length} categories</span>
                </div>

                {/* Category tiles */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 12 }}>
                  {group.categories.map(cat => (
                    <div key={cat.slug} style={{ backgroundColor: C, border: '1px solid rgba(0,0,0,0.07)', borderRadius: 14, padding: '18px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div>
                        <p style={{ fontFamily: serif, fontSize: 14, fontWeight: 800, color: N, marginBottom: 6, lineHeight: 1.3 }}>{cat.name}</p>
                        <p style={{ fontSize: 12, color: '#888', lineHeight: 1.55 }}>{cat.description}</p>
                      </div>
                      {phase === 'nominations' ? (
                        <Link href={`/family-favorites/nominate/${cat.slug}`} style={{ fontSize: 12, fontWeight: 700, color: GOLD, textDecoration: 'none', marginTop: 'auto' }}>
                          Nominate →
                        </Link>
                      ) : phase === 'voting' ? (
                        <Link href={`/family-favorites/vote/${cat.slug}`} style={{ fontSize: 12, fontWeight: 700, color: '#3b82f6', textDecoration: 'none', marginTop: 'auto' }}>
                          Vote →
                        </Link>
                      ) : (
                        <span style={{ fontSize: 11, color: '#bbb', marginTop: 'auto' }}>
                          {isPreLaunch ? 'Opens November' : phaseInfo.publicLabel}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────── NOTIFY / EMAIL CAPTURE ────────────────────────── */}
      {(isPreLaunch || phase === 'finalist-review') && (
        <section id="notify" style={{ backgroundColor: N, padding: '80px 24px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(ellipse at 70% 30%, rgba(184,134,11,0.15) 0%, transparent 48%)', pointerEvents: 'none' }} />
          <div style={{ maxWidth: 620, margin: '0 auto', textAlign: 'center', position: 'relative' }}>
            <span style={{ fontSize: 32, display: 'block', marginBottom: 20 }}>⭐</span>
            <h2 style={{ fontFamily: serif, fontSize: 'clamp(24px, 4vw, 38px)', fontWeight: 900, color: W, lineHeight: 1.1, marginBottom: 16 }}>
              {phase === 'finalist-review' ? 'Get Notified When Voting Opens' : 'Be the First to Know When Nominations Open'}
            </h2>
            <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.65)', lineHeight: 1.8, marginBottom: 32 }}>
              {phase === 'finalist-review'
                ? 'Finalists are being selected now. We\'ll let you know the moment voting opens.'
                : 'Sign up and we\'ll notify you when Family Favorites nominations open. No spam — just the announcement and a reminder when we\'re close to closing.'}
            </p>
            <form style={{ display: 'flex', gap: 10, maxWidth: 440, margin: '0 auto', flexWrap: 'wrap' }}>
              <input
                type="email"
                name="email"
                placeholder="Your email address"
                required
                style={{ flex: 1, minWidth: 200, fontSize: 14, padding: '13px 18px', borderRadius: 100, border: '1.5px solid rgba(255,255,255,0.2)', backgroundColor: 'rgba(255,255,255,0.08)', color: W, outline: 'none' }}
              />
              <button
                type="submit"
                style={{ fontSize: 14, fontWeight: 700, color: N, backgroundColor: GOLD, padding: '13px 28px', borderRadius: 100, border: 'none', cursor: 'pointer', flexShrink: 0 }}
              >
                Notify Me
              </button>
            </form>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 14 }}>
              By signing up you&apos;re joining the River Region Parents newsletter. Unsubscribe anytime.
            </p>
          </div>
        </section>
      )}

      {/* ─────────────────── WHY IT'S DIFFERENT ────────────────────────────── */}
      <section style={{ backgroundColor: C, padding: '80px 24px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
          <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: T, marginBottom: 14 }}>What Makes This Different</p>
          <h2 style={{ fontFamily: serif, fontSize: 'clamp(24px, 4vw, 38px)', fontWeight: 900, color: N, lineHeight: 1.1, marginBottom: 14 }}>
            Real Recognition. Real Community.
          </h2>
          <p style={{ fontSize: 15, color: '#6b7280', lineHeight: 1.8, maxWidth: 540, margin: '0 auto 48px' }}>
            Family Favorites is not purchased, not algorithmic, and not decided by a committee. It is the voice of River Region families — organized, celebrated, and amplified.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
            {[
              { icon: '🚫', title: 'Not Pay-to-Win', desc: 'Sponsor placements amplify the program. They never influence who wins. Winners are chosen by community votes alone.' },
              { icon: '✅', title: 'Editorially Reviewed', desc: 'Every nomination is reviewed by our team before finalists are selected. This is not an open-ballot click farm.' },
              { icon: '🔒', title: 'One Vote Per Family', desc: 'Voting requires email verification. One vote per category per email. We actively monitor for suspicious patterns.' },
              { icon: '🏅', title: 'Prestige That Compounds', desc: 'A Family Favorites badge in 2026 remains meaningful in 2028 and beyond. Local recognition builds over years, not clicks.' },
            ].map(item => (
              <div key={item.title} style={{ backgroundColor: W, border: '1px solid rgba(0,0,0,0.07)', borderRadius: 16, padding: '24px 20px', textAlign: 'left' }}>
                <span style={{ fontSize: 26, display: 'block', marginBottom: 12 }}>{item.icon}</span>
                <p style={{ fontFamily: serif, fontSize: 15, fontWeight: 800, color: N, marginBottom: 8 }}>{item.title}</p>
                <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.65 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────── FOR BUSINESSES ────────────────────────────────── */}
      <section style={{ backgroundColor: W, padding: '80px 24px' }}>
        <div style={{ maxWidth: 860, margin: '0 auto', textAlign: 'center' }}>
          <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: T, marginBottom: 14 }}>For Local Businesses</p>
          <h2 style={{ fontFamily: serif, fontSize: 'clamp(24px, 4vw, 38px)', fontWeight: 900, color: N, lineHeight: 1.1, marginBottom: 14 }}>
            A Family Favorites Win Means Something.
          </h2>
          <p style={{ fontSize: 15, color: '#6b7280', lineHeight: 1.8, maxWidth: 540, margin: '0 auto 44px' }}>
            When River Region families vote for your business, they&apos;re saying: we trust you, we love you, and we want everyone else to know it.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, textAlign: 'left' }}>
            {[
              { label: 'Digital Winner Badge', desc: 'Display on your website, social profiles, and email signature. Recognized by River Region families.' },
              { label: 'Guide Listing Boost', desc: 'Winner status is highlighted on your River Region Parents guide listing for the full year.' },
              { label: 'Print Recognition', desc: 'Featured in the annual Family Favorites print issue — the most-saved issue of the year.' },
              { label: 'Social Celebration', desc: 'Your win is announced to 10,000+ River Region moms across social media and the newsletter.' },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', gap: 14, alignItems: 'flex-start', padding: '16px 18px', backgroundColor: C, border: '1px solid rgba(0,0,0,0.07)', borderRadius: 14 }}>
                <span style={{ fontSize: 20, flexShrink: 0 }}>🎖️</span>
                <div>
                  <p style={{ fontFamily: serif, fontSize: 14, fontWeight: 800, color: N, marginBottom: 5 }}>{item.label}</p>
                  <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6 }}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 36 }}>
            <Link href="/partners#strategy-call" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 700, color: N, textDecoration: 'none', padding: '12px 28px', border: `1.5px solid rgba(26,39,68,0.2)`, borderRadius: 100 }}>
              Ask about sponsor opportunities →
            </Link>
          </div>
        </div>
      </section>

    </div>
  )
}
