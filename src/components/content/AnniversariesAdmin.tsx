'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { RefreshCw, Heart, Download } from 'lucide-react'

type Anniversary = {
  id: string
  couple_name: string
  person1_name: string
  person2_name: string
  years_together: number
  anniversary_date: string
  short_message: string | null
  email: string
  tier: 'free' | 'featured' | 'premium'
  amount: number
  status: string
  photo_url: string | null
  stripe_session_id: string | null
  social_post: string | null
  pdf_url: string | null
  print_flag: boolean
  scheduled_publish: string | null
  created_at: string
}

const TIER_CONFIG: Record<string, { label: string; color: string }> = {
  free:     { label: 'Free',     color: 'bg-slate-50 text-slate-700 ring-slate-200' },
  featured: { label: 'Featured', color: 'bg-amber-50 text-amber-700 ring-amber-200' },
  premium:  { label: 'Premium',  color: 'bg-orange-50 text-orange-700 ring-orange-200' },
}

const STATUS_CONFIG: Record<string, string> = {
  pending_payment: 'bg-gray-50 text-gray-500 ring-gray-200',
  pending:         'bg-amber-50 text-amber-700 ring-amber-200',
  approved:        'bg-green-50 text-green-700 ring-green-200',
  scheduled:       'bg-teal-50 text-teal-700 ring-teal-200',
  published:       'bg-blue-50 text-blue-700 ring-blue-200',
  rejected:        'bg-red-50 text-red-700 ring-red-200',
}

const MOCK: Anniversary[] = [
  {
    id: '1',
    couple_name: 'Robert & Linda Braswell',
    person1_name: 'Robert Braswell',
    person2_name: 'Linda Braswell',
    years_together: 40,
    anniversary_date: '2026-06-15',
    short_message: 'Forty years of love, laughter, and learning together. We wouldn\'t trade a single day.',
    email: 'robert.braswell@example.com',
    tier: 'premium',
    amount: 75,
    status: 'approved',
    photo_url: null,
    stripe_session_id: 'cs_test_xxx',
    social_post: '🎉 Congratulations to Robert & Linda Braswell — 40 years of love! Their story is one for the ages. Read their full feature on RiverRegionBoom.com. #RiverRegionBoom #Anniversary #Love',
    pdf_url: null,
    print_flag: true,
    scheduled_publish: '2026-06-01T10:00:00Z',
    created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
  {
    id: '2',
    couple_name: 'James & Carol Monroe',
    person1_name: 'James Monroe',
    person2_name: 'Carol Monroe',
    years_together: 25,
    anniversary_date: '2026-05-20',
    short_message: 'Silver anniversary! 25 years flew by.',
    email: 'jmonroe@example.com',
    tier: 'featured',
    amount: 45,
    status: 'pending',
    photo_url: null,
    stripe_session_id: 'cs_test_yyy',
    social_post: null,
    pdf_url: null,
    print_flag: false,
    scheduled_publish: null,
    created_at: new Date(Date.now() - 1 * 86400000).toISOString(),
  },
  {
    id: '3',
    couple_name: 'Thomas & Betty Higgins',
    person1_name: 'Thomas Higgins',
    person2_name: 'Betty Higgins',
    years_together: 55,
    anniversary_date: '2026-07-04',
    short_message: null,
    email: 'thiggins@example.com',
    tier: 'free',
    amount: 0,
    status: 'pending',
    photo_url: null,
    stripe_session_id: null,
    social_post: null,
    pdf_url: null,
    print_flag: false,
    scheduled_publish: null,
    created_at: new Date(Date.now() - 6 * 86400000).toISOString(),
  },
]

export function AnniversariesAdmin() {
  const [items, setItems]       = useState<Anniversary[]>([])
  const [loading, setLoading]   = useState(true)
  const [filter, setFilter]     = useState('all')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [generatingCaption, setGeneratingCaption] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const supaRes = await fetch('/api/anniversaries')
      if (supaRes.ok) {
        const data = await supaRes.json()
        setItems(data.length > 0 ? data : MOCK)
      } else {
        setItems(MOCK)
      }
    } catch {
      setItems(MOCK)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const updateStatus = async (id: string, status: string) => {
    setItems(prev => prev.map(a => a.id === id ? { ...a, status } : a))
    await fetch('/api/anniversaries', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    }).catch(() => {})
  }

  const generateSocialPost = async (item: Anniversary) => {
    setGeneratingCaption(item.id)
    try {
      const res = await fetch('/api/anniversaries/social', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          person1: item.person1_name,
          person2: item.person2_name,
          years:   item.years_together,
          message: item.short_message,
        }),
      })
      if (res.ok) {
        const { post } = await res.json()
        setItems(prev => prev.map(a => a.id === item.id ? { ...a, social_post: post } : a))
      }
    } finally {
      setGeneratingCaption(null)
    }
  }

  const visible = filter === 'all' ? items : items.filter(a =>
    filter === 'paid' ? a.amount > 0 : (a.tier === filter || a.status === filter)
  )

  const revenue = items.reduce((sum, a) => sum + (a.status !== 'pending_payment' ? a.amount : 0), 0)

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Heart size={16} className="text-rose-500" />
            <h1 className="text-xl font-bold text-gray-900">Anniversary Spotlights</h1>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Couple submissions · Free / Featured ($45) / Premium ($75)
          </p>
        </div>
        <button onClick={load} className="flex items-center gap-1 px-3 py-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50">
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      <div className="p-6 space-y-5">

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total',    value: items.length,                                          color: 'text-gray-900' },
            { label: 'Pending',  value: items.filter(a => a.status === 'pending').length,      color: 'text-amber-700' },
            { label: 'Revenue',  value: `$${revenue}`,                                         color: 'text-green-700' },
            { label: 'Print',    value: items.filter(a => a.print_flag).length,                color: 'text-blue-700' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <div className={cn('text-2xl font-bold', s.color)}>{s.value}</div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wide mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-1 flex-wrap">
          {['all', 'free', 'featured', 'premium', 'pending', 'approved', 'published'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn('px-3 py-1.5 text-xs rounded-lg border capitalize transition-all', filter === f ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50')}
            >
              {f}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-sm text-gray-400">Loading…</div>
          ) : visible.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-400">No anniversary spotlights yet.</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {visible.map(a => {
                const isOpen = expanded === a.id
                const tierCfg = TIER_CONFIG[a.tier]
                return (
                  <div key={a.id}>
                    <button
                      className="w-full flex items-start gap-3 px-5 py-4 text-left hover:bg-gray-50 transition-colors"
                      onClick={() => setExpanded(isOpen ? null : a.id)}
                    >
                      {/* Heart icon */}
                      <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                        style={{ backgroundColor: '#FFF1F2', border: '1px solid #FECDD3' }}>
                        <Heart size={14} className="text-rose-500" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-gray-900">{a.couple_name}</span>
                          <span className="text-xs text-gray-400">{a.years_together} years</span>
                          {a.print_flag && <span className="text-[10px] text-blue-600 font-medium">Print</span>}
                          {a.social_post && <span className="text-[10px] text-green-600 font-medium">✦ Social ready</span>}
                        </div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-xs text-gray-500">
                            {new Date(a.anniversary_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                          </span>
                          <span className="text-xs text-gray-400">{a.email}</span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        {tierCfg && (
                          <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-semibold ring-1', tierCfg.color)}>
                            {tierCfg.label}{a.amount > 0 ? ` ($${a.amount})` : ''}
                          </span>
                        )}
                        <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-semibold ring-1', STATUS_CONFIG[a.status] ?? STATUS_CONFIG.pending)}>
                          {a.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                    </button>

                    {isOpen && (
                      <div className="px-5 pb-5 bg-gray-50/50 border-t border-gray-100 space-y-4">
                        <div className="pt-4 grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <div className="text-[10px] text-gray-400 uppercase tracking-wide">Person 1</div>
                            <div className="text-gray-800 mt-0.5 font-medium">{a.person1_name}</div>
                          </div>
                          <div>
                            <div className="text-[10px] text-gray-400 uppercase tracking-wide">Person 2</div>
                            <div className="text-gray-800 mt-0.5 font-medium">{a.person2_name}</div>
                          </div>
                          <div>
                            <div className="text-[10px] text-gray-400 uppercase tracking-wide">Anniversary</div>
                            <div className="text-gray-800 mt-0.5">{new Date(a.anniversary_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
                          </div>
                          <div>
                            <div className="text-[10px] text-gray-400 uppercase tracking-wide">Years Together</div>
                            <div className="text-gray-800 mt-0.5">{a.years_together}</div>
                          </div>
                          {a.short_message && (
                            <div className="col-span-2">
                              <div className="text-[10px] text-gray-400 uppercase tracking-wide">Their Message</div>
                              <div className="text-gray-800 mt-0.5 italic">&ldquo;{a.short_message}&rdquo;</div>
                            </div>
                          )}
                          <div>
                            <div className="text-[10px] text-gray-400 uppercase tracking-wide">Photo</div>
                            <div className="text-gray-800 mt-0.5">{a.photo_url ? <a href={a.photo_url} className="text-blue-600 hover:underline">View photo</a> : 'Not uploaded'}</div>
                          </div>
                          {a.scheduled_publish && (
                            <div>
                              <div className="text-[10px] text-gray-400 uppercase tracking-wide">Scheduled</div>
                              <div className="text-gray-800 mt-0.5">{new Date(a.scheduled_publish).toLocaleDateString()}</div>
                            </div>
                          )}
                        </div>

                        {/* Social post */}
                        {(a.tier === 'featured' || a.tier === 'premium') && (
                          <div>
                            {a.social_post ? (
                              <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                                <div className="text-[10px] font-bold text-green-700 uppercase tracking-wide mb-1">AI Social Post</div>
                                <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-line">{a.social_post}</p>
                                <button className="mt-2 flex items-center gap-1 text-[10px] text-green-700 hover:underline">
                                  <Download size={10} /> Copy to clipboard
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => generateSocialPost(a)}
                                disabled={generatingCaption === a.id}
                                className="px-4 py-2 text-xs font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                              >
                                {generatingCaption === a.id ? 'Generating…' : '✦ Generate Social Post with AI'}
                              </button>
                            )}
                          </div>
                        )}

                        {/* PDF / print */}
                        {a.tier === 'premium' && (
                          <div className="flex items-center gap-3">
                            <div className={cn('px-3 py-1.5 text-xs font-semibold rounded-lg', a.print_flag ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500')}>
                              {a.print_flag ? '✓ Print flagged' : 'Print: not flagged'}
                            </div>
                            {a.pdf_url ? (
                              <a href={a.pdf_url} className="px-3 py-1.5 text-xs font-semibold text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50">
                                <Download size={10} className="inline mr-1" />Download PDF
                              </a>
                            ) : (
                              <span className="text-xs text-gray-400">PDF not yet generated</span>
                            )}
                          </div>
                        )}

                        {/* Status actions */}
                        <div>
                          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">Actions</div>
                          <div className="flex flex-wrap gap-2">
                            {a.status === 'pending' && (
                              <>
                                <button onClick={() => updateStatus(a.id, 'approved')}
                                  className="px-3 py-1.5 text-xs font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700">
                                  Approve
                                </button>
                                <button onClick={() => updateStatus(a.id, 'rejected')}
                                  className="px-3 py-1.5 text-xs font-semibold text-white bg-red-500 rounded-lg hover:bg-red-600">
                                  Reject
                                </button>
                              </>
                            )}
                            {a.status === 'approved' && (
                              <button onClick={() => updateStatus(a.id, 'published')}
                                className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700">
                                Mark Published
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
