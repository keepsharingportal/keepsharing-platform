// Plan by Budget — three tier cards (Backyard / Sweet Spot /
// Showstopper). The differentiator that no other regional guide does.
// Editor manages tiers + picks at /admin/birthday/budget-tiers; when
// no tiers are set we render default copy so the page never looks empty.

import { DollarSign, Users, ArrowRight } from 'lucide-react'

const DEFAULTS = [
  {
    tier_key:      'backyard',
    name:          'The Backyard Birthday',
    price_ceiling: 150,
    guest_count:   '8-10 kids',
    pitch:         'You + your backyard + a few smart picks. Stress-free, budget-light, surprisingly memorable.',
    picks: [
      { role: 'Venue',     note: 'Your backyard, a local park, or a community center room' },
      { role: 'Cake',      note: 'Cakeology custom cake (~$45) or DIY Pillsbury' },
      { role: 'Decor',     note: 'Party City basics + a balloon arch DIY ($35)' },
      { role: 'Activity',  note: 'Scavenger hunt + lawn games (free, just print)' },
      { role: 'Goody bags', note: 'One nicer take-home gift (sticker book or small toy)' },
    ],
    accent: '#84cc16',
  },
  {
    tier_key:      'sweet-spot',
    name:          'The Sweet Spot',
    price_ceiling: 400,
    guest_count:   '10-12 kids',
    pitch:         'The plan most River Region moms land on. Real venue, custom cake, one big activity. Hosted but not exhausting.',
    picks: [
      { role: 'Venue',     note: 'Snapology, BAMA Lanes, Family Karate Center, or Newtopia' },
      { role: 'Cake',      note: 'Bruster\'s ice cream cake or GiGi\'s Cupcakes' },
      { role: 'Decor',     note: 'Theme-matched balloons + table covers ($40)' },
      { role: 'Activity',  note: 'Venue includes — gymnastics, bowling, escape room, etc.' },
      { role: 'Goody bags', note: 'Themed party favors from Party City ($25 total)' },
    ],
    accent: '#f59e0b',
  },
  {
    tier_key:      'showstopper',
    name:          'The Showstopper',
    price_ceiling: 1000,
    guest_count:   '15+ kids',
    pitch:         'When you want the photos AND the bragging rights. Premium venue, custom everything, an entertainer. The full bash.',
    picks: [
      { role: 'Venue',     note: 'Skyzone, Launch Trampoline Park, Fun City Adventure Park' },
      { role: 'Cake',      note: 'Custom Cakeology or JoZettie\'s cake + cupcakes' },
      { role: 'Decor',     note: 'Arrow Rents or Brendle full theme package' },
      { role: 'Entertainer', note: 'Dynamite Magic, Pretty & Pampered Spa Bus, or Big Green Bus' },
      { role: 'Goody bags', note: 'Personalized goody bags + take-home gift' },
    ],
    accent: '#ff7a59',
  },
]

interface Tier {
  tier_key:     string
  name:         string
  price_ceiling: number
  guest_count:  string
  pitch:        string
  picks:        Array<{ role: string; note: string; vendor_id?: string }>
  hero_image_url?: string | null
}

export function BudgetTiers({ tiers }: { tiers: Array<Record<string, unknown>> }) {
  const useTiers: Tier[] = tiers.length > 0
    ? tiers.map(t => ({
        tier_key:      t.tier_key as string,
        name:          t.name as string,
        price_ceiling: t.price_ceiling as number,
        guest_count:   t.guest_count as string,
        pitch:         t.pitch as string,
        picks:         (t.picks as Tier['picks']) ?? [],
        hero_image_url: (t.hero_image_url as string | null) ?? null,
      }))
    : DEFAULTS

  return (
    <div>
      <SectionHeader
        eyebrow="The differentiator"
        title="Plan by your budget"
        kicker="No more wondering what $150 actually buys you. Real local picks for three real budgets."
      />
      <div className="grid lg:grid-cols-3 gap-4">
        {useTiers.map((tier, i) => {
          const accent = (tier as { accent?: string }).accent ?? DEFAULTS[i]?.accent ?? '#ff7a59'
          return (
            <div key={tier.tier_key} className="bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden flex flex-col">
              <div className="px-5 py-4 text-white" style={{ background: `linear-gradient(135deg, ${accent}, ${shade(accent)})` }}>
                <div className="text-[10px] font-bold uppercase tracking-[0.15em] opacity-90">{tier.tier_key === 'backyard' ? 'Budget-smart' : tier.tier_key === 'sweet-spot' ? 'Most popular' : 'All-out'}</div>
                <h3 className="text-[18px] font-bold mt-1 leading-tight">{tier.name}</h3>
                <div className="flex items-center gap-3 text-[12px] mt-2 opacity-95">
                  <span className="inline-flex items-center gap-1"><DollarSign size={11} />Up to ${tier.price_ceiling}</span>
                  <span className="opacity-50">•</span>
                  <span className="inline-flex items-center gap-1"><Users size={11} />{tier.guest_count}</span>
                </div>
              </div>
              <div className="p-5 flex-1 flex flex-col">
                <p className="text-[13px] text-slate-700 leading-relaxed mb-4">{tier.pitch}</p>
                <div className="space-y-2 mb-4">
                  {tier.picks.map((pick, j) => (
                    <div key={j} className="flex items-start gap-2">
                      <span className="shrink-0 text-[10px] font-bold uppercase text-slate-500 tracking-wider w-16 pt-0.5">{pick.role}</span>
                      <span className="text-[12px] text-slate-800 leading-snug flex-1">{pick.note}</span>
                    </div>
                  ))}
                </div>
                <a
                  href="#vendors"
                  className="mt-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 text-[12px] font-bold border-2 rounded-lg hover:bg-slate-50 transition-colors"
                  style={{ color: accent, borderColor: accent }}
                >
                  Browse {tier.name.replace(/^The /, '').toLowerCase()} vendors
                  <ArrowRight size={11} />
                </a>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function shade(hex: string): string {
  // Quick + dirty 20% darker. For the gradient end-stop.
  const n = parseInt(hex.slice(1), 16)
  const r = Math.max(0, Math.floor(((n >> 16) & 0xff) * 0.8))
  const g = Math.max(0, Math.floor(((n >> 8)  & 0xff) * 0.8))
  const b = Math.max(0, Math.floor( (n        & 0xff) * 0.8))
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

export function SectionHeader({ eyebrow, title, kicker }: { eyebrow: string; title: string; kicker?: string }) {
  return (
    <div className="mb-5">
      <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#ff7a59] mb-1.5">{eyebrow}</div>
      <h2 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight">{title}</h2>
      {kicker && <p className="text-[13px] text-slate-600 mt-2 max-w-2xl">{kicker}</p>}
    </div>
  )
}
