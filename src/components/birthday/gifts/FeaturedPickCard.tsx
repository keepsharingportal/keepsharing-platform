// FeaturedPickCard — "if you only get one thing" hero card.
// 2-column layout: image/poster on the left, content on the right.
// When idea.image is set the left renders the real photo; otherwise
// it renders a designed poster with the gift name as type.

import { Star, ExternalLink, Quote } from 'lucide-react'
import type { GiftIdea, PriceBand } from '@/lib/birthday/gift-guides'

const PRICE_LABEL: Record<PriceBand, string> = {
  '$':    'Under $25',
  '$$':   '$25 – $60',
  '$$$':  '$60 – $150',
  '$$$$': '$150+',
}

export function FeaturedPickCard({ idea, accent }: { idea: GiftIdea; accent: string }) {
  return (
    <article
      className="relative overflow-hidden rounded-3xl border-2 bg-white shadow-lg"
      style={{ borderColor: accent }}
    >
      <div className="absolute top-4 right-4 z-10">
        <span
          className="inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white rounded-full shadow-sm"
          style={{ backgroundColor: accent }}
        >
          <Star size={11} className="fill-current" /> Editor&apos;s pick
        </span>
      </div>

      <div className="grid md:grid-cols-[1fr,1.4fr]">
        <FeaturedHero idea={idea} accent={accent} />

        {/* Body */}
        <div className="p-6 md:p-8 flex flex-col gap-4">
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 leading-tight">{idea.name}</h2>

          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="inline-flex items-center px-2.5 py-1 text-[11px] font-bold rounded-full"
              style={{ backgroundColor: `${accent}1a`, color: accent }}
            >
              {PRICE_LABEL[idea.priceBand]}
            </span>
            {(idea.tags ?? []).slice(0, 3).map(t => (
              <span key={t} className="inline-flex items-center px-2 py-0.5 text-[10px] font-semibold rounded-full bg-slate-100 text-slate-600">
                {t}
              </span>
            ))}
          </div>

          <p className="text-[15px] text-slate-700 leading-relaxed">{idea.blurb}</p>

          {idea.editorNote && (
            <blockquote
              className="border-l-4 pl-4 py-1 text-[14px] italic text-slate-700 leading-relaxed"
              style={{ borderColor: accent }}
            >
              <span className="not-italic text-[10px] font-black uppercase tracking-widest block mb-1" style={{ color: accent }}>
                Editor&apos;s note
              </span>
              {idea.editorNote}
            </blockquote>
          )}

          {idea.affiliateUrl ? (
            <a
              href={idea.affiliateUrl}
              target="_blank"
              rel="noopener noreferrer sponsored"
              className="self-start inline-flex items-center gap-1.5 px-5 py-2.5 text-[14px] font-bold text-white rounded-lg hover:opacity-90 transition-opacity mt-2"
              style={{ backgroundColor: accent }}
            >
              Where to shop <ExternalLink size={13} />
            </a>
          ) : (
            <p className="text-[11px] text-slate-500 italic mt-2">
              Available at most major toy retailers + Amazon.
            </p>
          )}
        </div>
      </div>
    </article>
  )
}

function FeaturedHero({ idea, accent }: { idea: GiftIdea; accent: string }) {
  if (idea.image) {
    return (
      <div className="relative aspect-[4/3] md:aspect-auto md:min-h-[320px] overflow-hidden bg-slate-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={idea.image} alt={idea.name} className="w-full h-full object-cover" />
      </div>
    )
  }
  // Designed poster fallback — larger version of GiftIdeaCard's
  return (
    <div
      className="hidden md:flex relative items-center justify-center p-8 overflow-hidden"
      style={{ background: `linear-gradient(135deg, ${accent}, ${accent}cc)` }}
    >
      <div className="absolute inset-0 opacity-20 pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(circle at 20% 30%, white 1px, transparent 1px), radial-gradient(circle at 70% 80%, white 1px, transparent 1px)', backgroundSize: '28px 28px, 36px 36px' }}
      />
      <Quote size={120} className="absolute top-4 left-4 text-white/10" />
      <div className="relative text-center">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/85 mb-2">If you only get one</p>
        <p className="text-white text-2xl font-black leading-tight">{idea.name}</p>
      </div>
    </div>
  )
}
