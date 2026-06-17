// ── /birthday-party-guide/deals — Birthday Deals page ────────────
//
// Recurring revenue product. Advertisers buy a deal slot; their offer
// shows here + as a sidebar card on the main portal. Cron auto-hides
// expired deals (valid_until < now).

import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { ArrowLeft, Tag, Star, ExternalLink, Clock, ArrowRight } from 'lucide-react'

export const revalidate = 600

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

export const metadata: Metadata = {
  title: 'Birthday Deals — The Big Birthday Bash | River Region Parents',
  description: 'Exclusive birthday party deals from River Region vendors — venues, cakes, entertainment, rentals. Limited-time offers, updated weekly.',
}

interface Deal {
  id:           string
  business_name: string
  category:     string
  headline:     string
  offer:        string
  redeem_how:   string | null
  promo_code:   string | null
  image_url:    string | null
  link_url:     string | null
  valid_from:   string | null
  valid_until:  string | null
  is_featured:  boolean
}

const CATEGORY_LABEL: Record<string, string> = {
  venue:         'Venues',
  cake:          'Cakes & treats',
  entertainment: 'Entertainment',
  rental:        'Rentals',
  printables:    'Printables',
  gifts:         'Gifts',
  other:         'Other',
}

export default async function BirthdayDealsPage() {
  const supabase = sb()
  const nowIso = new Date().toISOString()
  const { data } = await supabase
    .from('birthday_deals')
    .select('*')
    .eq('is_active', true)
    .or(`valid_until.is.null,valid_until.gte.${nowIso.slice(0, 10)}`)
    .order('is_featured', { ascending: false })
    .order('display_order', { ascending: true })
    .limit(60)

  const deals = (data ?? []) as Deal[]
  const featured = deals.filter(d => d.is_featured)
  const regular  = deals.filter(d => !d.is_featured)

  const byCat = new Map<string, Deal[]>()
  for (const d of regular) {
    if (!byCat.has(d.category)) byCat.set(d.category, [])
    byCat.get(d.category)!.push(d)
  }

  return (
    <main className="bg-[#fffaf5] min-h-screen">

      <div className="bg-gradient-to-br from-amber-500 to-orange-500 text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
          <Link href="/birthday-party-guide" className="text-[12px] font-semibold text-white/80 hover:text-white inline-flex items-center gap-1 mb-3">
            <ArrowLeft size={11} /> The Big Birthday Bash
          </Link>
          <div className="flex items-center gap-2">
            <Tag size={22} />
            <h1 className="text-3xl sm:text-4xl font-black">Birthday Deals</h1>
          </div>
          <p className="text-[14px] sm:text-base text-white/95 mt-3 max-w-2xl leading-relaxed">
            Exclusive offers from local birthday vendors. Mention River Region Parents when you book.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">

        {deals.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {/* Featured deals */}
            {featured.length > 0 && (
              <section className="mb-10">
                <h2 className="text-[18px] font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <Star size={16} className="text-amber-500" /> Featured deals
                </h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  {featured.map(d => <DealCard key={d.id} deal={d} featured />)}
                </div>
              </section>
            )}

            {/* By category */}
            {Array.from(byCat.entries()).map(([cat, items]) => (
              <section key={cat} className="mb-8">
                <h2 className="text-[16px] font-bold text-slate-900 mb-3">{CATEGORY_LABEL[cat] ?? cat}</h2>
                <div className="grid sm:grid-cols-2 gap-3">
                  {items.map(d => <DealCard key={d.id} deal={d} />)}
                </div>
              </section>
            ))}
          </>
        )}

        {/* Sponsor CTA */}
        <div className="mt-12 bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-6 sm:p-8">
          <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-300 mb-2">For local businesses</div>
          <h3 className="text-2xl font-bold">Run your birthday deal in front of every planning mom</h3>
          <p className="text-[13px] text-slate-300 mt-2 max-w-2xl leading-relaxed">
            Birthday Deal slots are part of every sponsorship package. 2-6 slots per year depending on tier — your offer + your link + your code, in front of moms who are actively comparing vendors.
          </p>
          <Link
            href="/birthday-party-guide/sponsor"
            className="mt-5 inline-flex items-center gap-1.5 px-5 py-2.5 text-[13px] font-bold text-slate-900 bg-amber-300 rounded-lg hover:bg-amber-200"
          >
            See sponsorship packages <ArrowRight size={12} />
          </Link>
        </div>

      </div>
    </main>
  )
}

function DealCard({ deal, featured }: { deal: Deal; featured?: boolean }) {
  const validUntil = deal.valid_until ? new Date(deal.valid_until + 'T23:59:59') : null
  return (
    <div className={`bg-white rounded-2xl border ${featured ? 'border-amber-300 ring-2 ring-amber-100' : 'border-black/5'} shadow-sm overflow-hidden`}>
      {deal.image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={deal.image_url} alt="" className="w-full aspect-[16/10] object-cover bg-slate-100" />
      )}
      <div className="p-4">
        <div className="text-[10px] font-bold uppercase tracking-wider text-amber-700">{deal.business_name}</div>
        <h3 className="text-[16px] font-bold text-slate-900 mt-1 leading-snug">{deal.headline}</h3>
        <p className="text-[13px] text-slate-700 mt-2 leading-relaxed">{deal.offer}</p>

        {(deal.redeem_how || deal.promo_code) && (
          <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-600 space-y-0.5">
            {deal.redeem_how && <div><strong className="text-slate-900">How:</strong> {deal.redeem_how}</div>}
            {deal.promo_code && (
              <div>
                <strong className="text-slate-900">Code:</strong>{' '}
                <code className="bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded font-mono text-amber-800">{deal.promo_code}</code>
              </div>
            )}
          </div>
        )}

        <div className="mt-3 flex items-center justify-between flex-wrap gap-2">
          {validUntil && (
            <div className="text-[10px] text-slate-500 inline-flex items-center gap-1">
              <Clock size={10} /> Through {validUntil.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </div>
          )}
          {deal.link_url && (
            <a
              href={deal.link_url}
              target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-3 py-1.5 text-[12px] font-bold text-white bg-[#ff7a59] rounded hover:opacity-90"
            >
              Redeem <ExternalLink size={10} />
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-10 text-center">
      <Tag size={32} className="text-slate-300 mx-auto mb-3" />
      <h3 className="text-[16px] font-bold text-slate-900">Deals are coming</h3>
      <p className="text-[13px] text-slate-600 mt-1 max-w-md mx-auto">
        We&apos;re bringing on the first wave of vendor partners now. Your favorite local business should be running a deal here — tell them so.
      </p>
    </div>
  )
}
