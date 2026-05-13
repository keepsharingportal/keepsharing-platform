import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowRight, CheckCircle2, Lock } from 'lucide-react'
import {
  GUIDE_CONFIGS, getGuideConfig,
  TRUST_LABELS, TRUST_COLORS,
  URGENCY_LABELS, URGENCY_COLORS,
} from '../configs'

// ── Static params for all 9 guides ───────────────────────────────────────────
export function generateStaticParams() {
  return GUIDE_CONFIGS.map(g => ({ slug: g.slug }))
}

// ── Metadata ─────────────────────────────────────────────────────────────────
export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params
  const guide = getGuideConfig(slug)
  if (!guide) return {}
  return {
    title: `${guide.name} — Partner Opportunities | River Region Parents`,
    description: `See how your business appears in the ${guide.name} and what visibility looks like for families who use this guide to find local providers.`,
  }
}

// ── Design tokens ─────────────────────────────────────────────────────────────
const T    = '#c4622d'
const N    = '#1a2744'
const C    = '#fdf8f3'
const W    = '#ffffff'
const GOLD = '#b8860b'

const serif = 'var(--font-fraunces, serif)'
const sans  = 'var(--font-dm-sans, sans-serif)'

// ── Page ──────────────────────────────────────────────────────────────────────
export default async function GuidePartnerPage(
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const guide = getGuideConfig(slug)
  if (!guide) notFound()

  const urgencyColor = URGENCY_COLORS[guide.urgency]
  const trustColor   = TRUST_COLORS[guide.trustProfile]
  const isCritical   = guide.trustProfile === 'critical-trust'
  const isTimeSensitive = guide.urgency === 'time-critical'

  const openCategories   = guide.categories.filter(c => c.sponsorOpen)
  const closedCategories = guide.categories.filter(c => !c.sponsorOpen)

  return (
    <div style={{ backgroundColor: C, color: '#3a2c1e', fontFamily: sans }}>

      {/* ──────────────────────────── 1. HERO ─────────────────────────────── */}
      <section style={{ backgroundColor: N, padding: '88px 24px 80px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: `radial-gradient(ellipse at 72% 30%, ${urgencyColor}20 0%, transparent 52%), radial-gradient(ellipse at 18% 75%, rgba(184,134,11,0.07) 0%, transparent 44%)`, pointerEvents: 'none' }} />
        <div style={{ maxWidth: 800, margin: '0 auto', position: 'relative' }}>

          {/* Breadcrumb */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 36 }}>
            <Link href="/partners" style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textDecoration: 'none', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Partner With Us</Link>
            <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: 12 }}>›</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Guide Opportunities</span>
          </div>

          {/* Guide emoji + badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 36 }}>{guide.emoji}</span>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ display: 'inline-block', backgroundColor: `${urgencyColor}25`, border: `1px solid ${urgencyColor}50`, borderRadius: 100, padding: '5px 14px', fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: urgencyColor === T ? '#f0a070' : '#d4a843' }}>
                {guide.hero.badge}
              </span>
            </div>
          </div>

          {/* Headline */}
          <h1 style={{ fontFamily: serif, fontSize: 'clamp(30px, 5vw, 54px)', fontWeight: 900, color: W, lineHeight: 1.06, letterSpacing: '-0.02em', marginBottom: 22 }}>
            {guide.hero.headline}
          </h1>
          <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.66)', lineHeight: 1.8, maxWidth: 600, marginBottom: 36 }}>
            {guide.hero.subheadline}
          </p>

          {/* Trust + urgency profile pills */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '6px 14px', borderRadius: 100, backgroundColor: `${trustColor}20`, border: `1px solid ${trustColor}40` }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: trustColor === '#6d2d9a' ? '#b060e0' : trustColor === T ? '#f0a070' : trustColor }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {TRUST_LABELS[guide.trustProfile]}
              </span>
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '6px 14px', borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {URGENCY_LABELS[guide.urgency]}
              </span>
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '6px 14px', borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {guide.categories.length} Categories
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────── 2. HOW FAMILIES USE THIS GUIDE ──────────────── */}
      <section style={{ backgroundColor: W, padding: '88px 24px' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 56, alignItems: 'start' }}>

            {/* Left: context */}
            <div>
              <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: T, marginBottom: 14 }}>Family Behavior</p>
              <h2 style={{ fontFamily: serif, fontSize: 'clamp(24px, 3.5vw, 36px)', fontWeight: 900, color: N, lineHeight: 1.12, marginBottom: 20 }}>
                How Families Use<br />the {guide.shortName}
              </h2>
              <p style={{ fontSize: 15, color: '#666', lineHeight: 1.8, marginBottom: 28 }}>{guide.audience}</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {[
                  { label: 'Visit Frequency',    value: guide.visitFrequency },
                  { label: 'Research Window',    value: guide.researchWindow },
                  { label: 'Peak Period',        value: guide.peakPeriod },
                ].map(item => (
                  <div key={item.label} style={{ padding: '14px 18px', backgroundColor: C, border: '1px solid rgba(0,0,0,0.07)', borderRadius: 12 }}>
                    <p style={{ fontSize: 10, fontWeight: 800, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 5 }}>{item.label}</p>
                    <p style={{ fontSize: 13, fontWeight: 600, color: N, lineHeight: 1.55 }}>{item.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: usage patterns */}
            <div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {guide.howFamiliesUseIt.map((pattern, i) => (
                  <div key={i} style={{ display: 'flex', gap: 16, alignItems: 'flex-start', padding: '18px 20px', backgroundColor: C, border: '1px solid rgba(0,0,0,0.07)', borderRadius: 16 }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', backgroundColor: `${T}15`, border: `1px solid ${T}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                      <span style={{ fontSize: 11, fontWeight: 900, color: T }}>{i + 1}</span>
                    </div>
                    <p style={{ fontSize: 14, color: '#444', lineHeight: 1.7, margin: 0 }}>{pattern}</p>
                  </div>
                ))}
              </div>

              {/* Seasonal note */}
              <div style={{ marginTop: 20, padding: '18px 20px', backgroundColor: `${urgencyColor}08`, border: `1px solid ${urgencyColor}20`, borderRadius: 14 }}>
                <p style={{ fontSize: 10, fontWeight: 800, color: urgencyColor, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 7 }}>Timing Note</p>
                <p style={{ fontSize: 13, color: '#555', lineHeight: 1.7 }}>{guide.seasonalNote}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────── 3. CATEGORY ECOSYSTEM ───────────────────────── */}
      <section style={{ backgroundColor: C, padding: '88px 24px' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: T, marginBottom: 14 }}>Category Ecosystem</p>
            <h2 style={{ fontFamily: serif, fontSize: 'clamp(24px, 4vw, 40px)', fontWeight: 900, color: N, lineHeight: 1.1, marginBottom: 16 }}>
              {guide.categories.length} Categories.<br />One Category Sponsor Each.
            </h2>
            <p style={{ fontSize: 16, color: '#666', lineHeight: 1.8, maxWidth: 520, margin: '0 auto' }}>
              Every category in the {guide.shortName} has one exclusive Category Sponsor position. Once claimed, that position is unavailable to competitors for as long as the sponsor holds it.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
            {guide.categories.map(cat => (
              <div key={cat.slug} style={{ backgroundColor: W, border: `1.5px solid ${cat.sponsorOpen ? 'rgba(184,134,11,0.22)' : 'rgba(0,0,0,0.07)'}`, borderRadius: 16, padding: '20px 20px', opacity: cat.sponsorOpen ? 1 : 0.65 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <h3 style={{ fontFamily: serif, fontSize: 15, fontWeight: 800, color: N, lineHeight: 1.3, flex: 1, marginRight: 10 }}>{cat.name}</h3>
                  {cat.sponsorOpen
                    ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 100, backgroundColor: 'rgba(184,134,11,0.12)', border: '1px solid rgba(184,134,11,0.3)', flexShrink: 0 }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: GOLD }} />
                        <span style={{ fontSize: 9, fontWeight: 800, color: GOLD, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Open</span>
                      </span>
                    : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 100, backgroundColor: 'rgba(0,0,0,0.04)', flexShrink: 0 }}>
                        <Lock size={8} color="#bbb" />
                        <span style={{ fontSize: 9, fontWeight: 700, color: '#bbb', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Reserved</span>
                      </span>}
                </div>
                <p style={{ fontSize: 12, color: '#888', lineHeight: 1.6 }}>{cat.intentSignal}</p>
              </div>
            ))}
          </div>

          {openCategories.length > 0 && (
            <p style={{ textAlign: 'center', fontSize: 13, color: GOLD, fontWeight: 700, marginTop: 28 }}>
              {openCategories.length} of {guide.categories.length} category sponsor positions currently open.
              {closedCategories.length > 0 ? ` ${closedCategories.length} already reserved.` : ''}
            </p>
          )}
        </div>
      </section>

      {/* ─────────────────── 4. VISIBILITY TIERS IN THIS GUIDE ───────────── */}
      <section style={{ backgroundColor: W, padding: '88px 24px' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: T, marginBottom: 14 }}>Visibility Inside the {guide.shortName}</p>
            <h2 style={{ fontFamily: serif, fontSize: 'clamp(24px, 4vw, 40px)', fontWeight: 900, color: N, lineHeight: 1.1, marginBottom: 16 }}>
              Four Ways to Appear.<br />One Position Owns the Category.
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 16 }}>
            {[
              {
                n: 1,
                name: 'Directory Listing',
                color: '#888',
                border: 'rgba(0,0,0,0.09)',
                bg: '#f9f9f9',
                what: 'Your business name, phone, and website. You exist in the guide. Families who search and scroll far enough find you.',
                includes: ['Name, phone, website link', 'Listed in your category', 'Discoverable via search'],
              },
              {
                n: 2,
                name: 'Guide Partner',
                color: N,
                border: 'rgba(26,39,68,0.15)',
                bg: 'rgba(26,39,68,0.03)',
                what: 'A full profile with photo, editorial description, and a Guide Partner badge. Families can evaluate your business before they contact you.',
                includes: ['Photo + editorial blurb (written by RRP)', 'Guide Partner trust badge', 'Direct call + website buttons', 'Enhanced category position'],
              },
              {
                n: 3,
                name: 'Ecosystem Partner',
                color: T,
                border: 'rgba(196,98,45,0.2)',
                bg: 'rgba(196,98,45,0.04)',
                what: 'Featured at the top of your category. Plus presence across print, newsletter, and social — families encounter your name before they open the guide.',
                includes: ['Featured position in category', 'Print magazine placement', 'Newsletter inclusion', 'Social media reach'],
              },
              {
                n: 4,
                name: 'Category Sponsor',
                color: GOLD,
                border: 'rgba(184,134,11,0.3)',
                bg: 'rgba(184,134,11,0.05)',
                what: '"Presented By" in the category header. Permanent top position. No competitor above you — for as long as you hold the sponsorship.',
                includes: ['"Presented By" in category header', 'Exclusive — one per category', 'No competitor featured above you', 'All Ecosystem Partner touchpoints'],
                exclusive: true,
              },
            ].map(tier => (
              <div key={tier.n} style={{ backgroundColor: tier.bg, border: `1.5px solid ${tier.border}`, borderRadius: 20, padding: '26px 22px', position: 'relative' }}>
                {tier.exclusive && (
                  <div style={{ position: 'absolute', top: -10, right: 16, backgroundColor: GOLD, color: W, fontSize: 9, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '3px 10px', borderRadius: 100 }}>
                    Exclusive
                  </div>
                )}
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 100, backgroundColor: `${tier.color}15`, border: `1px solid ${tier.color}28`, marginBottom: 14 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: tier.color, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Tier {tier.n}</span>
                </div>
                <h3 style={{ fontFamily: serif, fontSize: 17, fontWeight: 900, color: N, marginBottom: 10 }}>{tier.name}</h3>
                <p style={{ fontSize: 13, color: '#666', lineHeight: 1.65, marginBottom: 16 }}>{tier.what}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {tier.includes.map(item => (
                    <div key={item} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                      <CheckCircle2 size={12} color={tier.color} style={{ flexShrink: 0, marginTop: 2 }} />
                      <span style={{ fontSize: 12, color: '#555' }}>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'center', marginTop: 36 }}>
            <Link href="/partners/compare" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 700, color: N, textDecoration: 'none', padding: '10px 22px', borderRadius: 100, border: `1.5px solid rgba(26,39,68,0.18)` }}>
              See visual comparison of all tiers <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </section>

      {/* ─────────────────── 5. ADVERTISER INSIGHT ───────────────────────── */}
      <section style={{ backgroundColor: N, padding: '88px 24px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: `radial-gradient(ellipse at 75% 25%, ${urgencyColor}15 0%, transparent 50%)`, pointerEvents: 'none' }} />
        <div style={{ maxWidth: 1000, margin: '0 auto', position: 'relative' }}>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#f0a070', marginBottom: 14 }}>Why This Guide</p>
            <h2 style={{ fontFamily: serif, fontSize: 'clamp(24px, 4vw, 42px)', fontWeight: 900, color: W, lineHeight: 1.08, marginBottom: 16 }}>
              What Being in the {guide.shortName}<br />
              <span style={{ fontStyle: 'italic', color: '#f0a070' }}>Actually Means for Your Business</span>
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18 }}>
            {[
              { label: 'The Advertiser Angle',        text: guide.advertiserInsight },
              { label: 'The Competitive Reality',     text: guide.competitiveInsight },
              { label: isTimeSensitive ? 'Why Now Matters' : 'The Visibility Opportunity', text: guide.urgencyFrame },
            ].map(item => (
              <div key={item.label} style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 18, padding: '26px 24px' }}>
                <p style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>{item.label}</p>
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)', lineHeight: 1.75 }}>{item.text}</p>
              </div>
            ))}
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginTop: 36 }}>
            {guide.stats.map(stat => (
              <div key={stat.label} style={{ textAlign: 'center', padding: '22px 16px', backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14 }}>
                <p style={{ fontFamily: serif, fontSize: 26, fontWeight: 900, color: W, marginBottom: 6 }}>{stat.value}</p>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────── 6. DISCOVERY JOURNEY ────────────────────────── */}
      <section style={{ backgroundColor: C, padding: '88px 24px' }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: T, marginBottom: 14 }}>Guide-Specific Journey</p>
            <h2 style={{ fontFamily: serif, fontSize: 'clamp(24px, 4vw, 40px)', fontWeight: 900, color: N, lineHeight: 1.1, marginBottom: 16 }}>
              How One Family Finds You<br />Through the {guide.shortName}
            </h2>
            <p style={{ fontSize: 15, color: '#666', lineHeight: 1.8, maxWidth: 480, margin: '0 auto' }}>
              This is not a hypothetical. This is the path families in your category already take — through the guide and across the ecosystem.
            </p>
          </div>

          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', left: 21, top: 24, bottom: 24, width: 2, backgroundImage: `linear-gradient(to bottom, #ddd 0%, ${T} 100%)`, borderRadius: 2 }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {guide.discoveryJourney.map((step, i) => {
                const isFinal = i === guide.discoveryJourney.length - 1
                return (
                  <div key={i} style={{ display: 'flex', gap: 22, paddingBottom: isFinal ? 0 : 28, position: 'relative' }}>
                    <div style={{ width: 44, height: 44, borderRadius: '50%', backgroundColor: isFinal ? T : '#f0f0f0', border: `2px solid ${isFinal ? T : '#e0e0e0'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, zIndex: 1, boxShadow: isFinal ? `0 4px 18px ${T}35` : 'none' }}>
                      <span style={{ fontSize: 12, fontWeight: 900, color: isFinal ? W : '#aaa', fontFamily: serif }}>{i + 1}</span>
                    </div>
                    <div style={{ flex: 1, paddingTop: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 7, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: isFinal ? T : '#bbb', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{step.timing}</span>
                        <span style={{ fontSize: 10, fontWeight: 700, color: W, backgroundColor: isFinal ? T : 'rgba(0,0,0,0.15)', padding: '2px 9px', borderRadius: 100 }}>{step.surface}</span>
                      </div>
                      <p style={{ fontSize: 15, color: isFinal ? '#2a1c10' : '#555', lineHeight: 1.72, fontWeight: isFinal ? 600 : 400 }}>{step.moment}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div style={{ textAlign: 'center', marginTop: 44 }}>
            <Link href="/partners/visibility-engine" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 700, color: N, textDecoration: 'none', padding: '10px 22px', borderRadius: 100, border: `1.5px solid rgba(26,39,68,0.18)` }}>
              See how the full ecosystem compounds this effect <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </section>

      {/* ─────────────────── 7. CATEGORY SPONSOR SPOTLIGHT ───────────────── */}
      {openCategories.length > 0 && (
        <section style={{ backgroundColor: W, padding: '88px 24px' }}>
          <div style={{ maxWidth: 960, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 52 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, backgroundColor: 'rgba(184,134,11,0.1)', border: '1px solid rgba(184,134,11,0.25)', borderRadius: 100, padding: '6px 18px', marginBottom: 20 }}>
                <span style={{ fontSize: 10, fontWeight: 800, color: GOLD, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Exclusive Positions · One Per Category</span>
              </div>
              <h2 style={{ fontFamily: serif, fontSize: 'clamp(24px, 4vw, 40px)', fontWeight: 900, color: N, lineHeight: 1.1, marginBottom: 16 }}>
                Open Category Sponsor Positions<br />in the {guide.shortName}
              </h2>
              <p style={{ fontSize: 15, color: '#666', lineHeight: 1.8, maxWidth: 520, margin: '0 auto' }}>
                Each of these positions gives one business the &ldquo;Presented By&rdquo; placement in the category header — appearing before every family who opens that section. When a position is claimed, it closes.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16, marginBottom: 36 }}>
              {openCategories.map(cat => (
                <div key={cat.slug} style={{ backgroundColor: C, border: `1.5px solid rgba(184,134,11,0.28)`, borderRadius: 18, padding: '24px 22px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <h3 style={{ fontFamily: serif, fontSize: 15, fontWeight: 800, color: N, lineHeight: 1.3 }}>{cat.name}</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0, marginLeft: 10 }}>
                      <div style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: GOLD }} />
                      <span style={{ fontSize: 9, fontWeight: 800, color: GOLD, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Open</span>
                    </div>
                  </div>
                  <p style={{ fontSize: 12, color: '#777', lineHeight: 1.6, marginBottom: 14 }}>{cat.intentSignal}</p>
                  <div style={{ fontSize: 12, color: GOLD, fontWeight: 700 }}>Ask about this position →</div>
                </div>
              ))}
            </div>

            <div style={{ padding: '24px 28px', backgroundColor: N, borderRadius: 18, textAlign: 'center' }}>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 1.7, margin: '0 0 16px' }}>
                Category Sponsor positions are discussed privately. Contact Jason to ask about a specific category — he&apos;ll let you know what&apos;s available and what the position looks like for your business.
              </p>
              <Link
                href="/partners#strategy-call"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, backgroundColor: GOLD, color: W, padding: '12px 28px', borderRadius: 100, fontWeight: 700, fontSize: 14, textDecoration: 'none' }}
              >
                Ask About Category Availability <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ────────────────────────── 8. FINAL CTA ─────────────────────────── */}
      <section style={{ backgroundColor: C, padding: '88px 24px 108px' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', textAlign: 'center' }}>

          {/* Critical trust emphasis for high-trust guides */}
          {isCritical && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 18px', borderRadius: 100, backgroundColor: `${trustColor}10`, border: `1px solid ${trustColor}25`, marginBottom: 24 }}>
              <span style={{ fontSize: 10, fontWeight: 800, color: trustColor, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Trust-Critical Guide · Editorial Voice Matters Most</span>
            </div>
          )}

          {/* Time-sensitive emphasis */}
          {isTimeSensitive && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 18px', borderRadius: 100, backgroundColor: `${T}10`, border: `1px solid ${T}25`, marginBottom: 24 }}>
              <span style={{ fontSize: 10, fontWeight: 800, color: T, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Time-Critical · {guide.peakPeriod} Is the Primary Window</span>
            </div>
          )}

          <h2 style={{ fontFamily: serif, fontSize: 'clamp(28px, 4.5vw, 46px)', fontWeight: 900, color: N, lineHeight: 1.08, marginBottom: 20 }}>
            {guide.cta.headline}
          </h2>
          <p style={{ fontSize: 16, color: '#666', lineHeight: 1.8, maxWidth: 500, margin: '0 auto 40px' }}>
            {guide.cta.body}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center', marginBottom: 36 }}>
            <Link
              href="/partners#strategy-call"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 10, backgroundColor: T, color: W, padding: '16px 34px', borderRadius: 100, fontWeight: 700, fontSize: 16, textDecoration: 'none', boxShadow: `0 6px 28px ${T}35` }}
            >
              Request a Visibility Strategy Call <ArrowRight size={16} />
            </Link>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
              <Link href="/partners/compare" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: N, padding: '11px 22px', borderRadius: 100, fontWeight: 600, fontSize: 13, textDecoration: 'none', border: `1.5px solid rgba(26,39,68,0.2)` }}>
                See What Families See
              </Link>
              <Link href="/partners/visibility-engine" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#888', padding: '11px 22px', borderRadius: 100, fontWeight: 600, fontSize: 13, textDecoration: 'none', border: `1.5px solid rgba(0,0,0,0.1)` }}>
                The Visibility Engine
              </Link>
            </div>
          </div>

          {/* Other guides */}
          <div style={{ paddingTop: 32, borderTop: '1px solid rgba(0,0,0,0.07)', marginTop: 8 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#bbb', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>Also in the Ecosystem</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
              {GUIDE_CONFIGS.filter(g => g.slug !== guide.slug).map(g => (
                <Link
                  key={g.slug}
                  href={`/partners/guide/${g.slug}`}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 100, backgroundColor: W, border: '1px solid rgba(0,0,0,0.08)', fontSize: 12, fontWeight: 600, color: '#666', textDecoration: 'none' }}
                >
                  {g.emoji} {g.shortName}
                </Link>
              ))}
            </div>
          </div>

          {/* Trust footer */}
          <div style={{ marginTop: 32, padding: '18px 28px', backgroundColor: W, border: '1px solid rgba(0,0,0,0.07)', borderRadius: 16, display: 'inline-block' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: N, margin: 0 }}>Jason Watson</p>
                <p style={{ fontSize: 11, color: '#aaa', margin: '2px 0 0' }}>River Region Parents · (334) 328-5189</p>
              </div>
              <div style={{ width: 1, height: 30, backgroundColor: '#e0e0e0' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <CheckCircle2 size={12} color={T} />
                <span style={{ fontSize: 12, color: T, fontWeight: 600 }}>Personal reply within 24h</span>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  )
}
