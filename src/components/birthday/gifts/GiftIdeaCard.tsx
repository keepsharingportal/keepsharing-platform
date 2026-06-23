// Single gift idea card. Magazine-style with a hero image area at
// the top — either a real product photo (when idea.image is set) or
// a designed text-poster fallback using the bucket accent color.
//
// The fallback is intentional, not a missing-image apology. It uses
// the gift name in big type with subtle pattern + accent color, so
// cards without photos still look like a curated guide rather than
// "we haven't added pictures yet."

import { ExternalLink } from 'lucide-react'
import type { GiftIdea, PriceBand } from '@/lib/birthday/gift-guides'

const PRICE_LABEL: Record<PriceBand, string> = {
  '$':    'Under $25',
  '$$':   '$25 – $60',
  '$$$':  '$60 – $150',
  '$$$$': '$150+',
}

export function GiftIdeaCard({ idea, accent }: { idea: GiftIdea; accent: string }) {
  return (
    <article className="bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden flex flex-col h-full hover:shadow-md transition-shadow group">
      <CardHero idea={idea} accent={accent} />
      <div className="p-5 flex flex-col flex-1">
        <header className="flex items-start justify-between gap-3 mb-2">
          <h3 className="text-[15px] font-bold text-slate-900 leading-snug">{idea.name}</h3>
          <span
            className="shrink-0 inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded-full"
            style={{ backgroundColor: `${accent}1a`, color: accent }}
          >
            {PRICE_LABEL[idea.priceBand]}
          </span>
        </header>

        <p className="text-[13px] text-slate-600 leading-relaxed mb-4 flex-1">{idea.blurb}</p>

        {(idea.tags ?? []).length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {(idea.tags ?? []).slice(0, 4).map(t => (
              <span key={t} className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold rounded bg-slate-100 text-slate-600">
                {t}
              </span>
            ))}
          </div>
        )}

        {idea.affiliateUrl && (
          <a
            href={idea.affiliateUrl}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className="inline-flex items-center justify-center gap-1.5 mt-auto px-3 py-2 text-[12px] font-bold text-white rounded-lg hover:opacity-90 transition-opacity"
            style={{ backgroundColor: accent }}
          >
            Where to shop <ExternalLink size={11} />
          </a>
        )}
      </div>
    </article>
  )
}

// Hero block — either a real photo or a designed text poster.
function CardHero({ idea, accent }: { idea: GiftIdea; accent: string }) {
  if (idea.image) {
    return (
      <div className="aspect-[4/3] bg-slate-100 overflow-hidden relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={idea.image}
          alt={idea.name}
          className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
        />
      </div>
    )
  }
  // Designed fallback poster
  return (
    <div
      className="aspect-[4/3] relative overflow-hidden flex items-center justify-center p-5"
      style={{ background: `linear-gradient(135deg, ${accent}, ${accent}cc)` }}
    >
      <div className="absolute inset-0 opacity-20 pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(circle at 20% 30%, white 1px, transparent 1px), radial-gradient(circle at 70% 80%, white 1px, transparent 1px)', backgroundSize: '24px 24px, 32px 32px' }}
      />
      <p className="relative text-white text-center font-black leading-[1.05] text-lg sm:text-xl line-clamp-4 drop-shadow-sm">
        {idea.name}
      </p>
    </div>
  )
}
