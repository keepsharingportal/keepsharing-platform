'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { RefreshCw, Stethoscope, ChevronDown, ChevronUp } from 'lucide-react'

type Question = {
  id: string
  name: string | null
  form_data: {
    first_name?: string
    age_range?: string
    question?: string
    [key: string]: string | undefined
  }
  status: string
  created_at: string
  ai_article: string | null
  editorial_item_id: string | null
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending:  { label: 'New',        color: 'bg-portal-amber-lt text-portal-amber ring-amber-200' },
  reviewed: { label: 'Reviewed',   color: 'bg-portal-blue-lt text-portal-blue ring-portal-blue/30' },
  selected: { label: 'Selected',   color: 'bg-purple-50 text-purple-700 ring-purple-200' },
  assigned: { label: 'Assigned',   color: 'bg-teal-50 text-teal-700 ring-teal-200' },
  answered: { label: 'Answered',   color: 'bg-green-50 text-green-700 ring-green-200' },
  rejected: { label: 'Not Used',   color: 'bg-red-50 text-red-700 ring-red-200' },
}

const MOCK_QUESTIONS: Question[] = [
  {
    id: '1',
    name: 'M.T.',
    form_data: { first_name: 'M.T.', age_range: '55-64', question: "I've been having occasional dizzy spells when I stand up quickly. My doctor says my blood pressure is fine. What else could be causing this and should I be worried?" },
    status: 'pending',
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    ai_article: null,
    editorial_item_id: null,
  },
  {
    id: '2',
    name: 'B.W.',
    form_data: { first_name: 'B.W.', age_range: '65-74', question: 'My doctor mentioned I should ask about a shingles vaccine. I had chickenpox as a child. Is the vaccine still recommended at 68 and what are the risks?' },
    status: 'reviewed',
    created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    ai_article: null,
    editorial_item_id: null,
  },
  {
    id: '3',
    name: 'R.P.',
    form_data: { first_name: 'R.P.', age_range: '45-54', question: "Is it true that taking aspirin every day can help prevent heart attacks? I've heard conflicting things and want to know what the current thinking is before I start." },
    status: 'selected',
    created_at: new Date(Date.now() - 8 * 86400000).toISOString(),
    ai_article: null,
    editorial_item_id: null,
  },
  {
    id: '4',
    name: 'C.H.',
    form_data: { first_name: 'C.H.', age_range: '75+', question: "I take several medications and I've noticed my memory has gotten worse. Could my prescriptions be affecting my memory? How do I bring this up with my doctor?" },
    status: 'assigned',
    created_at: new Date(Date.now() - 12 * 86400000).toISOString(),
    ai_article: null,
    editorial_item_id: null,
  },
]

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending
  return (
    <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-semibold ring-1', cfg.color)}>
      {cfg.label}
    </span>
  )
}

export default function AskDoctorAdminPage() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading]     = useState(true)
  const [filter, setFilter]       = useState('all')
  const [expanded, setExpanded]   = useState<string | null>(null)
  const [notes, setNotes]         = useState<Record<string, string>>({})

  const load = async () => {
    setLoading(true)
    try {
      const url = filter !== 'all'
        ? `/api/submissions?formType=ask-the-doctor&status=${filter}`
        : '/api/submissions?formType=ask-the-doctor'
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setQuestions(data.length > 0 ? data : MOCK_QUESTIONS)
      } else {
        setQuestions(MOCK_QUESTIONS)
      }
    } catch {
      setQuestions(MOCK_QUESTIONS)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [filter])

  const updateStatus = async (id: string, status: string) => {
    setQuestions(q => q.map(item => item.id === id ? { ...item, status } : item))
    await fetch('/api/submissions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    }).catch(() => {})
  }

  const counts = Object.fromEntries(
    Object.keys(STATUS_CONFIG).map(s => [s, questions.filter(q => q.status === s).length])
  )
  const total = questions.length

  const visible = filter === 'all' ? questions : questions.filter(q => q.status === filter)

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Stethoscope size={16} className="text-portal-blue" />
            <h1 className="text-xl font-bold text-gray-900">Ask the Doctor — Queue</h1>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Manage reader health questions · Select monthly feature · Assign to doctor partner
          </p>
        </div>
        <button onClick={load} className="flex items-center gap-1 px-3 py-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50">
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      <div className="p-6 space-y-5">

        {/* Stats row */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {[
            { key: 'all',      label: 'Total',    count: total,            color: 'text-gray-700' },
            { key: 'pending',  label: 'New',      count: counts.pending,   color: 'text-portal-amber' },
            { key: 'reviewed', label: 'Reviewed', count: counts.reviewed,  color: 'text-portal-blue' },
            { key: 'selected', label: 'Selected', count: counts.selected,  color: 'text-purple-700' },
            { key: 'assigned', label: 'Assigned', count: counts.assigned,  color: 'text-teal-700' },
            { key: 'answered', label: 'Answered', count: counts.answered,  color: 'text-green-700' },
          ].map(s => (
            <button
              key={s.key}
              onClick={() => setFilter(s.key)}
              className={cn(
                'bg-white rounded-xl border p-3 text-center transition-all',
                filter === s.key ? 'border-blue-400 ring-1 ring-portal-blue/30' : 'border-gray-200 hover:border-gray-300'
              )}
            >
              <div className={cn('text-2xl font-bold', s.color)}>{s.count ?? 0}</div>
              <div className="text-[10px] text-gray-500 mt-0.5 uppercase tracking-wide">{s.label}</div>
            </button>
          ))}
        </div>

        {/* Workflow guide */}
        <div className="bg-portal-blue-lt border border-blue-200 rounded-xl p-4">
          <div className="text-xs font-bold text-portal-blue uppercase tracking-wide mb-2">Monthly Workflow</div>
          <div className="flex flex-wrap gap-2 items-center text-xs text-portal-blue">
            <span className="px-2 py-1 bg-portal-blue-lt rounded-lg">1. Review new questions</span>
            <span className="text-blue-400">→</span>
            <span className="px-2 py-1 bg-portal-blue-lt rounded-lg">2. Select one for this month</span>
            <span className="text-blue-400">→</span>
            <span className="px-2 py-1 bg-portal-blue-lt rounded-lg">3. Assign to doctor partner</span>
            <span className="text-blue-400">→</span>
            <span className="px-2 py-1 bg-portal-blue-lt rounded-lg">4. Doctor emails answer</span>
            <span className="text-blue-400">→</span>
            <span className="px-2 py-1 bg-portal-blue-lt rounded-lg">5. AI formats Q&A article</span>
            <span className="text-blue-400">→</span>
            <span className="px-2 py-1 bg-portal-blue-lt rounded-lg">6. Publishes in Boom Health dept</span>
          </div>
        </div>

        {/* Questions list */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-sm text-gray-400">Loading questions…</div>
          ) : visible.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-400">No questions in this queue.</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {visible.map(q => {
                const isOpen = expanded === q.id
                const fd = q.form_data
                return (
                  <div key={q.id}>
                    <button
                      className="w-full flex items-start gap-3 px-5 py-4 text-left hover:bg-gray-50 transition-colors"
                      onClick={() => setExpanded(isOpen ? null : q.id)}
                    >
                      {/* Icon */}
                      <div className="w-8 h-8 rounded-full bg-portal-blue-lt flex items-center justify-center shrink-0 mt-0.5">
                        <Stethoscope size={14} className="text-portal-blue" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-gray-900">{fd.first_name ?? 'Anonymous'}</span>
                          {fd.age_range && (
                            <span className="text-xs text-gray-400">Age {fd.age_range}</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2 leading-snug">
                          {fd.question ?? '(no question text)'}
                        </p>
                      </div>

                      {/* Right side */}
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <StatusBadge status={q.status} />
                        <span className="text-xs text-gray-400">
                          {new Date(q.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>

                      {isOpen ? <ChevronUp size={14} className="text-gray-400 shrink-0 mt-1" /> : <ChevronDown size={14} className="text-gray-400 shrink-0 mt-1" />}
                    </button>

                    {isOpen && (
                      <div className="px-5 pb-5 bg-gray-50/50 border-t border-gray-100 space-y-4">
                        {/* Full question */}
                        <div className="pt-4">
                          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Full Question</div>
                          <p className="text-sm text-gray-800 leading-relaxed bg-white border border-gray-200 rounded-xl p-3">
                            {fd.question}
                          </p>
                        </div>

                        {/* Notes */}
                        <div>
                          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Editorial Notes</div>
                          <textarea
                            value={notes[q.id] ?? ''}
                            onChange={e => setNotes(n => ({ ...n, [q.id]: e.target.value }))}
                            placeholder="Add internal notes (doctor to contact, topic relevance, etc.)"
                            rows={2}
                            className="w-full px-3 py-2 text-xs text-gray-800 bg-white border border-gray-200 rounded-xl outline-none focus:border-blue-400 resize-none"
                          />
                        </div>

                        {/* Status actions */}
                        <div>
                          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">Update Status</div>
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                              <button
                                key={key}
                                onClick={() => updateStatus(q.id, key)}
                                className={cn(
                                  'px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all',
                                  q.status === key
                                    ? 'bg-portal-navy text-white border-blue-600'
                                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                )}
                              >
                                {cfg.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Select as this month's feature */}
                        {q.status !== 'selected' && q.status !== 'assigned' && q.status !== 'answered' && (
                          <button
                            onClick={() => updateStatus(q.id, 'selected')}
                            className="w-full py-2 px-4 text-sm font-bold text-white bg-purple-600 rounded-xl hover:bg-purple-700 transition-colors"
                          >
                            Select as This Month's Feature →
                          </button>
                        )}

                        {q.status === 'selected' && (
                          <div className="bg-purple-50 border border-purple-200 rounded-xl p-3">
                            <div className="text-xs font-bold text-purple-800 mb-1">Selected for This Month</div>
                            <p className="text-xs text-purple-700">
                              Forward this question to your doctor partner. Once they reply, paste their answer below and generate the Q&A article.
                            </p>
                            <button
                              onClick={() => updateStatus(q.id, 'assigned')}
                              className="mt-3 px-4 py-1.5 text-xs font-bold text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors"
                            >
                              Mark as Assigned to Doctor
                            </button>
                          </div>
                        )}

                        {q.status === 'assigned' && (
                          <div className="bg-teal-50 border border-teal-200 rounded-xl p-3 space-y-3">
                            <div className="text-xs font-bold text-teal-800">Doctor's Answer</div>
                            <textarea
                              placeholder="Paste the doctor's emailed answer here…"
                              rows={4}
                              className="w-full px-3 py-2 text-xs text-gray-800 bg-white border border-gray-200 rounded-xl outline-none focus:border-teal-400 resize-none"
                            />
                            <button className="px-4 py-1.5 text-xs font-bold text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors">
                              Generate Q&A Article with AI →
                            </button>
                          </div>
                        )}
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
