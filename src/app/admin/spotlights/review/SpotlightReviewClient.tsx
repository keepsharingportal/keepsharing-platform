'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import {
  CheckCircle2, XCircle, ExternalLink, Download, RefreshCw,
  AlertCircle, ChevronDown, ChevronUp, ImageOff,
} from 'lucide-react'

interface SubmissionRow {
  id:                  string
  submitter_name:      string | null
  submitter_email:     string | null
  related_person_name: string | null
  related_school_name: string | null
  payload:             Record<string, string> | null
  web_image_url:       string | null
  print_image_url:     string | null
  status:              string
  created_at:          string
  promoted_article_id: string | null
}

interface Props {
  rows:   SubmissionRow[]
  status: string
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function SpotlightReviewClient({ rows, status }: Props) {
  const router        = useRouter()
  const [isPending, startTransition] = useTransition()
  const [selected,   setSelected]   = useState<Set<string>>(new Set())
  const [acting,     setActing]     = useState(false)
  const [msg,        setMsg]        = useState<{ text: string; ok: boolean } | null>(null)
  const [expanded,   setExpanded]   = useState<Set<string>>(new Set())

  const allIds      = rows.map(r => r.id)
  const allChecked  = allIds.length > 0 && allIds.every(id => selected.has(id))
  const someChecked = selected.size > 0 && !allChecked

  function toggleAll() {
    setSelected(allChecked ? new Set() : new Set(allIds))
  }

  function toggleOne(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleExpand(id: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function runBulkAction(ids: string[], action: 'publish' | 'reject' | 'send-to-review') {
    setActing(true)
    setMsg(null)
    try {
      const res = await fetch('/api/admin/spotlights/publish', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ submissionIds: ids, action }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setMsg({ text: json?.error ?? `Action failed (${res.status})`, ok: false })
        return
      }
      const verb = action === 'publish' ? 'published' : action === 'reject' ? 'rejected' : 'sent back to review'
      setMsg({ text: `${json.count ?? ids.length} ${verb}`, ok: true })
      setSelected(new Set())
      startTransition(() => router.refresh())
    } catch (e) {
      setMsg({ text: e instanceof Error ? e.message : 'Network error', ok: false })
    } finally {
      setActing(false)
    }
  }

  const busy = acting || isPending

  return (
    <div>
      {msg && (
        <div className={`mb-3 px-4 py-2.5 rounded-lg text-sm font-medium ${
          msg.ok ? 'bg-green-50 border border-green-200 text-green-700'
                 : 'bg-red-50 border border-red-200 text-red-600'
        }`}>
          {msg.ok ? <CheckCircle2 size={14} className="inline mr-1 -mt-0.5" /> : <AlertCircle size={14} className="inline mr-1 -mt-0.5" />}
          {msg.text}
        </div>
      )}

      {/* Bulk action bar */}
      <div className="mb-4 flex flex-wrap items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl sticky top-32 z-5">
        <input
          type="checkbox"
          checked={allChecked}
          ref={el => { if (el) el.indeterminate = someChecked }}
          onChange={toggleAll}
          className="w-4 h-4 rounded border-gray-300 text-portal-blue cursor-pointer"
          aria-label="Select all"
        />
        <span className="text-sm font-semibold text-gray-700">
          {selected.size > 0 ? `${selected.size} selected` : `${rows.length} submission${rows.length === 1 ? '' : 's'}`}
        </span>

        {selected.size > 0 && status === 'new' && (
          <div className="ml-auto flex items-center gap-2 flex-wrap">
            <button
              onClick={() => runBulkAction([...selected], 'publish')}
              disabled={busy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {busy ? <RefreshCw size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
              Approve &amp; Publish
            </button>
            <button
              onClick={() => runBulkAction([...selected], 'send-to-review')}
              disabled={busy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-portal-amber-lt text-portal-amber border border-amber-200 rounded-lg hover:bg-portal-amber-lt disabled:opacity-50 transition-colors"
            >
              Needs Editing
            </button>
            <button
              onClick={() => runBulkAction([...selected], 'reject')}
              disabled={busy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
            >
              <XCircle size={12} />
              Reject
            </button>
          </div>
        )}
      </div>

      {/* Grid of cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {rows.map(r => {
          const isSelected = selected.has(r.id)
          const isExpanded = expanded.has(r.id)
          const student    = r.related_person_name ?? r.payload?.student_name ?? 'Unknown'
          const school     = r.related_school_name ?? r.payload?.school_name  ?? null
          const region     = r.payload?.school_region ?? null
          const grade      = r.payload?.grade ?? null
          const whySpecial = r.payload?.why_special ?? ''
          const achievement = r.payload?.achievement ?? ''
          const relationship = r.payload?.submitter_relationship ?? null

          return (
            <article
              key={r.id}
              className={`flex flex-col bg-white rounded-xl border overflow-hidden transition-colors ${
                isSelected ? 'border-blue-400 ring-1 ring-portal-blue/30' : 'border-gray-200'
              }`}
            >
              <div className="flex gap-3 p-3.5">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleOne(r.id)}
                  className="w-4 h-4 mt-1 rounded border-gray-300 text-portal-blue cursor-pointer shrink-0"
                  aria-label={`Select ${student}`}
                />

                {r.web_image_url ? (
                  <div className="relative w-24 h-24 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                    <Image
                      src={r.web_image_url}
                      alt={student}
                      fill
                      sizes="96px"
                      style={{ objectFit: 'cover', objectPosition: 'center 25%' }}
                      unoptimized
                    />
                  </div>
                ) : (
                  <div className="w-24 h-24 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 shrink-0">
                    <ImageOff size={20} />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1 flex-wrap">
                    <h3 className="text-sm font-bold text-gray-900 leading-tight">{student}</h3>
                    {school && (
                      <span className="text-[10px] font-bold bg-portal-blue-lt text-portal-blue px-1.5 py-0.5 rounded">
                        {school}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-500 mb-1">
                    {grade && <>{grade} · </>}
                    {region && <>{region} · </>}
                    Submitted {fmtDate(r.created_at)}
                  </p>
                  <p className="text-xs text-gray-600 leading-snug line-clamp-2">{whySpecial}</p>
                </div>
              </div>

              {/* Expanded body */}
              {isExpanded && (
                <div className="px-3.5 pb-3 space-y-2 border-t border-gray-100 pt-2.5">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-0.5">Why special</p>
                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{whySpecial}</p>
                  </div>
                  {achievement && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-0.5">A notable moment</p>
                      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{achievement}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Submitter</p>
                      <p className="text-xs text-gray-700">{r.submitter_name ?? '—'}</p>
                      {r.submitter_email && <p className="text-[11px] text-portal-blue truncate">{r.submitter_email}</p>}
                      {relationship && <p className="text-[11px] text-gray-500">{relationship}</p>}
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Print original</p>
                      {r.print_image_url ? (
                        <Link
                          href={r.print_image_url}
                          target="_blank"
                          className="inline-flex items-center gap-1 text-xs text-portal-blue hover:underline"
                        >
                          <Download size={11} /> Download high-res
                        </Link>
                      ) : (
                        <p className="text-[11px] text-gray-400">No upload</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between px-3.5 py-2 border-t border-gray-100 bg-gray-50/50">
                <button
                  onClick={() => toggleExpand(r.id)}
                  className="text-[11px] font-semibold text-gray-500 hover:text-gray-800 inline-flex items-center gap-1"
                >
                  {isExpanded ? <><ChevronUp size={11} /> Less</> : <><ChevronDown size={11} /> More</>}
                </button>
                <div className="flex items-center gap-1.5">
                  {r.promoted_article_id && (
                    <Link
                      href={`/admin/articles/${r.promoted_article_id}/edit`}
                      className="text-[11px] font-semibold text-portal-blue hover:underline inline-flex items-center gap-1"
                    >
                      Open article <ExternalLink size={10} />
                    </Link>
                  )}
                  {status === 'new' && (
                    <>
                      <button
                        onClick={() => runBulkAction([r.id], 'publish')}
                        disabled={busy}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 transition-colors"
                      >
                        <CheckCircle2 size={11} /> Publish
                      </button>
                      <button
                        onClick={() => runBulkAction([r.id], 'reject')}
                        disabled={busy}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-red-600 hover:bg-red-50 rounded transition-colors"
                      >
                        Reject
                      </button>
                    </>
                  )}
                </div>
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}
