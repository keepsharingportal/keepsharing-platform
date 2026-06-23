// Single gift idea card. Magazine-style — accent bar at top, name +
// price band, blurb, tags, "Where to shop" button when affiliate URL
// is set (revenue surface). Cards without affiliates render the same
// minus the CTA, so the page stays consistent before/after editor
// adds affiliate links.

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
    <article className="bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden flex flex-col h-full hover:shadow-md transition-shadow">
      <div className="h-1" style={{ backgroundColor: accent }} />
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
