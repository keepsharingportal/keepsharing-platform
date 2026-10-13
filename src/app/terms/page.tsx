import Link from 'next/link'
import { loadBrandContext } from '@/lib/brand-context'
import { chromeForBrand } from '@/lib/brands'
import { Navigation } from '@/components/Navigation'
import { PublicFooter } from '@/components/PublicFooter'
import type { Metadata } from 'next'

export async function generateMetadata(): Promise<Metadata> {
  const { market } = await loadBrandContext()
  const brandName    = market.displayName
  const { buildPageMetadata } = await import('@/lib/seo/metadata')
  return buildPageMetadata({
    title:       'Terms of Service',
    description: `Terms and conditions for using ${brandName} — submissions, contributor guidelines, advertising, and acceptable use.`,
    path:        '/terms',
    type:        'website',
  })
}

export default async function TermsPage() {
  const { market, brand, publicOrigin } = await loadBrandContext()
  const brandName    = market.displayName
  const host         = (publicOrigin || `https://${market.publicHost}`).replace(/^https?:\/\//, '')
  // Null for a brand whose address is not set yet — omit the sentence rather
  // than print another brand's inbox.
  const contactEmail = chromeForBrand(brand).contactEmail
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container py-10 md:py-16">
        <div className="max-w-2xl">
          <h1 className="text-3xl font-black text-foreground mb-2">Terms of Service</h1>
          <p className="text-sm text-muted-foreground mb-8">Last updated: May 2026</p>

          <div className="prose prose-sm max-w-none text-foreground/85 space-y-6">
            <section>
              <h2 className="text-lg font-bold text-foreground mb-2">Acceptance of Terms</h2>
              <p className="leading-relaxed">By accessing and using {brandName} ({host}), you accept and agree to be bound by these terms. If you do not agree to these terms, please do not use our website.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-foreground mb-2">Content</h2>
              <p className="leading-relaxed">All content published on {brandName}, including articles, guides, event listings, and community spotlights, is the property of KeepSharing LLC or its contributors. You may share links to our content but may not reproduce it in full without permission.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-foreground mb-2">User Submissions</h2>
              <p className="leading-relaxed">When you submit an event, nomination, or other content to {brandName}, you grant us a non-exclusive license to publish, edit, and distribute that content. You represent that you have the right to submit the content and that it does not violate any third-party rights.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-foreground mb-2">Advertiser Relationships</h2>
              <p className="leading-relaxed">{brandName} may include sponsored content and advertisements. Sponsored content is clearly labeled. We are not responsible for the products, services, or claims of third-party advertisers.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-foreground mb-2">Disclaimer</h2>
              <p className="leading-relaxed">The information on this website is provided for general informational purposes. {brandName} makes no warranties about the accuracy or completeness of this information. Always consult appropriate professionals for advice specific to your situation.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-foreground mb-2">Contact</h2>
              <p className="leading-relaxed">Questions about these terms? {contactEmail ? <>Contact us at <a href={`mailto:${contactEmail}`} className="text-primary hover:text-primary/80">{contactEmail}</a>.</> : <>Contact us through the form on our site.</>}</p>
            </section>
          </div>

          <div className="mt-10 pt-6 border-t border-border/40">
            <Link href="/" className="text-sm font-semibold text-primary hover:text-primary/80 transition-colors">← Back to Home</Link>
          </div>
        </div>
      </main>
      <PublicFooter />
    </div>
  )
}
