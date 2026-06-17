// Sticky horizontal jump-nav. Mobile-critical — without this, mobile
// users abandon at ~30% of the page. Scrolls horizontally on small
// screens; centered on desktop. Smooth-scroll to in-page anchors.
'use client'

import { useEffect, useState } from 'react'

const JUMPS = [
  { id: 'this-month', label: 'This Month' },
  { id: 'buzz',       label: 'Buzz' },
  { id: 'timeline',   label: 'Plan It' },
  { id: 'budget',     label: 'By Budget' },
  { id: 'themes',     label: 'Themes' },
  { id: 'vendors',    label: 'Vendors' },
  { id: 'real-parties', label: 'Real Parties' },
  { id: 'articles',   label: 'Articles' },
  { id: 'freebies',   label: 'Freebies' },
  { id: 'printables', label: 'Printables' },
  { id: 'tips',       label: 'Mom Tips' },
]

export function BirthdayJumpNav() {
  const [activeId, setActiveId] = useState<string | null>(null)

  useEffect(() => {
    // Highlight the section closest to the top of the viewport.
    const obs = new IntersectionObserver(
      entries => {
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible[0]) setActiveId(visible[0].target.id)
      },
      { rootMargin: '-100px 0px -60% 0px', threshold: 0 },
    )
    for (const j of JUMPS) {
      const el = document.getElementById(j.id)
      if (el) obs.observe(el)
    }
    return () => obs.disconnect()
  }, [])

  return (
    <nav className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-black/5 shadow-sm">
      <div className="max-w-7xl mx-auto px-2 sm:px-6">
        <div className="flex items-center gap-1 overflow-x-auto py-2 scrollbar-thin">
          {JUMPS.map(j => (
            <a
              key={j.id}
              href={`#${j.id}`}
              onClick={(e) => {
                e.preventDefault()
                const el = document.getElementById(j.id)
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }}
              className={`shrink-0 px-3 py-1.5 rounded-full text-[12px] font-bold transition-colors ${
                activeId === j.id
                  ? 'bg-[#ff7a59] text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {j.label}
            </a>
          ))}
        </div>
      </div>
    </nav>
  )
}
