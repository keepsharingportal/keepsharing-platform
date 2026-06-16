// Sidebar poll widget. Reads weekly_polls.brand_slug active row;
// records votes via /api/polls/[id]/vote (existing). Renders results
// after vote with bar chart.
'use client'

import { useState } from 'react'
import { CheckCircle2, BarChart2 } from 'lucide-react'

interface Poll {
  id:          string
  question:    string
  options:     string[]
  vote_counts: number[]
  total_votes: number
}

export function BirthdayPoll({ poll }: { poll: Record<string, unknown> | null }) {
  const [voted, setVoted] = useState(false)
  const [busy,  setBusy]  = useState(false)
  const [local, setLocal] = useState<Poll | null>(poll ? {
    id:          poll.id as string,
    question:    poll.question as string,
    options:     (poll.options as string[]) ?? [],
    vote_counts: (poll.vote_counts as number[]) ?? [],
    total_votes: (poll.total_votes as number) ?? 0,
  } : null)

  if (!local) {
    return (
      <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-4">
        <div className="text-[10px] font-bold uppercase tracking-wider text-[#ff7a59] mb-1.5">This week&apos;s poll</div>
        <h3 className="text-[14px] font-bold text-slate-900">No poll active right now.</h3>
        <p className="text-[11px] text-slate-500 mt-1">New poll lands Monday.</p>
      </div>
    )
  }

  async function vote(idx: number) {
    if (busy || voted || !local) return
    setBusy(true)
    try {
      // Same endpoint the existing fifty-plus PollWidget uses.
      const token = localStorage.getItem('poll_device_token') ?? (() => {
        const t = Math.random().toString(36).slice(2) + Date.now().toString(36)
        localStorage.setItem('poll_device_token', t)
        return t
      })()
      const res = await fetch('/api/x/poll-vote', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ poll_id: local.id, option_index: idx, device_token: token }),
      })
      if (res.ok) {
        const newCounts = [...local.vote_counts]
        newCounts[idx] = (newCounts[idx] ?? 0) + 1
        setLocal({ ...local, vote_counts: newCounts, total_votes: local.total_votes + 1 })
        setVoted(true)
      }
    } finally { setBusy(false) }
  }

  return (
    <div className="bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden">
      <div className="bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white px-4 py-3">
        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider opacity-90">
          <BarChart2 size={11} /> This week&apos;s poll
        </div>
        <h3 className="text-[14px] font-bold mt-0.5 leading-snug">{local.question}</h3>
      </div>
      <div className="p-3 space-y-1.5">
        {local.options.map((opt, idx) => {
          const count = local.vote_counts[idx] ?? 0
          const pct   = local.total_votes > 0 ? (count / local.total_votes) * 100 : 0
          if (voted) {
            return (
              <div key={idx} className="text-[12px]">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-slate-700 font-semibold">{opt}</span>
                  <span className="text-slate-500 text-[11px]">{Math.round(pct)}%</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-700" style={{ width: `${pct}%` }} />
                </div>
              </div>
            )
          }
          return (
            <button
              key={idx} type="button" disabled={busy}
              onClick={() => vote(idx)}
              className="w-full text-left px-3 py-2 text-[12px] font-semibold text-slate-700 bg-slate-50 border border-slate-100 rounded-lg hover:border-violet-400 hover:bg-violet-50 transition-colors disabled:opacity-50"
            >{opt}</button>
          )
        })}
        {voted && (
          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100 mt-2">
            <span className="inline-flex items-center gap-1"><CheckCircle2 size={11} className="text-emerald-600" />Thanks for voting</span>
            <span>{local.total_votes} {local.total_votes === 1 ? 'vote' : 'votes'}</span>
          </div>
        )}
      </div>
    </div>
  )
}
