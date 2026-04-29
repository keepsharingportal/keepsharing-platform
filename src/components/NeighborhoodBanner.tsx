'use client'

import { useState, useEffect } from 'react'
import { MapPin, X, ChevronDown } from 'lucide-react'
import { NEIGHBORHOODS, NEIGHBORHOOD_STORAGE_KEY, isValidSlug, type NeighborhoodSlug } from '@/lib/neighborhood'

const ORDERED_SLUGS: NeighborhoodSlug[] = [
  'montgomery', 'prattville', 'wetumpka', 'millbrook', 'pike-road', 'eastchase',
]

export function NeighborhoodBanner() {
  const [neighborhood, setNeighborhood]   = useState<NeighborhoodSlug | null>(null)
  const [dismissed, setDismissed]         = useState(false)
  const [showPicker, setShowPicker]       = useState(false)
  const [detecting, setDetecting]         = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem(NEIGHBORHOOD_STORAGE_KEY)
    if (saved && isValidSlug(saved)) {
      setNeighborhood(saved as NeighborhoodSlug)
      return
    }
    // Auto-detect from IP
    setDetecting(true)
    fetch('/api/neighborhood/detect')
      .then(r => r.json())
      .then((data: { neighborhood: NeighborhoodSlug }) => {
        if (isValidSlug(data.neighborhood)) {
          setNeighborhood(data.neighborhood)
          // Don't save auto-detected — only save explicit user choice
        }
      })
      .catch(() => setNeighborhood('montgomery'))
      .finally(() => setDetecting(false))
  }, [])

  const choose = (slug: NeighborhoodSlug) => {
    setNeighborhood(slug)
    localStorage.setItem(NEIGHBORHOOD_STORAGE_KEY, slug)
    setShowPicker(false)
  }

  const dismiss = () => {
    setDismissed(true)
    if (neighborhood) localStorage.setItem(NEIGHBORHOOD_STORAGE_KEY, neighborhood)
  }

  if (dismissed || detecting || !neighborhood) return null

  const meta = NEIGHBORHOODS[neighborhood]

  return (
    <div className="relative z-40 bg-blue-600 text-white">
      <div className="max-w-5xl mx-auto px-4 py-2 flex items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-2 min-w-0">
          <MapPin size={14} className="shrink-0 opacity-80" />
          <span className="truncate">
            Showing content for <strong>{meta.label}</strong>
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Change area */}
          <div className="relative">
            <button
              onClick={() => setShowPicker(!showPicker)}
              className="flex items-center gap-1 text-xs underline underline-offset-2 opacity-80 hover:opacity-100"
            >
              Not you? Change area <ChevronDown size={11} className={showPicker ? 'rotate-180' : ''} />
            </button>

            {showPicker && (
              <div className="absolute right-0 top-6 bg-white rounded-xl border border-gray-200 shadow-xl overflow-hidden z-50 w-48">
                {ORDERED_SLUGS.map(slug => (
                  <button
                    key={slug}
                    onClick={() => choose(slug)}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-blue-50 ${
                      slug === neighborhood ? 'font-semibold text-blue-700 bg-blue-50' : 'text-gray-700'
                    }`}
                  >
                    {NEIGHBORHOODS[slug].label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button onClick={dismiss} className="opacity-60 hover:opacity-100 transition-opacity ml-1">
            <X size={15} />
          </button>
        </div>
      </div>
    </div>
  )
}
