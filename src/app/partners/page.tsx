import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { LeadCaptureForm } from '@/components/advertise/LeadCaptureForm'

export const metadata: Metadata = {
  title: 'Partner with River Region Parents — Family Discovery Ecosystem',
  description: 'River Region Parents is the trusted family discovery ecosystem for the River Region — print, digital guides, editorial, events, social, and email. Learn how your business becomes part of it.',
}

// ── Design tokens ─────────────────────────────────────────────────────────────
const T = '#ef6442'   // terra
const N = '#1a2744'   // navy
const C = '#fdf8f3'   // cream
const W = '#ffffff'

const serif = 'var(--font-fraunces, serif)'
const sans  = 'var(--font-dm-sans, sans-serif)'

// ── Static data ───────────────────────────────────────────────────────────────

const GUIDES = [
  { emoji: '🏡', name: 'Family Resource Guide',  slug: 'family-resource-guide',  desc: 'The anchor guide — schools, childcare, health, activities, and services for River Region families.' },
  { emoji: '📚', name: 'Private School Guide',    slug: 'private-school-guide',   desc: 'Every private and parochial K–12 option in the region. Families research here before they tour.' },
  { emoji: '⛺', name: 'Summer Camp Guide',       slug: 'summer-camp-guide',      desc: 'Day camps, overnight camps, and specialty programs. Registration decisions happen here.' },
  { emoji: '🧸', name: 'Childcare Guide',         slug: 'childcare-guide',        desc: 'Licensed centers, home care, and preschool programs. Waitlists start here.' },
  { emoji: '🩺', name: 'Healthy Kids Guide',      slug: 'healthy-kids-guide',     desc: 'Pediatricians, dentists, specialists, and family health providers.' },
  { emoji: '☀️', name: 'Summer Fun Guide',        slug: 'summer-fun-guide',       desc: 'Activities, splash pads, festivals, and adventures. The summer planning resource.' },
  { emoji: '🎂', name: 'Birthday Party Guide',    slug: 'birthday-party-guide',   desc: 'Venues, entertainers, cakes, and rentals. Booked months in advance by local moms.' },
  { emoji: '🎨', name: 'After-School Guide',      slug: 'afterschool-guide',      desc: 'Programs that fill weekday afternoons with art, sports, music, and learning.' },
  { emoji: '💙', name: 'Special Needs Guide',     slug: 'special-needs-guide',    desc: 'Resources, providers, and organizations supporting families navigating special needs.' },
]

const JOURNEY = [
  { step: '01', surface: 'Print Magazine', action: 'A mom picks up the River Region Parents magazine at her pediatrician\'s office. She sees your business name in the guide section — the first impression, in a context she already trusts.' },
  { step: '02', surface: 'Digital Guide', action: 'Three weeks later, she\'s actively searching for options in your category. She opens the digital guide. Your listing is featured at the top. She reads your editorial description.' },
  { step: '03', surface: 'Editorial Article', action: 'She finds a River Region Parents article on exactly what you offer. Your business is mentioned or linked. The editorial context signals credibility — this is a recommendation, not an ad.' },
  { step: '04', surface: 'Social Media', action: 'She sees a River Region Parents post featuring your business on Instagram. Her friend comments "we love them." She screenshots it. She already knows your name.' },
  { step: '05', surface: 'Newsletter', action: 'Tuesday morning — she gets the River Region Parents newsletter in her inbox. Your category is featured. She clicks through. She bookmarks your listing page.' },
  { step: '06', surface: 'She Calls', action: 'She\'s ready. She\'s not cold. She\'s not a stranger. She\'s a River Region mom who has encountered your business five times across platforms she already trusts. She calls — and she already knows she wants you.' },
]

const LADDER = [
  {
    tier: 'Directory Listing',
    tagline: 'Be found when families search.',
    features: ['Name, phone, website, category', 'Listed across relevant guides', 'Entry into the trusted ecosystem'],
    accent: '#888',
    bg: '#f7f7f7',
    border: 'rgba(0,0,0,0.08)',
  },
  {
    tier: 'Guide Partner',
    tagline: 'A real presence. A real impression.',
    features: ['Hero photo + editorial description written by our team', 'Featured placement in your guide category', 'Send-a-message form — leads delivered to your inbox', 'River Region Parents Partner badge for your website', 'Year-round digital presence across guide ecosystems'],
    accent: N,
    bg: W,
    border: 'rgba(26,39,68,0.15)',
  },
  {
    tier: 'Ecosystem Partner',
    tagline: 'Consistent. Everywhere. Trusted.',
    features: ['Everything in Guide Partner', 'Quarter-page print ad in 12 issues', 'Targeted social distribution to 10,000+ River Region moms monthly', 'Monthly newsletter feature mention', 'Local lead capture with email auto-response', 'Ad design fully handled by our team', 'Quarterly performance report'],
    accent: T,
    bg: '#fff8f5',
    border: 'rgba(196,98,45,0.2)',
    highlight: true,
  },
  {
    tier: 'Category Sponsor',
    tagline: 'Own your section. No competitors above you.',
    features: ['"Presented By" credit in your guide category section header', 'Top placement — always above all other listings', 'Featured in guide hero when applicable', 'Category exclusivity — no competitor featured above you while you hold the position', 'Priority editorial inclusion for your category', 'One position available per category'],
    accent: '#b8860b',
    bg: N,
    border: 'transparent',
    dark: true,
  },
]

const STATS = [
  { number: '30+',   label: 'Years trusted in the River Region',  note: 'Since 1994' },
  { number: '8,000+', label: 'Email subscribers every Tuesday',   note: 'River Region families' },
  { number: '12,000+', label: 'Social media followers',           note: 'Facebook + Instagram' },
  { number: '9',     label: 'Active guide ecosystems',            note: 'More launching in 2026' },
]

const TESTIMONIALS = [
  {
    quote: 'We doubled our new patient inquiries in the first quarter. What surprised me most was how warm the leads were — these were moms who already trusted RRP, and that trust transferred to us immediately.',
    name: 'Dr. Porcia Bradford Love',
    title: 'Pediatric Healthcare, Montgomery',
  },
  {
    quote: 'I\'ve advertised in a lot of places over 20 years of business. River Region Parents is the only one where I can actually trace new customers back to the platform. The ROI is real and it\'s consistent.',
    name: 'Tommy McKinnon',
    title: 'Family Restaurant Owner, Prattville',
  },
  {
    quote: 'What I didn\'t expect was how much they helped me shape the offer itself. My original idea was generic. They pushed me to make it specific, and it completely changed how many people responded.',
    name: 'Michael Chen',
    title: 'Children\'s Fitness Studio, Pike Road',
  },
]

const OPEN_CATEGORIES = [
  'Pediatricians', 'Mom Wellness', 'Sports & Recreation', 'Shopping', 'Family Services',
  'Farmers Markets', 'Faith Communities', 'Family Getaways', 'Pregnancy & Postpartum',
]

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PartnersPage() {
  return (
    <div style={{ backgroundColor: C, color: '#3a2c1e', fontFamily: sans }}>

      {/* ── 1. HERO ────────────────────────────────────────────────────────── */}
      <section style={{ backgroundColor: N, padding: '100px 24px 80px', overflow: 'hidden', position: 'relative' }}>
        {/* Subtle background texture */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(ellipse at 20% 50%, rgba(196,98,45,0.15) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(196,98,45,0.08) 0%, transparent 50%)', pointerEvents: 'none' }} />

        <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center', position: 'relative' }}>
          <div style={{ display: 'inline-block', backgroundColor: 'rgba(196,98,45,0.2)', border: '1px solid rgba(196,98,45,0.4)', borderRadius: 100, padding: '6px 20px', fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#f5c4a4', marginBottom: 32 }}>
            River Region Parents · Partner Overview
          </div>

          <h1 style={{ fontFamily: serif, fontSize: 'clamp(36px, 6vw, 68px)', fontWeight: 900, color: W, lineHeight: 1.05, letterSpacing: '-0.02em', marginBottom: 28 }}>
            Families Don&apos;t Make Decisions<br />
            <span style={{ color: '#f0a070', fontStyle: 'italic' }}>From One Ad Anymore.</span>
          </h1>

          <p style={{ fontSize: 'clamp(16px, 2vw, 20px)', color: 'rgba(255,255,255,0.75)', lineHeight: 1.75, maxWidth: 660, margin: '0 auto 40px' }}>
            They discover. They search. They compare. They revisit. They ask friends. They come back.
            River Region Parents is where that entire journey happens — across print, digital guides,
            editorial content, events, social media, and email.
          </p>

          <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.55)', fontStyle: 'italic', marginBottom: 52 }}>
            Your business needs to be visible inside all of it.
          </p>

          {/* Ecosystem node visualization */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, maxWidth: 760, margin: '0 auto 52px' }}>
            {[
              { icon: '📖', label: 'Print Magazine' },
              { icon: '🗺️', label: 'Digital Guides' },
              { icon: '✍️', label: 'Editorial Articles' },
              { icon: '📅', label: 'Events Calendar' },
              { icon: '📧', label: 'Newsletter' },
              { icon: '📱', label: 'Social Media' },
              { icon: '🔍', label: 'Listing Directory' },
              { icon: '⭐', label: 'Sponsor Features' },
            ].map(node => (
              <div key={node.label} style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: '16px 12px', textAlign: 'center' }}>
                <div style={{ fontSize: 22, marginBottom: 6 }}>{node.icon}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.04em', lineHeight: 1.3 }}>{node.label}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link
              href="#strategy-call"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, backgroundColor: T, color: W, padding: '14px 30px', borderRadius: 100, fontWeight: 700, fontSize: 15, textDecoration: 'none', boxShadow: '0 4px 20px rgba(196,98,45,0.4)' }}
            >
              Talk About Your Category <ArrowRight size={16} />
            </Link>
            <Link
              href="#visibility"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.08)', color: W, padding: '14px 30px', borderRadius: 100, fontWeight: 600, fontSize: 15, textDecoration: 'none', border: '1px solid rgba(255,255,255,0.15)' }}
            >
              See Visibility Options
            </Link>
          </div>
        </div>
      </section>

      {/* ── 2. THE FAMILY DISCOVERY JOURNEY ──────────────────────────────── */}
      <section style={{ backgroundColor: W, padding: '96px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: T, marginBottom: 14 }}>How Families Discover Businesses</p>
            <h2 style={{ fontFamily: serif, fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 900, color: N, lineHeight: 1.1, marginBottom: 16 }}>
              The Journey That Ends With a Phone Call
            </h2>
            <p style={{ fontSize: 16, color: '#666', lineHeight: 1.7, maxWidth: 560, margin: '0 auto' }}>
              No parent calls a business after one ad. They encounter it. Repeatedly. In contexts they already trust.
              Here&apos;s how that journey actually happens inside this ecosystem.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {JOURNEY.map((j, i) => (
              <div
                key={j.step}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '80px 1fr',
                  gap: 24,
                  padding: '28px 0',
                  borderBottom: i < JOURNEY.length - 1 ? '1px solid rgba(0,0,0,0.06)' : 'none',
                  alignItems: 'start',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 52, height: 52, borderRadius: '50%', backgroundColor: i === JOURNEY.length - 1 ? T : N, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontFamily: serif, fontSize: 15, fontWeight: 900, color: W }}>{j.step}</span>
                  </div>
                  {i < JOURNEY.length - 1 && (
                    <div style={{ width: 2, height: 28, backgroundColor: 'rgba(0,0,0,0.08)' }} />
                  )}
                </div>
                <div style={{ paddingTop: 12 }}>
                  <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: i === JOURNEY.length - 1 ? T : N, marginBottom: 6 }}>{j.surface}</p>
                  <p style={{ fontSize: 16, color: '#444', lineHeight: 1.7 }}>{j.action}</p>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 56, padding: '28px 32px', backgroundColor: C, borderRadius: 20, border: `1px solid rgba(196,98,45,0.15)`, maxWidth: 680, margin: '56px auto 0' }}>
            <p style={{ fontFamily: serif, fontSize: 20, fontWeight: 700, color: N, lineHeight: 1.4, marginBottom: 8 }}>
              &ldquo;When your business appears across five platforms the family already trusts, the call isn&apos;t a cold contact. It&apos;s an introduction they&apos;ve already made.&rdquo;
            </p>
            <p style={{ fontSize: 13, color: '#888', fontWeight: 600 }}>River Region Parents</p>
          </div>
        </div>
      </section>

      {/* ── 3. GUIDE ECOSYSTEM ───────────────────────────────────────────── */}
      <section style={{ backgroundColor: C, padding: '96px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: T, marginBottom: 14 }}>The Guide Ecosystem</p>
            <h2 style={{ fontFamily: serif, fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 900, color: N, lineHeight: 1.1, marginBottom: 16 }}>
              Nine Discovery Layers.<br />Every One a Place Families Look.
            </h2>
            <p style={{ fontSize: 16, color: '#666', lineHeight: 1.7, maxWidth: 580, margin: '0 auto' }}>
              Each guide is a curated, searchable, trusted directory where River Region families
              actively look for businesses in your category. Your listing lives inside each one that&apos;s relevant to you.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {GUIDES.map(g => (
              <div key={g.slug} style={{ backgroundColor: W, border: '1px solid rgba(0,0,0,0.07)', borderRadius: 18, padding: '22px 22px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 10 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 10, backgroundColor: `rgba(196,98,45,0.08)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                    {g.emoji}
                  </div>
                  <h3 style={{ fontFamily: serif, fontSize: 16, fontWeight: 700, color: N, lineHeight: 1.2 }}>{g.name}</h3>
                </div>
                <p style={{ fontSize: 13, color: '#666', lineHeight: 1.6, marginBottom: 14 }}>{g.desc}</p>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <Link href={`/partners/guide/${g.slug}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 700, color: T, textDecoration: 'none' }}>
                    Partner opportunities <ArrowRight size={11} />
                  </Link>
                  <span style={{ color: '#ddd', fontSize: 12 }}>·</span>
                  <Link href={`/${g.slug}`} style={{ fontSize: 12, fontWeight: 500, color: '#aaa', textDecoration: 'none' }}>
                    View guide
                  </Link>
                </div>
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'center', marginTop: 40 }}>
            <p style={{ fontSize: 14, color: '#888', fontStyle: 'italic' }}>
              When you are a Partner, you appear in every guide relevant to your category — automatically.
            </p>
          </div>
        </div>
      </section>

      {/* ── 4. VISIBILITY LADDER ─────────────────────────────────────────── */}
      <section id="visibility" style={{ backgroundColor: N, padding: '96px 24px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#f0a070', marginBottom: 14 }}>Visibility Options</p>
            <h2 style={{ fontFamily: serif, fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 900, color: W, lineHeight: 1.1, marginBottom: 16 }}>
              From Discoverable to Undeniable
            </h2>
            <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.65)', lineHeight: 1.7, maxWidth: 520, margin: '0 auto' }}>
              Every business should start somewhere in this ecosystem.
              The question is: how visible do you want to be when families are actively looking for what you offer?
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {LADDER.map((tier, i) => (
              <div
                key={tier.tier}
                style={{
                  backgroundColor: tier.dark ? 'rgba(255,255,255,0.04)' : tier.bg,
                  border: `1px solid ${tier.dark ? 'rgba(255,255,255,0.1)' : tier.border}`,
                  borderRadius: 18,
                  padding: '28px 28px',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {tier.highlight && (
                  <div style={{ position: 'absolute', top: 0, right: 0, backgroundColor: T, color: W, fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '6px 14px', borderBottomLeftRadius: 12 }}>
                    Most Popular
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: tier.accent, flexShrink: 0 }} />
                      <h3 style={{ fontFamily: serif, fontSize: 20, fontWeight: 900, color: tier.dark ? W : N }}>{tier.tier}</h3>
                    </div>
                    <p style={{ fontSize: 14, color: tier.dark ? 'rgba(255,255,255,0.6)' : '#666', fontStyle: 'italic', marginBottom: 4 }}>{tier.tagline}</p>
                  </div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, flex: 2, minWidth: 260 }}>
                    {tier.features.map(f => (
                      <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: tier.dark ? 'rgba(255,255,255,0.75)' : '#444', lineHeight: 1.5, marginBottom: 6 }}>
                        <span style={{ color: tier.accent, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>✓</span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>

          <p style={{ textAlign: 'center', fontSize: 14, color: 'rgba(255,255,255,0.4)', fontStyle: 'italic', marginTop: 28 }}>
            Every partnership begins with a conversation. We&apos;ll help you find the right level for your goals and category.
          </p>
        </div>
      </section>

      {/* ── 5. WHY REPETITION WORKS ─────────────────────────────────────── */}
      <section style={{ backgroundColor: W, padding: '96px 24px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }}>

            <div>
              <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: T, marginBottom: 14 }}>The Psychology of Trust</p>
              <h2 style={{ fontFamily: serif, fontSize: 'clamp(26px, 4vw, 40px)', fontWeight: 900, color: N, lineHeight: 1.15, marginBottom: 20 }}>
                Families don&apos;t trust strangers.<br />They trust <em style={{ color: T }}>familiar faces.</em>
              </h2>
              <div style={{ width: 40, height: 3, backgroundColor: T, borderRadius: 2, marginBottom: 24 }} />
              <p style={{ fontSize: 15, color: '#5a4a3e', lineHeight: 1.8, marginBottom: 16 }}>
                Marketing research has shown for decades that people need 7 or more exposures to a brand before they act on it.
                In a city the size of Montgomery, that familiarity is everything.
              </p>
              <p style={{ fontSize: 15, color: '#5a4a3e', lineHeight: 1.8, marginBottom: 16 }}>
                The businesses that win in the River Region are the ones that mothers recognize — not because they saw one ad,
                but because they&apos;ve encountered the name in the magazine, the guide, the newsletter, and their friend&apos;s group chat.
              </p>
              <p style={{ fontSize: 15, fontWeight: 700, color: N, lineHeight: 1.7 }}>
                Being inside River Region Parents means being inside the conversation River Region moms are already having — before families even know they need you.
              </p>
            </div>

            {/* Touchpoint visual */}
            <div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { icon: '📖', label: 'She picks up the magazine at the pediatrician\'s office', num: 1 },
                  { icon: '🗺️', label: 'She searches and finds your guide listing', num: 2 },
                  { icon: '✍️', label: 'She reads an article that mentions your category', num: 3 },
                  { icon: '📱', label: 'She sees a social post about your business', num: 4 },
                  { icon: '📧', label: 'Your name appears in the Tuesday newsletter', num: 5 },
                  { icon: '🤝', label: 'Her friend mentions you in the moms group', num: 6 },
                  { icon: '📞', label: 'She calls — already warm, already trusting', num: 7 },
                ].map((touch, i) => (
                  <div key={touch.num} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', borderRadius: 12, backgroundColor: i === 6 ? T : C, border: `1px solid ${i === 6 ? 'transparent' : 'rgba(0,0,0,0.06)'}`, transition: 'opacity 0.2s' }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: i === 6 ? 'rgba(255,255,255,0.2)' : N, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: 11, fontWeight: 900, color: W }}>{touch.num}</span>
                    </div>
                    <span style={{ fontSize: 13, color: i === 6 ? W : '#444', lineHeight: 1.4, fontWeight: i === 6 ? 700 : 400 }}>{touch.label}</span>
                    <span style={{ fontSize: 16, marginLeft: 'auto', flexShrink: 0 }}>{touch.icon}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 6. CATEGORY OWNERSHIP ────────────────────────────────────────── */}
      <section style={{ backgroundColor: N, padding: '96px 24px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(ellipse at 70% 30%, rgba(196,98,45,0.12) 0%, transparent 60%)', pointerEvents: 'none' }} />

        <div style={{ maxWidth: 1000, margin: '0 auto', position: 'relative' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }}>

            <div>
              <div style={{ display: 'inline-block', backgroundColor: 'rgba(212,168,67,0.2)', border: '1px solid rgba(212,168,67,0.4)', borderRadius: 100, padding: '5px 16px', fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#d4a843', marginBottom: 24 }}>
                Category Sponsorship · Limited
              </div>
              <h2 style={{ fontFamily: serif, fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 900, color: W, lineHeight: 1.1, marginBottom: 20 }}>
                One Business.<br />One Category.<br /><span style={{ color: '#f0a070', fontStyle: 'italic' }}>No competitors above you.</span>
              </h2>
              <div style={{ width: 40, height: 3, backgroundColor: T, borderRadius: 2, marginBottom: 24 }} />
              <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.75)', lineHeight: 1.8, marginBottom: 16 }}>
                Category Sponsors hold the featured position at the top of their guide section — permanently,
                for as long as they hold the sponsorship. No bidding. No rotation. No competitor appears above you.
              </p>
              <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.75)', lineHeight: 1.8, marginBottom: 24 }}>
                When a family opens the Pediatric &amp; Family Healthcare section of the Family Resource Guide,
                the first thing they see is &ldquo;Presented By [Your Business].&rdquo; That positioning is exclusive.
                It is not available to any other business in your category while you hold it.
              </p>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', fontStyle: 'italic' }}>
                Category sponsorships are filled personally by Jason Watson. Current availability below.
              </p>
            </div>

            <div>
              {/* Mock of Presented By section header */}
              <div style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: '28px 24px', marginBottom: 24 }}>
                <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 12 }}>Example: How Your Category Section Appears</p>
                <div style={{ backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: '18px 18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                    <div>
                      <h3 style={{ fontFamily: serif, fontSize: 18, fontWeight: 900, color: W, marginBottom: 4 }}>Pediatric &amp; Family Healthcare</h3>
                      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>Trusted doctors, dentists, urgent care, and family health providers.</p>
                    </div>
                    <div style={{ flexShrink: 0, textAlign: 'right' }}>
                      <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#d4a843', marginBottom: 4 }}>Presented By</p>
                      <div style={{ backgroundColor: 'rgba(212,168,67,0.15)', border: '1px solid rgba(212,168,67,0.3)', borderRadius: 8, padding: '6px 12px' }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: W }}>Your Business Name</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Open categories */}
              <div>
                <p style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 14 }}>Currently Open</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {OPEN_CATEGORIES.map(cat => (
                    <span key={cat} style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 100, padding: '6px 14px', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>
                      {cat}
                    </span>
                  ))}
                </div>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', fontStyle: 'italic', marginTop: 14 }}>
                  Once a category is filled, it is not available until the sponsorship ends.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 7. REAL LOCAL TRUST ──────────────────────────────────────────── */}
      <section style={{ backgroundColor: C, padding: '96px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: T, marginBottom: 14 }}>The Audience You Want</p>
            <h2 style={{ fontFamily: serif, fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 900, color: N, lineHeight: 1.1 }}>
              They Already Trust Us.<br />They Will Trust You.
            </h2>
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 64 }}>
            {STATS.map(s => (
              <div key={s.label} style={{ backgroundColor: W, border: '1px solid rgba(0,0,0,0.07)', borderRadius: 18, padding: '28px 20px', textAlign: 'center' }}>
                <p style={{ fontFamily: serif, fontSize: 40, fontWeight: 900, color: N, lineHeight: 1, marginBottom: 8 }}>{s.number}</p>
                <p style={{ fontSize: 13, color: '#555', lineHeight: 1.4, fontWeight: 500 }}>{s.label}</p>
                <p style={{ fontSize: 11, color: '#aaa', fontStyle: 'italic', marginTop: 4 }}>{s.note}</p>
              </div>
            ))}
          </div>

          {/* Testimonials */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
            {TESTIMONIALS.map(t => (
              <div key={t.name} style={{ backgroundColor: W, border: '1px solid rgba(0,0,0,0.07)', borderRadius: 20, padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                <p style={{ fontSize: 13, color: T, fontWeight: 700 }}>&ldquo;</p>
                <p style={{ fontSize: 15, color: '#3a2c1e', lineHeight: 1.75, fontStyle: 'italic', flex: 1 }}>{t.quote}&rdquo;</p>
                <div>
                  <p style={{ fontFamily: serif, fontSize: 15, fontWeight: 700, color: N }}>{t.name}</p>
                  <p style={{ fontSize: 13, color: '#888' }}>{t.title}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Heritage statement */}
          <div style={{ textAlign: 'center', marginTop: 56 }}>
            <div style={{ display: 'inline-block', padding: '20px 36px', borderRadius: 100, backgroundColor: N }}>
              <p style={{ fontFamily: serif, fontSize: 17, fontWeight: 700, color: W, fontStyle: 'italic' }}>
                The River Region&apos;s most trusted family media network since 1994.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 8. WHAT PARTNERS SAY THIS IS WORTH ───────────────────────────── */}
      <section style={{ backgroundColor: W, padding: '80px 24px' }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 }}>
            {[
              { title: 'You Don\'t Need to Understand Marketing.', body: 'We\'ve been doing this for 30 years. We know what makes a River Region mom notice something, trust it, and act on it. We design the approach. You serve the customers it brings.' },
              { title: 'You Stay Consistently Visible.', body: 'Most businesses disappear between campaigns. Partners are present every month — magazine, guides, digital, email, social. Families encounter you before they need you.' },
              { title: 'Your Leads Arrive Warm.', body: 'When River Region Parents recommends you, 30 years of community credibility transfers. New leads know your name, trust the context, and convert faster.' },
            ].map(c => (
              <div key={c.title} style={{ padding: '28px 24px', backgroundColor: C, borderRadius: 18, border: '1px solid rgba(0,0,0,0.06)' }}>
                <h3 style={{ fontFamily: serif, fontSize: 18, fontWeight: 700, color: N, marginBottom: 12, lineHeight: 1.3 }}>{c.title}</h3>
                <p style={{ fontSize: 14, color: '#666', lineHeight: 1.7 }}>{c.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 8b. SALES TOOLS ──────────────────────────────────────────────── */}
      <section style={{ backgroundColor: C, padding: '64px 24px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: T, textAlign: 'center', marginBottom: 28 }}>Go Deeper</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
            <Link href="/partners/visibility-engine" style={{ textDecoration: 'none', display: 'block', backgroundColor: W, border: '1.5px solid rgba(196,98,45,0.18)', borderRadius: 20, padding: '26px 24px' }}>
              <p style={{ fontSize: 20, marginBottom: 10 }}>⚙️</p>
              <h3 style={{ fontFamily: serif, fontSize: 17, fontWeight: 800, color: N, marginBottom: 8 }}>The Visibility Engine</h3>
              <p style={{ fontSize: 13, color: '#666', lineHeight: 1.65, marginBottom: 14 }}>How businesses become the trusted, remembered, and recommended choice through layered ecosystem visibility over time.</p>
              <span style={{ fontSize: 12, fontWeight: 700, color: T }}>Read the strategy →</span>
            </Link>
            <Link href="/partners/compare" style={{ textDecoration: 'none', display: 'block', backgroundColor: W, border: '1.5px solid rgba(26,39,68,0.12)', borderRadius: 20, padding: '26px 24px' }}>
              <p style={{ fontSize: 20, marginBottom: 10 }}>🔍</p>
              <h3 style={{ fontFamily: serif, fontSize: 17, fontWeight: 800, color: N, marginBottom: 8 }}>What Families See</h3>
              <p style={{ fontSize: 13, color: '#666', lineHeight: 1.65, marginBottom: 14 }}>A visual side-by-side showing exactly how your business appears to families at each level of ecosystem presence — from invisible to Category Sponsor.</p>
              <span style={{ fontSize: 12, fontWeight: 700, color: N }}>See the comparison →</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ── 9. FINAL CTA ─────────────────────────────────────────────────── */}
      <section id="strategy-call" style={{ backgroundColor: C, padding: '96px 24px 120px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 56, alignItems: 'start' }}>

            {/* Left: positioning */}
            <div>
              <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: T, marginBottom: 16 }}>Let&apos;s Talk</p>
              <h2 style={{ fontFamily: serif, fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 900, color: N, lineHeight: 1.15, marginBottom: 20 }}>
                See What Your Visibility Could Look Like
              </h2>
              <div style={{ width: 40, height: 3, backgroundColor: T, borderRadius: 2, marginBottom: 24 }} />
              <p style={{ fontSize: 15, color: '#5a4a3e', lineHeight: 1.8, marginBottom: 20 }}>
                This isn&apos;t a sales form. It&apos;s the start of a conversation. Fill this out and Jason will respond within 24 hours
                with specific ideas for your business — which guides, which categories, what visibility looks like for where you are now.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
                {[
                  'Jason personally reviews every submission',
                  'No obligation, no pressure, no automated sales sequence',
                  'We\'ll tell you honestly if we\'re the right fit for your goals',
                  'Category sponsorships are discussed privately — ask about availability',
                ].map(item => (
                  <div key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 14, color: '#444', lineHeight: 1.5 }}>
                    <div style={{ width: 20, height: 20, borderRadius: '50%', backgroundColor: 'rgba(196,98,45,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                      <span style={{ fontSize: 10, color: T, fontWeight: 800 }}>✓</span>
                    </div>
                    {item}
                  </div>
                ))}
              </div>

              <div style={{ padding: '18px 20px', backgroundColor: W, borderRadius: 14, border: '1px solid rgba(0,0,0,0.07)' }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: T, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Prefer to talk first?</p>
                <p style={{ fontSize: 15, fontWeight: 600, color: N }}>Jason Watson</p>
                <p style={{ fontSize: 13, color: '#888' }}>River Region Parents · (334) 328-5189</p>
              </div>
            </div>

            {/* Right: form */}
            <div style={{ backgroundColor: W, border: '1px solid rgba(0,0,0,0.08)', borderRadius: 24, padding: '36px 32px', boxShadow: '0 8px 40px rgba(0,0,0,0.08)' }}>
              <p style={{ fontFamily: serif, fontSize: 20, fontWeight: 700, color: N, marginBottom: 4 }}>Tell us about your business.</p>
              <p style={{ fontSize: 14, color: '#888', marginBottom: 24 }}>We&apos;ll come back with category-specific ideas.</p>
              <LeadCaptureForm sourcePage="/partners" />
            </div>
          </div>
        </div>
      </section>

    </div>
  )
}
