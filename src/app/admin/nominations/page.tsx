'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ExternalLink, ChevronRight, CheckCircle2, Clock, Mic, Camera, FileText, ThumbsUp } from 'lucide-react'
import {
  MOCK_NOMINATIONS, NOMINATION_TYPE_CONFIG, STATUS_STEPS,
  type NominationType, type NominationRecord, type NominationStatus,
  getStatusStep, getNominationsByType,
} from '@/lib/mock-nominations'
import { cn } from '@/lib/utils'

const TYPES: NominationType[] = ['cover-profile', 'mom-to-mom', 'teacher-of-month', 'grands-are-great']

const STATUS_BADGE: Record<NominationStatus, string> = {
  pending:             'bg-portal-bg text-portal-sub ring-gray-200',
  selected:            'bg-portal-blue-lt text-portal-blue ring-portal-blue/30',
  questions_generated: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  interview_scheduled: 'bg-portal-amber-lt text-portal-amber ring-amber-200',
  interviewed:         'bg-purple-50 text-purple-700 ring-purple-200',
  article_drafted:     'bg-teal-50 text-teal-700 ring-teal-200',
  photos_received:     'bg-orange-50 text-orange-700 ring-orange-200',
  approved:            'bg-green-50 text-green-700 ring-green-200',
  published:           'bg-portal-green-lt text-portal-green ring-emerald-200',
}

const STEP_ICONS = [Clock, ThumbsUp, FileText, Mic, Mic, FileText, Camera, CheckCircle2, CheckCircle2]

function NominationCard({ nom, onSelect }: { nom: NominationRecord; onSelect: (n: NominationRecord) => void }) {
  const config = NOMINATION_TYPE_CONFIG[nom.type]
  const stepIdx = getStatusStep(nom.status)
  return (
    <div className="bg-white rounded-xl border border-portal-border overflow-hidden hover:shadow-sm transition-shadow cursor-pointer"
      onClick={() => onSelect(nom)}>
      <div className={`h-1 bg-${config.color}-400`}
        style={{ backgroundColor: nom.type === 'cover-profile' ? '#3b82f6' : nom.type === 'mom-to-mom' ? '#f43f5e' : nom.type === 'teacher-of-month' ? '#22c55e' : '#f59e0b' }} />
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="font-semibold text-portal-text text-sm">{nom.subjectName}</div>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ring-1 whitespace-nowrap ml-2 ${STATUS_BADGE[nom.status]}`}>
            {STATUS_STEPS.find((s) => s.status === nom.status)?.label ?? nom.status}
          </span>
        </div>
        <div className="text-xs text-portal-sub mb-3 line-clamp-2">{nom.reason}</div>

        {/* Progress dots */}
        <div className="flex items-center gap-1">
          {STATUS_STEPS.slice(0, 5).map((step, i) => (
            <div key={i} className={cn('flex-1 h-1 rounded-full transition-colors',
              i <= stepIdx ? 'bg-portal-blue-lt0' : 'bg-gray-200')} />
          ))}
        </div>
        <div className="flex items-center justify-between mt-2 text-[10px] text-portal-muted">
          <span>{nom.publication}</span>
          <span>{nom.issueMonth ?? 'Issue TBD'}</span>
        </div>
      </div>
    </div>
  )
}

export default function NominationsPage() {
  const [nominations, setNominations] = useState(MOCK_NOMINATIONS)
  const [activeType, setActiveType]   = useState<NominationType>('cover-profile')
  const [selected, setSelected]       = useState<NominationRecord | null>(null)

  const config = NOMINATION_TYPE_CONFIG[activeType]
  const typeNoms = nominations.filter((n) => n.type === activeType)

  const totalPending = nominations.filter((n) => n.status === 'pending').length

  const advance = (id: string) => {
    setNominations((prev) => prev.map((n) => {
      if (n.id !== id) return n
      const currentIdx = getStatusStep(n.status)
      const next = STATUS_STEPS[Math.min(currentIdx + 1, STATUS_STEPS.length - 1)]
      const now = new Date().toISOString()
      const updates: Partial<NominationRecord> = { status: next.status }
      if (next.status === 'selected')            updates.selectedAt = now.slice(0,10)
      if (next.status === 'questions_generated') updates.questionsGeneratedAt = now.slice(0,10)
      if (next.status === 'interview_scheduled') updates.interviewScheduledFor = 'TBD'
      if (next.status === 'interviewed')         updates.interviewedAt = now.slice(0,10)
      if (next.status === 'article_drafted')     updates.articleDraftedAt = now.slice(0,10)
      if (next.status === 'photos_received')     updates.photoReceivedAt = now.slice(0,10)
      if (next.status === 'approved')            updates.approvedAt = now.slice(0,10)
      return { ...n, ...updates }
    }))
    if (selected?.id === id) {
      setSelected((prev) => {
        if (!prev) return null
        const currentIdx = getStatusStep(prev.status)
        const next = STATUS_STEPS[Math.min(currentIdx + 1, STATUS_STEPS.length - 1)]
        return { ...prev, status: next.status }
      })
    }
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-portal-border px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-portal-text">Nominations</h1>
          {totalPending > 0 && (
            <span className="text-sm font-semibold text-portal-amber bg-portal-amber-lt px-2.5 py-0.5 rounded-full ring-1 ring-amber-200">
              {totalPending} pending
            </span>
          )}
        </div>
        <Link href={`/nominate/${activeType}`} target="_blank"
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-portal-sub border border-portal-border-2 rounded-lg hover:bg-portal-bg transition-colors">
          <ExternalLink size={13} /> Nomination Form
        </Link>
      </div>

      {/* Type tabs */}
      <div className="bg-white border-b border-portal-border px-6 shrink-0">
        <div className="flex items-center gap-1 overflow-x-auto">
          {TYPES.map((type) => {
            const cfg = NOMINATION_TYPE_CONFIG[type]
            const count = nominations.filter((n) => n.type === type).length
            const pending = nominations.filter((n) => n.type === type && n.status === 'pending').length
            return (
              <button key={type} onClick={() => setActiveType(type)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeType === type ? 'text-portal-blue border-blue-600' : 'text-portal-sub hover:text-portal-text border-transparent hover:border-portal-border-2'
                }`}>
                {cfg.label}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ring-1 ${activeType === type ? 'bg-portal-blue-lt text-portal-blue ring-portal-blue/30' : 'bg-portal-bg text-portal-sub ring-gray-200'}`}>
                  {count}
                </span>
                {pending > 0 && (
                  <span className="text-[10px] w-4 h-4 rounded-full bg-portal-amber-lt0 text-white flex items-center justify-center font-bold">
                    {pending}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Board columns */}
        <div className="flex-1 overflow-x-auto p-6">
          <div className="flex gap-4 h-full min-w-max">
            {(['pending', 'selected', 'questions_generated', 'interview_scheduled', 'interviewed', 'article_drafted', 'photos_received', 'approved'] as NominationStatus[]).map((status) => {
              const stageNoms = typeNoms.filter((n) => n.status === status)
              const stageLabel = STATUS_STEPS.find((s) => s.status === status)?.label ?? status
              return (
                <div key={status} className="w-52 shrink-0 flex flex-col">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-portal-sub uppercase tracking-wide">{stageLabel}</span>
                    <span className="text-xs text-portal-muted">{stageNoms.length}</span>
                  </div>
                  <div className="flex-1 space-y-2 overflow-y-auto pb-4">
                    {stageNoms.map((nom) => (
                      <NominationCard key={nom.id} nom={nom} onSelect={setSelected} />
                    ))}
                    {stageNoms.length === 0 && (
                      <div className="h-16 border-2 border-dashed border-portal-border rounded-xl flex items-center justify-center text-xs text-portal-muted">
                        Empty
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Detail panel */}
        {selected && (
          <div className="w-80 shrink-0 border-l border-portal-border bg-white flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-portal-border flex items-center justify-between">
              <h2 className="text-sm font-semibold text-portal-text">{selected.subjectName}</h2>
              <button onClick={() => setSelected(null)} className="text-portal-muted hover:text-portal-sub text-lg leading-none">×</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-sm">
              <div>
                <div className="text-xs font-semibold text-portal-sub uppercase mb-1.5">Status</div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ring-1 ${STATUS_BADGE[selected.status]}`}>
                  {STATUS_STEPS.find((s) => s.status === selected.status)?.label}
                </span>
              </div>
              <div>
                <div className="text-xs font-semibold text-portal-sub uppercase mb-1.5">Nomination Reason</div>
                <p className="text-portal-text text-xs leading-relaxed">{selected.reason}</p>
              </div>
              <div>
                <div className="text-xs font-semibold text-portal-sub uppercase mb-1.5">Nominated By</div>
                <p className="text-portal-text">{selected.nominatorName}</p>
                <p className="text-xs text-portal-blue">{selected.nominatorEmail}</p>
              </div>
              {selected.subjectPhone && (
                <div>
                  <div className="text-xs font-semibold text-portal-sub uppercase mb-1.5">Subject Contact</div>
                  <p className="text-portal-text">{selected.subjectEmail}</p>
                  <p className="text-portal-sub">{selected.subjectPhone}</p>
                </div>
              )}
              {selected.notes && (
                <div>
                  <div className="text-xs font-semibold text-portal-sub uppercase mb-1.5">Notes</div>
                  <p className="text-xs text-portal-sub leading-relaxed">{selected.notes}</p>
                </div>
              )}

              {/* Timeline */}
              <div>
                <div className="text-xs font-semibold text-portal-sub uppercase mb-2">Progress</div>
                <div className="space-y-1.5">
                  {STATUS_STEPS.map((step, i) => {
                    const done = getStatusStep(selected.status) >= i
                    const Icon = STEP_ICONS[i]
                    return (
                      <div key={step.status} className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${done ? 'bg-portal-blue-lt0' : 'bg-gray-200'}`}>
                          {done && <Icon size={9} className="text-white" />}
                        </div>
                        <span className={`text-xs ${done ? 'text-portal-text font-medium' : 'text-portal-muted'}`}>{step.label}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Advance button */}
            {getStatusStep(selected.status) < STATUS_STEPS.length - 1 && (
              <div className="p-4 border-t border-portal-border">
                <button onClick={() => advance(selected.id)}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 text-sm font-semibold text-white bg-portal-navy rounded-lg hover:opacity-90 transition-colors">
                  Advance to: {STATUS_STEPS[getStatusStep(selected.status) + 1]?.label}
                  <ChevronRight size={14} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
