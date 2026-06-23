// /birthday-party-guide/gifts/[age] — magazine-style gift guide for
// one age bucket. Anatomy (top to bottom):
//
//   Breadcrumb
//   Magazine hero (bucket color, intro, reading time)
//   2-col layout:
//     Left (8 col):
//       Featured pick (editor's pick, large card)
//       Tag filter + idea grid (mid-list pull-quote injected)
//       "Email the editor" CTA card
//     Right (4 col, sticky sidebar):
//       Email capture
//       Other ages nav
//       Sponsor slot
//       Cross-sell to vendor guide
//   Footer
//
// Monetization surfaces (3): per-card affiliate link, sponsor slot,
// email capture into the nurture funnel. Engagement levers: filter
// chips, mid-list quote, sticky sidebar, related guides.

import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Navigation } from '@/components/Navigation'
import { PublicFooter } from '@/components/PublicFooter'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { ArrowRight } from 'lucide-react'
import { bucketBySlug, featuredPick, nonFeaturedPicks, AGE_BUCKETS } from '@/lib/birthday/gift-guides'
import { GiftPageHero }     from '@/components/birthday/gifts/GiftPageHero'
import { GiftTagFilter }    from '@/components/birthday/gifts/GiftTagFilter'
import { FeaturedPickCard } from '@/components/birthday/gifts/FeaturedPickCard'
import { GiftPageSidebar }  from '@/components/birthday/gifts/GiftPageSidebar'

interface Props { params: Promise<{ age: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { age } = await params
  const bucket = bucketBySlug(age)
  if (!bucket) return { title: 'Gift Guide Not Found' }
  return {
    title:       `${bucket.ideas.length} Best Birthday Gifts for Ages ${bucket.range} (${bucket.label})`,
    description: `${bucket.intro} Editor-curated, mom-tested birthday gifts for ages ${bucket.range}.`,
    openGraph: {
      title:       `${bucket.ideas.length} Best Birthday Gifts for ${bucket.label} (Ages ${bucket.range})`,
      description: bucket.intro,
    },
  }
}

export function generateStaticParams() {
  return AGE_BUCKETS.map(b => ({ age: b.slug }))
}

export default async function GiftAgePage({ params }: Props) {
  const { age } = await params
  const bucket = bucketBySlug(age)
  if (!bucket) notFound()

  const featured = featuredPick(bucket)
  const rest     = nonFeaturedPicks(bucket)

  return (
    <div className="min-h-screen bg-[#fffaf5]">
      <Navigation />

      <div className="border-b border-border/40 bg-background">
        <div className="container py-3">
          <Breadcrumbs items={[
            { label: 'Home', href: '/' },
            { label: 'Birthday Party Guide', href: '/birthday-party-guide' },
            { label: 'Gift Guides', href: '/birthday-party-guide/gifts' },
            { label: `Ages ${bucket.range} · ${bucket.label}` },
          ]} />
        </div>
      </div>

      <GiftPageHero bucket={bucket} />

      <main className="container py-10 lg:py-14">
        <div className="grid lg:grid-cols-12 gap-10">

          {/* ── Main column ─────────────────────────────────── */}
          <div className="lg:col-span-8 space-y-10">
            {featured && (
              <FeaturedPickCard idea={featured} accent={bucket.color} />
            )}

            <GiftTagFilter
              ideas={rest}
              accent={bucket.color}
              midRowAfter={6}
              midRow={true /* GiftTagFilter renders its own pull-quote */}
            />

            {/* End-of-list editor CTA */}
            <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-6 md:p-8 text-center">
              <h2 className="text-xl font-bold text-slate-900 mb-2">
                Have a pick every {bucket.label.toLowerCase()} parent should know?
              </h2>
              <p className="text-sm text-slate-600 max-w-xl mx-auto mb-4">
                Real parent recs beat curated lists every time. Send us yours and we&apos;ll add it.
              </p>
              <a
                href={`mailto:hello@riverregionparents.com?subject=Gift%20Guide%20Idea%20-%20Ages%20${bucket.range}`}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-bold text-white rounded-lg hover:opacity-90"
                style={{ backgroundColor: bucket.color }}
              >
                Email the editor <ArrowRight size={13} />
              </a>
            </div>
          </div>

          {/* ── Sidebar ─────────────────────────────────────── */}
          <GiftPageSidebar currentSlug={bucket.slug} accent={bucket.color} />
        </div>
      </main>

      {/* Below the fold — full-width 'other ages' rail */}
      <section className="bg-white border-t border-black/5 py-12">
        <div className="container">
          <div className="flex items-baseline justify-between mb-5 flex-wrap gap-2">
            <h2 className="text-2xl font-bold text-slate-900">More birthday gift guides</h2>
            <Link href="/birthday-party-guide/gifts"
              className="text-sm font-bold text-[#ff7a59] inline-flex items-center gap-1 hover:underline">
              See all <ArrowRight size={12} />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {AGE_BUCKETS.filter(b => b.slug !== bucket.slug).map(b => (
              <Link
                key={b.slug}
                href={`/birthday-party-guide/gifts/${b.slug}`}
                className="bg-[#fffaf5] rounded-xl border border-black/5 p-4 hover:shadow-sm transition-shadow group"
              >
                <div className="text-[10px] font-black uppercase tracking-widest" style={{ color: b.color }}>
                  Ages {b.range}
                </div>
                <div className="text-[14px] font-bold text-slate-900 mt-1 group-hover:text-slate-700">{b.label}</div>
                <div className="text-[11px] text-slate-500 mt-1">{b.ideas.length} picks</div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  )
}
