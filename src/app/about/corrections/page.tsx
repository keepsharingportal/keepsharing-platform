// ── /about/corrections ─────────────────────────────────────────────────────
//
// Corrections policy. Required for trustworthy local-news ranking +
// referenced from NewsMediaOrganization as correctionsPolicy /
// actionableFeedbackPolicy.

import type { Metadata } from 'next'
import Link from 'next/link'
import { Navigation } from '@/components/Navigation'
import { PublicFooter } from '@/components/PublicFooter'
import { loadBrandContext } from '@/lib/brand-context'
import { getBrandSeoConfig } from '@/lib/seo/brand-seo'

export async function generateMetadata(): Promise<Metadata> {
  const { buildPageMetadata } = await import('@/lib/seo/metadata')
  return buildPageMetadata({
    title:       'Corrections Policy',
    description: 'If we got something wrong, here\'s how we fix it. Our corrections process, retraction policy, and how to report an error.',
    path:        '/about/corrections',
    type:        'website',
  })
}

export default async function CorrectionsPage() {
  const ctx = await loadBrandContext()
  const seo = getBrandSeoConfig(ctx.market, ctx.publicOrigin)

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container py-10 md:py-16 max-w-3xl">
        <p className="text-xs font-semibold text-muted-foreground mb-2">
          <Link href="/about" className="hover:text-foreground">About</Link> · Corrections Policy
        </p>
        <h1 className="text-3xl md:text-4xl font-black text-foreground leading-tight mb-2">Corrections Policy</h1>
        <p className="text-sm text-muted-foreground mb-10">Last updated: November 2025</p>

        <div className="prose prose-sm max-w-none text-foreground/85 space-y-7">

          <section>
            <p className="text-lg leading-relaxed">
              We try to get every detail right. When we don&apos;t, we fix it openly. This page
              explains how we handle corrections, retractions, and reader feedback at
              {' '}{seo.organizationName}.
            </p>
          </section>

          <Section title="Report an error">
            <p>
              If you see a factual error in any of our stories — a wrong name, date, school,
              quote, or detail — please email{' '}
              <a href={`mailto:${seo.contactEmail}?subject=Correction%20request`} className="text-primary hover:underline">
                {seo.contactEmail}
              </a>
              {' '}with the URL of the story and what needs to be corrected. Include your name
              if you&apos;re willing — we may follow up to verify, but we don&apos;t require
              identification to consider a correction.
            </p>
            <p>
              We aim to confirm or correct any factual error within <strong>two business days</strong>.
              Urgent corrections (anything affecting a child&apos;s safety, a school&apos;s
              reputation, or a business&apos;s standing) are handled same-day whenever possible.
            </p>
          </Section>

          <Section title="What we correct">
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Factual errors</strong> — names, dates, places, numbers, titles, attributions, quotes</li>
              <li><strong>Significant misrepresentations</strong> — characterizations of a person, business, or event that aren&apos;t accurate</li>
              <li><strong>Photo errors</strong> — wrong subjects, misidentified locations, miscredited photographers</li>
              <li><strong>Outdated information</strong> — when a story includes details that have materially changed since publication and would mislead a reader today</li>
            </ul>
            <p>
              Editorial judgment calls (story framing, what was included or left out, what we
              chose to feature) are not corrections — they&apos;re editorial decisions. We&apos;re
              happy to discuss them, but we don&apos;t alter published stories to reflect a
              different editorial point of view after the fact.
            </p>
          </Section>

          <Section title="How we correct">
            <p>
              For minor errors (typo, wrong date, misspelled name), we fix the story inline and
              add a small <em>Correction</em> note at the bottom of the article noting what
              changed and when.
            </p>
            <p>
              For significant errors (an incorrect fact that changes the meaning of the story, a
              misattributed quote, a wrong person identified), we add a clear <strong>Correction</strong>
              {' '}box at the top of the story explaining what was wrong, what&apos;s been corrected,
              and when. The original incorrect text is replaced; the correction box stays
              permanently so future readers see the correction history.
            </p>
            <p>
              For very rare cases where a story has a fundamental factual error that can&apos;t
              be fixed by editing (e.g. the story was about the wrong person entirely), we may
              <strong> retract</strong> the story. Retracted stories show a Retraction notice in
              place of the original content, explaining what happened.
            </p>
          </Section>

          <Section title="If you were nominated and want changes">
            <p>
              If you were featured in a Mom to Mom, Teacher of the Month, Play Ball, Student
              Spotlight, Grands Are the Greatest, or other community feature and want a factual
              detail changed, email{' '}
              <a href={`mailto:${seo.contactEmail}?subject=Feature%20update`} className="text-primary hover:underline">
                {seo.contactEmail}
              </a>. We&apos;re especially responsive to subjects of features who want a fact
              corrected — you know your own story better than we do.
            </p>
          </Section>

          <Section title="Removal requests">
            <p>
              We don&apos;t remove accurate, fairly-reported stories on request — even when the
              subject later wishes the story hadn&apos;t been published. That&apos;s the nature
              of an editorial record.
            </p>
            <p>
              <strong>Exception</strong>: stories involving minors, or stories where staying
              public would create a credible safety concern for a subject, can be removed at our
              editorial discretion. Email the address above with details.
            </p>
          </Section>

          <Section title="Feedback we welcome">
            <p>
              Even when there&apos;s no factual error, reader feedback matters. If a story landed
              wrong, missed important context, or could have been done better — tell us. Email{' '}
              <a href={`mailto:${seo.contactEmail}`} className="text-primary hover:underline">{seo.contactEmail}</a>.
              We won&apos;t always agree, but we do read every note.
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
