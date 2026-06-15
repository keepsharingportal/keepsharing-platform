import Link from 'next/link'
import { Navigation } from '@/components/Navigation'
import { PublicFooter } from '@/components/PublicFooter'
import type { Metadata } from 'next'

export async function generateMetadata(): Promise<Metadata> {
  const { buildPageMetadata } = await import('@/lib/seo/metadata')
  return buildPageMetadata({
    title:       'Privacy Policy',
    description: 'How River Region Parents collects, uses, and protects personal information. Our promise on nominee contact info, newsletter data, and third-party advertising.',
    path:        '/privacy',
    type:        'website',
  })
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container py-10 md:py-16">
        <div className="max-w-2xl">
          <h1 className="text-3xl font-black text-foreground mb-2">Privacy Policy</h1>
          <p className="text-sm text-muted-foreground mb-8">Last updated: May 2026</p>

          <div className="prose prose-sm max-w-none text-foreground/85 space-y-6">
            <section>
              <h2 className="text-lg font-bold text-foreground mb-2">Information We Collect</h2>
              <p className="leading-relaxed">We collect information you provide directly to us, such as when you subscribe to our newsletter, submit a nomination, or contact us. This may include your name, email address, and any content you share with us.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-foreground mb-2">How We Use Your Information</h2>
              <p className="leading-relaxed">We use the information we collect to send you our weekly newsletter, respond to your inquiries, publish community spotlights you nominate, and improve our website and services. We do not sell your personal information to third parties.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-foreground mb-2">Cookies and Analytics</h2>
              <p className="leading-relaxed">Our website uses cookies and analytics tools (such as Google Analytics) to understand how visitors use our site. This helps us improve our content and user experience. You may disable cookies in your browser settings.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-foreground mb-2">Email Newsletter</h2>
              <p className="leading-relaxed">If you subscribe to our newsletter, you can unsubscribe at any time by clicking the unsubscribe link in any email we send, or by contacting us directly. We will not share your email address with advertisers without your permission.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-foreground mb-2">Third-Party Links</h2>
              <p className="leading-relaxed">Our website may contain links to third-party sites, including advertiser websites. We are not responsible for the privacy practices of those sites and encourage you to review their policies.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-foreground mb-2">Contact Us</h2>
              <p className="leading-relaxed">If you have questions about this privacy policy, please contact us at <a href="mailto:hello@riverregionparents.com" className="text-primary hover:text-primary/80">hello@riverregionparents.com</a>.</p>
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
