'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Wand2, RefreshCw, Check, Zap, X, ChevronsUp } from 'lucide-react'
import { GAMES, DIFFICULTIES, DIFFICULTY_LABELS, type Difficulty, type GameId } from '@/lib/games/types'

interface Props {
  pendingCount: number
}

// Word-search is retired — don't offer it in the generator
const GENERATABLE: GameId[] = ['scramble', 'emoji', 'math', 'trivia', 'memory', 'family-connect']

interface BulkProgress {
  current:    number
  total:      number
  label:      string
  saved:      number
  failed:     { combo: string; reason: string }[]
  cancelled?: boolean
}

export function GeneratePanel({ pendingCount }: Props) {
  const router = useRouter()
  const [game,       setGame]       = useState<GameId>('scramble')
  const [difficulty, setDifficulty] = useState<Difficulty>('challenging')
  const [count,      setCount]      = useState(7)
  const [theme,      setTheme]      = useState('')
  const [busy,       setBusy]       = useState(false)
  const [result,     setResult]     = useState<{ ok: boolean; msg: string } | null>(null)

  const [bulkBusy,     setBulkBusy]     = useState(false)
  const [bulkProgress, setBulkProgress] = useState<BulkProgress | null>(null)
  const [bulkCount,    setBulkCount]    = useState(7)
  const [skipReview,   setSkipReview]   = useState(false)
  const cancelRef                       = useState({ cancel: false })[0]

  // ── Smart refill (cron-equivalent, on-demand) ───────────────────────────────
  // Calls the shared refill engine via /api/admin/games/refill. The same
  // logic runs daily via Vercel cron, but the editor can trigger an
  // immediate top-up when supply is low. Items go to the review queue
  // unless GAMES_REFILL_AUTO_APPROVE=true in Vercel env.
  const [refillBusy,    setRefillBusy]    = useState(false)
  const [refillResult,  setRefillResult]  = useState<{
    ok: boolean
    items_inserted?: number
    estimated_cost?: number
    cells_planned?:  number
    cells_run?:      number
    elapsed_ms?:     number
    msg?: string
  } | null>(null)

  async function runRefill() {
    setRefillBusy(true); setRefillResult(null)
    try {
      const res  = await fetch('/api/admin/games/refill', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({}),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setRefillResult({ ok: false, msg: json?.error ?? `HTTP ${res.status}` })
        return
      }
      setRefillResult({
        ok: true,
        items_inserted: json.items_inserted,
        estimated_cost: json.estimated_cost,
        cells_planned:  json.cells_planned,
        cells_run:      json.cells_run,
        elapsed_ms:     json.elapsed_ms,
      })
      router.refresh()
    } catch (e) {
      setRefillResult({ ok: false, msg: e instanceof Error ? e.message : String(e) })
    } finally { setRefillBusy(false) }
  }

  // ── single-batch generation ────────────────────────────────────────────────
  async function run() {
    setBusy(true); setResult(null)
    try {
      const res = await fetch('/api/admin/games/generate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ game, difficulty, count, theme: theme.trim() || undefined, skip_review: skipReview }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        const errs = Array.isArray(json?.errors) ? json.errors.join(' · ') : (json?.error ?? `HTTP ${res.status}`)
        setResult({ ok: false, msg: errs })
        return
      }
      const dropped = Array.isArray(json?.dropped) && json.dropped.length > 0
        ? ` (${json.dropped.length} dropped during validation)`
        : ''
      const destination = json.live ? 'the live pool' : 'the queue'
      setResult({ ok: true, msg: `Added ${json.saved} item${json.saved === 1 ? '' : 's'} to ${destination}${dropped}.` })
      router.refresh()
    } catch (e) {
      setResult({ ok: false, msg: e instanceof Error ? e.message : String(e) })
    } finally { setBusy(false) }
  }

  // ── BOOTSTRAP ALL: 6 games × 3 tiers = 18 batches ──────────────────────────
  // Sequential to be polite to Anthropic rate limits + so the operator can
  // watch progress one cell at a time. Each batch is ~10-30s of API time, so
  // the full run is roughly 3-9 minutes.
  async function runBulk() {
    const combos: { game: GameId; difficulty: Difficulty }[] = []
    for (const g of GENERATABLE) {
      for (const d of DIFFICULTIES) combos.push({ game: g, difficulty: d })
    }
    cancelRef.cancel = false
    setBulkBusy(true)
    setBulkProgress({ current: 0, total: combos.length, label: 'Warming up…', saved: 0, failed: [] })

    let saved  = 0
    const failed: BulkProgress['failed'] = []

    for (let i = 0; i < combos.length; i++) {
      if (cancelRef.cancel) {
        setBulkProgress({ current: i, total: combos.length, label: 'Cancelled', saved, failed, cancelled: true })
        break
      }
      const c = combos[i]
      const gameTitle = GAMES.find(g => g.id === c.game)?.title ?? c.game
      const tierLabel = DIFFICULTY_LABELS[c.difficulty]
      setBulkProgress({
        current: i + 1, total: combos.length,
        label:   `${gameTitle} · ${tierLabel}`,
        saved,   failed,
      })
      try {
        const res = await fetch('/api/admin/games/generate', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ game: c.game, difficulty: c.difficulty, count: bulkCount, skip_review: skipReview }),
        })
        const json = await res.json().catch(() => ({}))
        if (!res.ok) {
          const reason = Array.isArray(json?.errors) ? json.errors.join('; ') : (json?.error ?? `HTTP ${res.status}`)
          failed.push({ combo: `${gameTitle} · ${tierLabel}`, reason })
        } else {
          saved += json.saved ?? 0
        }
      } catch (e) {
        failed.push({ combo: `${gameTitle} · ${tierLabel}`, reason: e instanceof Error ? e.message : String(e) })
      }
      // Push intermediate progress update so the counters update live
      setBulkProgress(p => p ? { ...p, saved, failed: [...failed] } : p)
    }

    setBulkBusy(false)
    setBulkProgress(p => p ? { ...p, label: cancelRef.cancel ? 'Cancelled' : 'Complete' } : p)
    router.refresh()
  }

  function cancelBulk() { cancelRef.cancel = true }

  return (
    <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Wand2 size={14} className="text-primary" />
          <h2 className="text-sm font-bold text-gray-700">Generate content with Claude</h2>
        </div>
        <Link
          href="/admin/games/queue"
          className="text-xs font-bold inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-900 text-white hover:bg-gray-700"
        >
          Review queue
          {pendingCount > 0 && (
            <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-amber-400 text-amber-950 text-[10px] font-black">
              {pendingCount}
            </span>
          )}
        </Link>
      </div>

      {/* ── SKIP-REVIEW TOGGLE ─────────────────────────────────────────────── */}
      <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
        <label className="inline-flex items-center gap-2 cursor-pointer text-sm">
          <input
            type="checkbox"
            checked={skipReview}
            onChange={e => setSkipReview(e.target.checked)}
            disabled={busy || bulkBusy}
            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
          />
          <span className="font-bold text-gray-900">Skip review — insert straight into the live pool</span>
        </label>
        <p className="text-[11px] text-gray-500 max-w-md text-right">
          {skipReview
            ? '⚡ Items go LIVE immediately. Server validators still catch malformed items. You can retire bad items later in the content editor.'
            : '🛡 Items land in the queue for one-click review. Recommended for the first batch of a new game.'}
        </p>
      </div>

      {/* ── BOOTSTRAP-ALL BAND ─────────────────────────────────────────────── */}
      <div className="px-5 py-4 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-100">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-[240px]">
            <p className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
              <Zap size={14} className="text-amber-600" />
              Bootstrap the whole pool
            </p>
            <p className="text-xs text-gray-600 mt-1 leading-relaxed">
              Fires {GENERATABLE.length * DIFFICULTIES.length} batches: every game × every tier. ~3-9 minutes total.
              {skipReview ? ' Items go live immediately.' : ' Items land in the queue for your review.'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
              Each batch:
            </label>
            <input
              type="number"
              min={3}
              max={15}
              value={bulkCount}
              onChange={e => setBulkCount(Math.max(3, Math.min(15, Number(e.target.value) || 7)))}
              disabled={bulkBusy}
              className="w-16 text-sm px-2 py-1.5 border border-gray-200 rounded-lg bg-white"
            />
            <button
              type="button"
              onClick={runBulk}
              disabled={bulkBusy || busy}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-bold bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-40"
            >
              {bulkBusy ? <RefreshCw size={14} className="animate-spin" /> : <Zap size={14} />}
              {bulkBusy
                ? `Generating ${bulkProgress?.current ?? 0}/${bulkProgress?.total ?? 0}…`
                : `Generate ${GENERATABLE.length * DIFFICULTIES.length} × ${bulkCount} = ${GENERATABLE.length * DIFFICULTIES.length * bulkCount} items`}
            </button>
          </div>
        </div>

        {bulkProgress && (
          <div className="mt-3 bg-white border border-amber-200 rounded-lg p-3">
            <div className="flex items-center justify-between gap-2 mb-2">
              <p className="text-xs font-bold text-gray-700">
                {bulkProgress.label}
              </p>
              <p className="text-xs text-gray-500 tabular-nums">
                {bulkProgress.current} / {bulkProgress.total}
              </p>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full ${bulkProgress.cancelled ? 'bg-gray-400' : bulkBusy ? 'bg-amber-500' : 'bg-green-500'}`}
                style={{ width: `${Math.round((bulkProgress.current / bulkProgress.total) * 100)}%` }}
              />
            </div>
            <div className="flex items-center justify-between gap-3 mt-2 text-[11px] text-gray-500">
              <span>
                <strong className="text-green-700">{bulkProgress.saved}</strong> items queued
                {bulkProgress.failed.length > 0 && (
                  <>
                    {' '}·{' '}
                    <strong className="text-rose-700">{bulkProgress.failed.length}</strong> failed
                  </>
                )}
              </span>
              {bulkBusy && (
                <button type="button" onClick={cancelBulk} className="inline-flex items-center gap-1 text-gray-500 hover:text-rose-700">
                  <X size={11} /> Cancel
                </button>
              )}
            </div>
            {bulkProgress.failed.length > 0 && !bulkBusy && (
              <details className="mt-2 text-[11px]">
                <summary className="cursor-pointer text-rose-700 font-semibold">View {bulkProgress.failed.length} failure{bulkProgress.failed.length === 1 ? '' : 's'}</summary>
                <ul className="mt-1 space-y-1 text-gray-600">
                  {bulkProgress.failed.map((f, i) => (
                    <li key={i}><strong>{f.combo}:</strong> {f.reason}</li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}
      </div>

      {/* ── SMART REFILL BAND ──────────────────────────────────────────────── */}
      {/* Same logic the daily cron runs — tops up every cell to the configured
          target days of supply (env: GAMES_TARGET_DAYS_OF_SUPPLY, default 10).
          Cost-capped via GAMES_REFILL_DAILY_BUDGET (default $20) so an error
          loop can't burn the API credit overnight. */}
      <div className="px-5 py-4 bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-100">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-[260px]">
            <p className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
              <ChevronsUp size={14} className="text-emerald-600" />
              Smart refill — top up every low cell to the target
            </p>
            <p className="text-xs text-gray-600 mt-1 leading-relaxed">
              Reads current supply per (game × tier), generates only what&apos;s missing to hit the target days
              of supply. Same engine runs nightly via Vercel cron (5am UTC) so the pool self-heals — use this
              button when you need an immediate top-up. Hard $20/day cost cap; items go to the review queue
              unless you&apos;ve set <code className="text-[10px] bg-white px-1 py-0.5 rounded">GAMES_REFILL_AUTO_APPROVE=true</code>.
            </p>
          </div>
          <button
            type="button"
            onClick={runRefill}
            disabled={refillBusy || busy || bulkBusy}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-bold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-40"
          >
            {refillBusy
              ? (<><RefreshCw size={14} className="animate-spin" /> Refilling…</>)
              : (<><ChevronsUp size={14} /> Refill all low cells</>)}
          </button>
        </div>
        {refillResult && (
          <div className={`mt-3 rounded-lg p-3 border text-xs ${refillResult.ok ? 'bg-white border-emerald-200 text-gray-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
            {refillResult.ok ? (
              <>
                <strong className="text-emerald-700">Done.</strong>{' '}
                {refillResult.items_inserted ?? 0} item{(refillResult.items_inserted ?? 0) === 1 ? '' : 's'} added across{' '}
                {refillResult.cells_run ?? 0} of {refillResult.cells_planned ?? 0} planned cells
                {refillResult.estimated_cost !== undefined && (
                  <> · est. cost <strong>${refillResult.estimated_cost.toFixed(2)}</strong></>
                )}
                {refillResult.elapsed_ms !== undefined && (
                  <span className="text-gray-500"> · {(refillResult.elapsed_ms / 1000).toFixed(1)}s</span>
                )}
                {(refillResult.cells_run ?? 0) < (refillResult.cells_planned ?? 0) && (
                  <p className="mt-1 text-amber-700">Time or budget budget cut us short — re-run to keep filling the rest.</p>
                )}
              </>
            ) : (
              <>{refillResult.msg}</>
            )}
          </div>
        )}
      </div>

      {/* ── SINGLE-BATCH FORM ──────────────────────────────────────────────── */}
      <div className="p-5 grid sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
        <div className="lg:col-span-1">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Game</label>
          <select
            value={game}
            onChange={e => setGame(e.target.value as GameId)}
            className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg bg-white"
          >
            {GENERATABLE.map(id => {
              const g = GAMES.find(x => x.id === id)
              return <option key={id} value={id}>{g?.emoji} {g?.title ?? id}</option>
            })}
          </select>
        </div>

        <div className="lg:col-span-1">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Difficulty / audience</label>
          <select
            value={difficulty}
            onChange={e => setDifficulty(e.target.value as Difficulty)}
            className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg bg-white"
          >
            {DIFFICULTIES.map(d => (
              <option key={d} value={d}>{DIFFICULTY_LABELS[d]}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Count (1-15)</label>
          <input
            type="number"
            min={1}
            max={15}
            value={count}
            onChange={e => setCount(Math.max(1, Math.min(15, Number(e.target.value) || 1)))}
            className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg bg-white"
          />
        </div>

        <div className="sm:col-span-2 lg:col-span-2">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Theme (optional)</label>
          <input
            type="text"
            value={theme}
            onChange={e => setTheme(e.target.value)}
            placeholder='e.g., "back to school", "summer break", "Mother’s Day"'
            className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg bg-white"
          />
        </div>
      </div>

      <div className="px-5 pb-5 flex items-center justify-between gap-3 flex-wrap">
        <p className="text-[11px] text-gray-400 leading-relaxed">
          Or run a targeted single batch — useful for filling a specific cell or trying a theme.
        </p>
        <button
          type="button"
          onClick={run}
          disabled={busy || bulkBusy}
          className="inline-flex items-center gap-1.5 px-5 py-2 text-sm font-bold bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-40"
        >
          {busy ? <RefreshCw size={14} className="animate-spin" /> : <Wand2 size={14} />}
          {busy ? 'Generating…' : `Generate ${count}`}
        </button>
      </div>

      {result && (
        <div className={`mx-5 mb-5 rounded-lg px-3 py-2 text-xs font-semibold flex items-start gap-2 ${
          result.ok
            ? 'bg-green-50 border border-green-200 text-green-800'
            : 'bg-rose-50 border border-rose-200 text-rose-800'
        }`}>
          {result.ok && <Check size={13} className="shrink-0 mt-0.5" />}
          <span>{result.msg}</span>
        </div>
      )}
    </section>
  )
}
