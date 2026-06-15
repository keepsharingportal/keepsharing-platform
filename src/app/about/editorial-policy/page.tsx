// ── /about/editorial-policy ───────────────────────────────────────────────
//
// Real editorial-policy page. Required for E-E-A-T credibility AND
// referenced from NewsMediaOrganization JSON-LD as
// publishingPrinciples / ethicsPolicy / diversityPolicy.

import type { Metadata } from 'next'
import Link from 'next/link'
import { Navigation } from '@/components/Navigation'
import { PublicFooter } from '@/components/PublicFooter'
import { loadBrandContext } from '@/lib/brand-context'
import { getBrandSeoConfig } from '@/lib/seo/brand-seo'

export async function generateMetadata(): Promise<Metadata> {
  const { buildPageMetadata } = await import('@/lib/seo/metadata')
  return buildPageMetadata({
    title:       'Editorial Policy',
    description: 'How we choose what to publish, how we handle sponsored content, our standards for fact-checking, and our commitment to fairness + accuracy.',
    path:        '/about/editorial-policy',
    type:        'website',
  })
}

export default async function EditorialPolicyPage() {
  const ctx = await loadBrandContext()
  const seo = getBrandSeoConfig(ctx.market, ctx.publicOrigin)

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container py-10 md:py-16 max-w-3xl">
        <p className="text-xs font-semibold text-muted-foreground mb-2">
          <Link href="/about" className="hover:text-foreground">About</Link> · Editorial Policy
        </p>
        <h1 className="text-3xl md:text-4xl font-black text-foreground leading-tight mb-2">Editorial Policy</h1>
        <p className="text-sm text-muted-foreground mb-10">Last updated: November 2025</p>

        <div className="prose prose-sm max-w-none text-foreground/85 space-y-7">
          <Section title="What we publish, and what we don't">
            <p>
              {seo.organizationName} is a locally-owned magazine and digital ecosystem serving
              families in {seo.areaServedLabel}. We publish stories about real people in our community —
              teachers, athletes, students, grandparents, business owners, neighbors — alongside
              local resources, event listings, and trusted advice for parents.
            </p>
            <p>
              We <strong>don&apos;t publish</strong>: political endorsements, hot-button national
              opinion pieces, advertorial dressed up as editorial, or content that shames parents
              for their choices. We&apos;re a family-friendly community publication, not a debate venue.
            </p>
          </Section>

          <Section title="How we choose what to feature">
            <p>
              Most editorial features (Mom to Mom, Teacher of the Month, Play Ball, Student Spotlight,
              Grands Are the Greatest) come from <strong>community nominations</strong>. Anyone can
              submit one through our <Link href="/submit" className="text-primary hover:underline">Submit page</Link>;
              every nomination is reviewed by an editor. Selection happens based on the story&apos;s
              specificity, the strength of the nominator&apos;s reasons, and whether the nominee
              consents to being featured.
            </p>
            <p>
              We don&apos;t accept paid placements in editorial features. A business can&apos;t buy
              a Parent Picks placement, a teacher can&apos;t pay to be Teacher of the Month, and no
              nomination becomes more likely because the nominator advertises with us.
            </p>
          </Section>

          <Section title="Sponsored content and advertising">
            <p>
              Sponsored content — when it appears — is clearly labeled as <em>Sponsored</em>,
              <em> Promoted</em>, or with the sponsor&apos;s name visibly attached. Advertising
              (display ads, sponsorship blocks, sponsored events in the calendar) is separate
              from editorial decisions. Our advertising team has no input on what stories run or
              who gets featured.
            </p>
            <p>
              Local businesses that advertise with us receive normal commercial treatment — placement
              in the right context, brand-safe surroundings, and reporting. They don&apos;t receive
              editorial coverage as a benefit of advertising.
            </p>
          </Section>

          <Section title="Accuracy and fact-checking">
            <p>
              Every story is fact-checked by the editor before publication. For features about real
              people, we always confirm the basic facts (name spelling, school, role, dates) with
              the subject — usually as part of the interview-form process they fill out when they
              accept a nomination.
            </p>
            <p>
              If we got something wrong, we want to know. See our{' '}
              <Link href="/about/corrections" className="text-primary hover:underline">Corrections Policy</Link> for
              how we handle errors.
            </p>
          </Section>

          <Section title="Sources and attribution">
            <p>
              We attribute quotes to the people who said them. When we report on a school
              announcement, achievement, event, or program, we cite the school, district, or
              organizing body. When we share advice columns or expert commentary, we identify
              the contributor and their credentials.
            </p>
          </Section>

          <Section title="Use of AI assistance">
            <p>
              We use AI tools (Claude, etc.) to help with first-draft copy on certain editorial
              formats — primarily when an interview transcript needs to be shaped into a profile.
              <strong> Every AI-assisted draft is reviewed, edited, and approved by a human editor
              before publication.</strong> No story publishes without human editorial judgment.
              We never use AI to generate quotes, fabricate details, or replace human reporting
              on a person&apos;s story.
            </p>
          </Section>

          <Section title="Diversity and representation">
            <p>
              Our coverage strives to reflect the breadth of families in {seo.areaServedLabel} —
              across race, income, religion, neighborhood, school district, family structure, and
              ability. If we&apos;re missing your community in our coverage, we want to hear about
              it. Email <a href={`mailto:${seo.contactEmail}`} className="text-primary hover:underline">{seo.contactEmail}</a>.
            </p>
          </Section>

          <Section title="Photo and image policy">
            <p>
              Photos featuring minors are published only with parent/guardian consent — collected
              at submission time. We don&apos;t publish photos that identify a minor by name without
              that consent. Stock photos are clearly marked when used. We don&apos;t alter
              photos to misrepresent what was happening.
            </p>
          </Section>

          <Section title="Reader questions and feedback">
            <p>
              We read every email, every nomination, every event submission. If you have a question
              about a story, a correction request, an idea, or a complaint, email{' '}
              <a href={`mailto:${seo.contactEmail}`} className="text-primary hover:underline">{seo.contactEmail}</a>.
              We aim to respond within two business days.
            </p>
          </Section>
        </div>

        <div className="mt-10 pt-6 border-t border-border/40">
          <Link href="/about" className="text-sm font-semibold text-primary hover:underline">← Back to About</Link>
        </div>
      </main>
      <PublicFooter />
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-xl font-bold text-foreground mb-2">{title}</h2>
      {children}
    </section>
  )
}
