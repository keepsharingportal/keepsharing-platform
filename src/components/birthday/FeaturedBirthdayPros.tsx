// Featured Birthday Pros — magazine-style spotlight section.
//
// Layout: 1 hero + 4 supporting cards, all visible at once (no rotation).
// The most recently posted vendor_spotlight is the hero; the next 4 fill
// the supporting grid. Editor controls who's in the hero slot by setting
// posted_at (most recent wins) or by archiving older entries.
//
// On mobile every spotlight stacks full-width — each gets its own scroll
// moment instead of being crammed into a 2x2 grid. That's how premium
// editorial stays premium on small screens.
//
// Click anywhere → vendor profile page (the conversion experience).

import Link from 'next/link'
import { SectionHeader } from './BudgetTiers'
import { Star, ArrowRight } from 'lucide-react'

interface Spotlight {
  id:           string
  body:         string
  from_name:    string | null
  image_url:    string | null
  vendor_id:    string | null
  vendor_name:  string | null
  vendor_slug:  string | null
  link_url:     string | null
}

export function FeaturedBirthdayPros({ items }: { items: Array<Record<string, unknown>> }) {
  const list: Spotlight[] = items.map(b => ({
    id:          b.id          as string,
    body:        b.body        as string,
    from_name:   b.from_name   as string | null,
    image_url:   b.image_url   as string | null,
    vendor_id:   b.vendor_id   as string | null,
    vendor_name: b.vendor_name as string | null,
    vendor_slug: b.vendor_slug as string | null,
    link_url:    b.link_url    as string | null,
  }))

  if (list.length === 0) return null

  const hero       = list[0]
  const supporting = list.slice(1, 5) // up to 4 supporting

  return (
    <div>
      <SectionHeader
        eyebrow="Featured this month"
        title="Featured Birthday Pros"
        kicker="Hand-picked local vendors our editors trust. Five spots, refreshed monthly. Each one is editorially endorsed — we&apos;ve seen their work."
      />

      <HeroSpotlight spot={hero} />

      {supporting.length > 0 && (
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {supporting.map(s => <SupportingCard key={s.id} spot={s} />)}
        </div>
      )}
    </div>
  )
}

function hrefFor(spot: Spotlight): string | null {
  if (spot.vendor_slug) return `/birthday-party-guide/business/${spot.vendor_slug}`
  if (spot.link_url)    return spot.link_url
  return null
}

function splitHeadlineFromBody(body: string): { headline: string; story: string; quote: string | null } {
  // Extract a mom quote if the editor wrapped one in straight or curly quotes.
  // Pattern: "...quote text..." — Mom Name OR just at the end with "
  const quoteMatch = body.match(/[“"]([^”"]{20,200})[”"]\s*(?:—\s*[\w'.\- ]+)?/)
  const quote      = quoteMatch ? quoteMatch[1] : null
  const cleaned    = quote ? body.replace(quoteMatch![0], '').trim() : body
  const sentences  = cleaned.match(/[^.!?]+[.!?]+/g) ?? [cleaned]
  const headline   = sentences[0]?.trim() ?? cleaned
  const story      = sentences.slice(1).join(' ').trim()
  return { headline, story, quote }
}

function HeroSpotlight({ spot }: { spot: Spotlight }) {
  const href = hrefFor(spot)
  const { headline, story, quote } = splitHeadlineFromBody(spot.body)
  const Inner = (
    <div className="bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden group">
      <div className="grid lg:grid-cols-5">
        {/* Image */}
        <div className="lg:col-span-3 aspect-[16/10] lg:aspect-auto bg-slate-100 relative overflow-hidden">
          {spot.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={spot.image_url} alt={spot.vendor_name ?? ''} className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-700" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#fff0eb] via-[#ffe6dd] to-[#ffd9cc]" />
          )}
          <div className="absolute top-3 left-3">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-white bg-[#ff7a59] rounded-full shadow-md">
              <Star size={10} /> Editor&apos;s pick · This month
            </span>
          </div>
        </div>

        {/* Copy */}
        <div className="lg:col-span-2 p-5 sm:p-6 lg:p-8 flex flex-col justify-center">
          {spot.vendor_name && (
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 mb-2">
              {spot.vendor_name}
            </div>
          )}
          <h3 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 leading-[1.15]">
            {headline}
          </h3>
          {story && (
            <p className="text-[13px] sm:text-base text-slate-600 mt-3 leading-relaxed">{story}</p>
          )}
          {quote && (
            <blockquote className="mt-4 pl-3 border-l-2 border-[#ff7a59] text-[13px] italic text-slate-700 leading-relaxed">
              &ldquo;{quote}&rdquo;
              {spot.from_name && <div className="not-italic text-[11px] text-slate-500 mt-1">— {spot.from_name}</div>}
            </blockquote>
          )}
          {href && (
            <div className="mt-5">
              <span className="inline-flex items-center gap-1.5 px-5 py-2.5 text-[13px] font-bold text-white bg-[#ff7a59] rounded-lg group-hover:opacity-90">
                See their work <ArrowRight size={12} />
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
  return href
    ? (href.startsWith('/')
        ? <Link href={href} className="block">{Inner}</Link>
        : <a href={href} target="_blank" rel="noopener noreferrer" className="block">{Inner}</a>)
    : <div>{Inner}</div>
}

function SupportingCard({ spot }: { spot: Spotlight }) {
  const href     = hrefFor(spot)
  const { headline } = splitHeadlineFromBody(spot.body)
  const Inner = (
    <div className="bg-white rounded-xl border border-black/5 shadow-sm overflow-hidden h-full flex flex-col group">
      <div className="aspect-[3/2] bg-slate-100 overflow-hidden relative">
        {spot.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={spot.image_url} alt={spot.vendor_name ?? ''} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#fff0eb] to-[#ffd9cc]" />
        )}
        <div className="absolute top-2 left-2">
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white bg-[#ff7a59] rounded-full shadow-sm">
            <Star size={8} /> Featured
          </span>
        </div>
      </div>
      <div className="p-3 flex-1 flex flex-col">
        {spot.vendor_name && (
          <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
            {spot.vendor_name}
          </div>
        )}
        <h4 className="text-[14px] font-bold text-slate-900 leading-snug mt-0.5 line-clamp-3 group-hover:text-[#ff7a59] transition-colors">
          {headline}
        </h4>
      </div>
    </div>
  )
  return href
    ? (href.startsWith('/')
        ? <Link href={href} className="block h-full">{Inner}</Link>
        : <a href={href} target="_blank" rel="noopener noreferrer" className="block h-full">{Inner}</a>)
    : <div className="h-full">{Inner}</div>
}
