// Shared "refill the content pool to N days of supply" engine. Called by
// both the daily Vercel cron (/api/cron/games-refill) and the admin
// "Refill now" button (/api/admin/games/refill). Auth lives at the route
// level — this module assumes the caller is authorized.
//
// Behavior is identical regardless of caller:
//   - Read game_content, count per (game_type, difficulty)
//   - Compute days-of-supply per cell using ROUNDS_PER_SESSION
//   - For each cell below target, request enough items from Claude to
//     reach target — capped by BATCH_SIZE per game so heavy games stay
//     under a single 60s API call
//   - Insert as 'pending' to game_content_proposals (default) OR straight
//     to game_content if GAMES_REFILL_AUTO_APPROVE=true
//   - Honor a 280s soft time budget and a $-per-day cost cap so the
//     function always returns before Vercel's hard 300s timeout

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { DIFFICULTIES, ROUNDS_PER_SESSION, type Difficulty, type GameId } from './types'
import { generateContent } from './ai-generator'

const GAMES: GameId[] = ['scramble', 'emoji', 'math', 'trivia', 'memory', 'family-connect']

// How many items to request per generate() call, per game. Family
// Connect is heavy enough that we ask 1-at-a-time so each item gets full
// adaptive thinking and the call doesn't blow past 60s.
// Partial — word-search is retired and intentionally omitted; GAMES
// above filters it out so the lookup is always defined.
const BATCH_SIZE: Partial<Record<GameId, number>> = {
  'family-connect': 1,
  'memory':         5,
  'scramble':       10,
  'emoji':          10,
  'math':           10,
  'trivia':         10,
}

// Rough $/item used for the daily budget guard. NOT a billing meter —
// the real cost is whatever Anthropic charges. Conservative upper bounds.
const COST_ESTIMATE: Partial<Record<GameId, number>> = {
  'family-connect': 0.50,
  'memory':         0.10,
  'scramble':       0.05,
  'emoji':          0.05,
  'math':           0.05,
  'trivia':         0.05,
}

export interface CellPlan {
  game:       GameId
  difficulty: Difficulty
  current:    number
  needed:     number
}

export interface CellResult {
  game:       GameId
  difficulty: Difficulty
  generated:  number
  inserted:   number
  errors:     string[]
  est_cost:   number
}

export interface RefillSummary {
  target_days:    number
  cells_planned:  number
  cells_run:      number
  items_inserted: number
  estimated_cost: number
  elapsed_ms:     number
  auto_approved:  boolean
  results:        CellResult[]
}

export interface RefillOptions {
  dryRun?: boolean
  /** Override the env var defaults. */
  targetDays?:   number
  dailyBudget?:  number
  autoApprove?:  boolean
  /** Soft cutoff in ms. Default 280_000 (Vercel hard limit is 300s). */
  timeBudgetMs?: number
}

function targetDays(): number {
  const v = Number(process.env.GAMES_TARGET_DAYS_OF_SUPPLY)
  return Number.isFinite(v) && v > 0 ? v : 10
}

function dailyBudget(): number {
  const v = Number(process.env.GAMES_REFILL_DAILY_BUDGET)
  return Number.isFinite(v) && v > 0 ? v : 20
}

function autoApprove(): boolean {
  return process.env.GAMES_REFILL_AUTO_APPROVE === 'true'
}

function sb(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
    { auth: { persistSession: false } },
  )
}

/**
 * Plan-only — what we WOULD generate. Cheap; safe to call from a "preview"
 * button without consuming API credits.
 */
export async function planRefill(opts: { targetDays?: number } = {}): Promise<{
  target_days: number
  plans:       CellPlan[]
  estimated_cost: number
}> {
  const supabase = sb()
  const target   = opts.targetDays ?? targetDays()

  const { data: poolRows, error } = await supabase
    .from('game_content')
    .select('game_type, difficulty')
  if (error) throw new Error(`game_content read failed: ${error.message}`)

  const counts = new Map<string, number>()
  for (const row of poolRows ?? []) {
    counts.set(`${row.game_type}|${row.difficulty}`, (counts.get(`${row.game_type}|${row.difficulty}`) ?? 0) + 1)
  }

  const plans: CellPlan[] = []
  for (const game of GAMES) {
    const rounds = ROUNDS_PER_SESSION[game] ?? 1
    for (const difficulty of DIFFICULTIES) {
      const current  = counts.get(`${game}|${difficulty}`) ?? 0
      const targetCt = rounds * target
      if (current < targetCt) {
        plans.push({ game, difficulty, current, needed: targetCt - current })
      }
    }
  }
  plans.sort((a, b) => a.needed - b.needed)

  return {
    target_days:   target,
    plans,
    estimated_cost: Number(plans.reduce((s, p) => s + p.needed * (COST_ESTIMATE[p.game] ?? 0.05), 0).toFixed(2)),
  }
}

export async function runRefill(opts: RefillOptions = {}): Promise<RefillSummary> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY not configured')
  }

  const supabase = sb()
  const target   = opts.targetDays  ?? targetDays()
  const budget   = opts.dailyBudget ?? dailyBudget()
  const approve  = opts.autoApprove ?? autoApprove()
  const startMs  = Date.now()
  const deadline = startMs + (opts.timeBudgetMs ?? 280_000)

  const plan = await planRefill({ targetDays: target })
  const plans = plan.plans

  if (opts.dryRun) {
    return {
      target_days:    target,
      cells_planned:  plans.length,
      cells_run:      0,
      items_inserted: 0,
      estimated_cost: plan.estimated_cost,
      elapsed_ms:     Date.now() - startMs,
      auto_approved:  approve,
      results:        plans.map(p => ({
        game: p.game, difficulty: p.difficulty,
        generated: 0, inserted: 0, errors: [], est_cost: 0,
      })),
    }
  }

  const results: CellResult[] = []
  let spent = 0

  for (const p of plans) {
    if (Date.now() > deadline) break
    if (spent >= budget) break

    const result: CellResult = {
      game: p.game, difficulty: p.difficulty,
      generated: 0, inserted: 0, errors: [], est_cost: 0,
    }
    // Defaults are safe for any future game added — keeps the cron
    // tolerant of GAMES_LIST drift without crashing.
    const batchSize = BATCH_SIZE[p.game]    ?? 5
    const perItem   = COST_ESTIMATE[p.game] ?? 0.10

    let remaining = p.needed
    while (remaining > 0) {
      if (Date.now() > deadline) { result.errors.push('time_budget_exceeded'); break }
      if (spent + perItem > budget) { result.errors.push('cost_budget_exceeded'); break }

      const count = Math.min(batchSize, remaining)
      try {
        const gen = await generateContent({ game: p.game, difficulty: p.difficulty, count })
        result.generated += gen.items.length
        if (gen.errors.length > 0) result.errors.push(...gen.errors.slice(0, 3))

        if (gen.items.length > 0) {
          if (approve) {
            const { data: ins, error: insErr } = await supabase
              .from('game_content')
              .insert(gen.items.map(it => ({
                game_type: p.game, difficulty: p.difficulty,
                payload:   it.payload, weight: 1,
              })))
              .select('id')
            if (insErr) result.errors.push(`live_insert: ${insErr.message}`)
            else        result.inserted += ins?.length ?? 0
          } else {
            const { data: ins, error: insErr } = await supabase
              .from('game_content_proposals')
              .insert(gen.items.map(it => ({
                game_type: p.game, difficulty: p.difficulty,
                payload:   it.payload, source: 'ai',
                model:     gen.model, status: 'pending',
                notes:     gen.model_notes,
              })))
              .select('id')
            if (insErr) result.errors.push(`proposal_insert: ${insErr.message}`)
            else        result.inserted += ins?.length ?? 0
          }
        }

        spent += gen.items.length * perItem
        result.est_cost += gen.items.length * perItem
        remaining -= gen.items.length

        if (gen.items.length === 0) {
          result.errors.push('zero_items_returned')
          break
        }
      } catch (e) {
        result.errors.push(`generate: ${e instanceof Error ? e.message : String(e)}`)
        break
      }
    }
    results.push(result)
  }

  return {
    target_days:    target,
    cells_planned:  plans.length,
    cells_run:      results.length,
    items_inserted: results.reduce((s, r) => s + r.inserted, 0),
    estimated_cost: Number(spent.toFixed(2)),
    elapsed_ms:     Date.now() - startMs,
    auto_approved:  approve,
    results,
  }
}
