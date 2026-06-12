'use client'

// Article edit page widget for 50+ brands: "Feature on home page slider"
// checkbox. Auto-fetches the article's current slot, renders the toggle,
// and POSTs/DELETEs against /api/admin/hero-slots when the editor flips it.
//
// Visible only when the article's brand belongs to the fifty-plus family.
// If all 3 slots are full when the editor tries to add, we surface a
// replacement prompt (the API returns 409 slot_occupied) instead of
// silently bumping a slot.

import { useEffect, useState } from 'react'
import { MARKETS } from '@/lib/markets'

interface Props {
  articleId: string
  brandSlug: string
}

interface HeroSlot {
  slot_number: number
  article: { id: string; title: string } | null
}

const SLOTS = [2, 3, 4] as const

export function FeatureInHeroToggle({ articleId, brandSlug }: Props) {
  const family = MARKETS.find(m => m.slug === brandSlug)?.family
  const isFiftyPlus = family === 'fifty-plus'

  const [slots,     setSlots]     = useState<HeroSlot[]>([])
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const [confirmingReplace, setConfirmingReplace] = useState<HeroSlot | null>(null)

  // Skip data fetch entirely for non-fifty-plus brands.
  useEffect(() => {
    if (!isFiftyPlus) return
    let cancelled = false
    setLoading(true)
    fetch(`/api/admin/hero-slots?brand_slug=${encodeURIComponent(brandSlug)}`)
      .then(r => r.json())
      .then(j => { if (!cancelled) setSlots(j.slots ?? []) })
      .catch(() => { if (!cancelled) setError('Could not load hero slot state.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [brandSlug, isFiftyPlus])

  if (!isFiftyPlus) return null

  const currentSlot = slots.find(s => s.article?.id === articleId)
  const isFeatured  = !!currentSlot
  const freeSlot    = slots.find(s => !s.article)
  const allFull     = !isFeatured && slots.every(s => !!s.article)

  async function add(force = false, slotNumber?: number) {
    setLoading(true)
    setError(null)
    try {
      const target = slotNumber ?? freeSlot?.slot_number
      if (!target) {
        setError('No free slot — pick one to replace.')
        return
      }
      const res = await fetch('/api/admin/hero-slots', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ brand_slug: brandSlug, slot_number: target, article_id: articleId, force }),
      })
      const j = await res.json().catch(() => ({}))
      if (res.status === 409 && j.error === 'slot_occupied') {
        // Confirmation prompt — surface the displaced article.
        setConfirmingReplace({ slot_number: target, article: j.currentArticle })
        return
      }
      if (!res.ok) { setError(j.error ?? 'Failed to add to hero.'); return }
      await refresh()
    } finally { setLoading(false) }
  }

  async function remove() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/hero-slots', {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ brand_slug: brandSlug, article_id: articleId }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) { setError(j.error ?? 'Failed to remove.'); return }
      await refresh()
    } finally { setLoading(false) }
  }

  async function refresh() {
    const r = await fetch(`/api/admin/hero-slots?brand_slug=${encodeURIComponent(brandSlug)}`)
    const j = await r.json()
    setSlots(j.slots ?? [])
  }

  return (
    <div className="rounded-lg border border-portal-border bg-portal-card p-4">
      <div className="flex items-start gap-3">
        <input
          id="feature-in-hero"
          type="checkbox"
          checked={isFeatured}
          disabled={loading || (!isFeatured && allFull)}
          onChange={e => e.target.checked ? add(false) : remove()}
          className="mt-1 h-4 w-4 accent-portal-blue"
        />
        <div className="min-w-0 flex-1">
          <label htmlFor="feature-in-hero" className="text-sm font-semibold text-portal-text cursor-pointer">
            Feature on home page slider
          </label>
          <p className="text-xs text-portal-sub mt-0.5">
            {isFeatured
              ? `Currently in slot ${currentSlot!.slot_number} of the ${brandSlug.toUpperCase()} hero carousel.`
              : allFull
                ? 'All 3 slider slots are full. Manage from /admin/homepage/hero, or pick one below to replace.'
                : 'Rotates into the homepage hero carousel between the dynamic greeting and the other featured stories.'}
          </p>
          {error && <p className="text-xs text-portal-red mt-1.5">{error}</p>}

          {/* Replace prompt when all full */}
          {!isFeatured && allFull && !confirmingReplace && (
            <div className="mt-3 flex flex-wrap gap-2">
              {SLOTS.map(n => {
                const s = slots.find(x => x.slot_number === n)
                if (!s?.article) return null
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setConfirmingReplace(s)}
                    className="portal-btn portal-btn-ghost portal-btn-xs"
                    title={s.article.title}
                  >
                    Replace slot {n}: {s.article.title.length > 30 ? s.article.title.slice(0, 30) + '…' : s.article.title}
                  </button>
                )
              })}
            </div>
          )}

          {/* Confirmation step */}
          {confirmingReplace && (
            <div className="mt-3 rounded-md bg-portal-amber-lt p-3 text-xs">
              <p className="text-portal-amber font-semibold mb-2">
                Slot {confirmingReplace.slot_number} currently shows: <span className="font-bold">{confirmingReplace.article?.title}</span>
              </p>
              <p className="text-portal-text mb-3">Replace it with this article?</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="portal-btn portal-btn-amber portal-btn-sm"
                  onClick={async () => { await add(true, confirmingReplace.slot_number); setConfirmingReplace(null) }}
                >
                  Yes, replace
                </button>
                <button
                  type="button"
                  className="portal-btn portal-btn-ghost portal-btn-sm"
                  onClick={() => setConfirmingReplace(null)}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
