// ── /admin/games ──────────────────────────────────────────────────────────────
// Brain Games admin: this week's rotation snapshot, content pool counts,
// leaderboard, and a "Draw the monthly winner" button.

import type { Metadata } from 'next'
import Link from 'next/link'
import { Trophy, Users, Sparkles, BookOpen, BookMarked, AlertTriangle } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'
import { GAMES, DIFFICULTIES, ROUNDS_PER_SESSION, type Difficulty, type GameId } from '@/lib/games/types'
import { isoWeek, isoWeekString, dailyContent } from '@/lib/games/weekly'
import { DrawWinnerButton } from './DrawWinnerButton'
import { AnnouncePanel } from './AnnouncePanel'
import { GeneratePanel } from './GeneratePanel'

// Daily rotation needs at least this many distinct days of variety per
// (game, difficulty) so the same content doesn't recycle. Same value
// the cron refill uses (lib/games/refill.ts reads GAMES_TARGET_DAYS_OF_SUPPLY
// env var; this constant is the UI's render-side default).
const TARGET_DAYS_OF_SUPPLY = 10

function daysOfSupply(gameId: GameId, poolCount: number): number {
  const rounds = ROUNDS_PER_SESSION[gameId]
  if (rounds <= 0) return 0
  return Math.floor(poolCount / rounds)
}

export const metadata: Metadata = { title: 'Brain Games — Admin' }
export const dynamic = 'force-dynamic'

// Monday-anchored start of the ISO week (for the "Week 21 (May 18–24)" label)
function weekDateRange(d: Date = new Date()): string {
  const target = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const dayNum = (target.getUTCDay() + 6) % 7
  const monday = new Date(target); monday.setUTCDate(monday.getUTCDate() - dayNum)
  const sunday = new Date(monday); sunday.setUTCDate(sunday.getUTCDate() + 6)
  const fmt = (x: Date) => x.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
  return `${fmt(monday)}–${fmt(sunday)}`
}

interface ScoreRow {
  id:         string
  first_name: string
  last_name:  string
  email:      string
  phone:      string | null
  game_type:  string
  difficulty: string
  score:      number
  iso_year:   number
  iso_week:   number
  created_at: string
  ghl_status: string
}

function fmtDateTime(s: string): string {
  return new Date(s).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
}

// Service-role client — Brain Games admin tables (game_content,
// game_scores, game_winners, game_content_proposals) have RLS enabled by
// default in Supabase and the user-context anon client silently returns
// empty results. Admin pages always read with the service role.
function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export default async function GamesAdminPage() {
  const supabase = supabaseAdmin()
  const week     = isoWeek()
  const weekIso  = isoWeekString()                           // YYYY-Www
  const weekLabel = `Week ${week.week} (${weekDateRange()})`

  // 1. Pool counts per (game, difficulty)
  interface PoolRow { game_type: string; difficulty: string }
  const poolProbe = await supabase.from('game_content').select('id').limit(1)
  const poolAvailable = !poolProbe.error
  const { data: poolData } = poolAvailable
    ? await supabase.from('game_content').select('game_type, difficulty').gt('weight', 0)
    : { data: null }
  const counts = new Map<string, number>()
  for (const row of (poolData ?? []) as PoolRow[]) {
    const key = `${row.game_type}|${row.difficulty}`
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }

  // 2. Today's rotation snapshot per game (Challenging tier for the dashboard glimpse)
  const rotationPreview = poolAvailable
    ? await Promise.all(
        GAMES.map(async g => {
          const { items } = await dailyContent(g.id as GameId, 'challenging')
          return { game: g, sample: items.slice(0, 2).map(i => i.payload) }
        }),
      )
    : []

  // 3. Leaderboard: top scores this week
  const { data: leaderData } = poolAvailable
    ? await supabase
        .from('game_scores')
        .select('id, first_name, last_name, email, phone, game_type, difficulty, score, iso_year, iso_week, created_at, ghl_status')
        .eq('iso_year', week.year)
        .eq('iso_week', week.week)
        .order('score', { ascending: false })
        .limit(20)
    : { data: null }
  const leaderboard = (leaderData ?? []) as ScoreRow[]

  // 4. This week's entries (for the 3 × $10 weekly draw)
  const { data: weekEntryData } = poolAvailable
    ? await supabase
        .from('game_scores')
        .select('id, first_name, last_name, email, phone, game_type, score')
        .eq('iso_year', week.year)
        .eq('iso_week', week.week)
        .order('created_at', { ascending: false })
    : { data: null }
  type WeekRow = { id: string; first_name: string; last_name: string; email: string; phone: string | null; game_type: string; score: number }
  const weekEntries = (weekEntryData ?? []) as WeekRow[]

  // 5. Already-recorded winners for this week (so admin sees the saved picks)
  const winnersProbe = await supabase.from('game_winners').select('id').limit(1)
  const winnersAvailable = !winnersProbe.error
  let existingWinners: { slot: number; first_name: string; last_initial: string }[] = []
  if (winnersAvailable) {
    const { data: w } = await supabase
      .from('game_winners')
      .select('slot, first_name, last_initial')
      .eq('market', 'rrp')
      .eq('week_iso', weekIso)
      .order('slot', { ascending: true })
    if (w) existingWinners = w as { slot: number; first_name: string; last_initial: string }[]
  }

  // 6. AI proposal queue depth (for the badge on the generate panel)
  const proposalsProbe = await supabase.from('game_content_proposals').select('id').limit(1)
  let pendingProposalCount = 0
  if (!proposalsProbe.error) {
    const { count } = await supabase
      .from('game_content_proposals')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending')
    pendingProposalCount = count ?? 0
  }

  return (
    <div className="flex-1 overflow-y-auto">
    <main className="p-6 max-w-[1200px] mx-auto space-y-6 pb-16">

      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={20} className="text-portal-blue" />
            <h1 className="text-xl font-bold text-portal-text tracking-tight">Brain Games</h1>
          </div>
          <p className="text-sm text-portal-sub">
            Daily challenge content + leaderboard + weekly 3 × $10 drawing.
            {weekLabel} · {weekEntries.length} entries this week.
          </p>
        </div>
        <Link href="/games" target="_blank" rel="noreferrer"
          className="text-sm font-semibold text-portal-text bg-white border border-portal-border rounded-lg px-3 py-2 hover:bg-portal-bg">
          View public Games page →
        </Link>
      </div>

      {!poolAvailable && (
        <div className="rounded-lg border border-portal-amber/40 bg-portal-amber-lt px-5 py-4">
          <p className="text-sm font-bold text-portal-amber mb-1">Brain Games need a database migration</p>
          <p className="text-sm text-portal-amber leading-relaxed">
            Apply migrations <code className="bg-portal-amber-lt px-1 rounded">080_brain_games.sql</code> through <code className="bg-portal-amber-lt px-1 rounded">084_game_content_proposals.sql</code> in the Supabase SQL editor. The full admin (winners + AI queue) activates once all are in.
          </p>
        </div>
      )}

      {/* HOW THIS WORKS */}
      <section className="bg-white border border-portal-border rounded-lg overflow-hidden">
        <div className="px-5 py-3 border-b border-portal-border bg-portal-bg flex items-center gap-2">
          <BookMarked size={14} className="text-portal-muted" />
          <h2 className="text-sm font-bold text-portal-text">How Brain Games works</h2>
        </div>
        <div className="p-5 grid md:grid-cols-2 gap-x-6 gap-y-4 text-sm text-portal-text leading-relaxed">
          <div>
            <p className="font-bold text-portal-text mb-1">1. Stock the content pool</p>
            <p>Every game needs items in <code className="bg-portal-row-hover px-1 rounded text-xs">game_content</code>. Click <strong>Generate</strong> below to have Claude draft a batch — they land in the <Link href="/admin/games/queue" className="text-portal-blue hover:underline font-semibold">AI proposal queue</Link>. You approve each one before it ships. Hand-curated items go through the <Link href="/admin/games/content" className="text-portal-blue hover:underline font-semibold">content editor</Link>.</p>
          </div>
          <div>
            <p className="font-bold text-portal-text mb-1">2. Daily rotation, weekly draw</p>
            <p>Players see fresh content every UTC midnight (same puzzles for everyone that day — bragging rights stay honest). On Mondays you draw <strong>3 × $10 winners</strong> from the week&apos;s entries at the bottom of this page. Re-draw overwrites all 3 slots.</p>
          </div>
          <div>
            <p className="font-bold text-portal-text mb-1">3. Each tier targets a different audience</p>
            <p><strong>Perfect for Kids</strong> = ages 5-12 (whole-family play). <strong>Challenging</strong> = the magazine&apos;s core parent audience. <strong>Brain Squeezing</strong> = parents of teens / empty-nesters. Claude is prompted with this so generated content stays on-tone per tier.</p>
          </div>
          <div>
            <p className="font-bold text-portal-text mb-1">4. Days of supply</p>
            <p>The pool table below shows how many days of variety you have per (game, tier). Anything under {TARGET_DAYS_OF_SUPPLY} days will recycle within a week — generate more to keep it fresh.</p>
          </div>
          <div>
            <p className="font-bold text-portal-text mb-1">5. Announce + share</p>
            <p>Use the announcement panel to send the weekly &ldquo;new games are up&rdquo; email via your GHL webhook. Players share Wordle-style emoji grids from the win screen — the brand line is identical across all 6 games for recognizability.</p>
          </div>
          <div>
            <p className="font-bold text-portal-text mb-1">6. Where things live</p>
            <p>Scores → <code className="bg-portal-row-hover px-1 rounded text-xs">game_scores</code>. Winners → <code className="bg-portal-row-hover px-1 rounded text-xs">game_winners</code> (one row per slot per week). Proposals → <code className="bg-portal-row-hover px-1 rounded text-xs">game_content_proposals</code>. Approved items → <code className="bg-portal-row-hover px-1 rounded text-xs">game_content</code>.</p>
          </div>
        </div>
      </section>

      {poolAvailable && (
        <>
          {/* STATS */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Entries this week',  value: weekEntries.length,   tone: '#22c55e' },
              { label: 'Plays in leaderboard',value: leaderboard.length,  tone: '#3b82f6' },
              { label: 'Content pool items', value: (poolData?.length ?? 0), tone: '#a855f7' },
              { label: 'Top score this week',value: leaderboard[0]?.score ?? 0, tone: '#ef6442' },
            ].map(s => (
              <div key={s.label} className="bg-white border border-portal-border rounded-lg px-4 py-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.tone }} />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-portal-muted">{s.label}</span>
                </div>
                <p className="text-2xl font-bold text-portal-text">{s.value}</p>
              </div>
            ))}
          </div>

          {/* AI GENERATE PANEL */}
          <GeneratePanel pendingCount={pendingProposalCount} />

          {/* CONTENT POOL */}
          <section className="bg-white border border-portal-border rounded-lg overflow-hidden">
            <div className="px-5 py-3 border-b border-portal-border bg-portal-bg flex items-center gap-2">
              <BookOpen size={14} className="text-portal-muted" />
              <h2 className="text-sm font-bold text-portal-text">Content pool · days of supply</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-portal-bg text-[11px] font-bold uppercase tracking-wider text-portal-sub">
                    <th className="text-left px-4 py-2">Game</th>
                    {DIFFICULTIES.map(d => (
                      <th key={d} className="text-center px-4 py-2">{d}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {GAMES.map(g => (
                    <tr key={g.id} className="border-t border-portal-border">
                      <td className="px-4 py-2.5">
                        <p className="font-semibold text-portal-text">{g.emoji} {g.title}</p>
                        <p className="text-xs text-portal-muted">{ROUNDS_PER_SESSION[g.id]}/day</p>
                      </td>
                      {DIFFICULTIES.map(d => {
                        const n        = counts.get(`${g.id}|${d}`) ?? 0
                        const supply   = daysOfSupply(g.id as GameId, n)
                        const lowPool  = supply < TARGET_DAYS_OF_SUPPLY
                        const empty    = n === 0
                        return (
                          <td key={d} className="text-center px-4 py-2.5">
                            <span className={`inline-block text-sm font-bold ${empty ? 'text-portal-red' : lowPool ? 'text-portal-amber' : 'text-portal-text'}`}>
                              {n}
                            </span>
                            <p className={`text-[10px] font-semibold ${empty ? 'text-portal-red' : lowPool ? 'text-portal-amber' : 'text-portal-muted'}`}>
                              {empty
                                ? 'Empty'
                                : `${supply} day${supply === 1 ? '' : 's'}${lowPool ? ' · low' : ''}`}
                            </p>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 bg-portal-bg border-t border-portal-border flex items-center justify-between gap-3 flex-wrap">
              <p className="text-[11px] text-portal-muted flex items-center gap-1.5">
                <AlertTriangle size={11} className="text-portal-amber" />
                Target: at least {TARGET_DAYS_OF_SUPPLY} days of supply per cell. Anything lower will repeat within a week.
              </p>
              <Link href="/admin/games/content"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-portal-navy text-white rounded-lg hover:bg-portal-navy">
                Open content editor →
              </Link>
            </div>
          </section>

          {/* TODAY'S ROTATION SNAPSHOT */}
          <section className="bg-white border border-portal-border rounded-lg overflow-hidden">
            <div className="px-5 py-3 border-b border-portal-border bg-portal-bg flex items-center gap-2">
              <Sparkles size={14} className="text-portal-muted" />
              <h2 className="text-sm font-bold text-portal-text">Today&apos;s rotation (Challenging preview)</h2>
            </div>
            <ul className="divide-y divide-portal-border">
              {rotationPreview.map(({ game, sample }) => (
                <li key={game.id} className="p-4">
                  <p className="text-sm font-semibold text-portal-text mb-1">{game.emoji} {game.title}</p>
                  <p className="text-xs text-portal-sub font-mono break-all">
                    {sample.length > 0 ? JSON.stringify(sample[0]).slice(0, 180) : 'No content in pool'}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          {/* LEADERBOARD */}
          <section className="bg-white border border-portal-border rounded-lg overflow-hidden">
            <div className="px-5 py-3 border-b border-portal-border bg-portal-bg flex items-center gap-2">
              <Users size={14} className="text-portal-muted" />
              <h2 className="text-sm font-bold text-portal-text">This week&apos;s top 20</h2>
            </div>
            {leaderboard.length === 0 ? (
              <p className="p-8 text-center text-sm text-portal-muted">No plays yet this week.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-portal-bg text-[11px] font-bold uppercase tracking-wider text-portal-sub">
                      <th className="text-left px-4 py-2">#</th>
                      <th className="text-left px-4 py-2">Player</th>
                      <th className="text-left px-4 py-2">Email</th>
                      <th className="text-left px-4 py-2">Game</th>
                      <th className="text-right px-4 py-2">Score</th>
                      <th className="text-left px-4 py-2">When</th>
                      <th className="text-left px-4 py-2">GHL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((s, i) => (
                      <tr key={s.id} className="border-t border-portal-border">
                        <td className="px-4 py-2 font-semibold text-portal-sub">{i + 1}</td>
                        <td className="px-4 py-2">{s.first_name} {s.last_name}</td>
                        <td className="px-4 py-2 text-xs text-portal-sub">{s.email}</td>
                        <td className="px-4 py-2 text-xs">{GAMES.find(g => g.id === s.game_type)?.title ?? s.game_type} · <span className="text-portal-muted">{s.difficulty}</span></td>
                        <td className="px-4 py-2 text-right font-bold text-portal-blue">{s.score}</td>
                        <td className="px-4 py-2 text-xs text-portal-sub">{fmtDateTime(s.created_at)}</td>
                        <td className="px-4 py-2 text-xs">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            s.ghl_status === 'sent'   ? 'bg-portal-green-lt text-portal-green' :
                            s.ghl_status === 'failed' ? 'bg-portal-red-lt text-portal-red'   :
                                                        'bg-portal-row-hover text-portal-sub'
                          }`}>{s.ghl_status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* WEEKLY ANNOUNCEMENT EMAIL */}
          <AnnouncePanel
            isoYear={week.year}
            isoWeek={week.week}
            webhookConfigured={Boolean(process.env.GHL_GAMES_ANNOUNCEMENT_WEBHOOK_URL || process.env.GHL_NEWSLETTER_WEBHOOK_URL)}
          />

          {/* WEEKLY 3 × $10 WINNER DRAW */}
          <section className="bg-white border border-portal-border rounded-lg overflow-hidden">
            <div className="px-5 py-3 border-b border-portal-border bg-portal-bg flex items-center gap-2">
              <Trophy size={14} className="text-portal-blue" />
              <h2 className="text-sm font-bold text-portal-text">Weekly 3 × $10 winners — {weekLabel}</h2>
            </div>
            <div className="p-5">
              {weekEntries.length === 0 ? (
                <p className="text-sm text-portal-muted">No entries yet for {weekLabel}.</p>
              ) : (
                <DrawWinnerButton
                  scores={weekEntries}
                  weekLabel={weekLabel}
                  weekIso={weekIso}
                  existingWinners={existingWinners}
                />
              )}
              <p className="text-[11px] text-portal-muted mt-3 leading-relaxed">
                Each play this week counts as one entry. Click the button to pick 3 random winners (each gets $10).
                Re-drawing overwrites all 3 slots. Full audit trail in <code className="bg-portal-row-hover px-1 rounded">game_scores</code> + <code className="bg-portal-row-hover px-1 rounded">game_winners</code>.
              </p>
            </div>
          </section>
        </>
      )}
    </main>
    </div>
  )
}
