// /birthday-party-guide/gifts — hub for the gift-guides-by-age set.
// Magazine-style layout matching the per-age pages: hero, primary
// age cards, featured pick gallery, then sponsor + email capture.

import type { Metadata } from 'next'
import Link from 'next/link'
import { Navigation } from '@/components/Navigation'
import { PublicFooter } from '@/components/PublicFooter'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { Gift, ArrowRight, Star, MapPin, Mail } from 'lucide-react'
import { AGE_BUCKETS, featuredPick } from '@/lib/birthday/gift-guides'

export const metadata: Metadata = {
  title:       'Birthday Gift Guides by Age | River Region Parents',
  description: '75 editor-curated birthday gifts — toddler through tween. Real toys kids use, not just unwrap.',
}

export default function GiftsHubPage() {
  const total = AGE_BUCKETS.reduce((s, b) => s + b.ideas.length, 0)

  return (
    <div className="min-h-screen bg-[#fffaf5]">
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

      {/* Hero */}
      <header className="bg-gradient-to-br from-[#fff0eb] via-white to-white">
        <div className="container py-14 md:py-20">
          <div className="max-w-3xl">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#ff7a59] mb-3 inline-flex items-center gap-1.5">
              <Gift size={12} /> Birthday Gift Guides
            </p>
            <h1 className="text-4xl md:text-6xl font-black text-slate-900 leading-[1.05] mb-4">
              {total} gifts River Region parents stand behind.
            </h1>
            <p className="text-lg md:text-xl text-slate-600 leading-relaxed">
              Five age buckets, fifteen picks each. Editor-curated — no sponsored placement, no algorithm. Toys kids re-open six months later, books they ask for at bedtime, experiences that beat a wrapped box.
            </p>
          </div>
        </div>
      </header>

      <main className="container py-12 lg:py-16 space-y-16">

        {/* Primary age cards */}
        <section>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {AGE_BUCKETS.map(b => (
              <Link
                key={b.slug}
                href={`/birthday-party-guide/gifts/${b.slug}`}
                className="bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden hover:shadow-md transition-shadow group flex flex-col"
              >
                <div
                  className="aspect-[4/3] flex items-center justify-center relative overflow-hidden"
                  style={{ background: `linear-gradient(135deg, ${b.color}26, ${b.color}14)` }}
                >
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform"
                    style={{ backgroundColor: b.color }}
                  >
                    <Gift size={28} className="text-white" />
                  </div>
                  <div
                    className="absolute top-3 left-3 inline-flex items-center px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-white rounded"
                    style={{ backgroundColor: b.color }}
                  >
                    Ages {b.range}
                  </div>
                </div>
                <div className="p-4 flex-1 flex flex-col">
                  <h3 className="text-[16px] font-bold text-slate-900 leading-tight">{b.label}</h3>
                  <p className="text-[12px] text-slate-600 mt-1.5 leading-snug flex-1">{b.pitch}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      {b.ideas.length} picks
                    </span>
                    <span className="text-[12px] font-bold inline-flex items-center gap-0.5 group-hover:gap-1.5 transition-all" style={{ color: b.color }}>
                      Read <ArrowRight size={11} />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Featured pick gallery — one editor's pick per age */}
        <section>
          <div className="flex items-baseline gap-2 mb-5">
            <Star size={16} className="text-[#ff7a59] fill-[#ff7a59]" />
            <h2 className="text-2xl font-bold text-slate-900">Editor&apos;s picks by age</h2>
          </div>
          <p className="text-sm text-slate-600 max-w-2xl mb-6">
            If you only get one gift per age bucket, get one of these.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {AGE_BUCKETS.map(b => {
              const pick = featuredPick(b)
              if (!pick) return null
              return (
                <Link
                  key={b.slug}
                  href={`/birthday-party-guide/gifts/${b.slug}`}
                  className="bg-white rounded-xl border border-black/5 shadow-sm p-4 hover:shadow-md transition-shadow flex flex-col"
                >
                  <div className="flex items-center gap-1.5 mb-2">
                    <span
                      className="inline-flex items-center px-1.5 py-0.5 text-[9px] font-black uppercase tracking-widest text-white rounded"
                      style={{ backgroundColor: b.color }}
                    >
                      Ages {b.range}
                    </span>
                  </div>
                  <h3 className="text-[14px] font-bold text-slate-900 leading-tight">{pick.name}</h3>
                  <p className="text-[11px] text-slate-600 mt-1 leading-snug flex-1 line-clamp-3">{pick.blurb}</p>
                </Link>
              )
            })}
          </div>
        </section>

        {/* Combined sponsor + email row */}
        <section className="grid md:grid-cols-2 gap-4">
          <SponsorPitch />
          <EmailPitch />
        </section>

        {/* Cross-sell to vendor guide */}
        <section className="rounded-3xl p-8 md:p-10 text-white relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #1e293b, #0f172a)' }}
        >
          <div className="absolute -right-10 -bottom-10 w-64 h-64 rounded-full bg-[#ff7a59]/20" />
          <div className="relative max-w-2xl">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/70 mb-2">Throwing the party?</p>
            <h2 className="text-3xl md:text-4xl font-black leading-tight mb-3">
              Find a venue, cake, or entertainer in the River Region.
            </h2>
            <p className="text-base text-white/85 leading-relaxed mb-5">
              The full birthday vendor guide — categorized, filterable, and updated annually. Featured partners + free directory listings, all in one place.
            </p>
            <Link
              href="/birthday-party-guide"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-bold text-slate-900 bg-white rounded-lg hover:bg-white/95"
            >
              Open the Birthday Guide <ArrowRight size={13} />
            </Link>
          </div>
        </section>

      </main>

      <PublicFooter />
    </div>
  )
}

function SponsorPitch() {
  return (
    <Link
      href="/advertise/get-listed"
      className="block rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/50 p-6 hover:border-[#ff7a59]/40 hover:bg-[#ff7a59]/5 transition-colors group"
    >
      <div className="flex items-center gap-2 mb-2">
        <MapPin size={14} className="text-slate-400" />
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Local spotlight</p>
      </div>
      <h3 className="text-lg font-bold text-slate-900 leading-tight mb-1">
        Your toy store, gift shop, or kids&apos; boutique featured here.
      </h3>
      <p className="text-sm text-slate-600 leading-snug mb-3">
        Parents browse this page year-round looking for birthday gifts. Get in front of them with an editor-managed sponsor card.
      </p>
      <span className="text-[12px] font-bold text-[#ff7a59] inline-flex items-center gap-0.5 group-hover:gap-1.5 transition-all">
        See sponsorship options <ArrowRight size={11} />
      </span>
    </Link>
  )
}

function EmailPitch() {
  return (
    <div className="rounded-2xl p-6 bg-gradient-to-br from-[#ff7a59]/10 to-[#ff7a59]/5 border border-[#ff7a59]/20">
      <div className="flex items-center gap-2 mb-2">
        <Mail size={14} className="text-[#ff7a59]" />
        <p className="text-[10px] font-black uppercase tracking-widest text-[#ff7a59]">Stay in the loop</p>
      </div>
      <h3 className="text-lg font-bold text-slate-900 leading-tight mb-1">
        Birthday Insider — the local-mom version of a gift guide newsletter.
      </h3>
      <p className="text-sm text-slate-600 leading-snug mb-3">
        Seasonal gift refreshes, party-planning tips, local birthday deals — once a month, never spammy.
      </p>
      <Link
        href="/birthday-party-guide#timeline"
        className="text-[12px] font-bold text-[#ff7a59] inline-flex items-center gap-0.5 hover:gap-1.5 transition-all"
      >
        Subscribe (free) <ArrowRight size={11} />
      </Link>
    </div>
  )
}
