'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ExternalLink, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

type Submission = {
  id: string
  form_type: string
  publication: string
  name: string | null
  email: string | null
  form_data: Record<string, string>
  ai_article: string | null
  status: string
  created_at: string
}

const FORM_META: Record<string, { label: string; pub: string; path: string; color: string }> = {
  'second-act':        { label: 'Second Act',             pub: 'RRB', path: '/boom/second-act',        color: 'bg-portal-amber-lt text-portal-amber border-portal-amber/30' },
  'then-and-now':      { label: 'Then and Now',           pub: 'RRB', path: '/boom/then-and-now',      color: 'bg-portal-red-lt text-portal-red border-portal-red/30' },
  'ask-the-doctor':    { label: 'Ask the Doctor',         pub: 'RRB', path: '/boom/ask-the-doctor',    color: 'bg-portal-blue-lt text-portal-blue ring-portal-blue/30' },
  'student-spotlight': { label: 'Student Spotlight',      pub: 'RRP', path: '/rrp/student-spotlight',  color: 'bg-portal-green-lt text-portal-green ring-portal-green/30' },
  'local-kid':         { label: 'Local Kid Cool Things',  pub: 'RRP', path: '/rrp/local-kid',          color: 'bg-portal-blue-lt text-portal-blue ring-portal-blue/30' },
  'parent-poll':       { label: 'Parent Poll',            pub: 'RRP', path: '/rrp/parent-poll',        color: 'bg-portal-green-lt text-portal-green ring-portal-green/30' },
}

const STATUS_CONFIG: Record<string, string> = {
  pending:  'bg-portal-amber-lt text-portal-amber border-portal-amber/30',
  reviewed: 'bg-portal-blue-lt text-portal-blue ring-portal-blue/30',
  approved: 'bg-portal-green-lt text-portal-green ring-portal-green/30',
  rejected: 'bg-portal-red-lt text-portal-red ring-portal-red/30',
  published:'bg-portal-bg text-portal-text ring-slate-200',
}

export default function FormsAdminPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading]         = useState(true)
  const [filter, setFilter]           = useState<string>('all')
  const [expanded, setExpanded]       = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const url = filter !== 'all' ? `/api/submissions?formType=${filter}` : '/api/submissions'
      const res = await fetch(url)
      setSubmissions(res.ok ? await res.json() : [])
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [filter])

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="bg-white border-b border-portal-border px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-portal-text">Submission Forms</h1>
          <p className="text-xs text-portal-sub mt-0.5">All public form submissions across RRP and Boom</p>
        </div>
        <button onClick={load} className="flex items-center gap-1 px-3 py-1.5 text-xs text-portal-sub border border-portal-border rounded-lg hover:bg-portal-bg">
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      <div className="p-6 space-y-4">
        {/* Form directory */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
          {Object.entries(FORM_META).map(([type, meta]) => (
            <div key={type} className="bg-white rounded-lg border border-portal-border p-3 text-center">
              <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-semibold ring-1 block mb-2', meta.color)}>{meta.pub}</span>
              <div className="text-xs font-semibold text-portal-text mb-2 leading-tight">{meta.label}</div>
              <a href={meta.path} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-1 text-[10px] text-portal-blue hover:underline">
                <ExternalLink size={9} /> View Form
              </a>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 flex-wrap">
          <button onClick={() => setFilter('all')} className={cn('px-3 py-1.5 text-xs rounded-lg border transition-all', filter === 'all' ? 'bg-portal-navy text-white border-portal-blue' : 'bg-white border-portal-border text-portal-sub hover:bg-portal-bg')}>
            All
          </button>
          {Object.entries(FORM_META).map(([type, meta]) => (
            <button key={type} onClick={() => setFilter(type)} className={cn('px-3 py-1.5 text-xs rounded-lg border transition-all', filter === type ? 'bg-portal-navy text-white border-portal-blue' : 'bg-white border-portal-border text-portal-sub hover:bg-portal-bg')}>
              {meta.label}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg border border-portal-border overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-sm text-portal-muted">Loading submissions…</div>
          ) : submissions.length === 0 ? (
            <div className="p-8 text-center text-sm text-portal-muted">No submissions yet.</div>
          ) : (
            <div className="divide-y divide-portal-border">
              {submissions.map(s => {
                const meta = FORM_META[s.form_type]
                const isOpen = expanded === s.id
                return (
                  <div key={s.id}>
                    <button className="w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-portal-bg transition-colors"
                      onClick={() => setExpanded(isOpen ? null : s.id)}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {meta && <span className={cn('px-1.5 py-0.5 rounded-full text-[10px] font-semibold ring-1', meta.color)}>{meta.label}</span>}
                          <span className="text-sm font-semibold text-portal-text">{s.name ?? 'Anonymous'}</span>
                          <span className="text-xs text-portal-muted">{s.email}</span>
                          {s.ai_article && <span className="text-[10px] text-portal-green font-medium">✦ AI article</span>}
                        </div>
                      </div>
                      <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-semibold ring-1 shrink-0', STATUS_CONFIG[s.status] ?? STATUS_CONFIG.pending)}>
                        {s.status}
                      </span>
                      <span className="text-xs text-portal-muted shrink-0">
                        {new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </button>
                    {isOpen && (
                      <div className="px-5 pb-4 bg-portal-bg/50 border-t border-portal-border space-y-3">
                        <div className="pt-3 grid grid-cols-2 gap-2 text-xs">
                          {Object.entries(s.form_data).map(([k, v]) => (
                            <div key={k} className={cn(v && String(v).length > 60 ? 'col-span-2' : '')}>
                              <div className="text-[10px] text-portal-muted uppercase tracking-wide">{k.replace(/_/g, ' ')}</div>
                              <div className="text-portal-text mt-0.5">{String(v)}</div>
                            </div>
                          ))}
                        </div>
                        {s.ai_article && (
                          <div className="bg-portal-green-lt border border-portal-green/30 rounded-lg p-3">
                            <div className="text-[10px] font-bold text-portal-green uppercase tracking-wide mb-1">AI-Generated Article Draft</div>
                            <p className="text-xs text-portal-text leading-relaxed whitespace-pre-line">{s.ai_article.slice(0, 400)}{s.ai_article.length > 400 ? '…' : ''}</p>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <Link href="/admin/content/editorial-board" className="px-3 py-1.5 text-xs font-semibold text-white bg-portal-navy rounded-lg hover:opacity-90">
                            View in Editorial Board →
                          </Link>
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
