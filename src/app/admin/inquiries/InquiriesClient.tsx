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
            className={`rounded-lg border bg-white overflow-hidden ${fresh ? 'border-blue-200 border border-portal-blue/30' : 'border-portal-border'}`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3 p-4">
              <button
                onClick={() => setExpanded(isOpen ? null : r.id)}
                className="flex-1 min-w-0 text-left"
              >
                <div className="flex items-center gap-2 mb-1">
                  {fresh && <span className="text-[10px] font-bold uppercase tracking-wider text-portal-blue bg-portal-blue-lt px-1.5 py-0.5 rounded">New</span>}
                  {r.replied_at && <span className="text-[10px] font-bold uppercase tracking-wider text-portal-green bg-portal-green-lt px-1.5 py-0.5 rounded">Replied</span>}
                  {r.read_at && !r.replied_at && <span className="text-[10px] font-bold uppercase tracking-wider text-portal-sub bg-gray-100 px-1.5 py-0.5 rounded">Read</span>}
                  <span className="text-xs text-portal-muted">{fmtTs(r.created_at)}</span>
                </div>
                <p className="text-sm font-bold text-portal-text leading-tight">
                  {r.parent_name} <span className="font-normal text-portal-sub">→</span> {biz?.business_name ?? 'Unknown business'}
                </p>
                <p className="text-xs text-portal-sub mt-0.5 line-clamp-2">{r.message}</p>
              </button>

              <div className="flex items-center gap-2 shrink-0">
                {!r.read_at && (
                  <button
                    onClick={() => mark(r.id, 'read_at')}
                    disabled={busyHere}
                    title="Mark read"
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold border border-portal-border text-portal-text rounded-lg hover:bg-portal-bg disabled:opacity-40"
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
                  className="text-portal-muted hover:text-portal-text p-1"
                  title={isOpen ? 'Collapse' : 'Expand'}
                >
                  {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
              </div>
            </div>

            {isOpen && (
              <div className="border-t border-portal-border bg-portal-bg/50 p-4 space-y-4 text-sm">
                <div>
                  <p className="text-[10px] font-bold text-portal-sub uppercase tracking-wider mb-1">Full message</p>
                  <p className="text-sm text-portal-text whitespace-pre-wrap leading-relaxed">{r.message}</p>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="rounded-lg border border-portal-border bg-white p-3">
                    <p className="text-[10px] font-bold text-portal-sub uppercase tracking-wider mb-2">From</p>
                    <p className="text-sm font-semibold text-portal-text">{r.parent_name}</p>
                    <a href={`mailto:${r.parent_email}`} className="text-xs text-portal-blue hover:underline inline-flex items-center gap-1 mt-1">
                      <Mail size={11} /> {r.parent_email}
                    </a>
                    {r.parent_phone && (
                      <a href={`tel:${r.parent_phone}`} className="text-xs text-portal-blue hover:underline inline-flex items-center gap-1 mt-0.5 ml-3">
                        <Phone size={11} /> {r.parent_phone}
                      </a>
                    )}
                  </div>

                  <div className="rounded-lg border border-portal-amber/30 bg-portal-amber-lt/50 p-3">
                    <p className="text-[10px] font-bold text-portal-amber uppercase tracking-wider mb-2">Forward to business</p>
                    <p className="text-sm font-semibold text-portal-text inline-flex items-center gap-1">
                      <Building2 size={11} /> {biz?.business_name ?? '—'}
                    </p>
                    {biz?.contact_email ? (
                      <a href={`mailto:${biz.contact_email}?subject=Inquiry from River Region Parents: ${r.parent_name}&body=${encodeURIComponent(`${r.message}\n\n---\nFrom: ${r.parent_name} (${r.parent_email}${r.parent_phone ? ', ' + r.parent_phone : ''})`)}`} className="text-xs text-portal-blue hover:underline inline-flex items-center gap-1 mt-1 block">
                        <Mail size={11} /> {biz.contact_email}
                      </a>
                    ) : (
                      <p className="text-xs text-portal-sub italic mt-1">No business email on file</p>
                    )}
                    {biz?.office_phone && (
                      <p className="text-xs text-portal-sub inline-flex items-center gap-1 mt-1">
                        <Phone size={11} /> {biz.office_phone}
                      </p>
                    )}
                    {biz?.website_url && (
                      <a href={biz.website_url} target="_blank" rel="noopener noreferrer" className="text-xs text-portal-blue hover:underline inline-flex items-center gap-1 mt-1 block">
                        <Globe size={11} /> {biz.website_url.replace(/^https?:\/\//, '')}
                      </a>
                    )}
                  </div>
                </div>

                {r.source_url && (
                  <p className="text-[11px] text-portal-muted">
                    Submitted from: <a href={r.source_url} target="_blank" rel="noopener noreferrer" className="text-portal-blue hover:underline">{r.source_url}</a>
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
