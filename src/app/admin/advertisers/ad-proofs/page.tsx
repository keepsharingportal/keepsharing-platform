'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  CheckCircle2, XCircle, Lock, Upload, MessageSquare,
  Clock, Eye, ChevronDown, ChevronUp, Send, AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type ProofStatus = 'pending_review' | 'changes_requested' | 'approved' | 'locked'
type DesignStatus = 'New' | 'Pick-up' | 'DropBox'

interface AdVersion {
  version: number
  uploadedAt: string
  uploadedBy: string
  label: string
  color: string
}

interface AdProof {
  id: string
  businessName: string
  contactName: string
  contactEmail: string
  publication: string
  issue: string
  size: string
  designStatus: DesignStatus
  designer: string
  status: ProofStatus
  versions: AdVersion[]
  changeNotes: string
  approvedAt?: string
  lockedAt?: string
  aiFlag?: 'must_change' | 'verify' | 'safe'
}

const MOCK_PROOFS: AdProof[] = [
  {
    id: '1',
    businessName: 'Prattville Christian Academy',
    contactName: 'Sarah Mitchell',
    contactEmail: 'smitchell@pca.edu',
    publication: 'RRP',
    issue: 'RRP MAY26',
    size: '1/2 Page',
    designStatus: 'DropBox',
    designer: 'Amanda',
    status: 'changes_requested',
    aiFlag: 'must_change',
    versions: [
      { version: 1, uploadedAt: '2026-04-20', uploadedBy: 'Amanda', label: 'Original', color: '#dbeafe' },
      { version: 2, uploadedAt: '2026-04-23', uploadedBy: 'Amanda', label: 'Rev 1', color: '#eff6ff' },
    ],
    changeNotes: 'Phone number is incorrect — should be (334) 365-5189. Also, the enrollment deadline should read "May 15" not "May 1". Background color feels washed out on print preview.',
  },
  {
    id: '2',
    businessName: 'Camp Cheaha',
    contactName: 'Derek Williams',
    contactEmail: 'derek@campcheaha.org',
    publication: 'RRP',
    issue: 'RRP MAY26',
    size: 'Full Page',
    designStatus: 'New',
    designer: 'Amanda',
    status: 'pending_review',
    aiFlag: 'verify',
    versions: [
      { version: 1, uploadedAt: '2026-04-25', uploadedBy: 'Amanda', label: 'Draft', color: '#fef9c3' },
    ],
    changeNotes: '',
  },
  {
    id: '3',
    businessName: 'Imagination Station',
    contactName: 'Lisa Park',
    contactEmail: 'lisa@imaginationstation.com',
    publication: 'RRP',
    issue: 'RRP MAY26',
    size: '1/4 Page',
    designStatus: 'Pick-up',
    designer: 'Self',
    status: 'approved',
    aiFlag: 'safe',
    versions: [
      { version: 1, uploadedAt: '2026-04-18', uploadedBy: 'Client', label: 'Pickup', color: '#dcfce7' },
    ],
    changeNotes: '',
    approvedAt: '2026-04-24',
  },
  {
    id: '4',
    businessName: 'Craig Eye Center',
    contactName: 'Dr. Robert Craig',
    contactEmail: 'rcraig@craigeyecenter.com',
    publication: 'RRP',
    issue: 'RRP MAY26',
    size: '1/2 Page',
    designStatus: 'Pick-up',
    designer: 'Self',
    status: 'locked',
    aiFlag: 'safe',
    versions: [
      { version: 1, uploadedAt: '2026-04-15', uploadedBy: 'Client', label: 'Final', color: '#f3f4f6' },
    ],
    changeNotes: '',
    approvedAt: '2026-04-20',
    lockedAt: '2026-04-22',
  },
  {
    id: '5',
    businessName: 'Courtyard by Marriott',
    contactName: 'Jennifer Shaw',
    contactEmail: 'jshaw@marriott.com',
    publication: 'MBP',
    issue: 'MBP MAY26',
    size: 'Full Page',
    designStatus: 'New',
    designer: 'Amanda',
    status: 'changes_requested',
    aiFlag: 'must_change',
    versions: [
      { version: 1, uploadedAt: '2026-04-21', uploadedBy: 'Amanda', label: 'Draft', color: '#fce7f3' },
      { version: 2, uploadedAt: '2026-04-24', uploadedBy: 'Amanda', label: 'Rev 1', color: '#fdf2f8' },
      { version: 3, uploadedAt: '2026-04-27', uploadedBy: 'Amanda', label: 'Rev 2', color: '#fdf4ff' },
    ],
    changeNotes: 'The contract rate shown ($1,200) is incorrect. Should be $850/mo. Please remove the social handles — they asked us not to include those.',
  },
  {
    id: '6',
    businessName: 'Alabama Orthopaedic Clinic',
    contactName: 'Tracy Hodges',
    contactEmail: 'thodges@aoc.com',
    publication: 'MBP',
    issue: 'MBP MAY26',
    size: '1/4 Page',
    designStatus: 'DropBox',
    designer: 'Self',
    status: 'pending_review',
    aiFlag: 'safe',
    versions: [
      { version: 1, uploadedAt: '2026-04-26', uploadedBy: 'Client', label: 'Client File', color: '#e0f2fe' },
    ],
    changeNotes: '',
  },
]

const STATUS_CONFIG: Record<ProofStatus, { label: string; cls: string; icon: React.ElementType }> = {
  pending_review:     { label: 'Pending Review',     cls: 'bg-amber-50 text-amber-700 ring-amber-200',  icon: Eye },
  changes_requested:  { label: 'Changes Requested',  cls: 'bg-red-50 text-red-700 ring-red-200',        icon: AlertCircle },
  approved:           { label: 'Approved',            cls: 'bg-green-50 text-green-700 ring-green-200',  icon: CheckCircle2 },
  locked:             { label: 'Locked',              cls: 'bg-gray-100 text-gray-600 ring-gray-200',    icon: Lock },
}

const AI_FLAG: Record<string, { label: string; cls: string }> = {
  must_change: { label: 'AI: Must Change', cls: 'bg-red-100 text-red-700' },
  verify:      { label: 'AI: Verify',      cls: 'bg-amber-100 text-amber-700' },
  safe:        { label: 'AI: Safe',        cls: 'bg-green-100 text-green-700' },
}

const TABS = ['All', 'Pending Review', 'Changes Requested', 'Approved', 'Locked']
const PUBS = ['All', 'RRP', 'MBP', 'AOP', 'ESP', 'GPP', 'RRB']
const ADVERTISER_TABS = ['Active Advertisers', 'Layout Sheet', 'Pipeline', 'Agreements', 'Ad Proofs', 'Businesses']
const ADVERTISER_HREFS: Record<string, string> = {
  'Active Advertisers': '/admin/advertisers',
  'Layout Sheet':       '/admin/advertisers/layout-sheet',
  'Pipeline':           '/admin/advertisers/pipeline',
  'Agreements':         '/admin/advertisers/agreements',
  'Ad Proofs':          '/admin/advertisers/ad-proofs',
  'Businesses':         '/admin/advertisers/businesses',
}

const STATUS_TAB_MAP: Record<string, ProofStatus | null> = {
  'All': null,
  'Pending Review': 'pending_review',
  'Changes Requested': 'changes_requested',
  'Approved': 'approved',
  'Locked': 'locked',
}

export default function AdProofsPage() {
  const [proofs, setProofs]           = useState<AdProof[]>(MOCK_PROOFS)
  const [activeTab, setActiveTab]     = useState('All')
  const [pubFilter, setPubFilter]     = useState('All')
  const [expandedId, setExpandedId]   = useState<string | null>(null)
  const [activeVersion, setActiveVersion] = useState<Record<string, number>>({})
  const [draftNotes, setDraftNotes]   = useState<Record<string, string>>({})
  const [sentNotes, setSentNotes]     = useState<Set<string>>(new Set())

  const getVersion = (proof: AdProof) =>
    activeVersion[proof.id] ?? proof.versions.length - 1

  const updateStatus = (id: string, status: ProofStatus) =>
    setProofs((prev) => prev.map((p) => p.id === id ? {
      ...p,
      status,
      approvedAt: status === 'approved' ? new Date().toISOString().slice(0, 10) : p.approvedAt,
      lockedAt:   status === 'locked'   ? new Date().toISOString().slice(0, 10) : p.lockedAt,
    } : p))

  const sendChangeRequest = (id: string) => {
    const notes = draftNotes[id] ?? ''
    if (!notes.trim()) return
    setProofs((prev) => prev.map((p) => p.id === id ? { ...p, status: 'changes_requested', changeNotes: notes } : p))
    setSentNotes((prev) => new Set([...prev, id]))
    setTimeout(() => setSentNotes((prev) => { const n = new Set(prev); n.delete(id); return n }), 2500)
  }

  const filtered = proofs.filter((p) => {
    const tabStatus = STATUS_TAB_MAP[activeTab]
    const tabMatch = !tabStatus || p.status === tabStatus
    const pubMatch = pubFilter === 'All' || p.publication === pubFilter
    return tabMatch && pubMatch
  })

  const countFor = (tab: string) => {
    const s = STATUS_TAB_MAP[tab]
    return s ? proofs.filter((p) => p.status === s).length : proofs.length
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0">
        <h1 className="text-xl font-semibold text-gray-900">Advertisers</h1>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-red-600 font-semibold bg-red-50 px-2.5 py-0.5 rounded-full ring-1 ring-red-200">
            {proofs.filter((p) => p.status === 'changes_requested').length} needs revision
          </span>
          <span className="text-amber-700 font-semibold bg-amber-50 px-2.5 py-0.5 rounded-full ring-1 ring-amber-200">
            {proofs.filter((p) => p.status === 'pending_review').length} pending review
          </span>
          <span className="text-green-700 font-semibold bg-green-50 px-2.5 py-0.5 rounded-full ring-1 ring-green-200">
            {proofs.filter((p) => p.status === 'approved' || p.status === 'locked').length} approved / locked
          </span>
        </div>
      </div>

      {/* Advertiser sub-tabs */}
      <div className="bg-white border-b border-gray-200 px-6 shrink-0">
        <div className="flex items-center gap-1">
          {ADVERTISER_TABS.map((tab) => (
            <Link key={tab} href={ADVERTISER_HREFS[tab]}
              className={cn(
                'px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap border-b-2',
                tab === 'Ad Proofs'
                  ? 'text-blue-600 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700 border-transparent hover:border-gray-300'
              )}>
              {tab}
            </Link>
          ))}
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-white border-b border-gray-200 px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1">
          {TABS.map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={cn(
                'px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap border-b-2 flex items-center gap-1.5',
                activeTab === tab ? 'text-blue-600 border-blue-600' : 'text-gray-500 hover:text-gray-700 border-transparent hover:border-gray-300'
              )}>
              {tab}
              <span className={cn(
                'text-[11px] px-1.5 py-0.5 rounded-full font-semibold',
                activeTab === tab ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
              )}>
                {countFor(tab)}
              </span>
            </button>
          ))}
        </div>
        <select value={pubFilter} onChange={(e) => setPubFilter(e.target.value)}
          className="text-sm text-gray-700 border border-gray-300 rounded-lg px-3 py-1.5 outline-none focus:border-blue-400">
          {PUBS.map((p) => <option key={p} value={p}>{p === 'All' ? 'All Publications' : p}</option>)}
        </select>
      </div>

      {/* Proof cards */}
      <div className="flex-1 overflow-y-auto bg-[#f4f5f7] p-4">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400">
            <CheckCircle2 size={32} className="mb-2 opacity-30" />
            <p className="text-sm">No proofs in this view</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {filtered.map((proof) => {
              const isExpanded = expandedId === proof.id
              const vIdx      = getVersion(proof)
              const version   = proof.versions[vIdx]
              const StatusIcon = STATUS_CONFIG[proof.status].icon
              const draft     = draftNotes[proof.id] ?? proof.changeNotes

              return (
                <div key={proof.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-sm transition-shadow">
                  {/* Card header */}
                  <div className="flex items-start justify-between px-4 py-3 border-b border-gray-100">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-gray-900">{proof.businessName}</span>
                        <span className="text-xs font-bold text-gray-400">{proof.publication}</span>
                        <span className="text-xs text-gray-400">{proof.issue}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-gray-500">{proof.size}</span>
                        <span className="text-xs text-gray-400">Designer: {proof.designer}</span>
                        <span className={cn(
                          'text-[10px] font-medium px-1.5 py-0.5 rounded',
                          proof.designStatus === 'New'     ? 'bg-blue-100 text-blue-700' :
                          proof.designStatus === 'DropBox' ? 'bg-purple-100 text-purple-700' :
                          'bg-gray-100 text-gray-600'
                        )}>
                          {proof.designStatus}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      {proof.aiFlag && (
                        <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded', AI_FLAG[proof.aiFlag].cls)}>
                          {AI_FLAG[proof.aiFlag].label}
                        </span>
                      )}
                      <span className={cn('flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ring-1', STATUS_CONFIG[proof.status].cls)}>
                        <StatusIcon size={11} />
                        {STATUS_CONFIG[proof.status].label}
                      </span>
                    </div>
                  </div>

                  {/* Version tabs + preview */}
                  <div className="px-4 pt-3 pb-2">
                    {/* Version history tabs */}
                    {proof.versions.length > 1 && (
                      <div className="flex items-center gap-1 mb-2">
                        {proof.versions.map((v, i) => (
                          <button key={v.version}
                            onClick={() => setActiveVersion((prev) => ({ ...prev, [proof.id]: i }))}
                            className={cn(
                              'text-xs px-2.5 py-1 rounded-md font-medium transition-colors',
                              i === vIdx
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                            )}>
                            v{v.version} — {v.label}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Ad preview placeholder */}
                    <div
                      className="rounded-lg flex items-center justify-center relative overflow-hidden"
                      style={{
                        backgroundColor: version.color,
                        height: proof.size === 'Full Page' ? 200 : proof.size === '1/2 Page' ? 130 : 90,
                      }}
                    >
                      <div className="text-center">
                        <div className="text-sm font-bold text-gray-400 opacity-60">{proof.businessName}</div>
                        <div className="text-xs text-gray-400 opacity-40 mt-0.5">{proof.size} · v{version.version}</div>
                      </div>
                      <div className="absolute top-2 right-2 text-[10px] bg-white/70 text-gray-500 px-1.5 py-0.5 rounded">
                        {version.uploadedAt} · {version.uploadedBy}
                      </div>
                      {proof.status === 'locked' && (
                        <div className="absolute inset-0 bg-gray-900/20 flex items-center justify-center">
                          <div className="flex items-center gap-1.5 bg-white/90 px-3 py-1.5 rounded-full text-xs font-semibold text-gray-600">
                            <Lock size={12} /> Locked for {proof.issue}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Timestamps for approved/locked */}
                  {(proof.approvedAt || proof.lockedAt) && (
                    <div className="px-4 pb-2 flex items-center gap-4 text-xs text-gray-400">
                      {proof.approvedAt && <span className="flex items-center gap-1"><CheckCircle2 size={10} className="text-green-500" /> Approved {proof.approvedAt}</span>}
                      {proof.lockedAt   && <span className="flex items-center gap-1"><Lock size={10} className="text-gray-400" /> Locked {proof.lockedAt}</span>}
                    </div>
                  )}

                  {/* Expand/collapse change notes section */}
                  {proof.status !== 'locked' && (
                    <>
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : proof.id)}
                        className="w-full flex items-center justify-between px-4 py-2.5 border-t border-gray-100 text-xs text-gray-500 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-1.5">
                          <MessageSquare size={12} />
                          {proof.changeNotes
                            ? <span className="text-amber-700 font-medium">Change notes recorded</span>
                            : <span>Add change request</span>}
                        </div>
                        {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      </button>

                      {isExpanded && (
                        <div className="px-4 pb-4 bg-gray-50 border-t border-gray-100">
                          <textarea
                            value={draft}
                            onChange={(e) => setDraftNotes((prev) => ({ ...prev, [proof.id]: e.target.value }))}
                            placeholder="Describe what needs to change — phone number, dates, colors, text corrections…"
                            className="w-full text-xs text-gray-700 border border-gray-200 rounded-lg px-3 py-2.5 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 resize-y min-h-[80px] mt-3 bg-white"
                          />
                          <div className="flex items-center gap-2 mt-2">
                            <button
                              onClick={() => sendChangeRequest(proof.id)}
                              disabled={!draft.trim()}
                              className={cn(
                                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                                sentNotes.has(proof.id)
                                  ? 'bg-green-50 text-green-700 ring-1 ring-green-200'
                                  : 'bg-red-600 text-white hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed'
                              )}>
                              {sentNotes.has(proof.id)
                                ? <><CheckCircle2 size={11} /> Sent to designer</>
                                : <><Send size={11} /> Request Changes</>
                              }
                            </button>
                            {proof.status !== 'approved' && (
                              <button
                                onClick={() => { updateStatus(proof.id, 'approved'); setExpandedId(null) }}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-green-600 text-white hover:bg-green-700 transition-colors">
                                <CheckCircle2 size={11} /> Approve
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* Bottom action bar */}
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border-t border-gray-100">
                    {proof.status === 'pending_review' && (
                      <>
                        <button
                          onClick={() => setExpandedId(proof.id)}
                          className="flex items-center gap-1 text-xs px-3 py-1.5 text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-colors">
                          <XCircle size={11} /> Request Changes
                        </button>
                        <button
                          onClick={() => updateStatus(proof.id, 'approved')}
                          className="flex items-center gap-1 text-xs px-3 py-1.5 font-semibold text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors">
                          <CheckCircle2 size={11} /> Approve
                        </button>
                      </>
                    )}
                    {proof.status === 'changes_requested' && (
                      <>
                        <span className="flex items-center gap-1 text-xs text-amber-600">
                          <Clock size={11} /> Awaiting designer revision
                        </span>
                        <button
                          onClick={() => updateStatus(proof.id, 'approved')}
                          className="ml-auto flex items-center gap-1 text-xs px-3 py-1.5 font-semibold text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors">
                          <CheckCircle2 size={11} /> Approve anyway
                        </button>
                      </>
                    )}
                    {proof.status === 'approved' && (
                      <>
                        <button
                          className="flex items-center gap-1 text-xs px-3 py-1.5 text-gray-500 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                          <Upload size={11} /> Upload new version
                        </button>
                        <button
                          onClick={() => updateStatus(proof.id, 'locked')}
                          className="flex items-center gap-1 text-xs px-3 py-1.5 font-semibold text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors ml-auto">
                          <Lock size={11} /> Lock for Issue
                        </button>
                      </>
                    )}
                    {proof.status === 'locked' && (
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <Lock size={11} /> Locked — no further changes allowed
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
