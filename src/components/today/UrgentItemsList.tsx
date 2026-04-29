'use client'

import { useState } from 'react'
import { Phone, Mail, ChevronDown, ChevronUp, Copy, CheckCheck, ExternalLink, X } from 'lucide-react'

export interface UrgentItem {
  id: number
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
  const [expandedId, setExpandedId]   = useState<number | null>(null)
  const [editedDrafts, setEditedDrafts] = useState<Record<number, string>>({})
  const [copied, setCopied]           = useState<number | null>(null)
  const [dismissed, setDismissed]     = useState<Set<number>>(new Set())

  const dismiss = (id: number, e: React.MouseEvent) => {
    e.stopPropagation()
    setDismissed((prev) => new Set([...prev, id]))
    if (expandedId === id) setExpandedId(null)
  }

  const borderColor = urgency === 'urgent' ? 'border-l-red-500' : 'border-l-amber-400'
  const badgeCls    = urgency === 'urgent'
    ? 'bg-red-50 text-red-600 ring-1 ring-red-200'
    : 'bg-amber-50 text-amber-600 ring-1 ring-amber-200'

  const handleCopy = (id: number, text: string) => {
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
            className={`bg-white rounded-xl border border-gray-200 border-l-4 ${borderColor} overflow-hidden hover:shadow-sm transition-shadow group`}
          >
            {/* Item row */}
            <div
              className="flex items-start gap-3 px-4 py-3 cursor-pointer"
              onClick={() => setExpandedId(isExpanded ? null : item.id)}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-gray-900">{item.name}</span>
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${badgeCls}`}>
                    {urgency === 'urgent' ? item.action : `${item.days}d`}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{item.note}</p>
                <div className="flex items-center gap-3 mt-1.5">
                  <a href={`tel:${item.phone}`} onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 transition-colors">
                    <Phone size={11} /> {item.phone}
                  </a>
                  {item.email && (
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <Mail size={11} /> {item.email}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0 mt-0.5">
                <span className="text-xs text-gray-400 mr-1">{isExpanded ? 'Close' : 'Draft email'}</span>
                {isExpanded
                  ? <ChevronUp size={15} className="text-gray-400" />
                  : <ChevronDown size={15} className="text-gray-400" />
                }
                <button
                  onClick={(e) => dismiss(item.id, e)}
                  className="ml-1 p-1 rounded text-gray-300 hover:text-gray-500 hover:bg-gray-100 transition-colors opacity-0 group-hover:opacity-100"
                  title="Dismiss"
                >
                  <X size={13} />
                </button>
              </div>
            </div>

            {/* Expanded email draft */}
            {isExpanded && (
              <div className="border-t border-gray-100 bg-gray-50 px-4 py-4">
                {/* Subject line */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide w-14">Subject</span>
                  <span className="text-xs text-gray-700 bg-white border border-gray-200 rounded px-2 py-1 flex-1">
                    {item.emailSubject}
                  </span>
                  <button
                    onClick={() => handleCopy(item.id * 100, item.emailSubject)}
                    className="p-1.5 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-colors"
                    title="Copy subject"
                  >
                    {copied === item.id * 100 ? <CheckCheck size={13} className="text-green-500" /> : <Copy size={13} />}
                  </button>
                </div>

                {/* Draft body */}
                <div className="flex items-start gap-2">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide w-14 mt-2">Body</span>
                  <div className="flex-1">
                    <textarea
                      value={draft}
                      onChange={(e) => setEditedDrafts((prev) => ({ ...prev, [item.id]: e.target.value }))}
                      className="w-full text-xs text-gray-700 bg-white border border-gray-200 rounded-lg px-3 py-2.5 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 resize-y min-h-[120px] font-mono leading-relaxed"
                    />
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => handleCopy(item.id, draft)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          copied === item.id
                            ? 'bg-green-50 text-green-700 ring-1 ring-green-200'
                            : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
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
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                      >
                        <ExternalLink size={12} /> Open in GHL
                      </a>
                      {editedDrafts[item.id] && (
                        <button
                          onClick={() => setEditedDrafts((prev) => { const n = {...prev}; delete n[item.id]; return n })}
                          className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          Reset draft
                        </button>
                      )}
                      <button
                        onClick={(e) => dismiss(item.id, e)}
                        className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors ml-auto"
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
