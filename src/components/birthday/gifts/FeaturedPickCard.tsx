// FeaturedPickCard — the "if you only get one thing" hero card.
// Larger, with an editor's note + accent border + bigger CTA. Sits
// at the top of the per-age guide so the most-recommended pick gets
// dominant visual weight.

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
          <Star size={11} className="fill-current" /> Editor's pick
        </span>
      </div>

      <div className="grid md:grid-cols-[1fr,1.4fr]">
        {/* Accent panel */}
        <div
          className="hidden md:flex relative items-center justify-center p-8"
          style={{ background: `linear-gradient(135deg, ${accent}, ${accent}cc)` }}
        >
          <Quote size={140} className="text-white/15" />
          <div className="absolute inset-0 flex items-center justify-center p-10 text-center">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/85 mb-2">If you only get one</p>
              <p className="text-white text-xl font-black leading-tight">{idea.name}</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 md:p-8 flex flex-col gap-4">
          {/* Mobile-only title (the accent panel hides at < md) */}
          <div className="md:hidden">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] mb-1" style={{ color: accent }}>
              If you only get one
            </p>
            <h2 className="text-2xl font-black text-slate-900 leading-tight">{idea.name}</h2>
          </div>
          <div className="hidden md:block">
            <h2 className="text-3xl font-black text-slate-900 leading-tight">{idea.name}</h2>
          </div>

          <div className="flex items-center gap-2">
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
                Editor's note
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
