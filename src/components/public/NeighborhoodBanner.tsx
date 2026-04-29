'use client'

import { useState, useEffect, useCallback } from 'react'
import { MapPin, Pencil, X, Check } from 'lucide-react'
import { NEIGHBORHOODS, NEIGHBORHOOD_SLUGS, NEIGHBORHOOD_STORAGE_KEY, type NeighborhoodSlug } from '@/lib/neighborhood'
import { cn } from '@/lib/utils'

interface Props {
  currentSlug: NeighborhoodSlug
}

export function NeighborhoodBanner({ currentSlug }: Props) {
  const [stored, setStored]       = useState<NeighborhoodSlug | null>(null)
  const [detected, setDetected]   = useState<NeighborhoodSlug | null>(null)
  const [showBanner, setShowBanner] = useState(false)
  const [showPicker, setShowPicker] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem(NEIGHBORHOOD_STORAGE_KEY) as NeighborhoodSlug | null
    setStored(saved)

    if (!saved) {
      fetch('/api/neighborhood/detect')
        .then(r => r.json())
        .then(data => {
          const n = data.neighborhood as NeighborhoodSlug
          setDetected(n)
          // Show banner only if the detected neighborhood differs from the current page
          if (n !== currentSlug) setShowBanner(true)
        })
        .catch(() => {})
    }
  }, [currentSlug])

  const save = useCallback((slug: NeighborhoodSlug) => {
    localStorage.setItem(NEIGHBORHOOD_STORAGE_KEY, slug)
    setStored(slug)
    setShowBanner(false)
    setShowPicker(false)
    if (slug !== currentSlug) {
      window.location.href = `/${slug}`
    }
  }, [currentSlug])

  const dismiss = () => {
    setDismissed(true)
    setShowBanner(false)
    // Store the current page slug as their preference
    localStorage.setItem(NEIGHBORHOOD_STORAGE_KEY, currentSlug)
  }

  const displayNeighborhood = stored ?? detected ?? currentSlug

  return (
    <>
      {/* Persistent neighborhood indicator in nav-bar area */}
      <button
        onClick={() => setShowPicker(true)}
        className="flex items-center gap-1 text-xs font-medium text-blue-700 hover:text-blue-900 transition-colors"
      >
        <MapPin size={12} />
        {NEIGHBORHOODS[displayNeighborhood]?.label ?? 'Montgomery'}
        <Pencil size={10} className="opacity-60" />
      </button>

      {/* Detection banner */}
      {showBanner && !dismissed && detected && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-blue-600 text-white px-4 py-2.5 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2 text-sm">
            <MapPin size={14} />
            <span>
              Showing content for <strong>{NEIGHBORHOODS[detected]?.label}</strong> 📍
              {detected !== currentSlug && (
                <span className="opacity-80"> — You&apos;re viewing {NEIGHBORHOODS[currentSlug]?.label}</span>
              )}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-4">
            {detected !== currentSlug && (
              <button
                onClick={() => save(detected)}
                className="flex items-center gap-1 text-xs bg-white text-blue-700 font-semibold px-2.5 py-1 rounded-full hover:bg-blue-50 transition-colors"
              >
                <Check size={11} /> Switch to {NEIGHBORHOODS[detected]?.label}
              </button>
            )}
            <button
              onClick={dismiss}
              className="text-xs underline opacity-70 hover:opacity-100"
            >
              Not you? Change
            </button>
            <button onClick={dismiss} className="opacity-60 hover:opacity-100 ml-1">
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Neighborhood picker modal */}
      {showPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowPicker(false)} />
          <div className="relative z-10 bg-white rounded-2xl shadow-2xl w-80 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-gray-900">Choose Your Area</h2>
                <p className="text-xs text-gray-500 mt-0.5">Content will be personalized for your neighborhood</p>
              </div>
              <button onClick={() => setShowPicker(false)} className="text-gray-400 hover:text-gray-700">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-1">
              {NEIGHBORHOOD_SLUGS.map(slug => {
                const n = NEIGHBORHOODS[slug]
                const isActive = (stored ?? currentSlug) === slug
                return (
                  <button
                    key={slug}
                    onClick={() => save(slug)}
                    className={cn(
                      'w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-colors',
                      isActive
                        ? 'bg-blue-50 ring-1 ring-blue-300'
                        : 'hover:bg-gray-50'
                    )}
                  >
                    <div>
                      <div className={cn('text-sm font-semibold', isActive ? 'text-blue-700' : 'text-gray-900')}>
                        {n.label}
                      </div>
                      <div className="text-xs text-gray-500">{n.schoolDistrict}</div>
                    </div>
                    {isActive && <Check size={14} className="text-blue-600 shrink-0" />}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
