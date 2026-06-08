// ── /admin/games/queue ────────────────────────────────────────────────────────
// AI-generated proposals awaiting review. Operator approves (pushes to
// game_content with weight=1) or rejects (kept for audit). The Generate panel
// on /admin/games is what populates this queue.

import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, Inbox } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'
import { GAMES, DIFFICULTY_LABELS, type Difficulty } from '@/lib/games/types'
import { ProposalRow } from './ProposalRow'
import { BulkActions } from './BulkActions'

export const metadata: Metadata = { title: 'AI Proposal Queue — Brain Games Admin' }
export const dynamic = 'force-dynamic'

// Service-role client — Brain Games proposals + winners are admin-only data
// and have RLS enabled by default in Supabase. The user-context client (anon
// key + cookies) silently returns zero rows even when the data is there.
function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

interface ProposalRowData {
  id:         string
  game_type:  string
  difficulty: string
  theme:      string | null
  payload:    Record<string, unknown>
  model:      string | null
  notes:      string | null
  created_at: string
}

export default async function ProposalQueuePage() {
  const supabase = supabaseAdmin()

  // Probe — if the table doesn't exist yet, show the migration prompt
  const probe = await supabase.from('game_content_proposals').select('id').limit(1)
  if (probe.error) {
    return (
      <div className="flex-1 overflow-y-auto">
      <main className="p-6 max-w-3xl mx-auto">
        <BackLink />
        <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 px-5 py-4">
          <p className="text-sm font-bold text-amber-900 mb-1">Migration needed</p>
          <p className="text-sm text-amber-800 leading-relaxed">
            Apply <code className="bg-amber-100 px-1 rounded">supabase/migrations/084_game_content_proposals.sql</code> in the Supabase SQL editor to enable the AI proposal queue.
          </p>
        </div>
      </main>
      </div>
    )
  }

  const { data: pendingData, error: pendingErr } = await supabase
    .from('game_content_proposals')
    .select('id, game_type, difficulty, theme, payload, model, notes, created_at')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
  if (pendingErr) {
    console.error('[queue] failed to load pending proposals:', pendingErr)
  }
  const pending = (pendingData ?? []) as ProposalRowData[]

  // Group by (game, difficulty) so the operator can power through similar batches
  const groups = new Map<string, ProposalRowData[]>()
  for (const p of pending) {
    const key = `${p.game_type}|${p.difficulty}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(p)
  }

  // Recently reviewed (audit trail glance)
  const { data: recentlyReviewedData } = await supabase
    .from('game_content_proposals')
    .select('id, status, game_type, difficulty, reviewed_at')
    .neq('status', 'pending')
    .order('reviewed_at', { ascending: false })
    .limit(15)
  const recentlyReviewed = (recentlyReviewedData ?? []) as { id: string; status: string; game_type: string; difficulty: string; reviewed_at: string }[]

  return (
    <div className="flex-1 overflow-y-auto">
    <main className="p-6 max-w-[1100px] mx-auto space-y-6 pb-16">
      <BackLink />

      <header className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Inbox size={20} className="text-portal-blue" />
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">AI Proposal Queue</h1>
          </div>
          <p className="text-sm text-gray-500">
            {pending.length === 0
              ? 'Nothing pending — generate a batch from the games admin.'
              : `${pending.length} pending item${pending.length === 1 ? '' : 's'} across ${groups.size} game/difficulty group${groups.size === 1 ? '' : 's'}.`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {pending.length > 0 && (
            <BulkActions
              count={pending.length}
              variant="primary"
              label={`Approve all ${pending.length}`}
              showReject
            />
          )}
          <Link href="/admin/games"
            className="text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg px-3 py-2 hover:bg-gray-50">
            Generate more →
          </Link>
        </div>
      </header>

      {pending.length === 0 ? (
        <div className="border border-dashed border-gray-300 rounded-2xl p-10 text-center bg-white">
          <Inbox size={28} className="mx-auto text-gray-300 mb-3" />
          <p className="text-sm text-gray-500 mb-1">All caught up.</p>
          <p className="text-xs text-gray-400">Run &ldquo;Generate content&rdquo; on the games admin to populate this queue.</p>
        </div>
      ) : (
        <>
          {Array.from(groups.entries()).map(([key, items]) => {
            const [gameType, difficulty] = key.split('|')
            const game = GAMES.find(g => g.id === gameType)
            const diffLabel = DIFFICULTY_LABELS[difficulty as Difficulty] ?? difficulty
            return (
              <section key={key} className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-700">{game?.emoji} {game?.title ?? gameType}</span>
                    <span className="text-xs font-semibold text-gray-500 px-2 py-0.5 rounded-full bg-gray-100">{diffLabel}</span>
                    <span className="text-xs text-gray-400">· {items.length} pending</span>
                  </div>
                  <BulkActions
                    count={items.length}
                    filter={{ game_type: gameType, difficulty }}
                    label={`Approve these ${items.length}`}
                  />
                </div>
                <ul className="divide-y divide-gray-100">
                  {items.map(item => (
                    <ProposalRow
                      key={item.id}
                      id={item.id}
                      gameType={item.game_type}
                      payload={item.payload}
                      theme={item.theme}
                      model={item.model}
                      createdAt={item.created_at}
                    />
                  ))}
                </ul>
              </section>
            )
          })}
        </>
      )}

      {recentlyReviewed.length > 0 && (
        <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
            <h2 className="text-sm font-bold text-gray-700">Recent reviews</h2>
          </div>
          <ul className="divide-y divide-gray-100 text-sm">
            {recentlyReviewed.map(r => (
              <li key={r.id} className="px-5 py-2 flex items-center justify-between text-gray-600">
                <span className="truncate">
                  <span className="font-semibold text-gray-900">{r.game_type}</span>
                  <span className="text-gray-400"> · {r.difficulty}</span>
                </span>
                <span className="flex items-center gap-3 shrink-0">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    r.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-rose-100 text-rose-700'
                  }`}>{r.status}</span>
                  <span className="text-xs text-gray-400">{new Date(r.reviewed_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
    </div>
  )
}

function BackLink() {
  return (
    <Link href="/admin/games" className="inline-flex items-center gap-1 text-sm font-semibold text-gray-600 hover:text-gray-900">
      <ArrowLeft size={14} /> Back to Brain Games
    </Link>
  )
}
