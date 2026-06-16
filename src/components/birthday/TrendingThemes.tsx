// Trending Themes — 6-9 cards with age range pills, filter by indoor/outdoor.
// Defaults render when DB is empty so the section never blanks.

'use client'

import { useState } from 'react'
import { SectionHeader } from './BudgetTiers'

const DEFAULT_THEMES = [
  { name: 'Dinosaur Dig',     blurb: 'Fossils, footprints, and roaring fun.',           min_age: 3, max_age: 7,  is_indoor: true,  is_outdoor: true,  image_url: '/images/birthday/themes/dinosaur.jpg' },
  { name: 'Glow in the Dark', blurb: 'Neon colors, blacklights, and dance parties.',     min_age: 8, max_age: 13, is_indoor: true,  is_outdoor: false, image_url: '/images/birthday/themes/glow.jpg' },
  { name: 'Princess Tea Party', blurb: 'Tiaras, finger sandwiches, and royal guests.',  min_age: 3, max_age: 8,  is_indoor: true,  is_outdoor: false, image_url: '/images/birthday/themes/princess.jpg' },
  { name: 'Backyard Olympics', blurb: 'Obstacle courses, medals, and team games.',      min_age: 5, max_age: 12, is_indoor: false, is_outdoor: true,  image_url: '/images/birthday/themes/olympics.jpg' },
  { name: 'Slime Lab',         blurb: 'Mad-scientist mixing station + take-home jar.',  min_age: 6, max_age: 11, is_indoor: true,  is_outdoor: true,  image_url: '/images/birthday/themes/slime.jpg' },
  { name: 'Backyard Camp Out', blurb: 'Tents, s\'mores, glow sticks, flashlight tag.',  min_age: 5, max_age: 12, is_indoor: false, is_outdoor: true,  image_url: '/images/birthday/themes/campout.jpg' },
  { name: 'Spa Day',           blurb: 'Manis, facials, and floral crowns.',             min_age: 7, max_age: 13, is_indoor: true,  is_outdoor: false, image_url: '/images/birthday/themes/spa.jpg' },
  { name: 'Superhero HQ',      blurb: 'Capes, missions, and a villain to defeat.',      min_age: 4, max_age: 9,  is_indoor: true,  is_outdoor: true,  image_url: '/images/birthday/themes/superhero.jpg' },
  { name: 'Art Studio',        blurb: 'Canvases, paint, and a take-home masterpiece.',  min_age: 5, max_age: 12, is_indoor: true,  is_outdoor: false, image_url: '/images/birthday/themes/art.jpg' },
]

type Filter = 'all' | 'indoor' | 'outdoor' | 'toddler' | 'big-kid'

interface Theme {
  name: string
  blurb: string
  min_age: number
  max_age: number
  is_indoor: boolean
  is_outdoor: boolean
  image_url: string | null
}

export function TrendingThemes({ themes }: { themes: Array<Record<string, unknown>> }) {
  const [filter, setFilter] = useState<Filter>('all')

  const useThemes: Theme[] = themes.length > 0
    ? themes.map(t => ({
        name:       t.name as string,
        blurb:      t.blurb as string,
        min_age:    (t.min_age as number) ?? 2,
        max_age:    (t.max_age as number) ?? 14,
        is_indoor:  (t.is_indoor as boolean) ?? true,
        is_outdoor: (t.is_outdoor as boolean) ?? true,
        image_url:  (t.image_url as string | null) ?? null,
      }))
    : DEFAULT_THEMES

  const filtered = useThemes.filter(t => {
    if (filter === 'all') return true
    if (filter === 'indoor')   return t.is_indoor
    if (filter === 'outdoor')  return t.is_outdoor
    if (filter === 'toddler')  return t.min_age <= 4
    if (filter === 'big-kid')  return t.max_age >= 9
    return true
  })

  return (
    <div>
      <SectionHeader
        eyebrow="Themes"
        title="Trending birthday themes"
        kicker="Browse 9 themes River Region moms are using right now. Filter by what works for your kid."
      />
      <div className="flex items-center gap-1.5 flex-wrap mb-4">
        {([
          { v: 'all',     l: 'All themes' },
          { v: 'indoor',  l: 'Indoor' },
          { v: 'outdoor', l: 'Outdoor' },
          { v: 'toddler', l: 'Toddlers (2-4)' },
          { v: 'big-kid', l: 'Big kids (9+)' },
        ] as Array<{ v: Filter; l: string }>).map(opt => (
          <button
            key={opt.v} type="button" onClick={() => setFilter(opt.v)}
            className={`px-3 py-1.5 text-[11px] font-bold rounded-full border transition-colors ${
              filter === opt.v ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400'
            }`}
          >{opt.l}</button>
        ))}
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(t => (
          <div key={t.name} className="group bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
            <div className="aspect-[4/3] bg-gradient-to-br from-[#fff0eb] via-[#ffe6dd] to-[#ffd9cc] relative overflow-hidden">
              {t.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={t.image_url} alt={t.name} className="w-full h-full object-cover" />
              )}
              <div className="absolute top-2 right-2 flex items-center gap-1">
                {t.is_indoor && <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-white/90 text-slate-700 rounded">Indoor</span>}
                {t.is_outdoor && <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-white/90 text-slate-700 rounded">Outdoor</span>}
              </div>
            </div>
            <div className="p-4">
              <h3 className="text-[15px] font-bold text-slate-900 group-hover:text-[#ff7a59] transition-colors">{t.name}</h3>
              <p className="text-[12px] text-slate-600 mt-1 leading-snug">{t.blurb}</p>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mt-2">
                Ages {t.min_age}–{t.max_age}
              </div>
            </div>
          </div>
        ))}
      </div>
      {filtered.length === 0 && (
        <div className="text-center text-slate-500 text-[13px] py-6">No themes match those filters yet.</div>
      )}
    </div>
  )
}
