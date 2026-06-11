'use client'

import { useEffect, useState } from 'react'
import { Heart } from 'lucide-react'
import { readDeviceToken } from '@/lib/reader/device-token'

interface Props {
  brandSlug:    string
  targetKind:   'article' | 'directory_listing'
  targetId:     string
  targetTitle?: string
  targetSlug?:  string
  targetUrl?:   string
  /** When true, render as a small inline icon button instead of the
   *  default labeled button. */
  compact?: boolean
}

export function FavoriteButton(props: Props) {
  const [favorited, setFavorited] = useState(false)
  const [pending, setPending] = useState(false)
  // Hydration-safe: read localStorage AFTER mount so the server and client
  // initial render match. The button briefly shows the unfavorited state
  // on first paint then resolves to the real state — same pattern as
  // dark-mode toggles.
  const [token, setToken] = useState('')

  useEffect(() => {
    const t = readDeviceToken()
    setToken(t)
    if (!t) return
    void fetch(`/api/reader/favorites?device_token=${encodeURIComponent(t)}`)
      .then(r => r.ok ? r.json() : null)
      .then((json: { favorites?: Array<{ target_kind: string; target_id: string }> } | null) => {
        if (!json?.favorites) return
        const hit = json.favorites.some(f => f.target_kind === props.targetKind && f.target_id === props.targetId)
        setFavorited(hit)
      })
      .catch(() => undefined)
  }, [props.targetKind, props.targetId])

  async function toggle() {
    if (!token || pending) return
    setPending(true)
    const willFavorite = !favorited
    // Optimistic toggle so the button feels instant; revert on error.
    setFavorited(willFavorite)
    try {
      const res = await fetch('/api/reader/favorites', {
        method:  'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          device_token: token,
          brand_slug:   props.brandSlug,
          target_kind:  props.targetKind,
          target_id:    props.targetId,
          target_title: props.targetTitle,
          target_slug:  props.targetSlug,
          target_url:   props.targetUrl,
          remove:       !willFavorite,
        }),
      })
      if (!res.ok) setFavorited(!willFavorite)
    } catch {
      setFavorited(!willFavorite)
    } finally {
      setPending(false)
    }
  }

  if (props.compact) {
    return (
      <button
        type="button"
        onClick={toggle}
        aria-label={favorited ? 'Remove from favorites' : 'Save to favorites'}
        className={`inline-flex items-center justify-center w-9 h-9 rounded-full transition-colors ${
          favorited
            ? 'bg-primary text-primary-foreground hover:opacity-90'
            : 'bg-white border border-border text-muted-foreground hover:text-primary hover:border-primary'
        }`}
      >
        <Heart size={16} fill={favorited ? 'currentColor' : 'none'} />
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className={`inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm font-bold transition-colors ${
        favorited
          ? 'bg-primary text-primary-foreground hover:opacity-90'
          : 'bg-white border border-border text-foreground hover:border-primary hover:text-primary'
      }`}
    >
      <Heart size={14} fill={favorited ? 'currentColor' : 'none'} />
      {favorited ? 'Saved' : 'Save'}
    </button>
  )
}
