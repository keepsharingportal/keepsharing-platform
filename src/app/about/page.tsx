// ── /about — About + Masthead ──────────────────────────────────────────────
//
// E-E-A-T (Experience, Expertise, Authoritativeness, Trustworthiness)
// landing page that NewsMediaOrganization JSON-LD references via
// mainEntityOfPage. Tells readers + search engines who we are, when
// we started, who runs us, and what we cover.

import type { Metadata } from 'next'
import Link from 'next/link'
import { Navigation } from '@/components/Navigation'
import { PublicFooter } from '@/components/PublicFooter'
import { loadBrandContext } from '@/lib/brand-context'
import { getBrandSeoConfig } from '@/lib/seo/brand-seo'
import { Heart, Award, BookOpen, ArrowRight } from 'lucide-react'

export const revalidate = 3600

export async function generateMetadata(): Promise<Metadata> {
  const { buildPageMetadata } = await import('@/lib/seo/metadata')
  return buildPageMetadata({
    title:       'About Us',
    description: 'Who we are, what we cover, and why we exist — a locally-owned magazine and digital ecosystem serving River Region families since 2005.',
    path:        '/about',
    type:        'website',
    keywords:    ['About River Region Parents', 'local family magazine', 'River Region publisher'],
  })
}

export default async function AboutPage() {
  const ctx = await loadBrandContext()
  const seo = getBrandSeoConfig(ctx.market, ctx.publicOrigin)
  const foundingYear = seo.foundingYear ?? 2005
  const yearsRunning = new Date().getFullYear() - foundingYear

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container py-10 md:py-16 max-w-3xl">

        <p className="text-xs font-bold uppercase tracking-widest text-primary mb-3">About</p>
        <h1 className="text-4xl md:text-5xl font-black text-foreground leading-tight mb-4">{seo.organizationName}</h1>
        <p className="text-lg md:text-xl text-foreground/80 leading-relaxed mb-10">
          {seo.slogan}.
        </p>

        <section className="prose prose-lg max-w-none text-foreground/85 space-y-6 mb-12">
          <p>
            We&apos;re a locally-owned print magazine and digital ecosystem serving
            families in {seo.areaServedLabel} since {foundingYear} — {yearsRunning} years of
            covering the schools, businesses, events, coaches, teachers, and neighbors
            who shape family life here. Every story is locally reported. Every guide
            is locally written. Every nominee is a real person from this community.
          </p>
          <p>
            We exist for one reason: to be <strong>the first-choice resource</strong> when
            a {seo.areaServedLabel.split(',')[0]} parent has a question, a decision, a
            celebration, or a story to share. Whether it&apos;s choosing a pediatrician,
            finding a summer camp, nominating their kid&apos;s teacher, or just looking
            for something to do with the family Saturday — we want them to know we&apos;re
            here, we&apos;re local, and we&apos;ve done the legwork.
          </p>
        </section>

        <div className="grid sm:grid-cols-3 gap-4 mb-12">
          <FactCard icon={<Heart className="h-5 w-5" />} title="Locally owned" body="Independently published. Not part of a national chain." />
          <FactCard icon={<Award className="h-5 w-5" />} title={`${yearsRunning} years strong`} body={`Serving families since ${foundingYear}.`} />
          <FactCard icon={<BookOpen className="h-5 w-5" />} title="Locally reported" body="Every story written by people who live here." />
        </div>

        <section className="bg-card border border-border/50 rounded-2xl p-6 md:p-8 mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-3">What we cover</h2>
          <div className="flex flex-wrap gap-2">
            {seo.knowsAbout.map(topic => (
              <span key={topic} className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">{topic}</span>
            ))}
          </div>
        </section>

        <section className="grid sm:grid-cols-2 gap-4 mb-8">
          <PolicyLink href="/about/editorial-policy" title="Editorial Policy" body="How we choose what to publish and our standards for accuracy + fairness." />
          <PolicyLink href="/about/corrections"      title="Corrections Policy" body="If we got something wrong, here's how we fix it." />
        </section>

        <section className="bg-card border border-border/50 rounded-2xl p-6 md:p-8">
          <h2 className="text-2xl font-bold text-foreground mb-3">Get in touch</h2>
          <p className="text-foreground/80 mb-2">
            Story tip? Press release? Question about advertising? Reach the editorial team at{' '}
            <a href={`mailto:${seo.contactEmail}`} className="text-primary font-semibold hover:underline">{seo.contactEmail}</a>.
          </p>
          <p className="text-foreground/70 text-sm">
            For the fastest response on a community story or nomination, use the {' '}
            <Link href="/submit" className="text-primary font-semibold hover:underline">Submit page</Link>.
          </p>
        </section>

      </main>
      <PublicFooter />
    </div>
  )
}

function FactCard({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="bg-card border border-border/50 rounded-2xl p-5">
      <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-3">{icon}</div>
      <p className="font-bold text-foreground mb-1">{title}</p>
      <p className="text-sm text-foreground/70 leading-relaxed">{body}</p>
    </div>
  )
}

function PolicyLink({ href, title, body }: { href: string; title: string; body: string }) {
  return (
    <Link href={href} className="group bg-card border border-border/50 rounded-2xl p-5 hover:border-primary/40 transition-colors">
      <p className="font-bold text-foreground mb-1 inline-flex items-center gap-1.5">
        {title} <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
      </p>
      <p className="text-sm text-foreground/70 leading-relaxed">{body}</p>
    </Link>
  )
}
