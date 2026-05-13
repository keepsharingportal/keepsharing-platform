import Image from 'next/image'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  MapPin, Star, BookOpen, ArrowRight, Search,
  Sparkles, Heart, CheckCircle2,
  ChevronRight, TrendingUp, ListChecks,
  Map, Utensils, Compass,
} from 'lucide-react'
import { NewsletterSignup } from '@/components/newsletter/NewsletterSignup'
import { SectionHeader, EditorialCard, GuideTrendingCard } from '@/components/theme'
import type { GuideListing } from '@/components/family-guide/types'
import type { PlaybookSection, AnchorArticle, StartCard } from './GuidePageLayout'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface GuideVerticalLayoutProps {
  guideSlug: string
  guideName?: string
  heroImageUrl: string | null
  heroTitle: string
  heroSubtitle: string
  heroEyebrow?: string
  heroPrimaryCta?: { label: string; href: string }
  featuredPartner?: GuideListing | null
  startCards?: StartCard[]
  playbookSection?: PlaybookSection
  articles?: AnchorArticle[]
  resourceCategories?: Array<{ name: string; iconName?: string | null; slug: string }>
  trendingListings?: GuideListing[]
  directorySlot: React.ReactNode
  sponsorCta: { eyebrow: string; headline: string; subheadline: string; ctaLabel: string; ctaHref: string }
  newsletter: { headline: string; subheadline: string; sourceTag: string }
}

// ── Fallback content (renders when live data is absent) ───────────────────────

const FB_ARTICLES: AnchorArticle[] = [
  {
    id: 'fb-1',
    slug: 'choosing-right-pediatrician',
    title: 'How to Choose the Right Pediatrician for Your Family',
    excerpt: "Finding the right pediatrician is one of the most important decisions you'll make as a parent. Here's what to look for.",
    heroImageUrl: 'https://images.unsplash.com/photo-1551601651-2a8555f1a136?w=800&q=80&auto=format&fit=crop',
    category: 'Health',
    byline: 'River Region Parents',
    href: '/family-resource-guide/articles/choosing-right-pediatrician',
  },
  {
    id: 'fb-2',
    slug: 'best-schools-river-region',
    title: 'Best Schools in the River Region: 2026 Guide',
    excerpt: 'From top-rated public schools to innovative private academies — your complete guide to education in Montgomery.',
    heroImageUrl: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=800&q=80&auto=format&fit=crop',
    category: 'Education',
    byline: 'River Region Parents',
    href: '/family-resource-guide/articles/best-schools-river-region',
  },
  {
    id: 'fb-3',
    slug: 'family-parks-outdoor-fun',
    title: 'Top 10 Parks & Outdoor Spots for River Region Families',
    excerpt: 'Splash pads, nature trails, and hidden gems — discover the best outdoor spaces for families in Montgomery.',
    heroImageUrl: 'https://images.unsplash.com/photo-1472457974886-0ebcd59440cc?w=800&q=80&auto=format&fit=crop',
    category: 'Activities',
    byline: 'River Region Parents',
    href: '/family-resource-guide/articles/family-parks-outdoor-fun',
  },
  {
    id: 'fb-4',
    slug: 'moving-to-montgomery',
    title: "New to Montgomery? Your Complete Family Relocation Guide",
    excerpt: 'Everything you need to know about settling your family into the River Region — neighborhoods, schools, doctors, and community.',
    heroImageUrl: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&q=80&auto=format&fit=crop',
    category: 'Newcomers',
    byline: 'River Region Parents',
    href: '/family-resource-guide/articles/moving-to-montgomery',
  },
]

const FB_PARTNER: GuideListing = {
  id: 'fb-partner',
  category_id: '',
  slug: 'river-region-pediatrics',
  business_name: 'River Region Pediatrics',
  editorial_blurb: 'Trusted Care for Every Stage',
  description: 'River Region Pediatrics has been serving families in Montgomery for over 20 years. Their compassionate team provides comprehensive care for children from birth through age 18, accepting most major insurance plans.',
  cover_image_url: 'https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?w=900&q=80&auto=format&fit=crop',
  logo_url: null,
  tags: ['Pediatric Care', 'All Ages', 'Most Insurance Accepted'],
  listing_tier: 'featured',
  display_order: 0,
}

const FB_CATEGORIES = [
  { name: 'Health & Wellness', iconName: null, slug: 'health-wellness' },
  { name: 'Education & Schools', iconName: null, slug: 'education-schools' },
  { name: 'Activities & Fun', iconName: null, slug: 'activities-fun' },
  { name: 'Local Services', iconName: null, slug: 'local-services' },
]

const FB_TRENDING: GuideListing[] = [
  {
    id: 'fb-t1', category_id: '', slug: 'montgomery-ymca', business_name: 'Montgomery YMCA',
    editorial_blurb: 'Family fitness & youth programs for all ages',
    cover_image_url: 'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=500&q=80&auto=format&fit=crop',
    city: 'Montgomery', listing_tier: 'enhanced', display_order: 0,
  },
  {
    id: 'fb-t2', category_id: '', slug: 'exploreum-science-center', business_name: 'Exploreum Science Center',
    editorial_blurb: 'Interactive science & discovery for the whole family',
    cover_image_url: 'https://images.unsplash.com/photo-1509233725247-49e657c54213?w=500&q=80&auto=format&fit=crop',
    city: 'Montgomery', listing_tier: 'enhanced', display_order: 1,
  },
  {
    id: 'fb-t3', category_id: '', slug: 'learning-tree-montessori', business_name: 'Learning Tree Montessori',
    editorial_blurb: 'Award-winning early childhood education since 1998',
    cover_image_url: 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=500&q=80&auto=format&fit=crop',
    city: 'Montgomery', listing_tier: 'enhanced', display_order: 2,
  },
  {
    id: 'fb-t4', category_id: '', slug: 'capitol-city-martial-arts', business_name: 'Capitol City Martial Arts',
    editorial_blurb: 'Building confidence and discipline in kids of all ages',
    cover_image_url: 'https://images.unsplash.com/photo-1555597673-b21d5c935865?w=500&q=80&auto=format&fit=crop',
    city: 'Montgomery', listing_tier: 'enhanced', display_order: 3,
  },
]

const FB_CHECKLIST = [
  '30 Days Before Moving Checklist',
  'New School Enrollment Guide',
  'Pediatrician Interview Questions',
  'River Region Utility Setup',
  'Neighborhood Family Groups',
]

const PLACEHOLDER_EVENTS = [
  { month: 'JUN', day: '5',  title: 'Summer Camp Open House',   detail: 'Saturday, June 5 · 10:00 AM' },
  { month: 'JUN', day: '8',  title: 'Local School Choice Fair', detail: 'Tuesday, June 8 · 5:30 PM'   },
  { month: 'JUN', day: '10', title: 'Family Wellness Workshop',  detail: 'Thursday, June 10 · 6:00 PM'  },
]

// ── Category icon helper ──────────────────────────────────────────────────────

function CatIcon({ name }: { name: string }) {
  const n = name.toLowerCase()
  if (n.includes('health') || n.includes('wellness') || n.includes('medical') || n.includes('pediatric'))
    return <Heart className="h-8 w-8" />
  if (n.includes('educat') || n.includes('school') || n.includes('care') || n.includes('learn'))
    return <BookOpen className="h-8 w-8" />
  if (n.includes('activ') || n.includes('fun') || n.includes('sport') || n.includes('camp'))
    return <Sparkles className="h-8 w-8" />
  return <MapPin className="h-8 w-8" />
}

const CAT_STYLE = [
  { color: 'text-red-500',     bg: 'bg-red-50'     },
  { color: 'text-blue-500',    bg: 'bg-blue-50'     },
  { color: 'text-amber-500',   bg: 'bg-amber-50'    },
  { color: 'text-emerald-500', bg: 'bg-emerald-50'  },
]

const DISCOVERY_ICONS = [Map, Compass, Sparkles, BookOpen]

// ── Component ─────────────────────────────────────────────────────────────────

export function GuideVerticalLayout({
  guideName = 'Family Resource Guide',
  heroImageUrl,
  heroTitle,
  heroSubtitle,
  heroEyebrow = 'OFFICIAL RIVER REGION GUIDE',
  heroPrimaryCta = { label: 'Explore the Directory', href: '#directory' },
  featuredPartner,
  startCards,
  playbookSection,
  articles = [],
  resourceCategories = [],
  trendingListings = [],
  directorySlot,
  sponsorCta,
  newsletter,
}: GuideVerticalLayoutProps) {

  // Resolved data — real if available, fallback if empty ─────────────────────
  const partner          = featuredPartner ?? FB_PARTNER
  const resolvedArticles = articles.length > 0 ? articles : FB_ARTICLES
  const resolvedCats     = resourceCategories.length > 0 ? resourceCategories : FB_CATEGORIES
  // Trending: real data only — no fallback. Hides the section until listings exist.
  const resolvedTrending = trendingListings

  const rawChecklist: string[] =
    startCards && startCards.length > 0
      ? startCards.map(c => c.title)
      : (playbookSection?.items?.[0]?.items ?? [])
  const resolvedChecklist = rawChecklist.length > 0 ? rawChecklist : FB_CHECKLIST

  const editorialArticles = resolvedArticles.slice(0, 2)
  const discoveryArticles = resolvedArticles.slice(0, 4)
  const sponsoredArticle  = resolvedArticles[2] ?? null

  const heroImg = heroImageUrl ?? 'https://images.unsplash.com/photo-1581579438747-104c53e7c2e1?w=1600&q=80&auto=format&fit=crop'

  return (
    <div className="min-h-screen bg-background">

      {/* ── 1. BREADCRUMB ─────────────────────────────────────────────────── */}
      <div className="border-b bg-muted/30">
        <div className="container py-3 flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-primary transition-colors">Home</Link>
          <ChevronRight className="h-3 w-3" />
          <Link href="/guides" className="hover:text-primary transition-colors">Guides</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground font-medium truncate">{guideName}</span>
        </div>
      </div>

      {/* ── 2. HERO ───────────────────────────────────────────────────────── */}
      <section className="relative min-h-[60vh] md:min-h-[75vh] flex items-center overflow-hidden bg-foreground">
        <div className="absolute inset-0">
          <Image
            src={heroImg}
            alt={heroTitle}
            fill
            priority
            sizes="100vw"
            className="object-cover opacity-40 grayscale"
            unoptimized
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-foreground" />
        </div>

        <div className="container relative z-10 py-20">
          <div className="max-w-4xl mx-auto text-center">

            {/* Eyebrow badge */}
            <div className="inline-flex items-center gap-3 bg-primary/20 backdrop-blur-md border border-primary/30 rounded-full px-4 py-2 mb-8">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-xs font-bold text-white uppercase tracking-widest">{heroEyebrow}</span>
            </div>

            {/* Title */}
            <h1 className="text-5xl md:text-8xl font-black text-white mb-6 leading-tight tracking-tight uppercase [text-shadow:_0_4px_12px_rgba(0,0,0,0.5)]">
              {heroTitle}
            </h1>

            {/* Subtitle */}
            <p className="text-xl md:text-2xl text-white/90 mb-10 leading-relaxed font-medium max-w-2xl mx-auto [text-shadow:_0_2px_4px_rgba(0,0,0,0.3)]">
              {heroSubtitle}
            </p>

            {/* ── 3. PRESENTED BY — only renders when a real featured partner exists ── */}
            {featuredPartner && (
              <div className="flex flex-col items-center gap-4 mb-12">
                <span className="text-[10px] font-bold text-white/50 uppercase tracking-[0.2em]">Presented By</span>
                <Link
                  href={`/family-resource-guide/listings/${partner.slug}`}
                  className="flex items-center gap-3 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 hover:bg-white/10 transition-colors group"
                >
                  <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform shrink-0">
                    {partner.logo_url ? (
                      <Image src={partner.logo_url} alt={partner.business_name} width={32} height={32} className="object-contain" unoptimized />
                    ) : (
                      <Star className="h-6 w-6 text-primary fill-primary" />
                    )}
                  </div>
                  <div className="text-left">
                    <div className="text-white font-bold text-lg leading-none mb-1">{partner.business_name}</div>
                    <div className="text-white/60 text-xs">{partner.editorial_blurb ?? 'View full profile'}</div>
                  </div>
                </Link>
              </div>
            )}

            {/* CTAs + search pill */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" className="rounded-full px-10 h-14 text-lg font-bold shadow-xl w-full sm:w-auto" asChild>
                <Link href={heroPrimaryCta.href}>{heroPrimaryCta.label}</Link>
              </Button>
              <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md rounded-full px-6 border border-white/20 h-14 w-full sm:w-auto">
                <Search className="h-5 w-5 text-white/70 shrink-0" />
                <input
                  placeholder="Search this guide..."
                  className="bg-transparent border-none text-white placeholder:text-white/50 outline-none w-full sm:w-48 text-sm"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 4. FEATURED PARTNER HERO CARD — only renders when a real listing exists ── */}
      {featuredPartner && (
        <section className="py-12 -mt-12 relative z-20">
          <div className="container">
            <div className="bg-card border border-primary/20 rounded-[2.5rem] p-8 md:p-12 shadow-2xl flex flex-col lg:flex-row items-center gap-10">
              {/* Image panel */}
              <div className="lg:w-1/2 relative aspect-video rounded-3xl overflow-hidden group w-full">
                <Image
                  src={partner.cover_image_url ?? 'https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?w=900&q=80&auto=format&fit=crop'}
                  alt={partner.business_name}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-700"
                  unoptimized
                />
                <div className="absolute top-6 left-6">
                  <Badge className="bg-accent text-accent-foreground px-4 py-2 font-bold shadow-lg border-none text-sm">
                    ★ Featured Partner
                  </Badge>
                </div>
              </div>
              {/* Content panel */}
              <div className="lg:w-1/2 space-y-6">
                <div className="flex items-center gap-2 text-primary font-bold uppercase tracking-widest text-xs">
                  <Sparkles className="h-4 w-4" /> Recommended for You
                </div>
                <h2 className="text-3xl md:text-5xl font-bold leading-tight">{partner.business_name}</h2>
                {(partner.description ?? partner.editorial_blurb) && (
                  <p className="text-lg text-muted-foreground leading-relaxed">
                    {partner.description ?? partner.editorial_blurb}
                  </p>
                )}
                {(partner.tags ?? []).length > 0 && (
                  <div className="flex flex-wrap gap-6 text-sm font-medium text-foreground/80">
                    {(partner.tags ?? []).slice(0, 3).map(tag => (
                      <div key={tag} className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-primary" /> {tag}
                      </div>
                    ))}
                  </div>
                )}
                <div className="pt-4 flex flex-wrap gap-3">
                  <Button size="lg" className="rounded-full px-10 font-bold" asChild>
                    <Link href={`/family-resource-guide/listings/${partner.slug}`}>
                      View Full Profile
                    </Link>
                  </Button>
                  {partner.website && (
                    <Button size="lg" variant="outline" className="rounded-full px-8 font-bold" asChild>
                      <a href={partner.website} target="_blank" rel="noopener noreferrer">
                        Visit Website
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── 5 + 6 + 7. ESSENTIAL CHECKLISTS + EDITORIAL + SPONSORED STRIP ─── */}
      <section className="py-20 bg-background border-b">
        <div className="container">
          <div className="flex flex-col md:flex-row gap-12 items-start">

            {/* Sticky checklist sidebar */}
            <div className="md:w-1/3 md:sticky md:top-24">
              <div className="bg-primary/5 rounded-[2rem] p-8 border border-primary/10">
                <div className="h-14 w-14 bg-primary rounded-2xl flex items-center justify-center text-white mb-6 shadow-lg shadow-primary/20">
                  <ListChecks className="h-8 w-8" />
                </div>
                <h2 className="text-3xl font-bold mb-4 tracking-tight">Essential Checklists</h2>
                <p className="text-muted-foreground mb-8 leading-relaxed">
                  Moving is hard. Parenting is harder. We&apos;ve simplified the biggest transitions with step-by-step guides from local experts.
                </p>
                <div className="space-y-4">
                  {resolvedChecklist.slice(0, 4).map((item, i) => (
                    <div key={i} className="flex items-center gap-3 group cursor-pointer">
                      <div className="w-6 h-6 rounded-full border-2 border-primary/30 flex items-center justify-center group-hover:border-primary transition-colors shrink-0">
                        <ArrowRight className="h-3 w-3 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <span className="text-sm font-bold group-hover:text-primary transition-colors">{item}</span>
                    </div>
                  ))}
                </div>
                <Button className="w-full mt-10 rounded-full font-bold" asChild>
                  <Link href={startCards && startCards.length > 0 ? startCards[0].ctaHref : '#directory'}>
                    Download All Guides
                  </Link>
                </Button>
              </div>
            </div>

            {/* Right column: article cards + sponsored strip */}
            <div className="md:w-2/3 space-y-12">
              <div className="grid sm:grid-cols-2 gap-8">
                {editorialArticles.map((article, i) => (
                  <EditorialCard
                    key={article.id}
                    href={article.href}
                    title={article.title}
                    excerpt={article.excerpt}
                    imageSrc={article.heroImageUrl}
                    fallbackSrc={FB_ARTICLES[i]?.heroImageUrl ?? undefined}
                    category={article.category ?? undefined}
                  />
                ))}
              </div>

              {/* Sponsored feature strip */}
              {sponsoredArticle && (
                <div className="bg-muted/50 rounded-3xl p-8 flex flex-col sm:flex-row items-center gap-8 border border-border/50">
                  <div className="w-20 h-20 bg-background rounded-2xl flex items-center justify-center shadow-sm border shrink-0">
                    <Utensils className="h-10 w-10 text-secondary" />
                  </div>
                  <div className="flex-1 text-center sm:text-left">
                    <Badge variant="outline" className="mb-2 text-[10px] uppercase tracking-widest text-muted-foreground">
                      Sponsored Feature
                    </Badge>
                    <h4 className="text-xl font-bold mb-1">{sponsoredArticle.title}</h4>
                    <p className="text-muted-foreground text-sm line-clamp-2">{sponsoredArticle.excerpt}</p>
                  </div>
                  <Button variant="secondary" className="rounded-full px-8 shrink-0" asChild>
                    <Link href={sponsoredArticle.href}>Get the Guide</Link>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── 8. LOCAL DISCOVERY HUB ────────────────────────────────────────── */}
      <section className="py-20 bg-muted/30">
        <div className="container">
          <SectionHeader
            size="lg"
            title="Local Discovery Hub"
            description="The best parks, day trips, and hidden gems in the River Region."
            action={
              <Button variant="ghost" className="hidden md:flex gap-2 font-bold" asChild>
                <Link href="#directory">Explore More <Compass className="h-4 w-4" /></Link>
              </Button>
            }
          />

          <div className="grid md:grid-cols-4 gap-6">
            {discoveryArticles.map((article, idx) => {
              const Icon = DISCOVERY_ICONS[idx % DISCOVERY_ICONS.length]
              return (
                <Link
                  key={article.id}
                  href={article.href}
                  className="group relative aspect-[4/5] rounded-[2rem] overflow-hidden block"
                >
                  <Image
                    src={article.heroImageUrl ?? ''}
                    alt={article.title}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-700"
                    unoptimized
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white mb-3 shadow-lg group-hover:scale-110 transition-transform">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2 leading-tight">{article.title}</h3>
                    <div className="flex items-center gap-2 text-white/70 text-xs font-bold uppercase tracking-widest">
                      Read Guide <ArrowRight className="h-3 w-3" />
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── 9. HAPPENING AROUND TOWN ──────────────────────────────────────── */}
      <section className="py-20 bg-background">
        <div className="container">
          <div className="bg-primary/5 rounded-[3rem] border border-primary/10 p-8 md:p-16">
            <div className="flex flex-col lg:flex-row gap-12 items-center">

              {/* Left: event list */}
              <div className="lg:w-1/2">
                <Badge variant="outline" className="mb-6 text-primary border-primary font-bold uppercase tracking-widest">
                  Guide Calendar
                </Badge>
                <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">Happening Around Town</h2>
                <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                  Don&apos;t miss out on local events specifically curated for River Region families.
                </p>
                <div className="space-y-4 mb-8">
                  {PLACEHOLDER_EVENTS.map((event, i) => (
                    <div key={i} className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-border/50 hover:shadow-md transition-all cursor-pointer">
                      <div className="w-12 h-12 bg-primary/10 rounded-xl flex flex-col items-center justify-center text-primary shrink-0">
                        <span className="text-[10px] font-bold uppercase leading-none">{event.month}</span>
                        <span className="text-lg font-black leading-none">{event.day}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-foreground">{event.title}</h4>
                        <p className="text-xs text-muted-foreground">{event.detail}</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-primary shrink-0" />
                    </div>
                  ))}
                </div>
                <Button size="lg" className="rounded-full px-10 font-bold" asChild>
                  <Link href="/calendar">View Full Calendar</Link>
                </Button>
              </div>

              {/* Right: rotated image collage */}
              <div className="lg:w-1/2 relative hidden lg:block">
                <div className="relative aspect-square rounded-[2rem] overflow-hidden shadow-2xl rotate-3">
                  <Image
                    src={discoveryArticles[0]?.heroImageUrl ?? FB_ARTICLES[0].heroImageUrl!}
                    alt="Local events"
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
                <div className="absolute -bottom-6 -left-6 w-48 aspect-square rounded-[2rem] overflow-hidden shadow-2xl -rotate-6 border-4 border-white">
                  <Image
                    src={discoveryArticles[2]?.heroImageUrl ?? FB_ARTICLES[2].heroImageUrl!}
                    alt="Local events"
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 10 + 11. TRUSTED LOCAL RESOURCES + TRENDING (DIRECTORY HUB) ───── */}
      <section id="directory" className="py-20 bg-muted/30 scroll-mt-20">
        <div className="container">

          <SectionHeader
            size="lg"
            title="Trusted Local Resources"
            description="Our directory features the best local businesses, from pediatricians to play cafes. Every listing is verified by our team."
            action={
              <div className="flex items-center gap-3 bg-white rounded-full px-6 py-3 border border-border shadow-sm w-full md:w-auto shrink-0">
                <Search className="h-5 w-5 text-muted-foreground" />
                <input
                  placeholder="Search providers..."
                  className="border-none outline-none bg-transparent p-0 h-auto w-full md:w-64 text-sm"
                />
              </div>
            }
          />

          {/* Category cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            {resolvedCats.slice(0, 4).map((cat, i) => {
              const cs = CAT_STYLE[i % CAT_STYLE.length]
              return (
                <Link
                  key={cat.slug}
                  href={`#${cat.slug}`}
                  className="group bg-card border border-border/50 rounded-3xl p-8 text-center hover:border-primary/30 hover:shadow-xl transition-all duration-300 block"
                >
                  <div className={`w-16 h-16 ${cs.bg} ${cs.color} rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform`}>
                    <CatIcon name={cat.name} />
                  </div>
                  <h4 className="font-bold text-lg">{cat.name}</h4>
                  <div className="mt-4 flex items-center justify-center text-xs font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                    Browse Category <ArrowRight className="ml-1 h-3 w-3" />
                  </div>
                </Link>
              )
            })}
          </div>

          {/* Full directory slot (Supabase-driven listings) */}
          {directorySlot}

          {/* Trending Resources — only renders when real listings exist */}
          {resolvedTrending.length > 0 && (
            <div className="space-y-6 mt-16">
              <SectionHeader
                size="md"
                withDivider={false}
                icon={TrendingUp}
                title="More Local Resources"
                action={
                  <Button variant="outline" className="rounded-full" asChild>
                    <Link href="#directory">View Full Directory</Link>
                  </Button>
                }
              />
              <div className="grid md:grid-cols-2 gap-6">
                {resolvedTrending.slice(0, 4).map(listing => (
                  <GuideTrendingCard
                    key={listing.id}
                    listing={listing}
                    href={`/family-resource-guide/listings/${listing.slug}`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── 12. SPONSORED OPPORTUNITY CTA ─────────────────────────────────── */}
      <section className="py-20">
        <div className="container">
          <div className="bg-foreground text-background rounded-[3rem] p-8 md:p-16 relative overflow-hidden">
            {/* Skew decoration */}
            <div className="absolute top-0 right-0 w-1/3 h-full bg-primary/20 -skew-x-12 translate-x-1/2 pointer-events-none" />
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-10">
              <div className="max-w-xl text-center md:text-left">
                <Badge variant="outline" className="text-primary border-primary mb-6 font-bold uppercase tracking-widest">
                  {sponsorCta.eyebrow}
                </Badge>
                <h3 className="text-3xl md:text-5xl font-bold mb-6 leading-tight">{sponsorCta.headline}</h3>
                <p className="text-xl text-background/70 mb-8 font-light leading-relaxed">{sponsorCta.subheadline}</p>
                <Button size="lg" className="bg-primary hover:bg-primary/90 text-white rounded-full px-10 h-14 font-bold" asChild>
                  <Link href={sponsorCta.ctaHref}>{sponsorCta.ctaLabel}</Link>
                </Button>
              </div>
              <div className="hidden lg:flex w-80 h-80 bg-background/5 rounded-full border border-background/10 items-center justify-center backdrop-blur-sm shrink-0">
                <div className="text-center p-8">
                  <TrendingUp className="h-16 w-16 text-primary mx-auto mb-4" />
                  <div className="text-4xl font-bold text-background mb-1">15k+</div>
                  <div className="text-xs font-bold uppercase tracking-widest text-background/50">Monthly Readers</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 13. NEWSLETTER ────────────────────────────────────────────────── */}
      <section className="bg-muted py-20 border-t">
        <div className="container">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold mb-6">{newsletter.headline}</h2>
            <p className="text-lg text-muted-foreground mb-10 leading-relaxed">{newsletter.subheadline}</p>
            <NewsletterSignup variant="inline" source={newsletter.sourceTag} />
          </div>
        </div>
      </section>

    </div>
  )
}
