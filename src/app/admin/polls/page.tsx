// ── /admin/polls ──────────────────────────────────────────────────────────
// Weekly poll list. Top-right "New poll" button. Each row shows the
// question, brand scope, total votes, status (open/closed/scheduled),
// closes-in countdown, and a quick deactivate/delete control.

import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { ArrowLeft, Plus, BarChart3 } from 'lucide-react'
import { requireAdmin } from '@/lib/admin/auth'
import { MARKETS } from '@/lib/markets'

export const metadata: Metadata = { title: 'Weekly Polls — Admin' }
export const dynamic = 'force-dynamic'

function adminDb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

interface PollRow {
  id:          string
  brand_slug:  string | null
  question:    string
  options:     string[]
  vote_counts: number[]
  total_votes: number
  opens_at:    string
  closes_at:   string | null
  is_active:   boolean
  created_at:  string
}

function statusOf(p: PollRow): { label: string; cls: string } {
  if (!p.is_active) return { label: 'Inactive', cls: 'portal-badge-gray' }
  const now = new Date()
  if (new Date(p.opens_at) > now) return { label: 'Scheduled', cls: 'portal-badge-amber' }
  if (p.closes_at && new Date(p.closes_at) < now) return { label: 'Closed', cls: 'portal-badge-gray' }
  return { label: 'Open', cls: 'portal-badge-green' }
}

function brandLabel(slug: string | null): string {
  if (!slug) return 'All brands'
  return MARKETS.find(m => m.slug === slug)?.short ?? slug.toUpperCase()
}

export default async function PollsAdminPage() {
  await requireAdmin()
  const sb = adminDb()

  let migrated = true
  let polls: PollRow[] = []
  try {
    const { data, error } = await sb.from('weekly_polls')
      .select('id, brand_slug, question, options, vote_counts, total_votes, opens_at, closes_at, is_active, created_at')
      .order('created_at', { ascending: false })
      .limit(100)
    if (error && /relation "weekly_polls" does not exist/i.test(error.message)) migrated = false
    else if (!error) polls = (data ?? []) as PollRow[]
  } catch { migrated = false }

  return (
    <div className="min-h-screen bg-portal-bg">
      <div className="portal-page-header">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="text-portal-sub hover:text-portal-text"><ArrowLeft className="h-4 w-4" /></Link>
          <div>
            <h1 className="portal-page-title flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-portal-blue" />
              Weekly Polls
            </h1>
            <p className="portal-page-subtitle">Engagement primitive on the homepage sidebar. Brand-scoped or all-brands.</p>
          </div>
        </div>
        <Link href="/admin/polls/new" className="portal-btn portal-btn-primary">
          <Plus className="h-3.5 w-3.5" /> New poll
        </Link>
      </div>

      <div className="portal-content-body">
        {!migrated && (
          <div className="portal-card p-6 mb-4 bg-portal-amber-lt border-portal-amber">
            <h3 className="font-bold text-portal-amber mb-1">Migration 170 not yet applied</h3>
            <p className="text-sm text-portal-text">Run <code>supabase/migrations/170_weekly_polls.sql</code> against your database to enable polls.</p>
          </div>
        )}

        {migrated && polls.length === 0 && (
          <div className="portal-card p-8 text-center text-portal-sub">
            <p className="mb-3">No polls yet — be the first to ask something.</p>
            <Link href="/admin/polls/new" className="portal-btn portal-btn-primary">
              <Plus className="h-3.5 w-3.5" /> Create your first poll
            </Link>
          </div>
        )}

        {migrated && polls.length > 0 && (
          <div className="portal-card overflow-hidden">
            <table className="portal-table">
              <thead>
                <tr>
                  <th className="portal-th">Question</th>
                  <th className="portal-th">Brand</th>
                  <th className="portal-th">Votes</th>
                  <th className="portal-th">Status</th>
                  <th className="portal-th">Closes</th>
                  <th className="portal-th"></th>
                </tr>
              </thead>
              <tbody>
                {polls.map(p => {
                  const st = statusOf(p)
                  return (
                    <tr key={p.id}>
                      <td className="portal-td max-w-[420px]">
                        <Link href={`/admin/polls/${p.id}`} className="font-semibold text-portal-text hover:text-portal-blue line-clamp-2">
                          {p.question}
                        </Link>
                        <div className="text-[11px] text-portal-sub mt-0.5">{p.options.length} options</div>
                      </td>
                      <td className="portal-td">
                        <span className="portal-badge portal-badge-blue">{brandLabel(p.brand_slug)}</span>
                      </td>
                      <td className="portal-td font-mono">{p.total_votes.toLocaleString()}</td>
                      <td className="portal-td"><span className={`portal-badge ${st.cls}`}>{st.label}</span></td>
                      <td className="portal-td text-portal-sub text-xs">
                        {p.closes_at
                          ? new Date(p.closes_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                          : 'No close date'}
                      </td>
                      <td className="portal-td text-right">
                        <Link href={`/admin/polls/${p.id}`} className="portal-btn portal-btn-ghost portal-btn-sm">View / edit</Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
