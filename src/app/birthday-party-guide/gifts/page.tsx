// /birthday-party-guide/gifts — hub for the gift-guides-by-age set.
// Lands all 5 age cards with their counts and pitches; each card
// opens /gifts/[age] with the full 15-idea list.

import type { Metadata } from 'next'
import Link from 'next/link'
import { Navigation } from '@/components/Navigation'
import { PublicFooter } from '@/components/PublicFooter'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { Gift, ArrowRight } from 'lucide-react'
import { AGE_BUCKETS } from '@/lib/birthday/gift-guides'

export const metadata: Metadata = {
  title:       'Birthday Gift Guides by Age | River Region Parents',
  description: '15 gifts per age bucket — toddler through tween — picked by River Region moms. Real toys kids use, not just unwrap.',
}

export default function GiftsHubPage() {
  const total = AGE_BUCKETS.reduce((s, b) => s + b.ideas.length, 0)

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="border-b border-border/40 bg-background">
        <div className="container py-3">
          <Breadcrumbs items={[
            { label: 'Home', href: '/' },
            { label: 'Birthday Party Guide', href: '/birthday-party-guide' },
            { label: 'Gift Guides' },
          ]} />
        </div>
      </div>

      <header className="bg-gradient-to-br from-[#fff0eb] via-white to-white">
        <div className="container py-12 md:py-16 text-center">
          <div className="text-[11px] font-bold uppercase tracking-widest text-[#ff7a59] mb-3 inline-flex items-center gap-1.5">
            <Gift size={12} /> Birthday Gift Guides
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-slate-900 leading-tight mb-3">
            {total} gifts River Region moms swear by
          </h1>
          <p className="text-base md:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Five age buckets, fifteen picks each. Toys kids actually use, books they re-read, and experiences that beat a wrapped box. Pick the age, browse the list.
          </p>
        </div>
      </header>

      <main className="container py-10 lg:py-14 space-y-10">
        <section>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {AGE_BUCKETS.map(b => (
              <Link
                key={b.slug}
                href={`/birthday-party-guide/gifts/${b.slug}`}
                className="bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden hover:shadow-md transition-shadow group"
              >
                <div
                  className="aspect-square flex items-center justify-center"
                  style={{ background: `linear-gradient(135deg, ${b.color}1a, ${b.color}33)` }}
                >
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center"
                    style={{ backgroundColor: b.color }}
                  >
                    <Gift size={30} className="text-white" />
                  </div>
                </div>
                <div className="p-4">
                  <div className="text-[11px] font-bold uppercase tracking-wider" style={{ color: b.color }}>
                    Ages {b.range}
                  </div>
                  <div className="text-[16px] font-bold text-slate-900 mt-0.5">{b.label}</div>
                  <p className="text-[12px] text-slate-600 mt-1 leading-snug">{b.pitch}</p>
                  <div className="text-[11px] font-bold text-[#ff7a59] mt-3 inline-flex items-center gap-1 group-hover:gap-1.5 transition-all">
                    {b.ideas.length} picks <ArrowRight size={11} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-black/5 shadow-sm p-6 md:p-8 text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Have a gift idea every parent should know?</h2>
          <p className="text-sm text-slate-600 max-w-xl mx-auto mb-5">
            Real parents&apos; picks beat curated lists every time. Send us yours and we&apos;ll add it to the right age guide.
          </p>
          <a href="mailto:hello@riverregionparents.com?subject=Gift%20Guide%20Idea"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-bold text-white bg-[#ff7a59] rounded-lg hover:opacity-90">
            Email the editor
          </a>
        </section>
      </main>

      <PublicFooter />
    </div>
  )
}
