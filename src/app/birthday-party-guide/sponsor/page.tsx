// ── /birthday-party-guide/sponsor — Sponsor Packages page ────────
//
// The sales tool. What you send/show a prospective advertiser to
// pitch the Birthday Bash sponsorship instead of (or alongside) the
// July print ad. Three tiers, escalating value, all annual.
//
// Pricing here is launch pricing — editor can override per-deal in
// conversation. The page renders the EXPERIENCE the advertiser is
// buying (placement screenshots / verbal description) so they see
// real value, not abstract bullet points.

import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, Check, X, Crown, Sparkles, Star, ArrowRight } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Sponsor the Big Birthday Bash — River Region Parents',
  description: 'Reach River Region moms while they\'re actively planning a birthday. Annual sponsorship packages with print, portal, and Birthday Club email touchpoints.',
}
export const revalidate = 3600

const TIERS = [
  {
    key:       'featured',
    icon:      Star,
    name:      'Featured Birthday Partner',
    tagline:   'Stand out in the directory',
    price:     '$995/year',
    monthly:   '~$83/mo',
    color:     '#84cc16',
    pitch:     'Your business at the top of its category, with a dedicated profile page and a 12-month listing — for less than half the cost of one quarter-page print ad.',
    includes: [
      'Featured placement at the top of your category page (Cakes, Entertainers, etc.)',
      'Custom business profile page with packages, hours, gallery, FAQ',
      'Listed in 2 Birthday Deal slots/year (your offer at /deals)',
      'Mention in 2 issues of the Birthday Insider newsletter',
      'Live link from the July magazine print ad to your profile',
      'Quarterly view + click report',
    ],
    excludes: [
      'Logo on portal home page',
      'Category exclusivity',
      'Presenting sponsor placement',
    ],
    cta:       'Pitch perfect for individual cake artists, entertainers, single-location venues.',
  },
  {
    key:       'sponsored-category',
    icon:      Sparkles,
    name:      'Sponsored Category',
    tagline:   'Own a category for a year',
    price:     '$2,495/year',
    monthly:   '~$208/mo',
    color:     '#f59e0b',
    popular:   true,
    pitch:     'You become the sponsor of an entire category — Cakes, Venues, Entertainers, etc. Your logo on the category header. Your business listed first. Competitors can still appear, but you own the page.',
    includes: [
      'Your logo + 60-word pitch at the top of the category page',
      'Featured placement #1 in the category directory',
      'Custom business profile page',
      'Listed in 4 Birthday Deal slots/year',
      'Mention in every Birthday Insider newsletter (12/year)',
      'Birthday Club email sponsor for 1 issue/year',
      'Quarter-page print ad in the July Big Birthday Issue',
      'Monthly view + click report',
      'Right of first refusal on renewal',
    ],
    excludes: [
      'Top-of-home logo placement (Presenting Sponsor only)',
    ],
    cta:       'Best for businesses competing in a single category — cake bakeries, party rental companies, gym/dance studios.',
  },
  {
    key:       'presenting',
    icon:      Crown,
    name:      'Presenting Sponsor',
    tagline:   'Own the whole portal',
    price:     '$5,995/year',
    monthly:   '~$500/mo',
    color:     '#ff7a59',
    pitch:     'Be the brand every River Region mom sees while planning her kid\'s birthday. One slot per year, period. The "Brought to you by" position at the top of every page.',
    includes: [
      '"Brought to you by [you]" header on every Birthday Bash page',
      'Sidebar sponsor card on the portal home (sitewide on RRP birthday content)',
      'Logo on the July Big Birthday Issue print cover',
      'Half-page print ad in the July magazine',
      'Custom business profile page',
      'Sponsor banner on /finder, /deals, /checklists pages',
      'Listed in 6 Birthday Deal slots/year',
      'Birthday Club email co-branding (12 issues, "Presented by" tag)',
      'Featured in 4 social posts on RRP\'s Facebook + Instagram',
      'Monthly performance report + quarterly editor sync',
      'First refusal on renewal — 2-year option locks rate',
    ],
    excludes: [],
    cta:       'For businesses going all-in on birthday-active families — Skyzone, Newtopia, large venue brands.',
  },
]

const COMPARE_ROWS: Array<{ feature: string; standard: string | boolean; featured: string | boolean; sponsoredCategory: string | boolean; presenting: string | boolean }> = [
  { feature: 'Listing in the directory',                       standard: true,             featured: true,        sponsoredCategory: true,            presenting: true },
  { feature: 'Custom business profile page',                  standard: false,            featured: true,        sponsoredCategory: true,            presenting: true },
  { feature: 'Featured at top of category page',              standard: false,            featured: true,        sponsoredCategory: true,            presenting: true },
  { feature: 'Logo on category header',                        standard: false,            featured: false,       sponsoredCategory: true,            presenting: true },
  { feature: 'Logo on portal home (sidebar)',                 standard: false,            featured: false,       sponsoredCategory: false,           presenting: true },
  { feature: 'Logo on every portal page (header)',            standard: false,            featured: false,       sponsoredCategory: false,           presenting: true },
  { feature: 'Birthday Deal slots / year',                    standard: '0',              featured: '2',         sponsoredCategory: '4',             presenting: '6' },
  { feature: 'Birthday Insider newsletter mentions / year',   standard: '0',              featured: '2',         sponsoredCategory: '12',            presenting: '12' },
  { feature: 'Birthday Club email sponsorship',               standard: false,            featured: false,       sponsoredCategory: '1 issue',       presenting: '12 issues' },
  { feature: 'July print issue placement',                    standard: 'Optional add-on', featured: 'Optional', sponsoredCategory: '1/4 page',      presenting: '1/2 page + cover logo' },
  { feature: 'Social media posts / year',                     standard: '0',              featured: '0',         sponsoredCategory: '0',             presenting: '4' },
  { feature: 'Performance reports',                            standard: 'Annual',         featured: 'Quarterly', sponsoredCategory: 'Monthly',       presenting: 'Monthly + sync' },
  { feature: 'Renewal pricing lock',                          standard: false,            featured: false,       sponsoredCategory: 'Right of refusal', presenting: '2-year lock available' },
]

export default function SponsorPackagesPage() {
  return (
    <main className="bg-[#fffaf5] min-h-screen">

      {/* Hero */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
          <Link href="/birthday-party-guide" className="text-[12px] font-semibold text-slate-300 hover:text-white inline-flex items-center gap-1 mb-4">
            <ArrowLeft size={12} /> Birthday Bash
          </Link>
          <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#ff7a59] mb-3">For local businesses</div>
          <h1 className="text-4xl sm:text-5xl font-black leading-[1.05]">
            Sponsor the <span className="text-[#ff7a59]">Big Birthday Bash</span>
          </h1>
          <p className="text-[15px] sm:text-base text-slate-300 mt-4 max-w-3xl leading-relaxed">
            River Region moms plan ~8,000 kids&apos; birthdays a year. They visit this portal when they&apos;re actively
            comparing venues, cakes, entertainers, and party rentals — credit card in hand. Sponsor it and
            you&apos;re part of every decision.
          </p>

          {/* Quick stats */}
          <div className="mt-7 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat n="80%" label="of RRP traffic is mobile (planning on phones)" />
            <Stat n="89" label="vendors already in the directory" />
            <Stat n="12 mo." label="year-round portal — not just July" />
            <Stat n="3" label="sellable packages, escalating ROI" />
          </div>
        </div>
      </div>

      {/* Tier cards */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <div className="text-center mb-8">
          <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#ff7a59] mb-1.5">Packages</div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900">Pick where you want to show up</h2>
          <p className="text-[13px] text-slate-600 mt-2 max-w-2xl mx-auto">All annual. All include print + portal + email touchpoints. Cancel or upgrade anytime.</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-5">
          {TIERS.map(tier => {
            const Icon = tier.icon
            return (
              <div key={tier.key}
                className={`bg-white rounded-2xl border-2 shadow-sm overflow-hidden flex flex-col ${tier.popular ? 'border-[#f59e0b] relative' : 'border-black/5'}`}
              >
                {tier.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white bg-[#f59e0b] rounded-full whitespace-nowrap shadow-lg">
                    ⭐ Most popular
                  </div>
                )}
                <div className="px-5 py-4 text-white" style={{ background: `linear-gradient(135deg, ${tier.color}, ${shade(tier.color)})` }}>
                  <Icon size={22} />
                  <div className="text-[18px] font-bold mt-2">{tier.name}</div>
                  <div className="text-[12px] opacity-95 mt-0.5">{tier.tagline}</div>
                  <div className="mt-3 flex items-baseline gap-1.5">
                    <div className="text-2xl font-black">{tier.price}</div>
                    <div className="text-[11px] opacity-90">({tier.monthly})</div>
                  </div>
                </div>
                <div className="p-5 flex-1 flex flex-col">
                  <p className="text-[13px] text-slate-700 leading-relaxed mb-4">{tier.pitch}</p>

                  <div className="space-y-2 mb-4">
                    {tier.includes.map(item => (
                      <div key={item} className="flex items-start gap-2">
                        <Check size={13} className="text-emerald-600 shrink-0 mt-0.5" />
                        <span className="text-[12px] text-slate-700 leading-snug">{item}</span>
                      </div>
                    ))}
                    {tier.excludes.map(item => (
                      <div key={item} className="flex items-start gap-2">
                        <X size={13} className="text-slate-300 shrink-0 mt-0.5" />
                        <span className="text-[12px] text-slate-400 leading-snug line-through">{item}</span>
                      </div>
                    ))}
                  </div>

                  <p className="text-[11px] italic text-slate-500 mb-4 leading-snug">{tier.cta}</p>

                  <a
                    href={`mailto:advertise@riverregionparents.com?subject=${encodeURIComponent('Birthday Bash sponsorship — ' + tier.name)}&body=${encodeURIComponent(`Hi RRP team,\n\nI'm interested in the ${tier.name} package. My business is:\n\nName:\nCategory:\nWebsite:\n\nPlease send me the proposal.\n\nThanks!`)}`}
                    className="mt-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-[13px] font-bold text-white rounded-lg hover:opacity-90"
                    style={{ background: tier.color }}
                  >
                    Get the proposal <ArrowRight size={12} />
                  </a>
                </div>
              </div>
            )
          })}
        </div>

        {/* Comparison table */}
        <div className="mt-12">
          <h3 className="text-[16px] font-bold text-slate-900 mb-4">Side-by-side comparison</h3>
          <div className="bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-[12px] min-w-[700px]">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr className="text-left">
                    <th className="px-4 py-3 font-bold text-slate-700">Feature</th>
                    <th className="px-3 py-3 font-bold text-slate-700 text-center w-24">Standard listing</th>
                    <th className="px-3 py-3 font-bold text-slate-700 text-center w-28">Featured Partner</th>
                    <th className="px-3 py-3 font-bold text-slate-700 text-center w-28">Sponsored Category</th>
                    <th className="px-3 py-3 font-bold text-slate-700 text-center w-28">Presenting Sponsor</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARE_ROWS.map((row, i) => (
                    <tr key={i} className="border-b border-slate-50 last:border-0">
                      <td className="px-4 py-2 text-slate-700">{row.feature}</td>
                      <Cell v={row.standard} />
                      <Cell v={row.featured} />
                      <Cell v={row.sponsoredCategory} />
                      <Cell v={row.presenting} />
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-3">Pricing is launch rate, subject to change. Custom packages available — talk to us.</p>
        </div>

        {/* Why now */}
        <div className="mt-12 bg-gradient-to-br from-[#fff0eb] to-[#ffe6dd] rounded-2xl p-6 sm:p-8">
          <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#ff7a59] mb-2">Why book before July</div>
          <h3 className="text-2xl font-bold text-slate-900">The July Big Birthday Issue lands soon</h3>
          <p className="text-[13px] text-slate-700 mt-2 max-w-2xl leading-relaxed">
            The annual print issue drives a wave of traffic to this portal. Every page view in July is a parent
            actively planning. Lock your sponsorship before the issue prints and you&apos;re positioned in front of
            the entire ad cycle — not catching up after.
          </p>
          <div className="mt-5 flex items-center gap-3 flex-wrap">
            <a
              href="mailto:advertise@riverregionparents.com?subject=Birthday%20Bash%20sponsorship"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 text-[13px] font-bold text-white bg-slate-900 rounded-lg hover:opacity-90"
            >
              Book a call
            </a>
            <Link
              href="/birthday-party-guide"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 text-[13px] font-bold text-slate-900 bg-white border-2 border-slate-900 rounded-lg hover:bg-slate-50"
            >
              See the portal in action →
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}

function Stat({ n, label }: { n: string; label: string }) {
  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10">
      <div className="text-2xl font-black text-white">{n}</div>
      <div className="text-[10px] uppercase tracking-wider text-slate-300 mt-0.5 leading-tight">{label}</div>
    </div>
  )
}

function Cell({ v }: { v: string | boolean }) {
  if (v === true) return <td className="px-3 py-2 text-center"><Check size={14} className="inline text-emerald-600" /></td>
  if (v === false) return <td className="px-3 py-2 text-center"><X size={14} className="inline text-slate-300" /></td>
  return <td className="px-3 py-2 text-center text-slate-700 text-[11px]">{v}</td>
}

function shade(hex: string): string {
  const n = parseInt(hex.slice(1), 16)
  const r = Math.max(0, Math.floor(((n >> 16) & 0xff) * 0.8))
  const g = Math.max(0, Math.floor(((n >> 8)  & 0xff) * 0.8))
  const b = Math.max(0, Math.floor( (n        & 0xff) * 0.8))
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}
