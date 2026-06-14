import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, CheckCircle2, Star, Globe, Phone, Lock } from 'lucide-react'

export const metadata: Metadata = {
  title: 'What Families See — Visibility Comparison | River Region Parents',
  description: 'See exactly how your business appears to River Region families at every level of ecosystem presence — from no listing to Category Sponsor.',
}

// ── Design tokens ─────────────────────────────────────────────────────────────
const T    = '#ef6442'
const N    = '#1a2744'
const C    = '#fdf8f3'
const W    = '#ffffff'
const G    = '#e8e8e8'
const GOLD = '#b8860b'

const serif = 'var(--font-fraunces, serif)'
const sans  = 'var(--font-dm-sans, sans-serif)'

// ── Images ─────────────────────────────────────────────────────────────────
const IMG_PEDIATRIC = 'https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?w=900&q=80&auto=format&fit=crop'
const IMG_CHILDCARE = 'https://images.unsplash.com/photo-1587654780291-39c9404d746b?w=900&q=80&auto=format&fit=crop'
const IMG_SPORTS    = 'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=900&q=80&auto=format&fit=crop'
const IMG_THUMB     = 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=400&q=80&auto=format&fit=crop'

// ── Annotation badge ──────────────────────────────────────────────────────────
function Ann({ n }: { n: number }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: 22, height: 22, borderRadius: '50%',
      backgroundColor: T, color: W,
      fontSize: 10, fontWeight: 900,
      position: 'absolute', top: -8, right: -8,
      boxShadow: '0 2px 8px rgba(196,98,45,0.45)',
      zIndex: 10, flexShrink: 0,
    }}>
      {n}
    </span>
  )
}

function CalloutItem({ n, text }: { n: number; text: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
      <div style={{ width: 22, height: 22, borderRadius: '50%', backgroundColor: T, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
        <span style={{ fontSize: 10, fontWeight: 900, color: W }}>{n}</span>
      </div>
      <p style={{ fontSize: 13, color: '#444', lineHeight: 1.55, margin: 0 }}>{text}</p>
    </div>
  )
}

// ── Mock UI building blocks ───────────────────────────────────────────────────

function MockSectionHeader({
  groupName, description, listingCount, sponsorName,
}: {
  groupName: string; description?: string; listingCount?: number; sponsorName?: string
}) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12, marginBottom: 16, paddingBottom: 14, borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
      <div style={{ flex: 1, minWidth: 180 }}>
        <h3 style={{ fontFamily: serif, fontSize: 17, fontWeight: 900, color: N, marginBottom: 4 }}>{groupName}</h3>
        {description && <p style={{ fontSize: 12, color: '#888', lineHeight: 1.5 }}>{description}</p>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
        {listingCount !== undefined && (
          <span style={{ fontSize: 12, color: '#bbb' }}>{listingCount} listing{listingCount !== 1 ? 's' : ''}</span>
        )}
        {sponsorName && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: GOLD }}>Presented By</span>
            <div style={{ backgroundColor: 'rgba(184,134,11,0.1)', border: '1px solid rgba(184,134,11,0.35)', borderRadius: 8, padding: '5px 11px' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: N }}>{sponsorName}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function MockEmptyState() {
  return (
    <div style={{ border: '1.5px dashed rgba(0,0,0,0.12)', borderRadius: 12, padding: '20px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, backgroundColor: 'rgba(0,0,0,0.015)', flexWrap: 'wrap' }}>
      <div>
        <p style={{ fontSize: 13, fontWeight: 600, color: '#bbb', marginBottom: 4 }}>Trusted providers being added here.</p>
        <p style={{ fontSize: 11, color: '#ccc' }}>No listings claimed in this section yet.</p>
      </div>
      <div style={{ padding: '7px 16px', borderRadius: 100, border: '1px solid rgba(0,0,0,0.12)', color: '#aaa', fontSize: 11, fontWeight: 600, flexShrink: 0 }}>
        Get Listed Early
      </div>
    </div>
  )
}

function MockFreeListing({ name, city, phone }: { name: string; city?: string; phone?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 16px', borderRadius: 10, border: '1px solid rgba(0,0,0,0.07)', backgroundColor: W, gap: 16, flexWrap: 'wrap' }}>
      <div>
        <p style={{ fontSize: 13, fontWeight: 700, color: N }}>{name}</p>
        {city && <p style={{ fontSize: 11, color: '#bbb', marginTop: 2 }}>{city}</p>}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        {phone && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: '#888', padding: '4px 10px', borderRadius: 100, border: '1px solid rgba(0,0,0,0.1)' }}>
            <Phone size={10} /> {phone}
          </span>
        )}
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: '#888', padding: '4px 10px', borderRadius: 100, border: '1px solid rgba(0,0,0,0.1)' }}>
          <Globe size={10} /> Website
        </span>
      </div>
    </div>
  )
}

function MockEnhancedListing({
  name, city, blurb, phone, imgSrc, badge,
}: {
  name: string; city?: string; blurb?: string; phone?: string; imgSrc?: string; badge?: string
}) {
  return (
    <div style={{ border: '1px solid rgba(0,0,0,0.09)', borderRadius: 16, overflow: 'hidden', backgroundColor: W, boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
      <div style={{ display: 'flex', gap: 0 }}>
        <div style={{ width: 110, flexShrink: 0, overflow: 'hidden' }}>
          {imgSrc
            ? <img src={imgSrc} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} /> /* eslint-disable-line @next/next/no-img-element */
            : <div style={{ width: '100%', height: '100%', backgroundColor: G, minHeight: 100 }} />}
        </div>
        <div style={{ padding: '14px 16px', flex: 1, minWidth: 0 }}>
          {badge && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 100, backgroundColor: 'rgba(196,98,45,0.08)', marginBottom: 7 }}>
              <Star size={9} color={T} fill={T} />
              <span style={{ fontSize: 9, fontWeight: 800, color: T, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{badge}</span>
            </div>
          )}
          <h4 style={{ fontFamily: serif, fontSize: 14, fontWeight: 700, color: N, marginBottom: 4 }}>{name}</h4>
          {city && <p style={{ fontSize: 11, color: '#aaa', marginBottom: 7 }}>{city}</p>}
          {blurb && <p style={{ fontSize: 12, color: '#555', lineHeight: 1.55, marginBottom: 9, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{blurb}</p>}
          <div style={{ display: 'flex', gap: 7 }}>
            {phone && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: N, padding: '4px 10px', borderRadius: 100, border: '1px solid rgba(26,39,68,0.18)' }}>
                <Phone size={9} /> Call
              </span>
            )}
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: N, padding: '4px 10px', borderRadius: 100, border: '1px solid rgba(26,39,68,0.18)' }}>
              <Globe size={9} /> Website
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

function MockFeaturedListing({
  name, blurb, phone, imgSrc, badge = 'Featured Partner',
}: {
  name: string; blurb?: string; phone?: string; imgSrc?: string; badge?: string
}) {
  return (
    <div style={{ border: '1.5px solid rgba(196,98,45,0.22)', borderRadius: 20, overflow: 'hidden', backgroundColor: W, boxShadow: '0 4px 24px rgba(0,0,0,0.09)' }}>
      <div style={{ width: '100%', height: 145, position: 'relative', overflow: 'hidden' }}>
        {imgSrc
          ? <img src={imgSrc} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> /* eslint-disable-line @next/next/no-img-element */
          : <div style={{ width: '100%', height: '100%', backgroundColor: G }} />}
        <div style={{ position: 'absolute', top: 10, left: 12 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 100, backgroundColor: 'rgba(212,168,67,0.95)' }}>
            <Star size={10} color={N} fill={N} />
            <span style={{ fontSize: 9, fontWeight: 800, color: N, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{badge}</span>
          </div>
        </div>
      </div>
      <div style={{ padding: '14px 18px' }}>
        <h4 style={{ fontFamily: serif, fontSize: 16, fontWeight: 900, color: N, marginBottom: 5 }}>{name}</h4>
        {blurb && <p style={{ fontSize: 13, color: '#555', lineHeight: 1.6, marginBottom: 12 }}>{blurb}</p>}
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1, textAlign: 'center', padding: '8px 0', borderRadius: 100, backgroundColor: N, color: W, fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
            <Phone size={11} /> {phone ?? 'Call Now'}
          </div>
          <div style={{ flex: 1, textAlign: 'center', padding: '8px 0', borderRadius: 100, border: `1.5px solid ${N}`, color: N, fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
            <Globe size={11} /> Visit Website
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Before / After pairing for one category ───────────────────────────────────
function CategoryBeforeAfter({
  groupName,
  description,
  sponsorLabel,
  featuredImg,
  emptyLabel,
  sponsoredLabel,
}: {
  groupName: string
  description: string
  sponsorLabel: string
  featuredImg: string
  emptyLabel: string
  sponsoredLabel: string
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>
      {/* LEFT: No presence */}
      <div>
        <div style={{ border: '2px solid rgba(0,0,0,0.06)', borderRadius: 20, padding: '18px 18px', backgroundColor: '#f9f9f9', opacity: 0.65 }}>
          <MockSectionHeader groupName={groupName} description={description} />
          <MockEmptyState />
        </div>
        <p style={{ textAlign: 'center', fontSize: 12, color: '#ccc', marginTop: 10, fontStyle: 'italic' }}>{emptyLabel}</p>
      </div>
      {/* RIGHT: Owned */}
      <div>
        <div style={{ border: `2px solid rgba(184,134,11,0.28)`, borderRadius: 20, padding: '18px 18px', backgroundColor: W, boxShadow: '0 6px 32px rgba(0,0,0,0.1)' }}>
          <MockSectionHeader groupName={groupName} description={description} sponsorName="Your Business" listingCount={3} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <MockFeaturedListing name={sponsorLabel} blurb="The editorial description our team writes for you — specific, credible, and written in the voice families trust." phone="334-555-0100" imgSrc={featuredImg} />
            <MockEnhancedListing name="Competitor A" city="Montgomery, AL" blurb="Accepting new patients." badge="Guide Partner" imgSrc={IMG_THUMB} />
          </div>
        </div>
        <p style={{ textAlign: 'center', fontSize: 12, color: T, marginTop: 10, fontWeight: 700 }}>{sponsoredLabel}</p>
      </div>
    </div>
  )
}

// ── Small surface cards for Ecosystem Partner section ─────────────────────────
function SurfaceCard({ icon, label, detail, accent = false }: { icon: string; label: string; detail: string; accent?: boolean }) {
  return (
    <div style={{ backgroundColor: accent ? 'rgba(196,98,45,0.06)' : W, border: `1px solid ${accent ? 'rgba(196,98,45,0.18)' : 'rgba(0,0,0,0.08)'}`, borderRadius: 14, padding: '16px 16px' }}>
      <div style={{ fontSize: 22, marginBottom: 8 }}>{icon}</div>
      <p style={{ fontSize: 12, fontWeight: 800, color: accent ? T : N, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5 }}>{label}</p>
      <p style={{ fontSize: 12, color: '#666', lineHeight: 1.55 }}>{detail}</p>
    </div>
  )
}

// ── Category availability badge ────────────────────────────────────────────────
function CatBadge({ name, open }: { name: string; open: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 14px', borderRadius: 100, backgroundColor: open ? 'rgba(184,134,11,0.1)' : 'rgba(255,255,255,0.05)', border: `1px solid ${open ? 'rgba(184,134,11,0.3)' : 'rgba(255,255,255,0.08)'}` }}>
      {open
        ? <div style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: '#d4a843', flexShrink: 0 }} />
        : <Lock size={9} color="rgba(255,255,255,0.2)" />}
      <span style={{ fontSize: 12, fontWeight: 600, color: open ? '#d4a843' : 'rgba(255,255,255,0.28)' }}>{name}</span>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CompareVisibilityPage() {
  return (
    <div style={{ backgroundColor: C, color: '#3a2c1e', fontFamily: sans }}>

      {/* ─────────────────────────── 1. HERO ──────────────────────────────── */}
      <section style={{ backgroundColor: N, padding: '88px 24px 80px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(ellipse at 75% 35%, rgba(196,98,45,0.14) 0%, transparent 55%), radial-gradient(ellipse at 20% 80%, rgba(184,134,11,0.06) 0%, transparent 45%)', pointerEvents: 'none' }} />
        <div style={{ maxWidth: 760, margin: '0 auto', textAlign: 'center', position: 'relative' }}>
          <div style={{ display: 'inline-block', backgroundColor: 'rgba(196,98,45,0.18)', border: '1px solid rgba(196,98,45,0.35)', borderRadius: 100, padding: '5px 18px', fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#f5c4a4', marginBottom: 32 }}>
            Visibility Comparison · River Region Parents
          </div>
          <h1 style={{ fontFamily: serif, fontSize: 'clamp(36px, 6vw, 62px)', fontWeight: 900, color: W, lineHeight: 1.06, letterSpacing: '-0.02em', marginBottom: 24 }}>
            What Families See<br />
            <span style={{ color: '#f0a070', fontStyle: 'italic' }}>Changes Everything.</span>
          </h1>
          <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.68)', lineHeight: 1.75, maxWidth: 560, margin: '0 auto 40px' }}>
            This is exactly how your business appears to River Region families
            at each level of presence — from invisible to undeniable.
          </p>

          {/* Tier journey pills */}
          <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 40 }}>
            {[
              { label: 'No Presence', color: 'rgba(255,255,255,0.12)', text: 'rgba(255,255,255,0.4)' },
              { label: 'Directory Listing', color: 'rgba(255,255,255,0.12)', text: 'rgba(255,255,255,0.55)' },
              { label: 'Guide Partner', color: 'rgba(26,39,68,0.6)', text: 'rgba(255,255,255,0.8)', border: 'rgba(255,255,255,0.2)' },
              { label: 'Ecosystem Partner', color: 'rgba(196,98,45,0.22)', text: '#f0a070', border: 'rgba(196,98,45,0.35)' },
              { label: 'Category Sponsor', color: 'rgba(184,134,11,0.22)', text: '#d4a843', border: 'rgba(184,134,11,0.4)' },
            ].map((tier, i) => (
              <div key={tier.label} style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                <div style={{ padding: '6px 14px', borderRadius: 100, backgroundColor: tier.color, border: `1px solid ${tier.border ?? 'transparent'}` }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: tier.text }}>{tier.label}</span>
                </div>
                {i < 4 && (
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', margin: '0 4px' }}>→</span>
                )}
              </div>
            ))}
          </div>

          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', fontStyle: 'italic' }}>
            Scroll to see the transformation.
          </p>
        </div>
      </section>

      {/* ─────────────────── 2. BEFORE / AFTER — 3 CATEGORIES ─────────────── */}
      <section style={{ backgroundColor: W, padding: '96px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: T, marginBottom: 14 }}>The Transformation</p>
            <h2 style={{ fontFamily: serif, fontSize: 'clamp(26px, 4vw, 44px)', fontWeight: 900, color: N, lineHeight: 1.08, marginBottom: 16 }}>
              The Same Category.<br />Two Different Realities.
            </h2>
            <p style={{ fontSize: 16, color: '#666', lineHeight: 1.75, maxWidth: 560, margin: '0 auto' }}>
              When a parent opens the River Region Parents Family Resource Guide,
              this is the difference between your business being there — and not.
            </p>
          </div>

          {/* Column labels */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 28 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '7px 18px', borderRadius: 100, backgroundColor: 'rgba(0,0,0,0.05)' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#ddd' }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: '#999', textTransform: 'uppercase', letterSpacing: '0.08em' }}>No Ecosystem Presence</span>
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '7px 18px', borderRadius: 100, backgroundColor: 'rgba(184,134,11,0.1)', border: '1px solid rgba(184,134,11,0.25)' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: GOLD }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: GOLD, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Category Sponsor</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            <CategoryBeforeAfter
              groupName="Pediatric & Family Healthcare"
              description="Doctors, dentists, urgent care, and family health providers."
              sponsorLabel="River Region Pediatrics"
              featuredImg={IMG_PEDIATRIC}
              emptyLabel="Families see a gap. A competitor fills it."
              sponsoredLabel="Families see you first. Every time."
            />
            <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }} />
            <CategoryBeforeAfter
              groupName="Childcare & Early Learning"
              description="Daycare, preschool, pre-K, and early childhood programs."
              sponsorLabel="Bright Horizons Montgomery"
              featuredImg={IMG_CHILDCARE}
              emptyLabel="Parents who needed you chose someone else."
              sponsoredLabel="You're the first name they trust."
            />
            <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }} />
            <CategoryBeforeAfter
              groupName="Sports & Recreation"
              description="Youth sports leagues, swim teams, gymnastics, and outdoor activities."
              sponsorLabel="Capital City Athletics"
              featuredImg={IMG_SPORTS}
              emptyLabel="Your category looks empty. So does your pipeline."
              sponsoredLabel="Active families see your name first."
            />
          </div>

          <p style={{ textAlign: 'center', fontSize: 14, color: '#888', fontStyle: 'italic', marginTop: 44 }}>
            Every category in the guide has one Category Sponsor position. Most are still open.
          </p>
        </div>
      </section>

      {/* ─────────────────────── 3. FOUR LEVELS PROGRESSION ──────────────── */}
      <section style={{ backgroundColor: C, padding: '96px 24px' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: T, marginBottom: 14 }}>The Four Levels</p>
            <h2 style={{ fontFamily: serif, fontSize: 'clamp(26px, 4vw, 44px)', fontWeight: 900, color: N, lineHeight: 1.08, marginBottom: 16 }}>
              Your Visibility, at Every Level
            </h2>
            <p style={{ fontSize: 16, color: '#666', lineHeight: 1.75, maxWidth: 520, margin: '0 auto' }}>
              Each level fundamentally changes how families encounter your business — and how often.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 64 }}>

            {/* ── LEVEL 1: Directory Listing ────────────────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 48, alignItems: 'start' }}>
              <div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 14px', borderRadius: 100, backgroundColor: 'rgba(0,0,0,0.06)', marginBottom: 18 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#999', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Level 1</span>
                </div>
                <h3 style={{ fontFamily: serif, fontSize: 26, fontWeight: 900, color: N, marginBottom: 12 }}>Directory Listing</h3>
                <p style={{ fontSize: 15, color: '#5a4a3e', lineHeight: 1.8, marginBottom: 22 }}>
                  You exist in the guide. Families who search your category and scroll far enough can find you. Your name, phone, and website — nothing more.
                </p>
                <div style={{ padding: '16px 18px', backgroundColor: 'rgba(0,0,0,0.04)', borderRadius: 12 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: N, marginBottom: 6 }}>What this level gives you:</p>
                  <p style={{ fontSize: 13, color: '#777', lineHeight: 1.65 }}>
                    A starting point. You are technically discoverable. But you look identical to every other unlisted business in your category.
                  </p>
                </div>
              </div>
              <div>
                <div style={{ border: '1.5px solid rgba(0,0,0,0.07)', borderRadius: 20, padding: '20px', backgroundColor: '#fafafa' }}>
                  <MockSectionHeader groupName="Sports & Recreation" listingCount={3} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <MockFreeListing name="Your Business Name" city="Montgomery, AL" phone="334-555-0000" />
                    <MockFreeListing name="River Region YMCA" city="Montgomery, AL" phone="334-555-0100" />
                    <MockFreeListing name="Capital City Soccer League" city="Prattville, AL" />
                  </div>
                </div>
                <p style={{ fontSize: 12, color: '#bbb', textAlign: 'center', marginTop: 12, fontStyle: 'italic' }}>Present — but not prominent.</p>
              </div>
            </div>

            <div style={{ borderTop: '1px solid rgba(0,0,0,0.07)' }} />

            {/* ── LEVEL 2: Guide Partner ─────────────────────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 48, alignItems: 'start' }}>
              <div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 14px', borderRadius: 100, backgroundColor: 'rgba(26,39,68,0.08)', marginBottom: 18 }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: N }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: N, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Level 2 · Guide Partner</span>
                </div>
                <h3 style={{ fontFamily: serif, fontSize: 26, fontWeight: 900, color: N, marginBottom: 12 }}>A Real Presence.<br />A Real Impression.</h3>
                <p style={{ fontSize: 15, color: '#5a4a3e', lineHeight: 1.8, marginBottom: 20 }}>
                  Families can now <em>evaluate</em> your business before they ever contact you. A photo. A description our editorial team writes for you. A Partner badge that signals trusted, vetted, local.
                </p>

                {/* Editorial callout */}
                <div style={{ padding: '16px 18px', backgroundColor: W, border: '1px solid rgba(196,98,45,0.15)', borderRadius: 14, marginBottom: 18, position: 'relative' }}>
                  <div style={{ position: 'absolute', top: -10, left: 14, backgroundColor: C, padding: '0 8px' }}>
                    <span style={{ fontSize: 10, fontWeight: 800, color: T, textTransform: 'uppercase', letterSpacing: '0.1em' }}>✍️ Editorial Blurb — Written By RRP</span>
                  </div>
                  <p style={{ fontSize: 13, color: '#444', lineHeight: 1.7, fontStyle: 'italic', margin: 0 }}>
                    &ldquo;The sports program River Region families have trusted since 2009. Small-group instruction, flexible scheduling, and coaches who know every kid by name.&rdquo;
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <CalloutItem n={1} text="Editorial description written by the RRP team — not marketing copy, which makes it feel like a recommendation" />
                  <CalloutItem n={2} text="Guide Partner badge signals verified, trusted, local — families recognize it across all 9 guides" />
                  <CalloutItem n={3} text="Photo makes your listing 3× more likely to be clicked than text-only rows" />
                  <CalloutItem n={4} text="Direct call and website links — immediate action from the guide" />
                </div>
              </div>
              <div>
                <div style={{ border: '1.5px solid rgba(26,39,68,0.14)', borderRadius: 20, padding: '20px', backgroundColor: W, boxShadow: '0 4px 20px rgba(0,0,0,0.07)' }}>
                  <MockSectionHeader groupName="Sports & Recreation" listingCount={3} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ position: 'relative' }}>
                      <Ann n={2} />
                      <MockEnhancedListing
                        name="Your Business Name"
                        city="Montgomery, AL"
                        blurb="The sports program River Region families have trusted since 2009. Small-group instruction, flexible scheduling, coaches who know every kid by name."
                        phone="334-555-0000"
                        imgSrc={IMG_THUMB}
                        badge="Guide Partner"
                      />
                    </div>
                    <MockFreeListing name="River Region YMCA" city="Montgomery, AL" phone="334-555-0100" />
                    <MockFreeListing name="Capital City Soccer League" city="Prattville, AL" />
                  </div>
                </div>
                <p style={{ fontSize: 12, color: '#888', textAlign: 'center', marginTop: 12, fontStyle: 'italic' }}>Families can discover, evaluate, and contact you.</p>
              </div>
            </div>

            <div style={{ borderTop: '1px solid rgba(0,0,0,0.07)' }} />

            {/* ── LEVEL 3: Ecosystem Partner ────────────────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 48, alignItems: 'start' }}>
              <div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 14px', borderRadius: 100, backgroundColor: 'rgba(196,98,45,0.1)', border: '1px solid rgba(196,98,45,0.22)', marginBottom: 18 }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: T }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: T, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Level 3 · Ecosystem Partner</span>
                </div>
                <h3 style={{ fontFamily: serif, fontSize: 26, fontWeight: 900, color: N, marginBottom: 12 }}>Families Recognize You<br />Before They Need You.</h3>
                <p style={{ fontSize: 15, color: '#5a4a3e', lineHeight: 1.8, marginBottom: 20 }}>
                  You are no longer just listed — you are <em>present</em>. Featured at the top of your guide category. In the print magazine in living rooms across the region. In the newsletter on Tuesday morning. In social posts shared to mom groups.
                </p>
                <p style={{ fontSize: 15, color: '#5a4a3e', lineHeight: 1.8, marginBottom: 20 }}>
                  Families see your name so often it becomes familiar. And familiar becomes trusted. That&apos;s the goal.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <CalloutItem n={1} text="Featured position — first listing in your category, above every Guide Partner" />
                  <CalloutItem n={2} text="Full hero photo gives your business a visual identity across the ecosystem" />
                  <CalloutItem n={3} text="Bold action buttons drive immediate calls and website visits from warm audiences" />
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Featured guide card */}
                <div style={{ border: '1.5px solid rgba(196,98,45,0.22)', borderRadius: 20, padding: '18px', backgroundColor: W, boxShadow: '0 6px 28px rgba(0,0,0,0.09)' }}>
                  <MockSectionHeader groupName="Sports & Recreation" listingCount={3} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ position: 'relative' }}>
                      <Ann n={1} />
                      <MockFeaturedListing
                        name="Your Business Name"
                        blurb="The description our editorial team crafts — written to resonate with River Region moms and drive real inquiries."
                        phone="334-555-0000"
                        imgSrc={IMG_SPORTS}
                      />
                    </div>
                    <MockEnhancedListing
                      name="River Region YMCA"
                      city="Montgomery, AL"
                      blurb="Youth programs and after-school care."
                      imgSrc={IMG_THUMB}
                      badge="Guide Partner"
                    />
                    <MockFreeListing name="Capital City Soccer League" city="Prattville, AL" />
                  </div>
                </div>
                {/* Multi-surface grid */}
                <p style={{ fontSize: 11, fontWeight: 700, color: '#bbb', textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'center' }}>+ Across the full ecosystem</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <SurfaceCard icon="📖" label="Print Magazine" detail="Quarter-page ad in the River Region Parents print edition, distributed to 14,000+ households." accent />
                  <SurfaceCard icon="📧" label="Newsletter" detail="Monthly feature reaching 4,800+ subscribers who open every issue." />
                  <SurfaceCard icon="📱" label="Social Media" detail="Paid reach to 10,000+ River Region moms/month across Facebook and Instagram." />
                  <SurfaceCard icon="✍️" label="Editorial Coverage" detail="Priority for inclusion in editorial articles and seasonal resource lists." accent />
                </div>
                <p style={{ fontSize: 12, color: T, textAlign: 'center', fontWeight: 700 }}>You are first. You are prominent. You are everywhere.</p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ─────────────────── 4. CATEGORY SPONSOR — PREMIUM ──────────────── */}
      <section style={{ backgroundColor: N, padding: '100px 24px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(ellipse at 15% 55%, rgba(196,98,45,0.14) 0%, transparent 50%), radial-gradient(ellipse at 88% 18%, rgba(184,134,11,0.09) 0%, transparent 45%)', pointerEvents: 'none' }} />

        <div style={{ maxWidth: 1080, margin: '0 auto', position: 'relative' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, backgroundColor: 'rgba(184,134,11,0.14)', border: '1px solid rgba(184,134,11,0.3)', borderRadius: 100, padding: '6px 20px', marginBottom: 22 }}>
              <span style={{ fontSize: 10, fontWeight: 800, color: '#d4a843', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Level 4 · Category Sponsor · Exclusive Position</span>
            </div>
            <h2 style={{ fontFamily: serif, fontSize: 'clamp(30px, 5vw, 52px)', fontWeight: 900, color: W, lineHeight: 1.06, marginBottom: 18 }}>
              You Don&apos;t Share the Top.<br />
              <span style={{ color: '#f0a070', fontStyle: 'italic' }}>You Own It.</span>
            </h2>
            <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.62)', lineHeight: 1.75, maxWidth: 560, margin: '0 auto' }}>
              One business. One section. The &ldquo;Presented By&rdquo; position in the guide header.
              No competitor appears above you — for as long as you hold the sponsorship.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 52, alignItems: 'start' }}>

            {/* Left: what you get */}
            <div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 22, marginBottom: 36 }}>
                {[
                  { n: 1, title: '"Presented By" in the section header', desc: 'Your name appears in the category header — the first thing every family sees the moment they open your section.' },
                  { n: 2, title: 'Permanent top position — no rotation', desc: 'No bidding. No competing. Your featured listing is first, always. Other businesses list beneath you.' },
                  { n: 3, title: 'Category exclusivity', desc: 'No competitor can hold a featured position above you while you own the sponsorship. The position locks when you claim it.' },
                  { n: 4, title: 'Cross-ecosystem priority', desc: 'First consideration for editorial articles, newsletter category features, and seasonal print placements in your section.' },
                ].map(item => (
                  <div key={item.n} style={{ display: 'flex', gap: 14 }}>
                    <div style={{ width: 30, height: 30, borderRadius: '50%', backgroundColor: 'rgba(184,134,11,0.2)', border: '1px solid rgba(184,134,11,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                      <span style={{ fontSize: 12, fontWeight: 900, color: '#d4a843' }}>{item.n}</span>
                    </div>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 700, color: W, marginBottom: 5 }}>{item.title}</p>
                      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.65 }}>{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Category availability */}
              <div style={{ padding: '22px 22px', backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(184,134,11,0.2)', borderRadius: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <p style={{ fontSize: 12, fontWeight: 800, color: '#d4a843', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Category Availability</p>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontStyle: 'italic' }}>One sponsor per category</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  <CatBadge name="Pediatricians" open />
                  <CatBadge name="Mom Wellness" open />
                  <CatBadge name="Sports & Recreation" open />
                  <CatBadge name="Shopping" open />
                  <CatBadge name="Family Services" open />
                  <CatBadge name="Farmers Markets" open />
                  <CatBadge name="Family Photographers" open />
                  <CatBadge name="Private Schools" open={false} />
                  <CatBadge name="Childcare" open={false} />
                </div>
                <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)', fontStyle: 'italic', lineHeight: 1.6 }}>
                    Claimed positions are shown dimmed. Open positions are first-come. Once a category closes, it stays closed.
                  </p>
                </div>
              </div>
            </div>

            {/* Right: live mockup */}
            <div>
              <div style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 22, padding: '8px', marginBottom: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', letterSpacing: '0.12em', textAlign: 'center', padding: '10px 0 14px' }}>
                  Live Preview · Pediatric &amp; Family Healthcare
                </div>
                <div style={{ backgroundColor: W, borderRadius: 16, padding: '20px 18px' }}>
                  <MockSectionHeader
                    groupName="Pediatric & Family Healthcare"
                    description="Trusted doctors, dentists, urgent care, and family health providers."
                    sponsorName="Your Business"
                    listingCount={3}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <MockFeaturedListing
                      name="Your Business"
                      blurb="The editorial description our team writes for you — specific, credible, written in the voice families trust."
                      phone="334-555-0100"
                      imgSrc={IMG_PEDIATRIC}
                    />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <MockEnhancedListing
                        name="Capital City Pediatrics"
                        city="Montgomery, AL"
                        blurb="Accepting new patients."
                        imgSrc={IMG_THUMB}
                        badge="Guide Partner"
                      />
                      <MockEnhancedListing
                        name="River Oaks Family Care"
                        city="Prattville, AL"
                        blurb="Family-centered care."
                        badge="Guide Partner"
                      />
                    </div>
                    <MockFreeListing name="Montgomery Pediatric Associates" city="Montgomery, AL" phone="334-555-0400" />
                  </div>
                </div>
              </div>
              <p style={{ textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.45)', fontStyle: 'italic' }}>
                This is the exact treatment families see. Your business. Your section. Above every competitor.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* ──────────────────────── 5. DISCOVERY PATH ───────────────────────── */}
      <section style={{ backgroundColor: W, padding: '96px 24px' }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: T, marginBottom: 14 }}>Why Repetition Wins</p>
            <h2 style={{ fontFamily: serif, fontSize: 'clamp(26px, 4vw, 42px)', fontWeight: 900, color: N, lineHeight: 1.08, marginBottom: 16 }}>
              One Family. Seven Encounters.<br />One Phone Call.
            </h2>
            <p style={{ fontSize: 16, color: '#666', lineHeight: 1.75, maxWidth: 500, margin: '0 auto' }}>
              This is how a River Region mom goes from never having heard of your business to calling you — without you ever running a cold ad.
            </p>
          </div>

          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', left: 23, top: 28, bottom: 28, width: 2, backgroundImage: 'linear-gradient(to bottom, #e0e0e0, rgba(196,98,45,0.4))', borderRadius: 2 }} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {[
                { icon: '📖', surface: 'Print Magazine', timing: 'First touch', detail: 'She picks up River Region Parents at her pediatrician\'s office. She sees your business in the guide section. First impression — no search required.', highlight: false },
                { icon: '🗺️', surface: 'Family Resource Guide', timing: 'Active search', detail: 'She searches for providers in your category. The guide appears. Your listing is featured at the top of the section, with photo and editorial description.', highlight: false },
                { icon: '✍️', surface: 'Editorial Article', timing: 'Trust signal', detail: 'She finds an RRP article about choosing a provider. Your business is linked as a trusted local resource. Editorial placement reads like a recommendation — because it is.', highlight: false },
                { icon: '📱', surface: 'Social Media', timing: 'Brand recall', detail: 'She scrolls Instagram. An RRP post features your business. Her friend comments "we love them." She screenshots it.', highlight: false },
                { icon: '📧', surface: 'Newsletter', timing: 'Warm reminder', detail: 'Tuesday morning. The RRP newsletter arrives. Your category is featured. She clicks through and bookmarks your listing.', highlight: false },
                { icon: '💬', surface: 'Word of Mouth', timing: 'Social proof', detail: 'Someone in a moms group asks for recommendations. Your name has appeared so many times it surfaces naturally from a friend who saw it in the guide.', highlight: false },
                { icon: '📞', surface: 'She Calls', timing: 'Conversion', detail: 'She\'s ready. She already trusts you because she\'s seen your name across the guide, the magazine, the newsletter, and a friend\'s message. She calls warm.', highlight: true },
              ].map((step, i) => (
                <div key={step.surface} style={{ display: 'flex', gap: 22, paddingBottom: i < 6 ? 32 : 0, position: 'relative' }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', backgroundColor: step.highlight ? T : '#f2f2f2', border: `2px solid ${step.highlight ? T : '#e0e0e0'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, zIndex: 1, boxShadow: step.highlight ? '0 4px 16px rgba(196,98,45,0.3)' : 'none' }}>
                    <span style={{ fontSize: 18 }}>{step.icon}</span>
                  </div>
                  <div style={{ flex: 1, paddingTop: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 7 }}>
                      <p style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: step.highlight ? T : '#bbb', margin: 0 }}>{step.surface}</p>
                      <span style={{ fontSize: 11, color: step.highlight ? 'rgba(196,98,45,0.6)' : '#ddd', fontWeight: 600 }}>· {step.timing}</span>
                    </div>
                    <p style={{ fontSize: 15, color: step.highlight ? '#2a1c10' : '#555', lineHeight: 1.72, fontWeight: step.highlight ? 600 : 400 }}>{step.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ textAlign: 'center', marginTop: 52 }}>
            <div style={{ display: 'inline-block', padding: '20px 36px', borderRadius: 100, backgroundColor: N }}>
              <p style={{ fontFamily: serif, fontSize: 17, fontWeight: 700, color: W, fontStyle: 'italic', margin: 0 }}>
                This is what presence in the ecosystem builds. Not an ad. A reputation.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────── 6. FINAL CTA ─────────────────────────── */}
      <section style={{ backgroundColor: C, padding: '96px 24px 108px' }}>
        <div style={{ maxWidth: 760, margin: '0 auto', textAlign: 'center' }}>
          <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: T, marginBottom: 18 }}>What&apos;s Your Category?</p>
          <h2 style={{ fontFamily: serif, fontSize: 'clamp(30px, 4.5vw, 48px)', fontWeight: 900, color: N, lineHeight: 1.08, marginBottom: 22 }}>
            See What Your Visibility<br />
            <span style={{ fontStyle: 'italic', color: T }}>Could Look Like.</span>
          </h2>
          <p style={{ fontSize: 16, color: '#666', lineHeight: 1.8, maxWidth: 520, margin: '0 auto 44px' }}>
            Jason reviews every inquiry personally. He&apos;ll show you exactly how your business would appear at each level, which categories are still open in your space, and what the right starting point is for your goals.
          </p>

          {/* Three distinct CTAs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center', marginBottom: 40 }}>
            <Link
              href="/partners#strategy-call"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 10, backgroundColor: T, color: W, padding: '16px 36px', borderRadius: 100, fontWeight: 700, fontSize: 16, textDecoration: 'none', boxShadow: '0 6px 28px rgba(196,98,45,0.35)', width: 'fit-content' }}
            >
              Request a Visibility Strategy Call <ArrowRight size={16} />
            </Link>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
              <Link
                href="/partners#strategy-call"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 7, backgroundColor: 'transparent', color: N, padding: '12px 24px', borderRadius: 100, fontWeight: 600, fontSize: 14, textDecoration: 'none', border: `1.5px solid rgba(26,39,68,0.22)` }}
              >
                Check Category Availability
              </Link>
              <Link
                href="/partners"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 7, backgroundColor: 'transparent', color: '#888', padding: '12px 24px', borderRadius: 100, fontWeight: 600, fontSize: 14, textDecoration: 'none', border: `1.5px solid rgba(0,0,0,0.1)` }}
              >
                View Full Ecosystem Overview
              </Link>
            </div>
          </div>

          {/* Trust footer */}
          <div style={{ padding: '18px 28px', backgroundColor: W, border: '1px solid rgba(0,0,0,0.08)', borderRadius: 16, display: 'inline-block' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: N, margin: 0 }}>Jason Watson</p>
                <p style={{ fontSize: 11, color: '#aaa', margin: '2px 0 0' }}>River Region Parents · Owner &amp; Publisher</p>
              </div>
              <div style={{ width: 1, height: 32, backgroundColor: '#e0e0e0' }} />
              <div>
                <p style={{ fontSize: 12, color: '#888', margin: 0 }}>(334) 328-5189</p>
                <p style={{ fontSize: 12, color: '#888', margin: '2px 0 0' }}>jason@riverregionparents.com</p>
              </div>
              <div style={{ width: 1, height: 32, backgroundColor: '#e0e0e0' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
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
