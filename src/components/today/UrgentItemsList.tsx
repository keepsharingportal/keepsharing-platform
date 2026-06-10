'use client'

import { useState } from 'react'
import { Phone, Mail, ChevronDown, ChevronUp, Copy, CheckCheck, ExternalLink, X } from 'lucide-react'

export interface UrgentItem {
  id: string | number
  name: string
  note: string
  phone: string
  email?: string
  action: string
  urgency: 'urgent' | 'review'
  days?: number
  emailDraft: string
  emailSubject: string
}

interface Props {
  items: UrgentItem[]
  urgency: 'urgent' | 'review'
}

export function UrgentItemsList({ items, urgency }: Props) {
  const [expandedId, setExpandedId]   = useState<string | number | null>(null)
  const [editedDrafts, setEditedDrafts] = useState<Record<string, string>>({})
  const [copied, setCopied]           = useState<string | number | null>(null)
  const [dismissed, setDismissed]     = useState<Set<string | number>>(new Set())

  const dismiss = (id: string | number, e: React.MouseEvent) => {
    e.stopPropagation()
    setDismissed((prev) => new Set([...prev, id]))
    if (expandedId === id) setExpandedId(null)
  }

  const borderColor = urgency === 'urgent' ? 'border-l-red-500' : 'border-l-portal-amber'
  const badgeCls    = urgency === 'urgent'
    ? 'bg-portal-red-lt text-portal-red ring-1 ring-portal-red/30'
    : 'bg-portal-amber-lt text-portal-amber ring-1 ring-portal-amber/30'

  const handleCopy = (id: string | number, text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  const visibleItems = items.filter((i) => !dismissed.has(i.id))

  return (
    <div className="space-y-2">
      {visibleItems.map((item) => {
        const isExpanded = expandedId === item.id
        const draft = editedDrafts[item.id] ?? item.emailDraft

        return (
          <div key={item.id}
            className={`bg-white rounded-lg border border-portal-border border-l-4 ${borderColor} overflow-hidden hover:shadow-sm transition-shadow group`}
          >
            {/* Item row */}
            <div
              className="flex items-start gap-3 px-4 py-3 cursor-pointer"
              onClick={() => setExpandedId(isExpanded ? null : item.id)}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-portal-text">{item.name}</span>
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${badgeCls}`}>
                    {urgency === 'urgent' ? item.action : `${item.days}d`}
                  </span>
                </div>
                <p className="text-xs text-portal-sub mt-0.5">{item.note}</p>
                <div className="flex items-center gap-3 mt-1.5">
                  <a href={`tel:${item.phone}`} onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1 text-xs text-portal-blue hover:text-portal-blue transition-colors">
                    <Phone size={11} /> {item.phone}
                  </a>
                  {item.email && (
                    <span className="flex items-center gap-1 text-xs text-portal-muted">
                      <Mail size={11} /> {item.email}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0 mt-0.5">
                <span className="text-xs text-portal-muted mr-1">{isExpanded ? 'Close' : 'Draft email'}</span>
                {isExpanded
                  ? <ChevronUp size={15} className="text-portal-muted" />
                  : <ChevronDown size={15} className="text-portal-muted" />
                }
                <button
                  onClick={(e) => dismiss(item.id, e)}
                  className="ml-1 p-1 rounded text-portal-border-2 hover:text-portal-sub hover:bg-portal-row-hover transition-colors opacity-0 group-hover:opacity-100"
                  title="Dismiss"
                >
                  <X size={13} />
                </button>
              </div>
            </div>

            {/* Expanded email draft */}
            {isExpanded && (
              <div className="border-t border-portal-border bg-portal-bg px-4 py-4">
                {/* Subject line */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-semibold text-portal-sub uppercase tracking-wide w-14">Subject</span>
                  <span className="text-xs text-portal-text bg-white border border-portal-border rounded px-2 py-1 flex-1">
                    {item.emailSubject}
                  </span>
                  <button
                    onClick={() => handleCopy(String(item.id) + '-subject', item.emailSubject)}
                    className="p-1.5 rounded text-portal-muted hover:text-portal-sub hover:bg-portal-border-2 transition-colors"
                    title="Copy subject"
                  >
                    {copied === String(item.id) + '-subject' ? <CheckCheck size={13} className="text-portal-green" /> : <Copy size={13} />}
                  </button>
                </div>

                {/* Draft body */}
                <div className="flex items-start gap-2">
                  <span className="text-xs font-semibold text-portal-sub uppercase tracking-wide w-14 mt-2">Body</span>
                  <div className="flex-1">
                    <textarea
                      value={draft}
                      onChange={(e) => setEditedDrafts((prev) => ({ ...prev, [item.id]: e.target.value }))}
                      className="w-full text-xs text-portal-text bg-white border border-portal-border rounded-lg px-3 py-2.5 outline-none focus:border-portal-blue focus:ring-2 focus:ring-portal-blue/20 resize-y min-h-[120px] font-mono leading-relaxed"
                    />
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => handleCopy(item.id, draft)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          copied === item.id
                            ? 'bg-portal-green-lt text-portal-green ring-1 ring-portal-green/30'
                            : 'bg-white border border-portal-border-2 text-portal-sub hover:bg-portal-bg'
                        }`}
                      >
                        {copied === item.id
                          ? <><CheckCheck size={12} /> Copied!</>
                          : <><Copy size={12} /> Copy draft</>
                        }
                      </button>
                      <a
                        href={`https://app.gohighlevel.com`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-portal-blue text-white hover:bg-portal-navy transition-colors"
                      >
                        <ExternalLink size={12} /> Open in GHL
                      </a>
                      {editedDrafts[item.id] && (
                        <button
                          onClick={() => setEditedDrafts((prev) => { const n = {...prev}; delete n[item.id]; return n })}
                          className="text-xs text-portal-muted hover:text-portal-sub transition-colors"
                        >
                          Reset draft
                        </button>
                      )}
                      <button
                        onClick={(e) => dismiss(item.id, e)}
                        className="flex items-center gap-1 text-xs text-portal-muted hover:text-portal-red transition-colors ml-auto"
                      >
                        <X size={11} /> Dismiss
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
