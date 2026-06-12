// ── /admin/polls/[id] ─────────────────────────────────────────────────────
// View + edit a single poll. Live results render at the top (percentage
// bars + raw counts) — the same view readers see, but with the editor
// controls below.

import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { ArrowLeft } from 'lucide-react'
import { requireAdmin } from '@/lib/admin/auth'
import { MARKETS } from '@/lib/markets'
import { PollEditorClient } from '../PollEditorClient'

export const metadata: Metadata = { title: 'Edit Poll — Admin' }
export const dynamic = 'force-dynamic'

interface Props { params: Promise<{ id: string }> }

function adminDb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export default async function EditPollPage({ params }: Props) {
  await requireAdmin()
  const { id } = await params
  const sb = adminDb()

  const { data, error } = await sb.from('weekly_polls')
    .select('id, brand_slug, question, options, vote_counts, total_votes, opens_at, closes_at, is_active, internal_notes, created_at')
    .eq('id', id).maybeSingle()

  if (error || !data) {
    return (
      <div className="min-h-screen bg-portal-bg">
        <div className="portal-page-header">
          <Link href="/admin/polls" className="text-portal-sub hover:text-portal-text inline-flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" /> Back to polls
          </Link>
        </div>
        <div className="portal-content-body">
          <div className="portal-card p-6 text-portal-red">
            Could not load poll: {error?.message ?? 'not found'}
          </div>
        </div>
      </div>
    )
  }

  const totalVotes = data.total_votes ?? 0
  const counts: number[] = (data.vote_counts as number[] | null) ?? new Array(data.options.length).fill(0)

  return (
    <div className="min-h-screen bg-portal-bg">
      <div className="portal-page-header">
        <div className="flex items-center gap-3">
          <Link href="/admin/polls" className="text-portal-sub hover:text-portal-text"><ArrowLeft className="h-4 w-4" /></Link>
          <div>
            <h1 className="portal-page-title line-clamp-2 max-w-xl">{data.question}</h1>
            <p className="portal-page-subtitle">{totalVotes.toLocaleString()} votes</p>
          </div>
        </div>
      </div>

      <div className="portal-content-body space-y-4">

        {/* Results */}
        <div className="portal-card p-5">
          <h3 className="text-sm font-bold uppercase tracking-wider text-portal-sub mb-3">Live results</h3>
          {data.options.length === 0 ? (
            <p className="text-portal-sub text-sm">No options.</p>
          ) : (
            <ul className="space-y-3">
              {(data.options as string[]).map((opt, i) => {
                const c   = counts[i] ?? 0
                const pct = totalVotes > 0 ? Math.round((c / totalVotes) * 100) : 0
                return (
                  <li key={i} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-portal-text">{opt}</span>
                      <span className="font-mono text-xs text-portal-sub tabular-nums">{pct}% &middot; {c.toLocaleString()}</span>
                    </div>
                    <div className="h-2 bg-portal-bg rounded-full overflow-hidden">
                      <div className="h-full bg-portal-blue rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* Editor */}
        <PollEditorClient
          mode="edit"
          brands={MARKETS.map(m => ({ slug: m.slug, label: m.displayName }))}
          initial={{
            id:             data.id,
            brand_slug:     data.brand_slug,
            question:       data.question,
            options:        data.options as string[],
            opens_at:       data.opens_at,
            closes_at:      data.closes_at,
            is_active:      data.is_active,
            internal_notes: data.internal_notes,
          }}
        />
      </div>
    </div>
  )
}
