// /advertise/[verticalSlug]
// Templated sponsor pitch page for any vertical. Pulls identity from the
// verticals table, shows what the sponsorship includes, and gives the
// advertiser a clear next step.

import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { Navigation } from '@/components/Navigation'
import { PublicFooter } from '@/components/PublicFooter'
import {
  Crown, Check, ArrowRight, Eye, MapPin, Zap, ChevronRight, MessageSquare,
} from 'lucide-react'
import type { Metadata } from 'next'

export const revalidate = 600

interface PageParams { params: Promise<{ verticalSlug: string }> }

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

interface Vertical {
  slug:           string
  display_name:   string
  subtitle:       string | null
  description:    string | null
  hero_image_url: string | null
  sponsor_label:  string | null
  is_active:      boolean
}

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { verticalSlug } = await params
  const supabase = getSupabase()
  const { data } = await supabase
    .from('verticals')
    .select('display_name, subtitle')
    .eq('slug', verticalSlug)
    .eq('is_active', true)
    .maybeSingle()

  if (!data) return { title: 'Sponsor a Vertical — River Region Parents' }
  return {
    title:       `Sponsor ${data.display_name} — River Region Parents`,
    description: `Become the exclusive sponsor of ${data.display_name}. ${data.subtitle ?? ''}`.trim(),
  }
}

// Each vertical can declare a pitch — what an exclusive sponsor gets. For
// now we hand-tune a few. Anything not listed falls back to the generic
// "year-round sponsorship of this vertical" pitch.
const PITCH: Record<string, { audience: string; whatYouGet: string[]; perfectFor: string[] }> = {
  'school-zone': {
    audience: 'Parents, grandparents, and educators across the River Region — Montgomery, Autauga, Elmore, Pike Road, and private schools.',
    whatYouGet: [
      'Exclusive "Proudly Presented By" banner at the top of the School Zone home page',
      'Sponsor logo + tagline embedded across every School Bits roundup',
      'Featured ad placement on Teacher of the Month and Student Spotlight articles',
      'Mention in our monthly School Zone email to subscribers',
      'First right of refusal to renew each year',
    ],
    perfectFor: [
      'Pediatric clinics and urgent care',
      'Tutoring + enrichment programs',
      'Private schools recruiting families',
      'Family-focused banks and credit unions',
      'Sports leagues and dance studios',
    ],
  },
  'mom-knows-best': {
    audience: 'Local moms — engaged readers who trust real River Region voices over national advice columns.',
    whatYouGet: [
      'Exclusive "Proudly Presented By" banner at the top of Mom Knows Best',
      'Sponsor mention on every blogger profile page',
      'Featured placement on individual blog posts',
      'Mention in our monthly newsletter alongside the latest mom-life posts',
      'First right of refusal to renew each year',
    ],
    perfectFor: [
      'Family photographers',
      'Mom-and-baby retail and boutiques',
      'OB-GYN, lactation, and postpartum services',
      'Subscription boxes and meal services',
      'Wellness studios (yoga, pilates, fitness)',
    ],
  },
}

const FALLBACK_PITCH = {
  audience: 'River Region families who turn to us first for trusted local recommendations and news.',
  whatYouGet: [
    'Exclusive "Proudly Presented By" banner at the top of this section',
    'Sponsor mention across every article in this vertical',
    'Featured placement in our monthly newsletter',
    'First right of refusal to renew each year',
  ],
  perfectFor: [
    'Family-focused local businesses',
    'Service providers reaching River Region parents',
    'Education, health, and wellness brands',
  ],
}

export default async function AdvertiseVerticalPage({ params }: PageParams) {
  const { verticalSlug } = await params
  const supabase = getSupabase()

  const [{ data: verticalRow }, { data: sponsorRow }] = await Promise.all([
    supabase.from('verticals')
      .select('slug, display_name, subtitle, description, hero_image_url, sponsor_label, is_active')
      .eq('slug', verticalSlug)
      .eq('is_active', true)
      .maybeSingle(),
    supabase.from('ad_placements')
      .select('ad_headline, advertiser:advertiser_accounts(business_name, slug)')
      .eq('placement_type', 'section_sponsor')
      .eq('is_active', true)
      .ilike('placement_context', `%${verticalSlug}%`)
      .limit(1)
      .maybeSingle(),
  ])

  const vertical = verticalRow as Vertical | null
  if (!vertical) notFound()

  const sponsorRecord = sponsorRow as {
    ad_headline: string | null
    advertiser:  { business_name?: string | null; slug?: string | null } | null
  } | null

  const sponsoredBy = sponsorRecord?.advertiser?.business_name ?? null
  const pitch       = PITCH[verticalSlug] ?? FALLBACK_PITCH

  const publicHref       = `/${verticalSlug}`
  const inquirySubject   = `Sponsorship inquiry: ${vertical.display_name}`
  const inquiryBody      = `Hi — I'd like to learn more about sponsoring ${vertical.display_name}. Please send pricing and availability.`
  const inquiryMailto    = `mailto:hello@riverregionparents.com?subject=${encodeURIComponent(inquirySubject)}&body=${encodeURIComponent(inquiryBody)}`

  return (
    <div className="min-h-screen bg-background public-page">
      <Navigation />

      {/* ── Hero ── */}
      <div className="relative overflow-hidden">
        {vertical.hero_image_url && (
          <div className="absolute inset-0">
            <Image
              src={vertical.hero_image_url}
              alt={vertical.display_name}
              fill
              style={{ objectFit: 'cover', objectPosition: 'center 30%' }}
              sizes="100vw"
              priority
              unoptimized
            />
            <div className="absolute inset-0 bg-gradient-to-br from-primary/92 via-primary/82 to-primary/65" />
          </div>
        )}
        {!vertical.hero_image_url && (
          <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/85 to-primary/70" />
        )}

        <div className="relative container py-14 md:py-20">
          <Link
            href="/advertise"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-white/85 hover:text-white mb-5"
          >
            ← All advertising options
          </Link>

          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-white/15 text-white text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full mb-4">
              <Crown className="h-3.5 w-3.5" />
              {sponsoredBy ? 'Currently Sponsored' : 'Exclusive Sponsorship Available'}
            </div>
            <h1 className="text-3xl md:text-5xl font-black text-white leading-tight mb-3">
              Sponsor {vertical.display_name}
            </h1>
            <p className="text-base md:text-lg text-white/85 leading-relaxed max-w-xl mb-7">
              {vertical.subtitle ?? `Become the year-round sponsor of ${vertical.display_name}, reaching engaged River Region families every time they visit this section.`}
            </p>
            <div className="flex flex-wrap gap-2.5">
              {!sponsoredBy && (
                <a
                  href={inquiryMailto}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-white text-primary rounded-full text-sm font-bold hover:bg-white/90 transition-colors shadow-sm"
                >
                  <MessageSquare className="h-4 w-4" /> Inquire About Sponsorship
                </a>
              )}
              <Link
                href={publicHref}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-white/15 border border-white/30 text-white rounded-full text-sm font-semibold hover:bg-white/25 transition-colors"
              >
                <Eye className="h-3.5 w-3.5" /> View the Section
              </Link>
            </div>
          </div>
        </div>
      </div>

      <main className="container py-10 md:py-14 space-y-12">

        {sponsoredBy && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5 md:p-6 flex items-start gap-4">
            <Crown className="h-6 w-6 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-gray-900 mb-1">
                This section is currently sponsored by {sponsoredBy}.
              </p>
              <p className="text-sm text-gray-600 leading-relaxed">
                The spot opens up again at the end of the current sponsorship term.
                If you&apos;d like to be notified when {vertical.display_name} sponsorship
                becomes available,{' '}
                <a href={inquiryMailto} className="text-primary hover:underline font-semibold">
                  get on our waitlist
                </a>.
              </p>
            </div>
          </div>
        )}

        {/* ── Who you reach ─────────────────────────────────────────────────── */}
        <section className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 rounded-2xl border border-border/50 bg-card p-6 md:p-8">
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="h-4 w-4 text-primary" />
              <span className="text-xs font-bold uppercase tracking-widest text-primary">Who you reach</span>
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-foreground leading-tight mb-3">
              {vertical.display_name} readers
            </h2>
            <p className="text-base text-muted-foreground leading-relaxed">
              {pitch.audience}
            </p>
            {vertical.description && (
              <p className="text-sm text-muted-foreground leading-relaxed mt-4 pt-4 border-t border-border/30">
                {vertical.description}
              </p>
            )}
          </div>

          <div className="rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-secondary/5 border border-primary/20 p-6 md:p-7">
            <Zap className="h-5 w-5 text-primary mb-2" />
            <p className="text-xs font-bold uppercase tracking-widest text-primary mb-1">One spot. One year.</p>
            <p className="text-sm text-foreground font-bold leading-snug mb-2">
              No competing voices on the page.
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              We don&apos;t stack sponsors. The year-round sponsor anchors every page
              in this vertical, with first right of refusal to renew.
            </p>
          </div>
        </section>

        {/* ── What you get ──────────────────────────────────────────────────── */}
        <section className="rounded-2xl border border-border/50 bg-card p-6 md:p-8">
          <h2 className="text-xl md:text-2xl font-bold text-foreground mb-5">
            What&apos;s included
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {pitch.whatYouGet.map(item => (
              <div key={item} className="flex items-start gap-2.5 p-3 rounded-xl bg-background border border-border/30">
                <div className="shrink-0 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                  <Check className="h-3 w-3 text-primary" />
                </div>
                <p className="text-sm text-foreground leading-snug">{item}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Perfect for ───────────────────────────────────────────────────── */}
        <section>
          <h2 className="text-xl md:text-2xl font-bold text-foreground mb-3">
            Especially a fit for
          </h2>
          <p className="text-sm text-muted-foreground mb-5">
            Local businesses where the {vertical.display_name} audience already overlaps with your customer base.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {pitch.perfectFor.map(item => (
              <div key={item} className="flex items-center gap-2.5 px-4 py-3 rounded-xl border border-border/40 bg-background">
                <ChevronRight className="h-4 w-4 text-primary shrink-0" />
                <p className="text-sm font-semibold text-foreground">{item}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── CTA ───────────────────────────────────────────────────────────── */}
        <section className="rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-secondary/5 border border-primary/20 p-8 md:p-12 text-center">
          <Crown className="h-7 w-7 text-primary mx-auto mb-3" />
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3 leading-tight">
            {sponsoredBy
              ? `Get on the ${vertical.display_name} waitlist`
              : `Become the ${vertical.display_name} sponsor`}
          </h2>
          <p className="text-base text-muted-foreground max-w-xl mx-auto mb-7 leading-relaxed">
            {sponsoredBy
              ? `When the current sponsor's term ends, you'll hear about the opening first.`
              : `Reach out and we'll send pricing and availability within one business day.`}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <a
              href={inquiryMailto}
              className="inline-flex items-center gap-1.5 px-6 py-3 bg-primary text-primary-foreground rounded-full text-sm font-bold hover:bg-primary/90 transition-colors"
            >
              <MessageSquare className="h-4 w-4" />
              {sponsoredBy ? 'Join the Waitlist' : 'Inquire About Sponsorship'}
            </a>
            <Link
              href="/advertise"
              className="inline-flex items-center gap-1.5 px-6 py-3 border border-primary/40 text-primary rounded-full text-sm font-semibold hover:bg-primary/10 transition-colors"
            >
              All advertising options <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  )
}
