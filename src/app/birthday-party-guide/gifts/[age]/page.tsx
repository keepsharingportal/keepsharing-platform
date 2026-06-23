// /birthday-party-guide/gifts/[age] — 15 curated gift ideas for one
// age bucket. Hero strip uses the bucket's color; each idea renders
// as a card with name + blurb + price band + tags.

import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Navigation } from '@/components/Navigation'
import { PublicFooter } from '@/components/PublicFooter'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { ArrowLeft, Gift, MapPin, ArrowRight } from 'lucide-react'
import { bucketBySlug, AGE_BUCKETS, type GiftIdea } from '@/lib/birthday/gift-guides'

interface Props { params: Promise<{ age: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { age } = await params
  const bucket = bucketBySlug(age)
  if (!bucket) return { title: 'Gift Guide Not Found' }
  return {
    title:       `Birthday Gifts for Ages ${bucket.range} (${bucket.label}) | River Region Parents`,
    description: bucket.intro,
  }
}

export function generateStaticParams() {
  return AGE_BUCKETS.map(b => ({ age: b.slug }))
}

const PRICE_LABEL: Record<string, string> = {
  '$':    'Under $25',
  '$$':   '$25 – $60',
  '$$$':  '$60 – $150',
  '$$$$': '$150+',
}

export default async function GiftAgePage({ params }: Props) {
  const { age } = await params
  const bucket = bucketBySlug(age)
  if (!bucket) notFound()

  const others = AGE_BUCKETS.filter(b => b.slug !== bucket.slug)

  return (
    <div className="min-h-screen bg-background">
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

      <header
        className="relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${bucket.color}1a, ${bucket.color}33)` }}
      >
        <div className="container py-12 md:py-14">
          <Link href="/birthday-party-guide/gifts"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-slate-900 mb-3">
            <ArrowLeft size={12} /> All gift guides
          </Link>
          <div className="flex items-start gap-4 flex-wrap">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: bucket.color }}
            >
              <Gift size={30} className="text-white" />
            </div>
            <div className="flex-1 min-w-[260px]">
              <p className="text-[11px] font-bold uppercase tracking-widest mb-1" style={{ color: bucket.color }}>
                Ages {bucket.range} · {bucket.ideas.length} picks
              </p>
              <h1 className="text-3xl md:text-4xl font-black text-slate-900 leading-tight">
                {bucket.label} birthday gifts
              </h1>
              <p className="text-sm md:text-base text-slate-700 mt-2 max-w-2xl leading-relaxed">
                {bucket.intro}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container py-10 lg:py-14 space-y-12">
        <section>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {bucket.ideas.map((idea, i) => (
              <IdeaCard key={i} idea={idea} accent={bucket.color} />
            ))}
          </div>
        </section>

        {/* Browse other ages */}
        <section className="pt-8 border-t border-border/40">
          <h2 className="text-lg font-bold text-foreground mb-3">Other ages</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {others.map(b => (
              <Link
                key={b.slug}
                href={`/birthday-party-guide/gifts/${b.slug}`}
                className="bg-white rounded-xl border border-black/5 shadow-sm p-4 flex items-center gap-3 hover:shadow-md transition-shadow"
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: b.color }}
                >
                  <Gift size={16} className="text-white" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: b.color }}>
                    Ages {b.range}
                  </div>
                  <div className="text-[13px] font-bold text-slate-900 truncate">{b.label}</div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-black/5 shadow-sm p-6 md:p-8 text-center">
          <h3 className="text-xl font-bold text-slate-900 mb-2">Have an idea every {bucket.label.toLowerCase()} parent should know?</h3>
          <p className="text-sm text-slate-600 max-w-xl mx-auto mb-4">
            Real parents&apos; picks beat curated lists every time. Send us yours and we&apos;ll add it.
          </p>
          <a href={`mailto:hello@riverregionparents.com?subject=Gift%20Guide%20Idea%20-%20Ages%20${bucket.range}`}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-bold text-white bg-[#ff7a59] rounded-lg hover:opacity-90">
            Email the editor <ArrowRight size={12} />
          </a>
        </section>
      </main>

      <PublicFooter />
    </div>
  )
}

function IdeaCard({ idea, accent }: { idea: GiftIdea; accent: string }) {
  return (
    <article className="bg-white rounded-2xl border border-black/5 shadow-sm p-5 flex flex-col">
      <header className="flex items-start justify-between gap-3 mb-2">
        <h3 className="text-[15px] font-bold text-slate-900 leading-snug">{idea.name}</h3>
        <span className="shrink-0 inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-100 text-slate-700">
          {PRICE_LABEL[idea.priceBand] ?? idea.priceBand}
        </span>
      </header>
      <p className="text-[13px] text-slate-600 leading-relaxed mb-3 flex-1">{idea.blurb}</p>
      <div className="flex flex-wrap items-center gap-1.5 mt-auto">
        {idea.where && (
          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 text-[10px] font-bold rounded-full"
            style={{ backgroundColor: `${accent}1a`, color: accent }}>
            <MapPin size={9} /> {idea.where}
          </span>
        )}
        {(idea.tags ?? []).slice(0, 3).map(t => (
          <span key={t} className="inline-flex items-center px-2 py-0.5 text-[10px] font-semibold rounded-full bg-slate-100 text-slate-600">
            {t}
          </span>
        ))}
      </div>
    </article>
  )
}
