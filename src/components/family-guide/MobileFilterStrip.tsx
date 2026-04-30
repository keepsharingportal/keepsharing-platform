'use client'

import { useState } from 'react'

const FILTER_PILLS = [
  { label: 'All',              value: '' },
  { label: '🏫 Schools',       value: 'schools' },
  { label: '🏥 Pediatric',     value: 'pediatric-care' },
  { label: '🧸 Childcare',     value: 'childcare-preschool' },
  { label: '⚽ Sports',         value: 'sports-recreation' },
  { label: '🎡 Activities',    value: 'family-activities' },
  { label: '🍕 Food',          value: 'food-dining' },
  { label: '🤝 Community',     value: 'community-connection' },
  { label: '💊 Healthcare',    value: 'healthcare' },
  { label: '🗺️ Day Trips',    value: 'day-trips-family-getaways' },
]

export function MobileFilterStrip() {
  const [active, setActive] = useState('')

  function handleClick(value: string) {
    setActive(value)
    if (value) {
      const el = document.getElementById(value)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      else {
        const dir = document.getElementById('directory')
        if (dir) dir.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  return (
    <div style={{
      backgroundColor: 'white',
      borderBottom: '1px solid rgba(0,0,0,0.07)',
      padding: '0 16px',
      display: 'flex',
      gap: 8,
      overflowX: 'auto',
      scrollbarWidth: 'none',
      height: 46,
      alignItems: 'center',
    }}
    className="md:hidden"
    /* Hide scrollbar in webkit */
    >
      <style>{`.mfs::-webkit-scrollbar { display: none; }`}</style>
      {FILTER_PILLS.map(({ label, value }) => {
        const on = active === value
        return (
          <button
            key={value}
            onClick={() => handleClick(value)}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '6px 13px',
              borderRadius: 20,
              fontSize: 12, fontWeight: 600,
              whiteSpace: 'nowrap',
              flexShrink: 0,
              cursor: 'pointer',
              border: on ? 'none' : '1.5px solid rgba(0,0,0,0.08)',
              backgroundColor: on ? 'var(--fg-navy, #1a2744)' : 'white',
              color: on ? 'white' : 'var(--fg-mid, #666)',
              transition: 'all 0.15s',
            }}>
            {label}
          </button>
        )
      })}
    </div>
  )
}
