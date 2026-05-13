import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, ChevronRight, MapPin } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'
import type { GuideListing, GuideCategory, GuideArticle } from '@/components/family-guide/types'
import { FeaturedListing } from '@/components/family-guide/FeaturedListing'
import { EnhancedListing } from '@/components/family-guide/EnhancedListing'
import { FreeListing } from '@/components/family-guide/FreeListing'
import { SponsorBanner } from '@/components/family-guide/SponsorBanner'
import { GuideDirectory } from './GuideDirectory'
import { NewsletterSignup } from '@/components/newsletter/NewsletterSignup'
import { NewsletterPopupTrigger } from '@/components/newsletter/NewsletterPopupTrigger'

export const metadata: Metadata = {
  title: 'River Region Family Resource Guide',
  description: 'Your trusted resource for raising kids in Montgomery, Prattville, Wetumpka, Pike Road, Millbrook, and Eastchase. Schools, pediatricians, childcare, activities, and more.',
}

// ── Data ──────────────────────────────────────────────────────────────────────

type CategoryWithListings = GuideCategory & { listings: GuideListing[] }
type GroupedData = Map<string, CategoryWithListings[]>

async function getGuideData(): Promise<{
  grouped: GroupedData
  articles: GuideArticle[]
  totalListings: number
}> {
  try {
    const supabase = await createClient()
    const [{ data: cats }, { data: listings }, { data: arts }] = await Promise.all([
      supabase.from('guide_categories').select('*').eq('guide_slug', 'newcomer-guide').order('display_order'),
      supabase.from('guide_listings').select('*').eq('needs_research', false).order('listing_tier').order('display_order'),
      supabase.from('guide_articles').select('*').eq('guide_slug', 'newcomer-guide').eq('published', true).order('display_order'),
    ])

    const sortedListings = (listings ?? []).sort((a: GuideListing, b: GuideListing) => {
      const t = { featured: 0, enhanced: 1, free: 2 }
      return (t[a.listing_tier] - t[b.listing_tier]) || a.display_order - b.display_order
    })

    const grouped: GroupedData = new Map()
    for (const cat of (cats ?? [])) {
      const group = (cat as CategoryWithListings & { parent_group: string }).parent_group ?? 'Other'
      const withListings: CategoryWithListings = {
        ...cat,
        listings: sortedListings.filter((l: GuideListing) => l.category_id === cat.id),
      }
      if (!grouped.has(group)) grouped.set(group, [])
      grouped.get(group)!.push(withListings)
    }

    return { grouped, articles: (arts ?? []) as GuideArticle[], totalListings: sortedListings.length }
  } catch {
    return { grouped: new Map(), articles: [], totalListings: 0 }
  }
}

// ── Config ────────────────────────────────────────────────────────────────────

const GROUP_PAGE_ORDER = [
  'Schools', 'Pediatric Care', 'Healthcare', 'Childcare & Preschool',
  'Faith Communities', 'Family Activities', 'Sports & Recreation', 'Food & Dining',
  'Community & Connection', 'Day Trips & Family Getaways', 'Date Nights & Adult Time',
  'Family Shopping', 'Mom Self-Care', 'Family Services', 'Senior & Multi-Generational',
]

const GROUP_EMOJI: Record<string, string> = {
  'Schools': '🏫',
  'Pediatric Care': '🏥',
  'Healthcare': '💊',
  'Childcare & Preschool': '🧸',
  'Faith Communities': '✝️',
  'Family Activities': '🎡',
  'Sports & Recreation': '⚽',
  'Food & Dining': '🍕',
  'Community & Connection': '🤝',
  'Day Trips & Family Getaways': '🗺️',
  'Date Nights & Adult Time': '🌙',
  'Family Shopping': '🛍️',
  'Mom Self-Care': '🌸',
  'Family Services': '🔧',
  'Senior & Multi-Generational': '👴',
}

const SPONSOR_GROUPS = new Set(['Schools', 'Pediatric Care'])

const ARTICLE_SLUGS_BY_GROUP: Record<string, string> = {
  'Schools':                  'choosing-the-right-school-district',
  'Pediatric Care':           'establishing-pediatric-care',
  'Community & Connection':   'where-to-find-your-people',
}

const START_HERE_SLUGS = [
  'your-first-30-days-in-the-river-region',
  'choosing-the-right-school-district',
  'where-to-find-your-people',
]

function groupHasRealListings(cats: CategoryWithListings[]) {
  return cats.some(c => (c.listings ?? []).length > 0)
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ArticleHeroCard({ article }: { article: GuideArticle }) {
  const hasImage = !!article.hero_image_url

  return (
    <Link href={`/newcomer-guide/articles/${article.slug}`}
      className="group block rounded-2xl overflow-hidden bg-white"
      style={{ boxShadow: 'var(--fg-shadow)', transition: 'box-shadow 0.2s, transform 0.2s' }}>
      {/* 16:9 image area — gradient background always present as fallback */}
      <div style={{
        position: 'relative',
        aspectRatio: '16/9',
        overflow: 'hidden',
        background: hasImage
          ? 'var(--fg-navy)'
          : 'linear-gradient(135deg, var(--fg-cream, #faf8f5) 0%, var(--fg-sage-light, #edf5f0) 100%)',
      }}>
        {hasImage && (
          <Image
            src={article.hero_image_url!}
            alt={article.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            style={{ objectFit: 'cover', objectPosition: 'center' }}
          />
        )}
        {/* Dark gradient overlay for text readability (only when image present) */}
        {hasImage && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 1,
            background: 'linear-gradient(to top, rgba(26,39,68,0.88) 0%, rgba(26,39,68,0.2) 55%, transparent 100%)',
          }} />
        )}
        {/* ARTICLE badge */}
        <span style={{
          position: 'absolute', top: 10, left: 10, zIndex: 2,
          backgroundColor: 'var(--fg-terra)',
          color: 'white', fontSize: 9, fontWeight: 700,
          letterSpacing: '0.1em', textTransform: 'uppercase',
          padding: '3px 8px', borderRadius: 3,
        }}>Article</span>
        {/* Title — overlaid on image or in gradient area */}
        <div style={{ position: 'absolute', bottom: 12, left: 14, right: 14, zIndex: 2 }}>
          <p style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
            color: hasImage ? 'var(--fg-gold)' : 'var(--fg-sage)',
            marginBottom: 4,
          }}>
            {article.author_name}
          </p>
          <h3 style={{
            fontFamily: 'var(--font-fraunces, serif)',
            fontSize: 17, fontWeight: 700,
            color: hasImage ? 'white' : 'var(--fg-navy)',
            lineHeight: 1.25,
          }}>
            {article.title}
          </h3>
        </div>
      </div>
      {/* Footer */}
      <div style={{ padding: '10px 14px 14px', borderTop: '1px solid var(--fg-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        {article.excerpt && (
          <p style={{
            fontSize: 11, color: 'var(--fg-mid)', lineHeight: 1.5, flex: 1,
            overflow: 'hidden', display: '-webkit-box',
            WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const,
          }}>
            {article.excerpt}
          </p>
        )}
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--fg-sky)', display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
          Read <ChevronRight size={12} />
        </span>
      </div>
    </Link>
  )
}

function CategorySection({ category, limit }: { category: CategoryWithListings; limit?: number }) {
  const listings = limit ? (category.listings ?? []).slice(0, limit) : (category.listings ?? [])
  if (!listings.length) return null

  const featured = listings.filter(l => l.listing_tier === 'featured')
  const enhanced = listings.filter(l => l.listing_tier === 'enhanced')
  const free     = listings.filter(l => l.listing_tier === 'free')

  return (
    <div className="space-y-3">
      {featured.map(l => <FeaturedListing key={l.id} listing={l} />)}
      {enhanced.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {enhanced.map(l => <EnhancedListing key={l.id} listing={l} />)}
        </div>
      )}
      {free.length > 0 && <div className="space-y-1">{free.map(l => <FreeListing key={l.id} listing={l} />)}</div>}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function NewcomerGuidePage() {
  const { grouped, articles, totalListings } = await getGuideData()
  const artMap = Object.fromEntries(articles.map(a => [a.slug, a]))

  const allCategories: CategoryWithListings[] = []
  for (const cats of grouped.values()) allCategories.push(...cats)

  const startHereArticles = START_HERE_SLUGS.map(s => artMap[s]).filter(Boolean)

  return (
    <div style={{ backgroundColor: 'var(--fg-cream)', minHeight: '100vh', fontFamily: 'var(--font-dm-sans, sans-serif)' }}>

      {/* ── HERO ────────────────────────────────────────────────────────────── */}
      <div style={{ position: 'relative', overflow: 'hidden', minHeight: 480 }}>
        {/* Background photo */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'url(/images/family-guide/hero-grandfather-mom-daughter.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center 30%',
          backgroundColor: 'var(--fg-navy)',
        }} />
        {/* Gradient overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to bottom, rgba(26,39,68,0.55) 0%, rgba(26,39,68,0.88) 100%)',
        }} />
        {/* Content */}
        <div style={{ position: 'relative', maxWidth: 900, margin: '0 auto', padding: '72px 20px 64px' }}>
          {/* Eyebrow */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 18 }}>
            <MapPin size={12} color="var(--fg-gold)" />
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--fg-gold)' }}>
              River Region Parents · Family Resource Guide
            </span>
          </div>
          {/* H1 */}
          <h1 style={{
            fontFamily: 'var(--font-fraunces, serif)',
            fontSize: 'clamp(38px, 7vw, 60px)',
            fontWeight: 900,
            fontStyle: 'italic',
            color: 'white',
            lineHeight: 1.1,
            marginBottom: 16,
            letterSpacing: '-0.02em',
          }}>
            Your Guide to<br />Raising a Family Here
          </h1>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.8)', lineHeight: 1.6, maxWidth: 520, marginBottom: 8 }}>
            Montgomery, Prattville, Wetumpka, Pike Road, Millbrook, and Eastchase —
            everything your family needs, in one place.
          </p>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', fontStyle: 'italic', marginBottom: 36 }}>
            Newcomer Issue · June 2026
          </p>
          {/* CTAs */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <a href="#start-here" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '13px 28px', borderRadius: 12, fontWeight: 700, fontSize: 14,
              backgroundColor: 'var(--fg-gold)', color: '#3d1f17',
              textDecoration: 'none', transition: 'opacity 0.15s',
            }}>
              Start Here <ArrowRight size={15} />
            </a>
            <a href="#directory" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '13px 28px', borderRadius: 12, fontWeight: 600, fontSize: 14,
              border: '1.5px solid rgba(255,255,255,0.35)', color: 'white',
              textDecoration: 'none', background: 'rgba(255,255,255,0.08)',
            }}>
              Browse {totalListings > 0 ? `${totalListings} ` : ''}Resources
            </a>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '48px 20px 80px' }}>

        {/* ── START HERE ────────────────────────────────────────────────────── */}
        <section id="start-here" style={{ marginBottom: 64 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 }}>
            <h2 style={{
              fontFamily: 'var(--font-fraunces, serif)',
              fontSize: 26,
              fontWeight: 700,
              color: 'var(--fg-navy)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}>
              ✏️ Start Here
            </h2>
          </div>
          <p style={{ fontSize: 14, color: 'var(--fg-mid)', marginBottom: 24 }}>
            New to the River Region? These three reads will orient your whole family.
          </p>

          {startHereArticles.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
              {startHereArticles.map(a => <ArticleHeroCard key={a.slug} article={a} />)}
            </div>
          ) : (
            /* Fallback if articles not yet seeded — gradient placeholder cards, no emoji */
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
              {[
                { title: 'Your First 30 Days in the River Region', href: '#first-30-days', desc: 'The practical checklist — week by week, nothing missed.', grad: 'linear-gradient(135deg, var(--fg-cream) 0%, var(--fg-sage-light) 100%)' },
                { title: 'Choosing a School in the River Region', href: '/newcomer-guide/articles/choosing-the-right-school-district', desc: 'Six public districts, dozens of private options. How to decide.', grad: 'linear-gradient(135deg, var(--fg-sky-light) 0%, #d4e8f8 100%)' },
                { title: 'Where to Find Your People', href: '/newcomer-guide/articles/where-to-find-your-people', desc: 'The fastest ways to find your community in the River Region.', grad: 'linear-gradient(135deg, var(--fg-terra-light) 0%, #fde8d8 100%)' },
              ].map(card => (
                <Link key={card.title} href={card.href}
                  className="group block rounded-2xl overflow-hidden"
                  style={{ textDecoration: 'none', boxShadow: 'var(--fg-shadow)' }}>
                  <div style={{ aspectRatio: '16/9', background: card.grad, position: 'relative' }}>
                    <span style={{ position: 'absolute', top: 10, left: 10, backgroundColor: 'var(--fg-terra)', color: 'white', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '3px 8px', borderRadius: 3 }}>Article</span>
                    <div style={{ position: 'absolute', bottom: 12, left: 14, right: 14 }}>
                      <h3 style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 17, fontWeight: 700, color: 'var(--fg-navy)', lineHeight: 1.25 }}>
                        {card.title}
                      </h3>
                    </div>
                  </div>
                  <div style={{ padding: '10px 14px 14px', borderTop: '1px solid var(--fg-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, backgroundColor: 'white' }}>
                    <p style={{ fontSize: 11, color: 'var(--fg-mid)', lineHeight: 1.5, flex: 1 }}>{card.desc}</p>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--fg-sky)', display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>Read <ChevronRight size={12} /></span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* ── DYNAMIC GROUP SECTIONS ────────────────────────────────────────── */}
        {GROUP_PAGE_ORDER.map(groupName => {
          const cats = grouped.get(groupName)
          if (!cats?.length) return null
          if (!groupHasRealListings(cats)) return null

          const articleSlug = ARTICLE_SLUGS_BY_GROUP[groupName]
          const article     = articleSlug ? artMap[articleSlug] : undefined
          const hasSponsor  = SPONSOR_GROUPS.has(groupName)
          const emoji       = GROUP_EMOJI[groupName] ?? '📌'
          const sectionId   = groupName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')

          return (
            <section key={groupName} id={sectionId} style={{ marginBottom: 64 }}>
              {hasSponsor && <SponsorBanner sectionLabel={groupName} />}

              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 20 }}>
                <h2 style={{
                  fontFamily: 'var(--font-fraunces, serif)',
                  fontSize: 24,
                  fontWeight: 700,
                  color: 'var(--fg-navy)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}>
                  {emoji} {groupName}
                </h2>
                <a href="#directory" style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-sky)', textDecoration: 'none' }}>
                  Full directory →
                </a>
              </div>

              {/* Article preview for keyed groups */}
              {article && (
                <div style={{ marginBottom: 28 }}>
                  <ArticleHeroCard article={article} />
                </div>
              )}

              <div className="space-y-8">
                {cats.slice(0, 3).map(cat => {
                  if (!(cat.listings ?? []).length) return null
                  const total = (cat.listings ?? []).length
                  return (
                    <div key={cat.id}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                        <h3 style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>{cat.name}</h3>
                        {total > 4 && (
                          <a href="#directory" style={{ fontSize: 11, color: 'var(--fg-sky)', textDecoration: 'none', fontWeight: 600 }}>
                            All {total} →
                          </a>
                        )}
                      </div>
                      <CategorySection category={cat} limit={cat.listings.some(l => l.listing_tier === 'featured') ? 6 : 4} />
                    </div>
                  )
                })}
                {cats.length > 3 && (
                  <div style={{ textAlign: 'center', paddingTop: 4 }}>
                    <a href="#directory" style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-sky)', textDecoration: 'none' }}>
                      {cats.slice(3).reduce((s, c) => s + (c.listings ?? []).length, 0)} more listings in {cats.length - 3} more {groupName} categories →
                    </a>
                  </div>
                )}
              </div>
            </section>
          )
        })}

        {/* ── FIRST 30 DAYS ─────────────────────────────────────────────────── */}
        <section id="first-30-days" style={{ marginBottom: 64 }}>
          <div style={{
            borderRadius: 20,
            overflow: 'hidden',
            border: '1.5px solid rgba(196,98,45,0.18)',
            backgroundColor: 'white',
            boxShadow: 'var(--fg-shadow)',
          }}>
            <div style={{ padding: '18px 24px 16px', borderBottom: '1px solid rgba(196,98,45,0.12)', background: 'var(--fg-terra-light)' }}>
              <h2 style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 20, fontWeight: 700, color: 'var(--fg-navy)', marginBottom: 4 }}>
                📋 Your First 30 Days in the River Region
              </h2>
              <p style={{ fontSize: 13, color: 'var(--fg-mid)' }}>A practical checklist for every family new to the area.</p>
            </div>
            <div style={{ padding: 24, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 24, fontSize: 13 }}>
              {[
                { period: 'Week 1', items: ['Register your child with school district or contact admissions', 'Establish a pediatrician — most practices have wait times', 'Update your driver\'s license (Alabama 30-day rule)', 'Get utilities transferred', 'Find your nearest urgent care that sees kids'] },
                { period: 'Month 1', items: ['Visit local libraries — huge family resource often missed', 'Attend one community event — farmer\'s market, park day', 'Identify a faith community if relevant', 'Sign kids up for a sports league or activity', 'Find a restaurant where you\'d take grandparents'] },
                { period: 'Months 2–3', items: ['Connect with a parent group or church small group', 'Try at least 3 family activities you\'ve never done', 'Establish a dentist (kids + adult)', 'Visit 2 neighborhoods you didn\'t move into', 'Subscribe to River Region Parents'] },
              ].map(({ period, items }) => (
                <div key={period}>
                  <div style={{ fontFamily: 'var(--font-fraunces, serif)', fontWeight: 700, fontSize: 14, color: 'var(--fg-terra)', marginBottom: 12 }}>
                    {period}
                  </div>
                  <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {items.map((item, i) => (
                      <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, color: '#374151' }}>
                        <span style={{ marginTop: 5, width: 10, height: 10, borderRadius: '50%', border: '2px solid var(--fg-gold)', flexShrink: 0, display: 'inline-block' }} />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── ARTICLES GRID ─────────────────────────────────────────────────── */}
        {articles.length > 0 && (
          <section style={{ marginBottom: 64 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 24, fontWeight: 700, color: 'var(--fg-navy)' }}>
                📖 All Articles
              </h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
              {articles.map(a => <ArticleHeroCard key={a.slug} article={a} />)}
            </div>
          </section>
        )}

        {/* ── FULL DIRECTORY ────────────────────────────────────────────────── */}
        <section id="directory" style={{ marginBottom: 64 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 }}>
            <h2 style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 24, fontWeight: 700, color: 'var(--fg-navy)' }}>
              📍 Full Directory
            </h2>
          </div>
          <p style={{ fontSize: 14, color: 'var(--fg-mid)', marginBottom: 24 }}>
            {allCategories.length} categories · {totalListings} listings — filter by area, category, or specialty.
          </p>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <GuideDirectory categories={allCategories as any} />
        </section>

        {/* ── ADVERTISE CTA ─────────────────────────────────────────────────── */}
        {/* Newsletter signup */}
        <NewsletterSignup
          variant="inline"
          source="newcomer-guide-footer"
          headline="Stay in the Loop"
          subheadline="Get our weekly email with what's new, what's coming up, and what local moms are talking about."
          cta_label="Subscribe"
        />

        {/* Popup trigger */}
        <NewsletterPopupTrigger source="newcomer-guide-popup" />

        <section>
          <div style={{
            borderRadius: 20,
            padding: '48px 32px',
            textAlign: 'center',
            background: 'linear-gradient(135deg, var(--fg-navy) 0%, #2a3f6f 100%)',
          }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--fg-gold)', marginBottom: 10 }}>
              Partner With Us
            </p>
            <h2 style={{
              fontFamily: 'var(--font-fraunces, serif)',
              fontSize: 'clamp(22px, 4vw, 32px)',
              fontWeight: 700,
              color: 'white',
              marginBottom: 12,
              lineHeight: 1.2,
            }}>
              Be the First Name Families See
            </h2>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', lineHeight: 1.6, maxWidth: 460, margin: '0 auto 8px' }}>
              A Featured Listing puts your business in front of every family new to the River Region — year-round.
            </p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', fontStyle: 'italic', marginBottom: 32 }}>
              &quot;When a newcomer family chooses their child&apos;s first doctor, they see your name first.&quot;
            </p>
            <Link href="/advertise" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '13px 32px', borderRadius: 12, fontSize: 14, fontWeight: 700,
              backgroundColor: 'var(--fg-gold)', color: '#3d1f17',
              textDecoration: 'none',
            }}>
              See partnership options <ArrowRight size={15} />
            </Link>
          </div>
        </section>

      </div>
    </div>
  )
}
