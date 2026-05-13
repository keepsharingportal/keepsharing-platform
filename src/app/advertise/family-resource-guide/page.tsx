import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Check, BookOpen, Heart, Sparkles, MapPin, Users, ShoppingBag, Star } from 'lucide-react'
import { LeadCaptureForm } from '@/components/advertise/LeadCaptureForm'
import { Navigation } from '@/components/Navigation'
import { PublicFooter } from '@/components/PublicFooter'

export const metadata: Metadata = {
  title: 'Get Listed in the Family Resource Guide — River Region Parents',
  description: 'Reach thousands of River Region families every month. Get your business listed in the Family Resource Guide — the trusted local directory for parents in Montgomery, Prattville, Pike Road, and the River Region.',
}

// ── Styles ────────────────────────────────────────────────────────────────────

const terra   = '#c4622d'
const navy    = '#1a2744'
const cream   = '#fdf8f3'
const border  = 'rgba(0,0,0,0.08)'
const muted   = '#666'

function Check_({ children }: { children: React.ReactNode }) {
  return (
    <li style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
      <div style={{ width: 20, height: 20, borderRadius: '50%', backgroundColor: 'rgba(196,98,45,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
        <Check size={11} color={terra} strokeWidth={3} />
      </div>
      <span style={{ fontSize: 14, color: '#3a2c1e', lineHeight: 1.6 }}>{children}</span>
    </li>
  )
}

// ── V1 categories ─────────────────────────────────────────────────────────────

const CATEGORIES = [
  { icon: BookOpen,    label: 'Schools & Learning'           },
  { icon: Sparkles,    label: 'Childcare'                    },
  { icon: Heart,       label: 'Pediatric & Family Healthcare'},
  { icon: MapPin,      label: 'Things To Do'                 },
  { icon: MapPin,      label: 'Family Getaways'              },
  { icon: Star,        label: 'Food & Dining'                },
  { icon: Users,       label: 'Community & Faith'            },
  { icon: Heart,       label: 'Mom Life'                     },
  { icon: Sparkles,    label: 'Family Services'              },
  { icon: ShoppingBag, label: 'Shopping'                     },
  { icon: Star,        label: 'Sports & Recreation'          },
]

// ── Tier data ─────────────────────────────────────────────────────────────────

const TIERS = [
  {
    name: 'Featured Listing',
    badge: 'Most Visible',
    color: terra,
    price: 'Starting at $149/mo',
    description: 'Maximum visibility across the guide. Your business leads each category section.',
    perks: [
      'Top position in your category section',
      'Hero photo + editorial description',
      '"Featured Partner" badge in the guide',
      'Highlighted in the Trending Resources strip',
      '"Presented By" placement in the guide hero',
      'Included in print edition (where applicable)',
      'Direct website and appointment links',
    ],
  },
  {
    name: 'Enhanced Listing',
    badge: 'Popular',
    color: navy,
    price: 'Starting at $59/mo',
    description: 'A standout card with photo, description, and direct contact links — above free listings.',
    perks: [
      'Photo card with business description',
      'Direct website and phone links',
      'Listed above free entries in category',
      'Included in print edition (where applicable)',
      'Annual listing review with our team',
    ],
  },
  {
    name: 'Free Listing',
    badge: 'Get Started',
    color: '#5a8a6a',
    price: 'Free',
    description: 'Basic name-and-contact entry in the directory. A great starting point.',
    perks: [
      'Business name, phone, and website',
      'Listed in your primary category',
      'Upgrade anytime',
    ],
  },
]

// ── Page ──────────────────────────────────────────────────────────────────────

export default function FRGAdvertisePage() {
  return (
    <div style={{ backgroundColor: cream, minHeight: '100vh', fontFamily: 'var(--font-dm-sans, sans-serif)' }}>

      <Navigation />

      {/* ── BACK LINK ── */}
      <div style={{ borderBottom: `1px solid ${border}`, backgroundColor: 'white' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '12px 24px' }}>
          <Link
            href="/family-resource-guide"
            style={{ fontSize: 13, color: terra, fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            ← Back to Family Resource Guide
          </Link>
        </div>
      </div>

      {/* ── HERO ── */}
      <div style={{ backgroundColor: navy, color: 'white', padding: '72px 24px 64px' }}>
        <div style={{ maxWidth: 760, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ display: 'inline-block', backgroundColor: 'rgba(196,98,45,0.25)', border: '1px solid rgba(196,98,45,0.4)', borderRadius: 100, padding: '6px 18px', fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#f5c4a4', marginBottom: 28 }}>
            River Region Parents · Family Resource Guide
          </div>
          <h1 style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 'clamp(32px, 5vw, 56px)', fontWeight: 900, lineHeight: 1.1, marginBottom: 20 }}>
            Reach the Families<br />Who Are Looking for You
          </h1>
          <p style={{ fontSize: 18, lineHeight: 1.7, color: 'rgba(255,255,255,0.75)', marginBottom: 36, maxWidth: 580, margin: '0 auto 36px' }}>
            The Family Resource Guide is how River Region parents find schools, childcare, doctors, activities, and local businesses they can trust. Get your business in front of them.
          </p>
          <a
            href="#get-listed"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, backgroundColor: terra, color: 'white', padding: '14px 32px', borderRadius: 100, fontWeight: 700, fontSize: 15, textDecoration: 'none' }}
          >
            Get Listed Today <ArrowRight size={16} />
          </a>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px' }}>

        {/* ── WHO SEES THIS ── */}
        <div style={{ padding: '64px 0 0' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
            {[
              { number: '15,000+', label: 'Monthly readers across the River Region' },
              { number: '11',      label: 'Directory categories covering family life' },
              { number: 'Year-round', label: 'Digital discovery — not just one issue' },
              { number: 'Print + Digital', label: 'Combined reach for maximum visibility' },
            ].map(stat => (
              <div key={stat.label} style={{ backgroundColor: 'white', border: `1px solid ${border}`, borderRadius: 16, padding: '28px 24px', textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 28, fontWeight: 900, color: navy, marginBottom: 6 }}>{stat.number}</div>
                <div style={{ fontSize: 13, color: muted, lineHeight: 1.5 }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── LISTING TIERS ── */}
        <div style={{ padding: '64px 0 0' }}>
          <h2 style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 32, fontWeight: 900, color: navy, marginBottom: 8 }}>
            Choose Your Listing Tier
          </h2>
          <p style={{ fontSize: 15, color: muted, marginBottom: 36, maxWidth: 520 }}>
            Every business can start for free. Upgrade when you want more visibility, more inquiries, and more parents seeing your name first.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
            {TIERS.map(tier => (
              <div key={tier.name} style={{ backgroundColor: 'white', border: `1px solid ${border}`, borderRadius: 20, padding: '32px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h3 style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 18, fontWeight: 700, color: navy }}>{tier.name}</h3>
                  <span style={{ fontSize: 11, fontWeight: 700, color: tier.color, backgroundColor: `${tier.color}18`, padding: '4px 10px', borderRadius: 100, letterSpacing: '0.04em' }}>
                    {tier.badge}
                  </span>
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, color: tier.color }}>{tier.price}</div>
                <p style={{ fontSize: 13, color: muted, lineHeight: 1.6, marginBottom: 4 }}>{tier.description}</p>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {tier.perks.map(p => <Check_ key={p}>{p}</Check_>)}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* ── CATEGORY SPONSORSHIPS ── */}
        <div style={{ padding: '64px 0 0' }}>
          <h2 style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 32, fontWeight: 900, color: navy, marginBottom: 8 }}>
            Category Sponsorships
          </h2>
          <p style={{ fontSize: 15, color: muted, marginBottom: 28, maxWidth: 540 }}>
            Own a section of the guide. Category sponsors are the exclusive featured business at the top of their section — in print and digital — for the full year.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
            {CATEGORIES.map(({ icon: Icon, label }) => (
              <div key={label} style={{ backgroundColor: 'white', border: `1px solid ${border}`, borderRadius: 12, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, backgroundColor: 'rgba(196,98,45,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: terra }}>
                  <Icon size={16} />
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: navy, lineHeight: 1.3 }}>{label}</span>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 13, color: muted, marginTop: 16 }}>
            Category sponsorships are limited to one business per section. Ask about availability when you fill out the form below.
          </p>
        </div>

        {/* ── PRINT + DIGITAL ── */}
        <div style={{ padding: '64px 0 0' }}>
          <div style={{ backgroundColor: navy, borderRadius: 24, padding: '48px 40px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(196,98,45,0.9)' }}>
              Print + Digital Visibility
            </div>
            <h2 style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 28, fontWeight: 900, color: 'white', maxWidth: 540 }}>
              Year-Round Discovery, Not Just a One-Time Ad
            </h2>
            <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.7)', lineHeight: 1.7, maxWidth: 560 }}>
              The Family Resource Guide lives online 365 days a year — searchable, browsable, and updated continuously. Featured and Enhanced listings also appear in our annual print edition, distributed to thousands of River Region families through schools, pediatric offices, and community hubs.
            </p>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                'Digital listing active immediately after approval',
                'Print edition distributed annually to 5,000+ families',
                'Your listing shared in our email newsletter (15k+ subscribers)',
                'Social amplification to 50,000+ local parents on Facebook + Instagram',
              ].map(item => (
                <li key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 14, color: 'rgba(255,255,255,0.8)', lineHeight: 1.5 }}>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', backgroundColor: 'rgba(196,98,45,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                    <Check size={11} color={terra} strokeWidth={3} />
                  </div>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* ── LEAD FORM ── */}
        <div id="get-listed" style={{ padding: '64px 0 80px', scrollMarginTop: 80 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 48, alignItems: 'start' }}>

            {/* Left: copy */}
            <div>
              <div style={{ width: 40, height: 4, backgroundColor: terra, borderRadius: 2, marginBottom: 20 }} />
              <h2 style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 32, fontWeight: 900, color: navy, marginBottom: 12, lineHeight: 1.15 }}>
                Get Your Business Listed
              </h2>
              <p style={{ fontSize: 15, color: muted, lineHeight: 1.7, marginBottom: 28 }}>
                Fill out the form and Jason will be in touch within 24 hours to walk you through the right listing tier for your business — no pressure, no obligation.
              </p>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                <Check_>Featured listings are limited per category — ask about availability</Check_>
                <Check_>Free listings are always open — start today at no cost</Check_>
                <Check_>Category sponsorships include a dedicated editorial feature</Check_>
                <Check_>Most listings go live within 48 hours of approval</Check_>
                <Check_>Print edition submissions close each spring — don&apos;t miss the window</Check_>
              </ul>

              <div style={{ marginTop: 36, padding: '20px 24px', backgroundColor: 'white', border: `1px solid ${border}`, borderRadius: 14 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: terra, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                  Prefer to talk first?
                </p>
                <p style={{ fontSize: 14, color: navy, fontWeight: 600 }}>Jason Watson</p>
                <p style={{ fontSize: 13, color: muted }}>River Region Parents · (334) 328-5189</p>
              </div>
            </div>

            {/* Right: form */}
            <div style={{ backgroundColor: 'white', border: `1px solid ${border}`, borderRadius: 20, padding: '36px 32px' }}>
              <LeadCaptureForm sourcePage="/advertise/family-resource-guide" />
            </div>

          </div>
        </div>

      </div>

      <PublicFooter />
    </div>
  )
}
