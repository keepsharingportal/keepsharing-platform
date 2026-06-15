'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, X, Pause, Play, ChevronDown, ChevronUp, RefreshCw, Loader2 } from 'lucide-react'

interface QueueItem {
  id:            string
  source_kind:   string
  source_id:     string
  brand_slug:    string | null
  scheduled_for: string
  status:        string
  captions:      Record<string, { caption: string; image_url?: string; hashtags?: string[] }>
  platforms:     string[]
  needs_review:  boolean
  recycle_index: number
  created_at:    string
}

export function SocialQueueClient({ initial }: { initial: QueueItem[] }) {
  const router = useRouter()
  const [items, setItems] = useState<QueueItem[]>(initial)
  const [openId, setOpenId] = useState<string | null>(null)
  const [busy,   setBusy]   = useState<string | null>(null)

  async function action(id: string, action: 'approve' | 'reject' | 'pause' | 'resume') {
    setBusy(id)
    try {
      const res = await fetch(`/api/admin/social-queue/${id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action }),
      })
      if (res.ok) {
        const j = await res.json()
        setItems(items.map(i => i.id === id ? { ...i, ...j.row } : i))
      }
    } finally { setBusy(null) }
  }

  async function updateCaption(id: string, platform: string, caption: string) {
    setBusy(id)
    try {
      await fetch(`/api/admin/social-queue/${id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action: 'edit-caption', platform, caption }),
      })
    } finally { setBusy(null); router.refresh() }
  }

  return (
    <div className="space-y-2">
      {items.map(item => {
        const isOpen = openId === item.id
        return (
          <div key={item.id} className="bg-white border border-portal-border rounded-lg overflow-hidden">

            {/* Header row */}
            <div className="flex items-start gap-3 p-3 cursor-pointer hover:bg-portal-bg" onClick={() => setOpenId(isOpen ? null : item.id)}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-portal-bg text-portal-sub rounded">
                    {item.source_kind}
                  </span>
                  <span className="text-[10px] text-portal-sub">{item.brand_slug ?? '—'}</span>
                  {item.recycle_index > 0 && (
                    <span className="text-[10px] text-portal-amber">recycle #{item.recycle_index}</span>
                  )}
                  <span className="text-[10px] text-portal-sub">→ {item.platforms.join(', ')}</span>
                  {item.needs_review && item.status === 'ready' && (
                    <span className="text-[10px] font-bold text-portal-amber bg-portal-amber-lt px-1.5 py-0.5 rounded">NEEDS APPROVAL</span>
                  )}
                </div>
                <div className="text-[13px] font-bold text-portal-text">
                  {item.captions.facebook?.caption?.slice(0, 80) ?? item.captions.instagram?.caption?.slice(0, 80) ?? '(captions not yet generated)'}
                  {(item.captions.facebook?.caption?.length ?? 0) > 80 && '…'}
                </div>
                <div className="text-[11px] text-portal-sub mt-0.5">
                  Scheduled: {new Date(item.scheduled_for).toLocaleString()}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {item.status === 'ready' && item.needs_review && (
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); action(item.id, 'approve') }}
                    disabled={busy === item.id}
                    className="px-2.5 py-1 text-[11px] font-semibold text-white bg-portal-green rounded hover:opacity-90 disabled:opacity-50"
                    title="Approve — clears needs_review"
                  >
                    {busy === item.id ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />} Approve
                  </button>
                )}
                {item.status !== 'rejected' && item.status !== 'completed' && (
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); action(item.id, 'reject') }}
                    disabled={busy === item.id}
                    className="px-2.5 py-1 text-[11px] font-semibold text-portal-red bg-white border border-portal-red rounded hover:bg-portal-red-lt disabled:opacity-50"
                  >
                    <X size={11} className="inline" /> Reject
                  </button>
                )}
                {isOpen ? <ChevronUp size={14} className="text-portal-sub" /> : <ChevronDown size={14} className="text-portal-sub" />}
              </div>
            </div>

            {/* Expanded captions */}
            {isOpen && (
              <div className="border-t border-portal-border p-3 space-y-3">
                {item.platforms.map(p => {
                  const cap = item.captions[p]
                  return (
                    <div key={p}>
                      <div className="flex items-center justify-between mb-1">
                        <strong className="text-[11px] uppercase tracking-wider text-portal-sub">{p}</strong>
                        {cap?.hashtags && cap.hashtags.length > 0 && (
                          <span className="text-[10px] text-portal-blue">{cap.hashtags.join(' ')}</span>
                        )}
                      </div>
                      <textarea
                        defaultValue={cap?.caption ?? ''}
                        onBlur={e => {
                          if (e.target.value !== cap?.caption) {
                            updateCaption(item.id, p, e.target.value)
                          }
                        }}
                        rows={3}
                        className="w-full px-2 py-1.5 text-[12px] border border-portal-border-2 rounded outline-none focus:border-portal-blue bg-white"
                        placeholder="(awaiting AI generation)"
                      />
                      {cap?.image_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={cap.image_url} alt="" className="mt-1.5 w-32 h-auto rounded border border-portal-border" />
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// Re-export icons that get tree-shaken if not referenced
void Pause; void Play; void RefreshCw
