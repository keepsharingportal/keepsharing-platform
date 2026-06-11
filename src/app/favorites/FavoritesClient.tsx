'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Heart, FileText, Building2, Mail } from 'lucide-react'
import { readDeviceToken } from '@/lib/reader/device-token'
import { NewsletterSignup } from '@/components/NewsletterSignup'

interface FavoriteRow {
  id:            string
  brand_slug:    string
  target_kind:   'article' | 'directory_listing'
  target_id:     string
  target_title:  string | null
  target_slug:   string | null
  target_url:    string | null
  favorited_at:  string
}

export function FavoritesClient({ brandSlug, brandName }: { brandSlug: string; brandName: string }) {
  const [favorites, setFavorites] = useState<FavoriteRow[] | null>(null)

  useEffect(() => {
    const token = readDeviceToken()
    if (!token) { setFavorites([]); return }
    void fetch(`/api/reader/favorites?device_token=${encodeURIComponent(token)}`)
      .then(r => r.ok ? r.json() : null)
      .then((j: { favorites?: FavoriteRow[] } | null) => setFavorites(j?.favorites ?? []))
      .catch(() => setFavorites([]))
  }, [])

  async function removeFavorite(row: FavoriteRow) {
    const token = readDeviceToken()
    if (!token) return
    setFavorites(prev => (prev ?? []).filter(f => f.id !== row.id))
    await fetch('/api/reader/favorites', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        device_token: token,
        brand_slug:   row.brand_slug,
        target_kind:  row.target_kind,
        target_id:    row.target_id,
        remove:       true,
      }),
    }).catch(() => undefined)
  }

  if (favorites === null) {
    return <p className="text-sm text-muted-foreground">Loading…</p>
  }
  if (favorites.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center">
        <Heart size={28} className="mx-auto text-muted-foreground mb-3" />
        <p className="text-base font-bold text-foreground mb-1">No saves yet.</p>
        <p className="text-sm text-muted-foreground">
          Tap the heart on any article or directory listing to save it here.
        </p>
      </div>
    )
  }

  const articles = favorites.filter(f => f.target_kind === 'article')
  const listings = favorites.filter(f => f.target_kind === 'directory_listing')

  return (
    <div className="space-y-8">
      {articles.length > 0 && (
        <section>
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3 inline-flex items-center gap-1">
            <FileText size={11} /> Articles
          </h2>
          <ul className="space-y-2">
            {articles.map(f => <Row key={f.id} row={f} onRemove={() => removeFavorite(f)} />)}
          </ul>
        </section>
      )}
      {listings.length > 0 && (
        <section>
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3 inline-flex items-center gap-1">
            <Building2 size={11} /> Local businesses + experts
          </h2>
          <ul className="space-y-2">
            {listings.map(f => <Row key={f.id} row={f} onRemove={() => removeFavorite(f)} />)}
          </ul>
        </section>
      )}

      {/* Audience handoff: if the reader has saves but hasn't subscribed,
          surface the newsletter signup with the brand-aware copy. */}
      <section className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-6">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <Mail size={18} />
          </div>
          <div>
            <p className="text-base font-bold text-foreground leading-tight">
              Get more like this in your inbox.
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Subscribe and we&apos;ll keep your saves linked across devices + send next week&apos;s {brandName} stories.
            </p>
          </div>
        </div>
        <NewsletterSignup variant="inline" source="favorites-page" brandSlug={brandSlug} />
      </section>
    </div>
  )
}

function Row({ row, onRemove }: { row: FavoriteRow; onRemove: () => void }) {
  const href = row.target_url
    ?? (row.target_kind === 'article'
          ? `/articles/${row.target_slug}`
          : `/directory/${row.target_slug}`)
  return (
    <li className="flex items-center gap-3 bg-card border border-border rounded-xl p-3 hover:border-primary transition-colors">
      <Link href={href} className="flex-1 min-w-0">
        <p className="text-sm font-bold text-foreground truncate hover:text-primary transition-colors">
          {row.target_title ?? '(untitled)'}
        </p>
        <p className="text-[11px] text-muted-foreground">
          Saved {new Date(row.favorited_at).toLocaleDateString()}
        </p>
      </Link>
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove from favorites"
        className="text-muted-foreground hover:text-destructive p-1"
      >
        <Heart size={14} fill="currentColor" />
      </button>
    </li>
  )
}
