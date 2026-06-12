'use client'

// Weekly poll widget for the 50+ homepage sidebar. Anonymous-first:
// reads device_token from localStorage (same pattern as reader_favorites),
// posts the vote to /api/x/poll-vote, swaps the option list for a results
// view when the user has voted (or the poll has closed).
//
// Visual states:
//   unengaged → question + 4 outline buttons + "X neighbors voted this week"
//   voted     → "You voted: X" + percentage bars + total count
//   closed    → results only, no vote buttons
//
// The "X neighbors voted" line is the social-proof + closure pattern —
// the publisher pushed back on the AI-Studio default which was just a
// row of unloved buttons.

import { useEffect, useState } from 'react'
import { readDeviceToken } from '@/lib/reader/device-token'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export interface PollData {
  id:           string
  question:     string
  options:      string[]
  vote_counts:  number[]
  total_votes:  number
  closes_at:    string | null
}

interface Props {
  poll: PollData
}

function closesLabel(closesAt: string | null): string {
  if (!closesAt) return 'Open all week'
  const closes = new Date(closesAt)
  const now    = new Date()
  if (closes <= now) return 'Closed'
  const days = Math.ceil((closes.getTime() - now.getTime()) / 86_400_000)
  if (days === 0) return 'Closes today'
  if (days === 1) return 'Closes tomorrow'
  return `Closes in ${days} days`
}

export function FiftyPlusPollWidget({ poll }: Props) {
  const [counts,      setCounts]      = useState<number[]>(poll.vote_counts.length === poll.options.length ? poll.vote_counts : new Array(poll.options.length).fill(0))
  const [total,       setTotal]       = useState<number>(poll.total_votes)
  const [votedIndex,  setVotedIndex]  = useState<number | null>(null)
  const [submitting,  setSubmitting]  = useState(false)
  const [error,       setError]       = useState<string | null>(null)
  const [hydrated,    setHydrated]    = useState(false)

  // On mount: check whether this device has voted before. The endpoint
  // returns {votedIndex, counts, total, closed} so we re-sync server-side
  // state without flashing the unengaged view.
  useEffect(() => {
    const token = readDeviceToken()
    if (!token) { setHydrated(true); return }
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`/api/x/poll-vote?poll_id=${poll.id}&device_token=${encodeURIComponent(token)}`)
        if (!cancelled && res.ok) {
          const j = await res.json()
          if (j.counts && Array.isArray(j.counts) && j.counts.length === poll.options.length) {
            setCounts(j.counts)
            setTotal(j.total ?? total)
          }
          if (typeof j.votedIndex === 'number') setVotedIndex(j.votedIndex)
        }
      } catch { /* swallow — render with server-rendered counts */ }
      finally { if (!cancelled) setHydrated(true) }
    })()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poll.id])

  const isClosed = !!(poll.closes_at && new Date(poll.closes_at) <= new Date())
  const showResults = votedIndex !== null || isClosed

  async function vote(idx: number) {
    if (submitting || showResults) return
    setSubmitting(true)
    setError(null)
    try {
      const token = readDeviceToken()
      const res = await fetch('/api/x/poll-vote', {
        method:  'POST',
        headers: { 'content-type': 'application/json' },
        body:    JSON.stringify({ poll_id: poll.id, option_index: idx, device_token: token }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(j.error ?? 'Vote failed')
        return
      }
      if (j.counts && Array.isArray(j.counts)) setCounts(j.counts)
      if (typeof j.total === 'number') setTotal(j.total)
      setVotedIndex(idx)
    } catch {
      setError('Network error — try again')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card className="border-none shadow-md bg-white">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="font-heading text-lg uppercase tracking-wider text-primary">Weekly Poll</CardTitle>
          <span className="text-[10px] font-bold uppercase tracking-wide text-secondary">
            {closesLabel(poll.closes_at)}
          </span>
        </div>
        <CardDescription className="font-serif">{showResults ? 'Thanks for weighing in.' : 'Have your say in the community.'}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="font-semibold text-primary mb-4">{poll.question}</p>

        {!showResults && (
          <div className="space-y-2">
            {poll.options.map((opt, i) => (
              <Button
                key={i}
                variant="outline"
                disabled={submitting || !hydrated}
                onClick={() => vote(i)}
                className="w-full justify-start font-normal h-auto py-3 px-4 text-left whitespace-normal"
              >
                {opt}
              </Button>
            ))}
          </div>
        )}

        {showResults && (
          <div className="space-y-3">
            {poll.options.map((opt, i) => {
              const count = counts[i] ?? 0
              const pct   = total > 0 ? Math.round((count / total) * 100) : 0
              const isMe  = votedIndex === i
              return (
                <div key={i} className="space-y-1">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className={`${isMe ? 'font-bold text-primary' : 'font-medium text-primary/85'}`}>
                      {isMe && <span aria-hidden="true" className="mr-1.5">●</span>}
                      {opt}
                    </span>
                    <span className="font-mono text-xs text-muted-foreground tabular-nums">
                      {pct}% <span className="text-muted-foreground/70">({count})</span>
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${isMe ? 'bg-secondary' : 'bg-primary/60'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <p className="mt-4 text-xs text-muted-foreground">
          {total === 0
            ? 'Be the first to vote.'
            : `${total.toLocaleString()} ${total === 1 ? 'neighbor' : 'neighbors'} voted this week.`}
        </p>
        {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
      </CardContent>
    </Card>
  )
}
