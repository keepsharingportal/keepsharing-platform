'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Mail, Phone, Globe, Building2, Check, Reply, RefreshCw,
  ChevronDown, ChevronUp,
} from 'lucide-react'
import type { InquiryRow } from './page'

function fmtTs(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  })
}

interface Props { rows: InquiryRow[] }

export function InquiriesClient({ rows }: Props) {
  const router = useRouter()
  const [expanded, setExpanded] = useState<string | null>(null)
  const [busy, setBusy]         = useState<string | null>(null)

  async function mark(id: string, field: 'read_at' | 'replied_at') {
    setBusy(id)
    try {
      const res = await fetch(`/api/admin/listing-messages/${id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ [field]: new Date().toISOString() }),
      })
      if (res.ok) router.refresh()
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-3">
      {rows.map(r => {
        const isOpen   = expanded === r.id
        const busyHere = busy === r.id
        const fresh    = !r.read_at && !r.replied_at
        const biz      = r.advertiser_accounts

        return (
          <div
            key={r.id}
            className={`rounded-xl border bg-white overflow-hidden ${fresh ? 'border-blue-200 ring-1 ring-blue-100' : 'border-gray-200'}`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3 p-4">
              <button
                onClick={() => setExpanded(isOpen ? null : r.id)}
                className="flex-1 min-w-0 text-left"
              >
                <div className="flex items-center gap-2 mb-1">
                  {fresh && <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded">New</span>}
                  {r.replied_at && <span className="text-[10px] font-bold uppercase tracking-wider text-green-700 bg-green-100 px-1.5 py-0.5 rounded">Replied</span>}
                  {r.read_at && !r.replied_at && <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">Read</span>}
                  <span className="text-xs text-gray-400">{fmtTs(r.created_at)}</span>
                </div>
                <p className="text-sm font-bold text-gray-900 leading-tight">
                  {r.parent_name} <span className="font-normal text-gray-500">→</span> {biz?.business_name ?? 'Unknown business'}
                </p>
                <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">{r.message}</p>
              </button>

              <div className="flex items-center gap-2 shrink-0">
                {!r.read_at && (
                  <button
                    onClick={() => mark(r.id, 'read_at')}
                    disabled={busyHere}
                    title="Mark read"
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-40"
                  >
                    {busyHere ? <RefreshCw size={11} className="animate-spin" /> : <Check size={11} />}
                    Read
                  </button>
                )}
                {!r.replied_at && (
                  <button
                    onClick={() => mark(r.id, 'replied_at')}
                    disabled={busyHere}
                    title="Mark replied"
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-40"
                  >
                    {busyHere ? <RefreshCw size={11} className="animate-spin" /> : <Reply size={11} />}
                    Replied
                  </button>
                )}
                <button
                  onClick={() => setExpanded(isOpen ? null : r.id)}
                  className="text-gray-400 hover:text-gray-700 p-1"
                  title={isOpen ? 'Collapse' : 'Expand'}
                >
                  {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
              </div>
            </div>

            {isOpen && (
              <div className="border-t border-gray-100 bg-gray-50/50 p-4 space-y-4 text-sm">
                <div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Full message</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{r.message}</p>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="rounded-lg border border-gray-200 bg-white p-3">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">From</p>
                    <p className="text-sm font-semibold text-gray-900">{r.parent_name}</p>
                    <a href={`mailto:${r.parent_email}`} className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1 mt-1">
                      <Mail size={11} /> {r.parent_email}
                    </a>
                    {r.parent_phone && (
                      <a href={`tel:${r.parent_phone}`} className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1 mt-0.5 ml-3">
                        <Phone size={11} /> {r.parent_phone}
                      </a>
                    )}
                  </div>

                  <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3">
                    <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider mb-2">Forward to business</p>
                    <p className="text-sm font-semibold text-gray-900 inline-flex items-center gap-1">
                      <Building2 size={11} /> {biz?.business_name ?? '—'}
                    </p>
                    {biz?.contact_email ? (
                      <a href={`mailto:${biz.contact_email}?subject=Inquiry from River Region Parents: ${r.parent_name}&body=${encodeURIComponent(`${r.message}\n\n---\nFrom: ${r.parent_name} (${r.parent_email}${r.parent_phone ? ', ' + r.parent_phone : ''})`)}`} className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1 mt-1 block">
                        <Mail size={11} /> {biz.contact_email}
                      </a>
                    ) : (
                      <p className="text-xs text-gray-500 italic mt-1">No business email on file</p>
                    )}
                    {biz?.office_phone && (
                      <p className="text-xs text-gray-600 inline-flex items-center gap-1 mt-1">
                        <Phone size={11} /> {biz.office_phone}
                      </p>
                    )}
                    {biz?.website_url && (
                      <a href={biz.website_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1 mt-1 block">
                        <Globe size={11} /> {biz.website_url.replace(/^https?:\/\//, '')}
                      </a>
                    )}
                  </div>
                </div>

                {r.source_url && (
                  <p className="text-[11px] text-gray-400">
                    Submitted from: <a href={r.source_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{r.source_url}</a>
                  </p>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
