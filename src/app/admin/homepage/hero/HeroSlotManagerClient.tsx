'use client'

// Client component for /admin/homepage/hero — renders the 3-slot grid,
// handles the "Remove" action, and refreshes via a router refresh after.
// Slot replacement happens on the article edit page (single source of
// truth for "what's in this slot"), so this surface is intentionally
// thin: see + remove. Avoids the divergence that comes from two surfaces
// owning the same write.

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Trash2, ExternalLink } from 'lucide-react'

interface Slot {
  slot_number: number
  added_at:    string
  article: {
    id:             string
    title:          string
    slug:           string
    hero_image_url: string | null
    column_slug:    string | null
    published:      boolean
    ends_at:        string | null
    brand_slug:     string
  } | null
}

interface Props {
  slots:     Slot[]
  brandSlug: string
}

export function HeroSlotManagerClient({ slots, brandSlug }: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState<number | null>(null)
  const [, startTransition] = useTransition()

  async function removeSlot(slotNumber: number) {
    if (!confirm(`Remove the article from slot ${slotNumber}? The slot will become empty until you feature a different article.`)) return
    setBusy(slotNumber)
    try {
      const res = await fetch('/api/admin/hero-slots', {
        method:  'DELETE',
        headers: { 'content-type': 'application/json' },
        body:    JSON.stringify({ brand_slug: brandSlug, slot_number: slotNumber }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        alert(j.error ?? 'Could not remove from slot.')
        return
      }
      startTransition(() => router.refresh())
    } finally { setBusy(null) }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {slots.map(s => (
        <div key={s.slot_number} className="portal-card overflow-hidden flex flex-col">
          <div className="bg-portal-navy-lt px-4 py-2 flex items-center justify-between border-b border-portal-border">
            <span className="text-xs font-bold text-portal-blue uppercase tracking-wider">Slot {s.slot_number}</span>
            {s.article && (
              <button
                type="button"
                onClick={() => removeSlot(s.slot_number)}
                disabled={busy === s.slot_number}
                className="text-portal-red text-xs font-semibold inline-flex items-center gap-1 hover:text-portal-amber"
              >
                <Trash2 className="h-3 w-3" /> Remove
              </button>
            )}
          </div>

          {s.article ? (
            <>
              {s.article.hero_image_url && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={s.article.hero_image_url}
                  alt={s.article.title}
                  className="w-full aspect-[16/9] object-cover bg-portal-navy-lt"
                />
              )}
              <div className="p-4 flex-1 flex flex-col">
                {s.article.column_slug && (
                  <div className="text-[10px] text-portal-sub uppercase font-bold tracking-wider mb-1">
                    {s.article.column_slug.replace(/-/g, ' ')}
                  </div>
                )}
                <h3 className="font-bold text-sm text-portal-text leading-tight line-clamp-3 mb-3">
                  {s.article.title}
                </h3>
                <div className="mt-auto flex flex-wrap gap-1.5 text-[11px]">
                  {!s.article.published && (
                    <span className="portal-badge portal-badge-red">Unpublished</span>
                  )}
                  {s.article.brand_slug !== brandSlug && (
                    <span className="portal-badge portal-badge-amber">Syndicated</span>
                  )}
                  {s.added_at && (
                    <span className="text-portal-sub">
                      Added {new Date(s.added_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  )}
                </div>
                <Link
                  href={`/admin/articles/${s.article.id}/edit`}
                  className="portal-btn portal-btn-ghost portal-btn-sm mt-3 justify-center"
                >
                  <ExternalLink className="h-3 w-3 mr-1" /> Edit article
                </Link>
              </div>
            </>
          ) : (
            <div className="p-6 flex-1 flex flex-col items-center justify-center text-center text-portal-sub">
              <div className="text-3xl mb-2 opacity-40">∅</div>
              <p className="text-sm">Empty slot</p>
              <p className="text-xs mt-1">
                Open any published article and check &ldquo;Feature on home page slider&rdquo; to fill this slot.
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
