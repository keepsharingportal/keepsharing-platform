'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Mail, ExternalLink, Copy, CheckCheck, ChevronDown, AlertCircle, CheckCircle2, Clock, RefreshCw } from 'lucide-react'
import { GUIDE_CALENDAR, MOCK_GUIDE_LISTINGS, getListingsForGuide, type GuideListing, type UpdateStatus } from '@/lib/mock-guides'
import { cn } from '@/lib/utils'

const MONTH_NAMES = ['', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']

const STATUS_CONFIG: Record<UpdateStatus, { label: string; cls: string; icon: React.ElementType }> = {
  not_sent:  { label: 'Not Sent',  cls: 'bg-gray-50 text-gray-500 ring-gray-200',   icon: Clock },
  sent:      { label: 'Sent',      cls: 'bg-amber-50 text-amber-700 ring-amber-200', icon: Mail },
  responded: { label: 'Responded', cls: 'bg-blue-50 text-blue-700 ring-blue-200',    icon: RefreshCw },
  updated:   { label: 'Updated',   cls: 'bg-green-50 text-green-700 ring-green-200', icon: CheckCircle2 },
}

function buildEmailDraft(listing: GuideListing, guideName: string, month: number, year: number) {
  const deadline = new Date(year, month - 2, 15).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  const updateUrl = listing.updateToken
    ? `https://riverregionparents.com/update/${listing.updateToken}`
    : `https://riverregionparents.com/update/[TOKEN_PENDING]`
  return {
    subject: `Update Your ${guideName} Listing — River Region Parents ${year}`,
    body: `Hi ${listing.contactName},

It's that time of year! We're preparing our ${guideName} for the ${MONTH_NAMES[month]} ${year} issue of River Region Parents and want to make sure your listing is accurate and up to date.

→ Update your listing here: ${updateUrl}

It takes less than 5 minutes. Just review your current information and update anything that has changed — location, hours, contact info, programs, descriptions.

Your listing appears FREE in our guide as a service to the community. We just want to make sure it's accurate for the thousands of families who read it!

Deadline to update: ${deadline}

Questions? Just reply to this email or call (334) 555-0100.

Thank you,
[Publisher Name]
River Region Parents
(334) 555-0100`,
  }
}

export default function GuidePage() {
  const params = useParams()
  const month  = parseInt(params.month as string, 10)
  const year   = 2026
  const guide  = GUIDE_CALENDAR.find((g) => g.month === month)
  const listings = getListingsForGuide(month, year)

  const [emailModal, setEmailModal]   = useState<GuideListing | null>(null)
  const [pendingModal, setPendingModal] = useState<GuideListing | null>(null)
  const [copied, setCopied]           = useState<'subject' | 'body' | null>(null)
  const [localListings, setLocalListings] = useState(listings)
  const [filterStatus, setFilterStatus] = useState<UpdateStatus | 'all'>('all')

  if (!guide) return <div className="p-6 text-gray-500">Guide not found for month {month}</div>

  const stats = {
    total:     localListings.length,
    not_sent:  localListings.filter((l) => l.updateStatus === 'not_sent').length,
    sent:      localListings.filter((l) => l.updateStatus === 'sent').length,
    responded: localListings.filter((l) => l.updateStatus === 'responded').length,
    updated:   localListings.filter((l) => l.updateStatus === 'updated').length,
  }

  const filtered = filterStatus === 'all' ? localListings : localListings.filter((l) => l.updateStatus === filterStatus)

  const handleCopy = (text: string, which: 'subject' | 'body') => {
    navigator.clipboard.writeText(text)
    setCopied(which)
    setTimeout(() => setCopied(null), 2000)
  }

  const handleMarkSent = (id: string) => {
    setLocalListings((prev) => prev.map((l) => l.id === id ? { ...l, updateStatus: 'sent', updateRequestSentAt: new Date().toISOString() } : l))
    setEmailModal(null)
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/admin/guides" className="text-sm text-blue-600 hover:text-blue-800">← Guides</Link>
          <span className="text-gray-300">/</span>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              {guide.name}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">{MONTH_NAMES[month]} {year} · {stats.total} listings</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const notSent = localListings.filter((l) => l.updateStatus === 'not_sent')
              if (notSent.length > 0) setEmailModal(notSent[0])
            }}
            className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            disabled={stats.not_sent === 0}
          >
            <Mail size={14} />
            Send Update Requests ({stats.not_sent})
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-6 text-sm shrink-0">
        {(['all', 'not_sent', 'sent', 'responded', 'updated'] as const).map((s) => {
          const count = s === 'all' ? stats.total : stats[s]
          const labels: Record<string, string> = { all: 'All', not_sent: 'Not Sent', sent: 'Sent', responded: 'Responded', updated: 'Updated' }
          const colors: Record<string, string> = { all: 'text-gray-700', not_sent: 'text-gray-500', sent: 'text-amber-600', responded: 'text-blue-600', updated: 'text-green-600' }
          return (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={cn('flex items-center gap-1.5 transition-colors', filterStatus === s ? 'font-semibold' : 'hover:text-gray-900', colors[s])}>
              <span className="font-bold">{count}</span>
              <span className="text-gray-400">{labels[s]}</span>
            </button>
          )
        })}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto bg-white">
        <table className="w-full text-sm border-collapse">
          <thead className="sticky top-0 bg-gray-50 border-b border-gray-200 z-10">
            <tr>
              {['Status', 'Business', 'Category', 'Phone', 'Email', 'Last Verified', 'Actions'].map((h) => (
                <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((listing) => {
              const { label, cls, icon: Icon } = STATUS_CONFIG[listing.updateStatus]
              return (
                <tr key={listing.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ring-1 ${cls}`}>
                      <Icon size={11} /> {label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{listing.businessName}</div>
                    <div className="text-xs text-gray-400 mt-0.5 truncate max-w-[200px]">{listing.address}</div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{listing.category}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                    <a href={`tel:${listing.phone}`} className="hover:text-blue-600 transition-colors">{listing.phone}</a>
                  </td>
                  <td className="px-4 py-3 text-sm text-blue-600 whitespace-nowrap">
                    <a href={`mailto:${listing.email}`} className="hover:underline">{listing.email}</a>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                    {listing.lastVerified
                      ? new Date(listing.lastVerified).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                      : <span className="text-red-400">Never</span>
                    }
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {listing.updateStatus === 'not_sent' && (
                        <button onClick={() => setEmailModal(listing)}
                          className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                          <Mail size={11} /> Draft Email
                        </button>
                      )}
                      {listing.updateStatus === 'responded' && listing.pendingChanges && (
                        <button onClick={() => setPendingModal(listing)}
                          className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors ring-1 ring-blue-200">
                          Review Changes
                        </button>
                      )}
                      {listing.updateToken && (
                        <a href={`/update/${listing.updateToken}`} target="_blank"
                          className="p-1.5 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                          <ExternalLink size={13} />
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* ── Email Draft Modal ─────────────────────────────── */}
      {emailModal && (() => {
        const draft = buildEmailDraft(emailModal, guide.name, month, year)
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setEmailModal(null)} />
            <div className="relative z-10 w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
                <div>
                  <h2 className="text-base font-semibold text-gray-900">Update Request Email</h2>
                  <p className="text-xs text-gray-500 mt-0.5">{emailModal.businessName} · {emailModal.contactName}</p>
                </div>
                <button onClick={() => setEmailModal(null)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">✕</button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-gray-500 uppercase">Subject</span>
                    <button onClick={() => handleCopy(draft.subject, 'subject')}
                      className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600">
                      {copied === 'subject' ? <><CheckCheck size={12} className="text-green-500" /> Copied</> : <><Copy size={12} /> Copy</>}
                    </button>
                  </div>
                  <p className="text-sm text-gray-800 font-medium">{draft.subject}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-gray-500 uppercase">Body</span>
                    <button onClick={() => handleCopy(draft.body, 'body')}
                      className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600">
                      {copied === 'body' ? <><CheckCheck size={12} className="text-green-500" /> Copied</> : <><Copy size={12} /> Copy</>}
                    </button>
                  </div>
                  <pre className="text-xs text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">{draft.body}</pre>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <p className="text-xs font-semibold text-blue-800 mb-1">How to send</p>
                  <ol className="text-xs text-blue-700 space-y-1 list-decimal list-inside">
                    <li>Copy the subject and body above</li>
                    <li>Open GHL → Conversations → New Email</li>
                    <li>Search for "{emailModal.businessName}"</li>
                    <li>Paste and send — reply goes into GHL inbox</li>
                  </ol>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between shrink-0">
                <button onClick={() => setEmailModal(null)} className="text-sm text-gray-500 hover:text-gray-700">Cancel</button>
                <button onClick={() => handleMarkSent(emailModal.id)}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
                  <CheckCircle2 size={14} /> Mark as Sent
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* ── Pending Changes Modal ─────────────────────────── */}
      {pendingModal && pendingModal.pendingChanges && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setPendingModal(null)} />
          <div className="relative z-10 w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-base font-semibold text-gray-900">Review Requested Changes</h2>
              <p className="text-xs text-gray-500 mt-0.5">{pendingModal.businessName}</p>
            </div>
            <div className="px-6 py-5 space-y-3">
              {Object.entries(pendingModal.pendingChanges).map(([field, newValue]) => {
                const oldValue = pendingModal[field as keyof GuideListing] as string
                return (
                  <div key={field} className="bg-gray-50 rounded-xl p-4">
                    <div className="text-xs font-semibold text-gray-500 uppercase mb-2">{field.replace(/([A-Z])/g, ' $1')}</div>
                    <div className="flex gap-3 text-sm">
                      <div className="flex-1">
                        <div className="text-xs text-red-500 font-medium mb-0.5">Current</div>
                        <div className="text-gray-700 line-through">{oldValue}</div>
                      </div>
                      <div className="flex-1">
                        <div className="text-xs text-green-600 font-medium mb-0.5">Proposed</div>
                        <div className="text-gray-900 font-medium">{newValue as string}</div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex gap-2 justify-end">
              <button onClick={() => setPendingModal(null)} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100">Ignore</button>
              <button onClick={() => {
                setLocalListings((prev) => prev.map((l) => l.id === pendingModal.id ? { ...l, ...l.pendingChanges, pendingChanges: null, updateStatus: 'updated', lastVerified: new Date().toISOString().slice(0,10) } : l))
                setPendingModal(null)
              }} className="px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700">
                ✓ Approve Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
