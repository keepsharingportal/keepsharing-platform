import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, CheckCircle2, X } from 'lucide-react'

export const metadata: Metadata = {
  title: 'The Visibility Engine — River Region Parents',
  description: 'How businesses become the trusted, remembered, and recommended choice for River Region families through layered ecosystem visibility.',
}

// ── Design tokens ─────────────────────────────────────────────────────────────
const T    = '#c4622d'
const N    = '#1a2744'
const C    = '#fdf8f3'
const W    = '#ffffff'
const GOLD = '#b8860b'

const serif = 'var(--font-fraunces, serif)'
const sans  = 'var(--font-dm-sans, sans-serif)'

// ── Ecosystem touchpoints ─────────────────────────────────────────────────────
const TOUCHPOINTS = [
  {
    icon: '📖', label: 'Print Magazine', freq: '12 issues / year',
    reach: '14,000+ households',
    desc: 'In living rooms, waiting rooms, and hair salons across the River Region. Picked up, saved, and passed along.',
    accent: '#2d5a2d', bg: 'rgba(45,90,45,0.07)',
  },
  {
    icon: '🏠', label: 'Homepage Feature', freq: 'Rolling placement',
    reach: '8,000+ monthly visitors',
    desc: 'Seen by every family who visits RiverRegionParents.com — the region\'s most trusted family starting point.',
    accent: N, bg: 'rgba(26,39,68,0.07)',
  },
  {
    icon: '🗺️', label: 'Family Resource Guide', freq: 'Always active',
    reach: '9 specialized guides',
    desc: 'The most-searched local family directory in the region. Families open it when they\'re ready to decide.',
    accent: T, bg: 'rgba(196,98,45,0.07)',
  },
  {
    icon: '✍️', label: 'Editorial Articles', freq: 'Seasonal',
    reach: 'Organic + social reach',
    desc: 'Cited in articles families bookmark and share. Editorial mention reads as a recommendation — because it is.',
    accent: GOLD, bg: 'rgba(184,134,11,0.07)',
  },
  {
    icon: '📧', label: 'Email Newsletter', freq: 'Weekly',
    reach: '4,800+ subscribers',
    desc: 'Landing in inboxes every Tuesday morning. A subscriber base that opens every issue.',
    accent: '#6d2d9a', bg: 'rgba(109,45,154,0.07)',
  },
  {
    icon: '📱', label: 'Social Campaigns', freq: 'Monthly',
    reach: '10,000+ River Region moms',
    desc: 'Paid reach across Facebook and Instagram — to the exact audience that already follows and trusts RRP.',
    accent: '#0d7a5a', bg: 'rgba(13,122,90,0.07)',
  },
  {
    icon: '🎪', label: 'Events & Seasonal Content', freq: 'Quarterly',
    reach: 'High-intent seasonal traffic',
    desc: 'Featured in Things To Do, seasonal roundups, and local event coverage families use to plan their year.',
    accent: '#9a4a0d', bg: 'rgba(154,74,13,0.07)',
  },
  {
    icon: '👑', label: 'Category Sponsorship', freq: 'Exclusive · Always-on',
    reach: 'Every family who opens your section',
    desc: '"Presented By" in your category header. One position. One business. No competitor above you.',
    accent: GOLD, bg: 'rgba(184,134,11,0.1)',
  },
] as const

// ── Family decision stages ────────────────────────────────────────────────────
const STAGES = [
  { n: 1, name: 'Notice',    color: '#bbb',  surface: 'Family Resource Guide',  note: 'She sees your name while searching. Doesn\'t act. But something registers.' },
  { n: 2, name: 'Revisit',   color: '#aaa',  surface: 'Email Newsletter',        note: 'Your name appears in a weekly roundup. Confirmation you\'re local and real.' },
  { n: 3, name: 'Compare',   color: '#888',  surface: 'Featured Listing',        note: 'She opens your profile. She reads the editorial description. She evaluates.' },
  { n: 4, name: 'Recognize', color: N,       surface: 'Social Campaign',         note: 'A friend comments on an RRP post mentioning you. Social proof clicks in.' },
  { n: 5, name: 'Remember',  color: N,       surface: 'Print Magazine',          note: 'She sees your name at the dentist\'s office. You feel established. Permanent.' },
  { n: 6, name: 'Trust',     color: T,       surface: 'Ecosystem Repetition',    note: 'Six touchpoints. Each one trusted. The familiarity becomes something she calls trust.' },
  { n: 7, name: 'Contact',   color: T,       surface: 'Conversion',             note: 'She calls — warm. Not because she searched. Because she already knew.', final: true },
] as const

// ── Penetration levels ────────────────────────────────────────────────────────
const LEVELS = [
  {
    n: 1, name: 'Discoverable',
    tagline: 'Families can find you — if they look.',
    desc: 'You exist in the ecosystem. Families who search your category and scroll far enough can find your name. A starting point, not a destination.',
    active: ['Guide Directory Listing'],
    inactive: ['Newsletter', 'Print', 'Social', 'Featured Position', 'Editorial', 'Sponsor'],
    color: '#999', border: 'rgba(0,0,0,0.1)', bg: '#f8f8f8',
  },
  {
    n: 2, name: 'Recognized',
    tagline: 'Families see your name more than once.',
    desc: 'Your name appears across more than one trusted surface. Recognition builds. You are no longer a stranger — you\'re a name they\'ve seen before.',
    active: ['Guide (Enhanced)', 'Email Newsletter', 'Print Magazine'],
    inactive: ['Social', 'Featured Position', 'Editorial', 'Sponsor'],
    color: N, border: 'rgba(26,39,68,0.18)', bg: 'rgba(26,39,68,0.04)',
  },
  {
    n: 3, name: 'Remembered',
    tagline: 'Families think of you without being prompted.',
    desc: 'You appear across enough trusted surfaces that families begin associating your name with your category — before they ever open the guide.',
    active: ['Guide (Featured)', 'Email Newsletter', 'Print Magazine', 'Social Campaigns', 'Editorial Articles'],
    inactive: ['Category Sponsor'],
    color: T, border: 'rgba(196,98,45,0.22)', bg: 'rgba(196,98,45,0.04)',
  },
  {
    n: 4, name: 'Category Leader',
    tagline: 'Families recommend you before they need you.',
    desc: 'Your name is the category for River Region families. They don\'t search — they already know. And they tell everyone else.',
    active: ['Guide (Category Sponsor)', 'Email Newsletter', 'Print Magazine', 'Social Campaigns', 'Editorial Articles', 'Events & Seasonal', '"Presented By" Header'],
    inactive: [],
    color: GOLD, border: 'rgba(184,134,11,0.3)', bg: 'rgba(184,134,11,0.05)',
  },
] as const

// ── Category ownership examples ───────────────────────────────────────────────
const OWNERSHIP_EXAMPLES = [
  {
    category: 'Pediatric Healthcare',
    duration: '12 months',
    surfaces: 'Featured guide + 12 print issues + 52 newsletter mentions + 12 social posts',
    outcome: '"What pediatrician do you use?" → Their name comes up in every moms group conversation.',
    metric: 'Every new family in the River Region hears their name before their first search.',
    color: T,
  },
  {
    category: 'Childcare & Preschool',
    duration: 'Spring enrollment cycle',
    surfaces: 'Guide category sponsor + newsletter spring features + social campaign + editorial roundup',
    outcome: 'Parents on the waiting list before they tour any other facilities.',
    metric: 'Their inquiry volume peaks weeks before competitors even start advertising.',
    color: N,
  },
  {
    category: 'Summer Camps',
    duration: 'Annual camp guide cycle',
    surfaces: 'Camp guide featured + summer editorial + social countdown + print summer issue',
    outcome: 'The first camp on every registration shortlist — without running a single new ad.',
    metric: 'Families that registered last year refer friends before camp registration opens.',
    color: '#2d5a2d',
  },
  {
    category: 'Sports & Recreation',
    duration: 'Year-round presence',
    surfaces: 'Guide featured + newsletter sports column + fall/spring social campaigns + seasonal print',
    outcome: 'The name River Region parents say when their kids ask to try a sport.',
    metric: 'Word-of-mouth referrals become the primary acquisition channel by month 9.',
    color: GOLD,
  },
] as const

// ── Compound effect snapshots ─────────────────────────────────────────────────
const COMPOUND_SNAPSHOTS = [
  {
    period: 'Month 1',
    label: 'Awareness',
    touchpointCount: 2,
    details: 'Guide listing + newsletter',
    reach: '~600 impressions',
    what: 'Families can find you. A small number do.',
    dots: [T, T],
  },
  {
    period: 'Month 3',
    label: 'Recognition',
    touchpointCount: 5,
    details: 'Guide + newsletter + print + social + editorial',
    reach: '~2,400 impressions',
    what: 'Families who saw you in Month 1 see you again. Familiarity begins.',
    dots: [T, T, N, N, GOLD],
  },
  {
    period: 'Month 6',
    label: 'Trust',
    touchpointCount: 9,
    details: 'All surfaces active across 2 seasonal cycles',
    reach: '~6,800 impressions',
    what: 'Families who\'ve seen you 4+ times now associate your name with the category.',
    dots: [T, T, N, N, GOLD, T, N, GOLD, '#6d2d9a'],
  },
  {
    period: 'Year 1',
    label: 'Authority',
    touchpointCount: 14,
    details: 'Full ecosystem cycling across all surfaces and seasons',
    reach: '~18,000+ impressions',
    what: 'Families recommend you to people who haven\'t searched yet. The referral loop is self-sustaining.',
    dots: [T, T, N, N, GOLD, T, N, GOLD, '#6d2d9a', T, N, T, GOLD, N],
  },
] as const

// ── Page ──────────────────────────────────────────────────────────────────────

export default function VisibilityEnginePage() {
  return (
    <div style={{ backgroundColor: C, color: '#3a2c1e', fontFamily: sans }}>

      {/* ─────────────────────────── 1. HERO ──────────────────────────────── */}
      <section style={{ backgroundColor: N, padding: '92px 24px 84px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(ellipse at 70% 30%, rgba(196,98,45,0.15) 0%, transparent 52%), radial-gradient(ellipse at 20% 80%, rgba(184,134,11,0.07) 0%, transparent 45%)', pointerEvents: 'none' }} />
        <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center', position: 'relative' }}>

          {/* Breadcrumb */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 36 }}>
            <Link href="/partners" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textDecoration: 'none', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              ← Partner With Us
            </Link>
          </div>

          <div style={{ display: 'inline-block', backgroundColor: 'rgba(196,98,45,0.18)', border: '1px solid rgba(196,98,45,0.35)', borderRadius: 100, padding: '5px 18px', fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#f5c4a4', marginBottom: 32 }}>
            The Visibility Engine · River Region Parents
          </div>

          <h1 style={{ fontFamily: serif, fontSize: 'clamp(34px, 6vw, 62px)', fontWeight: 900, color: W, lineHeight: 1.06, letterSpacing: '-0.02em', marginBottom: 26 }}>
            Families Rarely Choose<br />
            <span style={{ color: '#f0a070', fontStyle: 'italic' }}>The First Time They See You.</span>
          </h1>

          <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.68)', lineHeight: 1.8, maxWidth: 580, margin: '0 auto 40px' }}>
            Trust is not built in a single ad. It is built through repeated, familiar presence across the places River Region families already go — every week, every season, every year.
          </p>

          {/* Touchpoint pills */}
          <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 44 }}>
            {['Print', 'Guides', 'Articles', 'Homepage', 'Newsletter', 'Social', 'Events', 'Category Sponsor'].map(tp => (
              <span key={tp} style={{ padding: '5px 14px', borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.55)' }}>
                {tp}
              </span>
            ))}
          </div>

          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', fontStyle: 'italic' }}>
            Eight trusted touchpoints. One ecosystem. One reputation.
          </p>
        </div>
      </section>

      {/* ──────────────────── 2. THE VISIBILITY ENGINE ────────────────────── */}
      <section style={{ backgroundColor: W, padding: '96px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: T, marginBottom: 14 }}>The System</p>
            <h2 style={{ fontFamily: serif, fontSize: 'clamp(26px, 4vw, 44px)', fontWeight: 900, color: N, lineHeight: 1.08, marginBottom: 18 }}>
              One Business. Every Place Families Are Looking.
            </h2>
            <p style={{ fontSize: 16, color: '#666', lineHeight: 1.8, maxWidth: 560, margin: '0 auto' }}>
              The River Region Parents ecosystem is not a directory. It is a layered visibility system where your business appears — repeatedly, in context — across every surface River Region families trust.
            </p>
          </div>

          {/* Touchpoint grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16, marginBottom: 56 }}>
            {TOUCHPOINTS.map(tp => (
              <div key={tp.label} style={{ backgroundColor: tp.bg, border: `1px solid ${tp.accent}22`, borderRadius: 18, padding: '22px 22px', borderLeft: `4px solid ${tp.accent}` }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 20 }}>{tp.icon}</span>
                    <span style={{ fontFamily: serif, fontSize: 14, fontWeight: 800, color: N }}>{tp.label}</span>
                  </div>
                </div>
                <p style={{ fontSize: 12, color: '#666', lineHeight: 1.65, marginBottom: 12 }}>{tp.desc}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: tp.accent, backgroundColor: `${tp.accent}15`, padding: '3px 10px', borderRadius: 100 }}>{tp.freq}</span>
                  <span style={{ fontSize: 11, color: '#aaa', fontWeight: 500 }}>{tp.reach}</span>
                </div>
              </div>
            ))}
          </div>

          {/* "A Tuesday morning" vignette */}
          <div style={{ backgroundColor: C, border: `1.5px solid rgba(196,98,45,0.18)`, borderRadius: 22, padding: '36px 40px', maxWidth: 780, margin: '0 auto' }}>
            <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: T, marginBottom: 22 }}>What This Actually Looks Like — One Week in the River Region</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {[
                { time: 'Monday, 9am', surface: 'Family Resource Guide', moment: 'She\'s searching for summer camp options. Your business appears featured at the top of the section. She reads the editorial description.' },
                { time: 'Tuesday, 8am', surface: 'Email Newsletter', moment: 'Inbox. Summer activity spotlight. Your business is mentioned. She clicks through. She bookmarks the listing.' },
                { time: 'Thursday, 12pm', surface: 'Social Media', moment: 'She scrolls Facebook during lunch. An RRP post about local camps. A friend comments: "My kids go here — they love it." She screenshots it.' },
                { time: 'Saturday, 2pm', surface: 'Print Magazine', moment: 'She\'s at her daughter\'s hair appointment. She picks up River Region Parents. She turns to the Summer Camps section. Your ad is there.' },
              ].map(m => (
                <div key={m.time} style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
                  <div style={{ flexShrink: 0, textAlign: 'right', minWidth: 130 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: '#aaa', margin: 0 }}>{m.time}</p>
                    <p style={{ fontSize: 10, fontWeight: 700, color: T, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 3 }}>{m.surface}</p>
                  </div>
                  <div style={{ width: 1, background: 'rgba(196,98,45,0.18)', alignSelf: 'stretch', flexShrink: 0 }} />
                  <p style={{ fontSize: 14, color: '#444', lineHeight: 1.7, margin: 0 }}>{m.moment}</p>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 28, paddingTop: 22, borderTop: '1px solid rgba(0,0,0,0.08)', textAlign: 'center' }}>
              <p style={{ fontFamily: serif, fontSize: 15, fontWeight: 700, color: N, fontStyle: 'italic', margin: 0 }}>
                By Saturday evening, she already knows your name. She wasn&apos;t targeted. She wasn&apos;t interrupted. She was simply part of the same ecosystem where you&apos;re present.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────── 3. HOW FAMILIES ACTUALLY DECIDE ─────────────── */}
      <section style={{ backgroundColor: C, padding: '96px 24px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: T, marginBottom: 14 }}>Decision Psychology</p>
            <h2 style={{ fontFamily: serif, fontSize: 'clamp(26px, 4vw, 44px)', fontWeight: 900, color: N, lineHeight: 1.08, marginBottom: 18 }}>
              They Don&apos;t Decide.<br />
              <span style={{ fontStyle: 'italic', color: T }}>They Arrive at a Decision.</span>
            </h2>
            <p style={{ fontSize: 16, color: '#666', lineHeight: 1.8, maxWidth: 560, margin: '0 auto' }}>
              Families don&apos;t search once, click, and buy. They move through a trust journey — noticing, revisiting, comparing, recognizing, and eventually contacting. Every touchpoint in the ecosystem moves them one stage forward.
            </p>
          </div>

          <div style={{ position: 'relative' }}>
            {/* Connecting line */}
            <div style={{ position: 'absolute', left: 20, top: 24, bottom: 24, width: 2, backgroundImage: `linear-gradient(to bottom, #ddd 0%, ${T} 100%)`, borderRadius: 2 }} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {(STAGES as unknown as Array<typeof STAGES[number] & { final?: boolean }>).map((stage, i) => (
                <div key={stage.name} style={{ display: 'flex', gap: 24, paddingBottom: i < STAGES.length - 1 ? 28 : 0, position: 'relative' }}>
                  {/* Stage circle */}
                  <div style={{ width: 42, height: 42, borderRadius: '50%', backgroundColor: stage.final ? T : i < 2 ? '#f0f0f0' : 'rgba(26,39,68,0.08)', border: `2px solid ${stage.final ? T : i < 2 ? '#ddd' : 'rgba(26,39,68,0.15)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, zIndex: 1, boxShadow: stage.final ? `0 4px 18px rgba(196,98,45,0.32)` : 'none' }}>
                    <span style={{ fontSize: 13, fontWeight: 900, color: stage.final ? W : stage.color, fontFamily: serif }}>{stage.n}</span>
                  </div>
                  {/* Content */}
                  <div style={{ flex: 1, paddingTop: 6, paddingBottom: i < STAGES.length - 1 ? 8 : 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 7, flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: serif, fontSize: 17, fontWeight: 900, color: stage.final ? T : N }}>{stage.name}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.8)', backgroundColor: stage.final ? T : 'rgba(0,0,0,0.15)', padding: '2px 9px', borderRadius: 100 }}>{stage.surface}</span>
                    </div>
                    <p style={{ fontSize: 15, color: stage.final ? '#2a1c10' : '#555', lineHeight: 1.72, marginBottom: 0, fontWeight: stage.final ? 600 : 400 }}>{stage.note}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 52, padding: '24px 32px', backgroundColor: W, border: '1px solid rgba(0,0,0,0.07)', borderRadius: 18, textAlign: 'center' }}>
            <p style={{ fontFamily: serif, fontSize: 16, fontWeight: 700, color: N, fontStyle: 'italic', lineHeight: 1.65, margin: 0 }}>
              Each stage of this journey is driven by ecosystem repetition — not a single ad. The businesses that win aren&apos;t the loudest. They&apos;re the most familiar.
            </p>
          </div>
        </div>
      </section>

      {/* ─────────────────── 4. ECOSYSTEM PENETRATION LEVELS ─────────────── */}
      <section style={{ backgroundColor: W, padding: '96px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: T, marginBottom: 14 }}>Ecosystem Depth</p>
            <h2 style={{ fontFamily: serif, fontSize: 'clamp(26px, 4vw, 44px)', fontWeight: 900, color: N, lineHeight: 1.08, marginBottom: 18 }}>
              Four Levels of Visibility Depth
            </h2>
            <p style={{ fontSize: 16, color: '#666', lineHeight: 1.8, maxWidth: 560, margin: '0 auto' }}>
              These are not listing tiers. They are ecosystem penetration levels — each one describing how deeply your business is woven into the fabric of how River Region families discover, evaluate, and choose.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 18 }}>
            {LEVELS.map(level => (
              <div key={level.n} style={{ backgroundColor: level.bg, border: `1.5px solid ${level.border}`, borderRadius: 20, padding: '26px 24px', position: 'relative', overflow: 'hidden' }}>
                {/* Level number watermark */}
                <div style={{ position: 'absolute', top: 16, right: 18, fontFamily: serif, fontSize: 64, fontWeight: 900, color: level.n === 4 ? `${GOLD}12` : `${N}08`, lineHeight: 1, userSelect: 'none' }}>
                  {level.n}
                </div>
                <div style={{ marginBottom: 14 }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 100, backgroundColor: `${level.color}18`, border: `1px solid ${level.color}30`, marginBottom: 12 }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: level.color, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Level {level.n}</span>
                  </div>
                  <h3 style={{ fontFamily: serif, fontSize: 20, fontWeight: 900, color: N, marginBottom: 6 }}>{level.name}</h3>
                  <p style={{ fontSize: 13, fontWeight: 700, color: level.color, marginBottom: 12, lineHeight: 1.4, fontStyle: 'italic' }}>{level.tagline}</p>
                  <p style={{ fontSize: 13, color: '#666', lineHeight: 1.65, marginBottom: 18 }}>{level.desc}</p>
                </div>
                {/* Active surfaces */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {level.active.map(s => (
                    <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <CheckCircle2 size={13} color={level.color} style={{ flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: '#3a2c1e', fontWeight: 500 }}>{s}</span>
                    </div>
                  ))}
                  {level.inactive.map(s => (
                    <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: 0.3 }}>
                      <X size={13} color="#999" style={{ flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: '#888', fontWeight: 400 }}>{s}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────────── 5. THE COMPOUND EFFECT ──────────────────── */}
      <section style={{ backgroundColor: N, padding: '100px 24px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(ellipse at 80% 20%, rgba(196,98,45,0.12) 0%, transparent 48%), radial-gradient(ellipse at 10% 75%, rgba(184,134,11,0.08) 0%, transparent 42%)', pointerEvents: 'none' }} />
        <div style={{ maxWidth: 1080, margin: '0 auto', position: 'relative' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#f0a070', marginBottom: 14 }}>This Section Is Critical</p>
            <h2 style={{ fontFamily: serif, fontSize: 'clamp(28px, 4.5vw, 50px)', fontWeight: 900, color: W, lineHeight: 1.06, marginBottom: 18 }}>
              Visibility Doesn&apos;t Add.<br />
              <span style={{ color: '#f0a070', fontStyle: 'italic' }}>It Compounds.</span>
            </h2>
            <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.62)', lineHeight: 1.8, maxWidth: 580, margin: '0 auto' }}>
              Every time a family sees your name, the next impression lands harder. Recognition builds on recognition. Trust builds on trust. And by the time they&apos;re ready to choose — you&apos;re already the answer.
            </p>
          </div>

          {/* Compound snapshots */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 56 }}>
            {COMPOUND_SNAPSHOTS.map((snap, i) => (
              <div key={snap.period} style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: '24px 22px', position: 'relative' }}>
                {/* Grow indicator */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: '20px 20px 0 0', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${(i + 1) * 25}%`, backgroundColor: T, borderRadius: 'inherit', transition: 'width 0.3s' }} />
                </div>
                <p style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>{snap.period}</p>
                <p style={{ fontFamily: serif, fontSize: 18, fontWeight: 900, color: W, marginBottom: 14 }}>{snap.label}</p>
                {/* Dots */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
                  {snap.dots.map((color, di) => (
                    <div key={di} style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: color, opacity: 0.9 }} />
                  ))}
                </div>
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 14 }}>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>{snap.details}</p>
                  <p style={{ fontSize: 11, fontWeight: 700, color: '#f0a070' }}>{snap.reach}</p>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6, marginTop: 10 }}>{snap.what}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Seasonal insight */}
          <div style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 22, padding: '32px 36px' }}>
            <p style={{ fontSize: 11, fontWeight: 800, color: `${GOLD}cc`, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 22 }}>Why Seasonal Cycles Amplify the Effect</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 20 }}>
              {[
                { season: 'Fall', months: 'Aug – Nov', categories: 'School enrollment, healthcare checkups, after-school activities', insight: 'Every new school year means new families asking for recommendations.' },
                { season: 'Winter', months: 'Dec – Feb', categories: 'Winter activities, family planning, holiday gifts', insight: 'Gift registrations and activity signups spike. Your name is already familiar.' },
                { season: 'Spring', months: 'Mar – May', categories: 'Camp registration, preschool decisions, spring sports', insight: 'The single highest-intent research window of the year for most family businesses.' },
                { season: 'Summer', months: 'Jun – Aug', categories: 'Camps, pediatric care, family activities, shopping', insight: 'Families who trusted you in spring refer you all summer long.' },
              ].map(s => (
                <div key={s.season}>
                  <p style={{ fontSize: 13, fontWeight: 800, color: '#d4a843', marginBottom: 4 }}>{s.season} <span style={{ fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.3)' }}>/ {s.months}</span></p>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginBottom: 8, lineHeight: 1.55 }}>{s.categories}</p>
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 1.65 }}>{s.insight}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────── 6. CATEGORY OWNERSHIP ───────────────────── */}
      <section style={{ backgroundColor: C, padding: '96px 24px' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: T, marginBottom: 14 }}>The Highest Level</p>
            <h2 style={{ fontFamily: serif, fontSize: 'clamp(26px, 4vw, 44px)', fontWeight: 900, color: N, lineHeight: 1.08, marginBottom: 18 }}>
              What Category Ownership<br />Actually Looks Like
            </h2>
            <p style={{ fontSize: 16, color: '#666', lineHeight: 1.8, maxWidth: 560, margin: '0 auto' }}>
              When one business consistently dominates a single category across the ecosystem, something remarkable happens. They stop being a business. They become the answer.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 18 }}>
            {OWNERSHIP_EXAMPLES.map(ex => (
              <div key={ex.category} style={{ backgroundColor: W, border: `1.5px solid ${ex.color}20`, borderRadius: 20, padding: '28px 24px', borderTop: `4px solid ${ex.color}` }}>
                <p style={{ fontSize: 11, fontWeight: 800, color: ex.color, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Category</p>
                <h3 style={{ fontFamily: serif, fontSize: 18, fontWeight: 900, color: N, marginBottom: 16, lineHeight: 1.25 }}>{ex.category}</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, color: '#bbb', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>Timeframe</p>
                    <p style={{ fontSize: 13, color: '#555' }}>{ex.duration}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, color: '#bbb', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>Surfaces Active</p>
                    <p style={{ fontSize: 13, color: '#555', lineHeight: 1.6 }}>{ex.surfaces}</p>
                  </div>
                  <div style={{ padding: '14px 16px', backgroundColor: `${ex.color}08`, border: `1px solid ${ex.color}18`, borderRadius: 12 }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: ex.color, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Outcome</p>
                    <p style={{ fontSize: 13, color: '#3a2c1e', lineHeight: 1.65, fontStyle: 'italic' }}>&ldquo;{ex.outcome}&rdquo;</p>
                  </div>
                  <p style={{ fontSize: 12, color: ex.color, fontWeight: 700, lineHeight: 1.55 }}>{ex.metric}</p>
                </div>
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'center', marginTop: 44 }}>
            <div style={{ display: 'inline-block', padding: '18px 32px', backgroundColor: W, border: '1px solid rgba(0,0,0,0.07)', borderRadius: 16 }}>
              <p style={{ fontSize: 14, color: '#666', lineHeight: 1.7, maxWidth: 540, margin: 0 }}>
                Category ownership is not about being the biggest. It is about being the most consistently present in the places where families make decisions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────── 7. LOCAL TRUST ADVANTAGE ────────────────────── */}
      <section style={{ backgroundColor: W, padding: '96px 24px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: T, marginBottom: 14 }}>Why It Works</p>
            <h2 style={{ fontFamily: serif, fontSize: 'clamp(26px, 4vw, 44px)', fontWeight: 900, color: N, lineHeight: 1.08, marginBottom: 18 }}>
              Generic Ads Are Forgotten.<br />
              <span style={{ fontStyle: 'italic', color: T }}>Local Presence Is Remembered.</span>
            </h2>
            <p style={{ fontSize: 16, color: '#666', lineHeight: 1.8, maxWidth: 520, margin: '0 auto' }}>
              Interruption advertising competes for attention it doesn&apos;t own. Ecosystem presence earns a position in the trusted landscape families already navigate.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>

            {/* Left: Generic Ads */}
            <div style={{ backgroundColor: '#f8f8f8', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 22, padding: '32px 28px', opacity: 0.85 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px', borderRadius: 100, backgroundColor: 'rgba(0,0,0,0.07)', marginBottom: 24 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Generic Digital Advertising</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[
                  ['Interruption-based', 'Your ad appears where families didn\'t ask for it — while they\'re doing something else.'],
                  ['No editorial association', 'No trusted voice says you\'re good. Just your own marketing claim.'],
                  ['Impression-based ROI', 'Measured in clicks and CPM — not in recognition or trust.'],
                  ['Forgotten immediately', 'The scroll continues. The impression fades within seconds.'],
                  ['Competes for attention', 'You\'re one of 4,000+ ads the average person sees every day.'],
                  ['Starts over every time', 'Stop paying, disappear. There is no accumulated presence.'],
                ].map(([title, desc]) => (
                  <div key={title} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <X size={14} color="#ccc" style={{ flexShrink: 0, marginTop: 2 }} />
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 600, color: '#888', marginBottom: 2 }}>{title}</p>
                      <p style={{ fontSize: 12, color: '#aaa', lineHeight: 1.55 }}>{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Ecosystem Visibility */}
            <div style={{ backgroundColor: W, border: `1.5px solid rgba(196,98,45,0.2)`, borderRadius: 22, padding: '32px 28px', boxShadow: '0 6px 32px rgba(0,0,0,0.09)' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px', borderRadius: 100, backgroundColor: 'rgba(196,98,45,0.1)', border: '1px solid rgba(196,98,45,0.22)', marginBottom: 24 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: T, textTransform: 'uppercase', letterSpacing: '0.08em' }}>RRP Ecosystem Visibility</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[
                  ['Context-based discovery', 'Your business appears where families are already looking for what you offer — in active research mode.'],
                  ['Editorial association', 'Your name appears alongside RRP\'s 30+ years of trusted community presence. That trust transfers.'],
                  ['Recognition-based ROI', 'Measured in familiarity, referrals, and warm inquiries — outcomes that compound over time.'],
                  ['Builds memory', 'Repeated exposure across trusted surfaces creates durable, category-level recognition.'],
                  ['Earns attention', 'Families open the guide, read the newsletter, and pick up the magazine intentionally.'],
                  ['Compounds over time', 'Every month of presence makes the next impression more powerful. Trust accumulates.'],
                ].map(([title, desc]) => (
                  <div key={title} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <CheckCircle2 size={14} color={T} style={{ flexShrink: 0, marginTop: 2 }} />
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 600, color: N, marginBottom: 2 }}>{title}</p>
                      <p style={{ fontSize: 12, color: '#666', lineHeight: 1.55 }}>{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          <div style={{ textAlign: 'center', marginTop: 44 }}>
            <div style={{ display: 'inline-block', padding: '20px 36px', backgroundColor: N, borderRadius: 100 }}>
              <p style={{ fontFamily: serif, fontSize: 16, fontWeight: 700, color: W, fontStyle: 'italic', margin: 0 }}>
                Ads buy attention. Ecosystem presence earns recognition. Only one of these compounds.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ────────────────────────── 8. FINAL CTA ─────────────────────────── */}
      <section style={{ backgroundColor: C, padding: '96px 24px 108px' }}>
        <div style={{ maxWidth: 760, margin: '0 auto', textAlign: 'center' }}>
          <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: T, marginBottom: 18 }}>Start Building Visibility</p>
          <h2 style={{ fontFamily: serif, fontSize: 'clamp(30px, 4.5vw, 50px)', fontWeight: 900, color: N, lineHeight: 1.08, marginBottom: 22 }}>
            Build Your Family<br />
            <span style={{ fontStyle: 'italic', color: T }}>Visibility Strategy.</span>
          </h2>
          <p style={{ fontSize: 16, color: '#666', lineHeight: 1.8, maxWidth: 520, margin: '0 auto 44px' }}>
            Jason reviews every inquiry personally. He&apos;ll show you exactly where families in your category are already searching, which ecosystem surfaces are the highest-leverage starting points, and what a 12-month visibility strategy looks like for your business.
          </p>

          {/* Three CTAs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center', marginBottom: 40 }}>
            <Link
              href="/partners#strategy-call"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 10, backgroundColor: T, color: W, padding: '16px 36px', borderRadius: 100, fontWeight: 700, fontSize: 16, textDecoration: 'none', boxShadow: '0 6px 28px rgba(196,98,45,0.35)', width: 'fit-content' }}
            >
              Build Your Visibility Strategy <ArrowRight size={16} />
            </Link>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
              <Link
                href="/partners/compare"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 7, color: N, padding: '12px 24px', borderRadius: 100, fontWeight: 600, fontSize: 14, textDecoration: 'none', border: `1.5px solid rgba(26,39,68,0.22)` }}
              >
                See What Families See
              </Link>
              <Link
                href="/partners"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 7, color: '#888', padding: '12px 24px', borderRadius: 100, fontWeight: 600, fontSize: 14, textDecoration: 'none', border: `1.5px solid rgba(0,0,0,0.1)` }}
              >
                View Full Ecosystem Overview
              </Link>
            </div>
          </div>

          {/* Trust footer */}
          <div style={{ padding: '20px 32px', backgroundColor: W, border: '1px solid rgba(0,0,0,0.08)', borderRadius: 18, display: 'inline-block' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap', justifyContent: 'center' }}>
              <div>
                <p style={{ fontSize: 14, fontWeight: 700, color: N, margin: 0 }}>Jason Watson</p>
                <p style={{ fontSize: 11, color: '#aaa', margin: '2px 0 0' }}>Owner &amp; Publisher · River Region Parents</p>
              </div>
              <div style={{ width: 1, height: 34, backgroundColor: '#e8e8e8' }} />
              <div>
                <p style={{ fontSize: 13, color: '#666', margin: 0 }}>(334) 328-5189</p>
                <p style={{ fontSize: 12, color: '#aaa', margin: '3px 0 0' }}>jason@riverregionparents.com</p>
              </div>
              <div style={{ width: 1, height: 34, backgroundColor: '#e8e8e8' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <CheckCircle2 size={13} color={T} />
                <span style={{ fontSize: 12, color: T, fontWeight: 600 }}>Personal reply within 24h</span>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  )
}
