'use client'

import { useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, BookOpen, Share2, Globe, Palette, Check, Quote } from 'lucide-react'
import { LeadCaptureForm } from './LeadCaptureForm'

// ── Scroll-reveal hook ────────────────────────────────────────────────────────
function useScrollReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.reveal')
    const io = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) { (e.target as HTMLElement).classList.add('revealed'); io.unobserve(e.target) } }),
      { threshold: 0.12 }
    )
    els.forEach(el => io.observe(el))
    return () => io.disconnect()
  }, [])
}

// ── Reusable layout pieces ────────────────────────────────────────────────────
function Divider() {
  return <div style={{ width: 48, height: 3, backgroundColor: 'var(--fg-terra, #ef6442)', borderRadius: 2, marginBottom: 20 }} />
}

function CheckItem({ children }: { children: React.ReactNode }) {
  return (
    <li style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
      <div style={{ width: 20, height: 20, borderRadius: '50%', backgroundColor: 'rgba(196,98,45,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
        <Check size={11} color="#ef6442" strokeWidth={3} />
      </div>
      <span style={{ fontSize: 14, color: '#3a2c1e', lineHeight: 1.6 }}>{children}</span>
    </li>
  )
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="reveal" style={{ display: 'flex', gap: 14, alignItems: 'flex-start', padding: '18px 20px', borderRadius: 14, backgroundColor: 'white', border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', transition: 'transform 0.2s, box-shadow 0.2s' }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.10)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)' }}
    >
      <div style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(196,98,45,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#ef6442' }}>
        {icon}
      </div>
      <div>
        <p style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 15, fontWeight: 700, color: '#1a2744', marginBottom: 4 }}>{title}</p>
        <p style={{ fontSize: 13, color: '#666', lineHeight: 1.55 }}>{description}</p>
      </div>
    </div>
  )
}

function TestimonialCard({ quote, name, title, avatarSrc }: { quote: string; name: string; title: string; avatarSrc: string }) {
  return (
    <div className="reveal" style={{ backgroundColor: 'white', borderRadius: 20, padding: '28px 24px', border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 2px 16px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <Quote size={28} color="rgba(196,98,45,0.3)" />
      <p style={{ fontSize: 14, color: '#3a2c1e', lineHeight: 1.75, fontStyle: 'italic', flex: 1 }}>&ldquo;{quote}&rdquo;</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', overflow: 'hidden', position: 'relative', flexShrink: 0, border: '2px solid rgba(196,98,45,0.2)' }}>
          <Image src={avatarSrc} alt={name} fill style={{ objectFit: 'cover' }} sizes="48px" />
        </div>
        <div>
          <p style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 14, fontWeight: 700, color: '#1a2744' }}>{name}</p>
          <p style={{ fontSize: 11, color: '#888' }}>{title}</p>
        </div>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export function AdvertiseLanding() {
  const formRef = useRef<HTMLDivElement>(null)
  useScrollReveal()

  function scrollToForm() {
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const CREAM = '#faf8f5'
  const NAVY  = '#1a2744'
  const TERRA = '#ef6442'

  return (
    <div style={{ backgroundColor: CREAM, fontFamily: 'var(--font-dm-sans, sans-serif)', color: '#3a2c1e' }}>

      {/* ── Top Nav ──────────────────────────────────────────────────────────── */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, backgroundColor: 'white', borderBottom: '1px solid rgba(0,0,0,0.07)', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, overflow: 'hidden', position: 'relative' }}>
            <Image src="/images/advertise/rrp-logo.png" alt="RRP" fill style={{ objectFit: 'contain' }} sizes="36px" />
          </div>
          <div>
            <p style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 15, fontWeight: 700, color: NAVY, lineHeight: 1 }}>River Region Parents</p>
            <p style={{ fontSize: 11, color: '#888', marginTop: 2 }}>We Help Your Future Customers Find You.</p>
          </div>
        </div>
        <button onClick={scrollToForm} style={{ padding: '9px 20px', borderRadius: 9, fontSize: 13, fontWeight: 700, backgroundColor: TERRA, color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          Get Advertising Info <ArrowRight size={13} />
        </button>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section style={{ maxWidth: 1160, margin: '0 auto', padding: '80px 24px 72px' }}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <div className="reveal">
            <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: TERRA, marginBottom: 16 }}>
              River Region&apos;s Premier Family Media Network
            </p>
            <h1 style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 'clamp(36px, 5.5vw, 60px)', fontWeight: 900, color: NAVY, lineHeight: 1.08, letterSpacing: '-0.02em', marginBottom: 20 }}>
              Get More Local Families Choosing Your Business
            </h1>
            <p style={{ fontSize: 18, color: '#5a4a3e', lineHeight: 1.7, marginBottom: 18 }}>
              Stop guessing about marketing. River Region Parents does what we&apos;ve done for 30 years — connect family businesses to the parents who become your customers.
            </p>
            <div style={{ padding: '16px 20px', borderRadius: 12, backgroundColor: 'rgba(196,98,45,0.08)', border: '1px solid rgba(196,98,45,0.18)', marginBottom: 32 }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#7a3010', lineHeight: 1.6 }}>
                We don&apos;t sell ads. We build winning systems. We are the biggest community influencer for parents in the River Region — and we put that influence to work for our Partners.
              </p>
            </div>
            <button onClick={scrollToForm} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 30px', borderRadius: 12, fontSize: 15, fontWeight: 800, backgroundColor: TERRA, color: 'white', border: 'none', cursor: 'pointer', boxShadow: '0 4px 16px rgba(196,98,45,0.35)' }}>
              See How It Works <ArrowRight size={16} />
            </button>
          </div>

          {/* Hero image with offset treatment */}
          <div className="reveal hidden md:block" style={{ position: 'relative', paddingBottom: 32, paddingRight: 32 }}>
            <div style={{ position: 'absolute', bottom: 0, right: 0, width: '88%', height: '88%', backgroundColor: 'rgba(196,98,45,0.12)', borderRadius: 20 }} />
            <div style={{ position: 'relative', borderRadius: 20, overflow: 'hidden', aspectRatio: '4/3', boxShadow: '0 16px 48px rgba(0,0,0,0.18)' }}>
              <Image src="/images/advertise/hero.png" alt="Local family business owner meeting with River Region Parents team" fill style={{ objectFit: 'cover', objectPosition: 'center' }} sizes="540px" />
            </div>
          </div>
        </div>
      </section>

      {/* ── Pain section ─────────────────────────────────────────────────────── */}
      <section style={{ backgroundColor: NAVY, padding: '80px 24px' }}>
        <div style={{ maxWidth: 760, margin: '0 auto', textAlign: 'center' }}>
          <p className="reveal" style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 'clamp(26px, 4vw, 40px)', fontWeight: 700, color: 'white', lineHeight: 1.2, marginBottom: 32 }}>
            If You&apos;re Not Reaching Moms...{' '}
            <span style={{ color: '#f0a070', fontStyle: 'italic' }}>You&apos;re Losing Business</span>
          </p>
          <div className="reveal" style={{ display: 'flex', flexDirection: 'column', gap: 16, textAlign: 'left', maxWidth: 640, margin: '0 auto 32px' }}>
            <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.8)', lineHeight: 1.8 }}>
              In the River Region, <strong style={{ color: 'white' }}>moms control 85% of household purchasing decisions</strong> for healthcare, education, food, activities, and services. If they don&apos;t know you exist, you don&apos;t exist to their family.
            </p>
            <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.8)', lineHeight: 1.8 }}>
              Running your own social ads? Hoping Google reviews will carry you? Waiting for word-of-mouth? That&apos;s not a strategy. That&apos;s hoping. And hoping doesn&apos;t fill your schedule.
            </p>
            <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.8)', lineHeight: 1.8 }}>
              River Region Parents has been the community&apos;s most trusted source for family recommendations for over 30 years. Our Partners don&apos;t hope to be found. <strong style={{ color: 'white' }}>They&apos;re discovered by the exact families who need what they offer.</strong>
            </p>
          </div>
          <p className="reveal" style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 17, fontStyle: 'italic', color: '#f0a070', letterSpacing: '0.01em' }}>
            Visibility doesn&apos;t grow your business. <strong>Being chosen does.</strong>
          </p>
        </div>
      </section>

      {/* ── Solution section ─────────────────────────────────────────────────── */}
      <section style={{ backgroundColor: CREAM, padding: '88px 24px' }}>
        <div style={{ maxWidth: 1160, margin: '0 auto' }}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">

            <div className="reveal">
              <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.13em', textTransform: 'uppercase', color: TERRA, marginBottom: 14 }}>The System</p>
              <h2 style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 700, color: NAVY, lineHeight: 1.15, marginBottom: 16 }}>
                You Need a System That Works While You Work
              </h2>
              <Divider />
              <p style={{ fontSize: 16, color: '#5a4a3e', lineHeight: 1.7, marginBottom: 10 }}>
                Most advertising puts your name in front of strangers who immediately forget it. Our system puts you in front of moms who are actively looking for exactly what you offer — and follows up until they become your customer.
              </p>
              <p style={{ fontSize: 15, fontWeight: 700, color: NAVY, lineHeight: 1.6, marginBottom: 32 }}>
                Print that stays on kitchen counters. Social content that gets shared to group chats. A digital presence that parents actually visit. All managed for you.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <FeatureCard icon={<BookOpen size={20} />} title="Print That Stays in Homes" description="Our magazine lives on kitchen counters, in waiting rooms, and in diaper bags for 90 days per issue. Not a scroll. Not an ad. A trusted guide." />
                <FeatureCard icon={<Share2 size={20} />} title="Targeted Social Media Campaigns" description="We run your promotion across Instagram and Facebook to our 12,000+ highly engaged following. Organic reach + paid reach + community trust = qualified traffic." />
                <FeatureCard icon={<Globe size={20} />} title="Digital & Email Exposure" description="Featured placement on RiverRegionParents.com alongside our weekly email newsletter reaching 8,000+ subscribers every Tuesday." />
                <FeatureCard icon={<Palette size={20} />} title="Free Ad Design Included" description="You don't need a designer. We design every ad with you — from the offer to the layout — and share a proof before anything goes live." />
              </div>
            </div>

            {/* Sticky photo — desktop only */}
            <div className="hidden lg:block" style={{ position: 'sticky', top: 100 }}>
              <div className="reveal" style={{ borderRadius: 24, overflow: 'hidden', aspectRatio: '3/4', position: 'relative', boxShadow: '0 16px 48px rgba(0,0,0,0.16)' }}>
                <Image src="/images/advertise/solution.png" alt="Local mom with child and business owner" fill style={{ objectFit: 'cover', objectPosition: 'top center' }} sizes="520px" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Mid-page CTA ─────────────────────────────────────────────────────── */}
      <section style={{ backgroundColor: TERRA, padding: '56px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <p className="reveal" style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 'clamp(22px, 3.5vw, 34px)', fontWeight: 700, color: 'white', lineHeight: 1.25, marginBottom: 24 }}>
            Ready to get in front of the families who make the decisions?
          </p>
          <button onClick={scrollToForm} className="reveal" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 32px', borderRadius: 12, fontSize: 15, fontWeight: 800, backgroundColor: 'white', color: TERRA, border: 'none', cursor: 'pointer', boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }}>
            See How It Works <ArrowRight size={15} />
          </button>
        </div>
      </section>

      {/* ── Heavy Lifting section ─────────────────────────────────────────────── */}
      <section style={{ backgroundColor: 'white', padding: '88px 24px' }}>
        <div style={{ maxWidth: 1160, margin: '0 auto' }}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">

            <div className="reveal">
              <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.13em', textTransform: 'uppercase', color: TERRA, marginBottom: 14 }}>We Do the Heavy Lifting</p>
              <h2 style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 'clamp(26px, 4vw, 40px)', fontWeight: 700, color: NAVY, lineHeight: 1.15, marginBottom: 18 }}>
                You Don&apos;t Need to Be a Marketing Expert. You Just Need the Right Partner.
              </h2>
              <Divider />
              <p style={{ fontSize: 15, color: '#5a4a3e', lineHeight: 1.75, marginBottom: 14 }}>
                Most business owners know they should be marketing better. They just don&apos;t have the time, the expertise, or the energy to figure out what &ldquo;better&rdquo; even looks like.
              </p>
              <p style={{ fontSize: 15, color: '#5a4a3e', lineHeight: 1.75, marginBottom: 14 }}>
                That&apos;s where we come in. We&apos;ve been doing this for 30 years. We know what makes a River Region mom notice something, trust something, and act on something. We turn that knowledge into a system that runs for your business.
              </p>
              <p style={{ fontSize: 15, color: '#5a4a3e', lineHeight: 1.75 }}>
                Our Partners don&apos;t need to understand Facebook algorithms or write ad copy or design anything. They show up to serve their customers. We show up to find them more.
              </p>
            </div>

            <div>
              <div className="reveal" style={{ borderRadius: 20, overflow: 'hidden', aspectRatio: '4/3', position: 'relative', marginBottom: 24, boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
                <Image src="/images/advertise/heavy-lifting.png" alt="Business consultation and partnership" fill style={{ objectFit: 'cover' }} sizes="520px" />
              </div>
              <div className="reveal" style={{ backgroundColor: CREAM, borderRadius: 16, padding: '24px 22px', border: '1px solid rgba(0,0,0,0.07)' }}>
                <p style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: TERRA, marginBottom: 14 }}>What We Handle For You</p>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  <CheckItem>We&apos;ll help you shape your offer so it connects with what moms actually care about</CheckItem>
                  <CheckItem>We&apos;ll design your ad, share a proof, and refine it until you love it</CheckItem>
                  <CheckItem>We&apos;ll keep you visible every month — not just when you remember to post</CheckItem>
                  <CheckItem>We&apos;ll move families from awareness to action with follow-up systems built for you</CheckItem>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Differentiator section ────────────────────────────────────────────── */}
      <section style={{ position: 'relative', overflow: 'hidden', padding: '88px 24px', minHeight: 400 }}>
        <div style={{ position: 'absolute', inset: 0 }}>
          <Image src="/images/advertise/differentiator.png" alt="" fill style={{ objectFit: 'cover', objectPosition: 'center' }} sizes="100vw" />
          <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(26,39,68,0.84)' }} />
        </div>
        <div style={{ position: 'relative', maxWidth: 720, margin: '0 auto', textAlign: 'center' }}>
          <h2 className="reveal" style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 'clamp(28px, 5vw, 48px)', fontWeight: 900, color: 'white', lineHeight: 1.15, letterSpacing: '-0.02em', marginBottom: 24 }}>
            Most Advertising Gets Seen.{' '}
            <span style={{ color: '#f0a070', fontStyle: 'italic' }}>Ours Gets Remembered.</span>
          </h2>
          <p className="reveal" style={{ fontSize: 16, color: 'rgba(255,255,255,0.8)', lineHeight: 1.75, marginBottom: 14 }}>
            River Region Parents isn&apos;t a billboard or a social media account. It&apos;s the thing moms forward to each other. The guide they come back to. The source they trust because it&apos;s been reliable for over 30 years.
          </p>
          <p className="reveal" style={{ fontSize: 16, color: 'rgba(255,255,255,0.8)', lineHeight: 1.75 }}>
            When your business is part of this platform, you&apos;re not running an ad. You&apos;re being <em>recommended</em> by the community&apos;s most trusted voice for families.
          </p>
        </div>
      </section>

      {/* ── Testimonials ─────────────────────────────────────────────────────── */}
      <section style={{ backgroundColor: CREAM, padding: '88px 24px' }}>
        <div style={{ maxWidth: 1160, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <p className="reveal" style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.13em', textTransform: 'uppercase', color: TERRA, marginBottom: 14 }}>Partner Voices</p>
            <h2 className="reveal" style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 'clamp(26px, 4vw, 40px)', fontWeight: 700, color: NAVY, lineHeight: 1.15 }}>
              What Local Business Owners Are Saying
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <TestimonialCard
              quote="We doubled our new patient inquiries in the first quarter. What surprised me most was how warm the leads were — these were moms who already trusted RRP, and that trust transferred to us immediately."
              name="Dr. Porcia Bradford Love"
              title="Pediatric Healthcare, Montgomery"
              avatarSrc="/images/advertise/avatar-porcia.png"
            />
            <TestimonialCard
              quote="I've advertised in a lot of places over 20 years of business. River Region Parents is the only one where I can actually trace new customers back to the platform. The ROI is real and it's consistent."
              name="Tommy McKinnon"
              title="Family Restaurant Owner, Prattville"
              avatarSrc="/images/advertise/avatar-tommy.png"
            />
            <TestimonialCard
              quote="What I didn't expect was how much they helped me shape the offer itself. My original ad idea was generic. They pushed me to make it specific, and it completely changed how many people responded."
              name="Michael Chen"
              title="Children's Fitness Studio, Pike Road"
              avatarSrc="/images/advertise/avatar-michael.png"
            />
          </div>
        </div>
      </section>

      {/* ── Who This Is For ───────────────────────────────────────────────────── */}
      <section style={{ backgroundColor: 'white', padding: '80px 24px' }}>
        <div style={{ maxWidth: 820, margin: '0 auto' }}>
          <div className="reveal" style={{ textAlign: 'center', marginBottom: 40 }}>
            <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.13em', textTransform: 'uppercase', color: TERRA, marginBottom: 14 }}>Is This Right For You?</p>
            <h2 style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 700, color: NAVY, lineHeight: 1.2, marginBottom: 10 }}>
              This Is For You If...
            </h2>
            <p style={{ fontSize: 15, color: '#666' }}>You serve families, parents, or children anywhere in the River Region.</p>
          </div>
          <div className="reveal grid grid-cols-1 md:grid-cols-2 gap-x-12">
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              <CheckItem>You&apos;re a healthcare provider looking for new patient families</CheckItem>
              <CheckItem>You run a private school, preschool, or daycare</CheckItem>
              <CheckItem>You own a restaurant where families celebrate milestones</CheckItem>
              <CheckItem>You run classes, activities, or sports for kids</CheckItem>
              <CheckItem>You provide services that parents actively look for</CheckItem>
            </ul>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              <CheckItem>You want to be seen as THE trusted choice in your category</CheckItem>
              <CheckItem>You&apos;ve tried social media ads that didn&apos;t convert</CheckItem>
              <CheckItem>You&apos;re tired of being invisible to the families who need you</CheckItem>
              <CheckItem>You want leads that are already warm — not cold strangers</CheckItem>
              <CheckItem>You&apos;re ready to invest in a system that actually produces customers</CheckItem>
            </ul>
          </div>
          <p className="reveal" style={{ fontSize: 14, color: '#888', textAlign: 'center', fontStyle: 'italic', marginTop: 28 }}>
            If your business serves families in the River Region, we have a way to help you grow.
          </p>
        </div>
      </section>

      {/* ── Offer cards ──────────────────────────────────────────────────────── */}
      <section style={{ backgroundColor: CREAM, padding: '80px 24px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <p className="reveal" style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.13em', textTransform: 'uppercase', color: TERRA, marginBottom: 14 }}>Why It Works</p>
            <h2 className="reveal" style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 700, color: NAVY, lineHeight: 1.2 }}>
              Three Things That Make River Region Parents Partners Different
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { num: '01', title: 'Stay Consistently Visible', desc: 'Most businesses disappear between campaigns. RRP Partners are present every month — magazine, digital, email, social. Families see you before they need you, so when they do need you, you&apos;re already trusted.' },
              { num: '02', title: 'Build Trust Faster', desc: 'When RRP recommends you, it carries 30 years of community credibility. That trust transfers immediately. New leads arrive warmer and convert faster than any cold advertising can deliver.' },
              { num: '03', title: 'Make Growth Easier', desc: 'A system that consistently delivers warm leads means you spend less time chasing business and more time serving it. Growth becomes predictable, not accidental.' },
            ].map(card => (
              <div key={card.num} className="reveal" style={{ backgroundColor: 'white', borderRadius: 20, padding: '28px 24px', border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
                <p style={{ fontSize: 32, fontFamily: 'var(--font-fraunces, serif)', fontWeight: 900, color: 'rgba(196,98,45,0.2)', lineHeight: 1, marginBottom: 14 }}>{card.num}</p>
                <h3 style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 20, fontWeight: 700, color: NAVY, marginBottom: 10 }}>{card.title}</h3>
                <p style={{ fontSize: 14, color: '#666', lineHeight: 1.7 }}>{card.desc}</p>
              </div>
            ))}
          </div>
          <p className="reveal" style={{ fontSize: 14, color: '#888', textAlign: 'center', fontStyle: 'italic', marginTop: 32 }}>
            The River Region&apos;s most trusted family media network has been making this happen since 1994.
          </p>
        </div>
      </section>

      {/* ── Risk Removal ─────────────────────────────────────────────────────── */}
      <section style={{ background: `linear-gradient(135deg, ${TERRA} 0%, #a03818 100%)`, padding: '64px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <h2 className="reveal" style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 'clamp(24px, 4vw, 38px)', fontWeight: 700, color: 'white', lineHeight: 1.2, marginBottom: 16 }}>
            We&apos;ll Help You Get It Right From the Start
          </h2>
          <p className="reveal" style={{ fontSize: 15, color: 'rgba(255,255,255,0.85)', lineHeight: 1.75, marginBottom: 24 }}>
            Before anything goes live, Jason sits down with you to understand your business, your customer, and your best offer. Every ad we create is crafted to convert — not just to look good. And if something isn&apos;t working, we fix it.
          </p>
          <button onClick={scrollToForm} className="reveal" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '13px 28px', borderRadius: 12, fontSize: 14, fontWeight: 800, backgroundColor: 'white', color: TERRA, border: 'none', cursor: 'pointer' }}>
            Let&apos;s Talk About Your Business <ArrowRight size={14} />
          </button>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────────────────────── */}
      <section style={{ position: 'relative', overflow: 'hidden', padding: '88px 24px' }}>
        <div style={{ position: 'absolute', inset: 0 }}>
          <Image src="/images/advertise/cta-bg.png" alt="" fill style={{ objectFit: 'cover', objectPosition: 'center' }} sizes="100vw" />
          <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(26,39,68,0.88)' }} />
        </div>
        <div style={{ position: 'relative', maxWidth: 680, margin: '0 auto', textAlign: 'center' }}>
          <h2 className="reveal" style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 'clamp(28px, 5vw, 48px)', fontWeight: 900, color: 'white', lineHeight: 1.12, letterSpacing: '-0.02em', marginBottom: 24 }}>
            Ready to Reach the Moms Who Make the Decisions?
          </h2>
          <p className="reveal" style={{ fontSize: 16, color: 'rgba(255,255,255,0.8)', lineHeight: 1.7, marginBottom: 36 }}>
            Tell us about your business and Jason will be in touch within 24 hours with a personalized look at what a River Region Parents partnership looks like for you.
          </p>
          <div className="reveal" style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={scrollToForm} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 28px', borderRadius: 12, fontSize: 15, fontWeight: 800, backgroundColor: TERRA, color: 'white', border: 'none', cursor: 'pointer' }}>
              Get Advertising Info <ArrowRight size={15} />
            </button>
            <a href="tel:334-328-5189" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 28px', borderRadius: 12, fontSize: 15, fontWeight: 700, backgroundColor: 'rgba(255,255,255,0.12)', color: 'white', textDecoration: 'none', border: '1.5px solid rgba(255,255,255,0.3)' }}>
              Schedule a Quick Call
            </a>
          </div>
        </div>
      </section>

      {/* ── Lead Capture Form ─────────────────────────────────────────────────── */}
      <section ref={formRef} id="advertise-form" style={{ backgroundColor: 'white', padding: '88px 24px' }}>
        <div style={{ maxWidth: 780, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <p className="reveal" style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.13em', textTransform: 'uppercase', color: TERRA, marginBottom: 14 }}>Take the First Step</p>
            <h2 className="reveal" style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 700, color: NAVY, lineHeight: 1.15, marginBottom: 12 }}>
              Tell Us About Your Business
            </h2>
            <p className="reveal" style={{ fontSize: 15, color: '#666', maxWidth: 480, margin: '0 auto' }}>
              No obligation. Jason reads every submission personally and responds within 24 hours with a real answer, not a sales pitch.
            </p>
          </div>
          <div className="reveal" style={{ backgroundColor: '#faf8f5', borderRadius: 24, padding: '40px 36px', border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 4px 32px rgba(0,0,0,0.06)' }}>
            <LeadCaptureForm />
          </div>
        </div>
      </section>

      {/* ── Still Not Sure ────────────────────────────────────────────────────── */}
      <section style={{ backgroundColor: CREAM, padding: '64px 24px' }}>
        <div style={{ maxWidth: 640, margin: '0 auto', textAlign: 'center' }}>
          <h3 className="reveal" style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 26, fontWeight: 700, color: NAVY, marginBottom: 12 }}>
            Still Not Sure If This Is Right For You?
          </h3>
          <p className="reveal" style={{ fontSize: 15, color: '#666', lineHeight: 1.7, marginBottom: 28 }}>
            That&apos;s completely normal. Here&apos;s a quick gut check:
          </p>
          <ul className="reveal" style={{ listStyle: 'none', padding: 0, margin: '0 auto 24px', display: 'inline-block', textAlign: 'left' }}>
            <CheckItem>Your customers are families with children in the River Region</CheckItem>
            <CheckItem>You want more of them, not just different ones</CheckItem>
            <CheckItem>You&apos;re willing to invest in a system that compounds over time</CheckItem>
            <CheckItem>You want a partner who cares whether it actually works</CheckItem>
          </ul>
          <p className="reveal" style={{ fontSize: 14, color: '#888', fontStyle: 'italic' }}>
            If those four things are true, fill out the form above. If they&apos;re not, we&apos;re probably not the right fit — and that&apos;s okay too.
          </p>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────────── */}
      <footer style={{ backgroundColor: NAVY, padding: '40px 24px', textAlign: 'center' }}>
        <p style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 18, fontWeight: 700, color: 'white', marginBottom: 6 }}>
          River Region Parents
        </p>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>
          We Help Your Future Customers Find You.
        </p>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 16 }}>
          © {new Date().getFullYear()} KeepSharing LLC · River Region Parents · Montgomery, Alabama
        </p>
      </footer>

      <style>{`
        .reveal { opacity: 0; transform: translateY(20px); transition: opacity 0.55s ease, transform 0.55s ease; }
        .revealed { opacity: 1; transform: translateY(0); }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
