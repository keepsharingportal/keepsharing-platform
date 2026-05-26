// Daily content rotation (with weekly branding).
//
// Internally rotates DAILY — same calendar day → same picks for everyone,
// midnight = new puzzles. Externally we still show "Week N" branding because
// it reads as a recurring program rather than disposable daily content.
//
// Why both? Daily creates the Wordle-style ritual ("did you do today's?").
// Weekly framing keeps the share card identifiable as a returning program.
//
// Personal-best keys do NOT include the day, so records carry across days.

import { createClient } from '@supabase/supabase-js'
import {
  type GameId, type Difficulty,
  ROUNDS_PER_SESSION,
} from './types'

// ── ISO calendar helpers ─────────────────────────────────────────────────────
//
// All daily/weekly computations are anchored to the magazine's local timezone
// (River Region Parents = America/Chicago). This way a parent playing at
// 11pm Central on Tuesday gets Tuesday's puzzle — not Wednesday's, which is
// what a UTC anchor would have produced (UTC is already Wednesday by then).
// Intl handles DST automatically, so there's no spring-forward fall-back math.
//
// When we expand to sister magazines in other timezones, swap this constant
// for a per-market lookup keyed off the request's market config.

const MARKET_TIMEZONE = 'America/Chicago'

function marketYMD(d: Date): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: MARKET_TIMEZONE,
    year:     'numeric',
    month:    '2-digit',
    day:      '2-digit',
  }).formatToParts(d)
  const get = (type: string) => parseInt(parts.find(p => p.type === type)?.value ?? '0', 10)
  return { year: get('year'), month: get('month'), day: get('day') }
}

export interface IsoWeek { year: number; week: number }

/** Returns { year, week } for the ISO-8601 week containing `d` in the market's timezone. ISO weeks start on Monday. */
export function isoWeek(d: Date = new Date()): IsoWeek {
  const { year, month, day } = marketYMD(d)
  const target = new Date(Date.UTC(year, month - 1, day))
  const dayNum = (target.getUTCDay() + 6) % 7  // Mon=0..Sun=6
  target.setUTCDate(target.getUTCDate() - dayNum + 3)
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4))
  const firstThursdayDayNum = (firstThursday.getUTCDay() + 6) % 7
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstThursdayDayNum + 3)
  const week = 1 + Math.round((target.getTime() - firstThursday.getTime()) / (7 * 24 * 3600 * 1000))
  return { year: target.getUTCFullYear(), week }
}

/** YYYY-Www string (e.g., "2026-W21"). Stable across calendar days within the same ISO week. */
export function isoWeekString(d: Date = new Date()): string {
  const { year, week } = isoWeek(d)
  return `${year}-W${String(week).padStart(2, '0')}`
}

/** YYYY-MM-DD in the market's timezone — the daily seed key. New puzzle at midnight local. */
export function isoDayString(d: Date = new Date()): string {
  const { year, month, day } = marketYMD(d)
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

// ── Deterministic shuffler (mulberry32 — fast, stable, no deps) ──────────────

function makeRng(seed: number): () => number {
  let s = seed >>> 0
  return function () {
    s = (s + 0x6D2B79F5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function seedFor(dayKey: string, game: GameId, difficulty: Difficulty): number {
  let h = 2166136261 >>> 0
  const tag = `${dayKey}-${game}-${difficulty}`
  for (let i = 0; i < tag.length; i++) {
    h ^= tag.charCodeAt(i)
    h = Math.imul(h, 16777619) >>> 0
  }
  return h
}

/** Stable shuffle using a seeded RNG. */
function shuffleSeeded<T>(items: T[], seed: number): T[] {
  const out = items.slice()
  const rng = makeRng(seed)
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

// ── Public API: fetch today's content for a (game, difficulty) ───────────────

interface ContentRow {
  id:        string
  payload:   Record<string, unknown>
  weight:    number
}

function supabaseAnon() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

/**
 * Pull the entire active pool for (game, difficulty), then deterministically
 * pick `rounds` items based on TODAY's UTC date. Same calendar day = same
 * picks for everyone in the world. New day at UTC midnight = new picks.
 *
 * Single-grid games (memory) get 1 row. Rotating games get
 * `ROUNDS_PER_SESSION[game]` items per session. If the pool is smaller than
 * the required round count, the pool itself is returned in seeded order.
 */
export async function dailyContent(
  game: GameId,
  difficulty: Difficulty,
  options: { now?: Date } = {},
): Promise<{ week: IsoWeek; dayKey: string; items: ContentRow[] }> {
  const now    = options.now ?? new Date()
  const week   = isoWeek(now)
  const dayKey = isoDayString(now)

  const supabase = supabaseAnon()
  const { data, error } = await supabase
    .from('game_content')
    .select('id, payload, weight')
    .eq('game_type', game)
    .eq('difficulty', difficulty)
    .gt('weight', 0)

  if (error || !data || data.length === 0) {
    return { week, dayKey, items: [] }
  }

  const pool = data as ContentRow[]
  const shuffled = shuffleSeeded(pool, seedFor(dayKey, game, difficulty))
  const rounds   = ROUNDS_PER_SESSION[game]
  return { week, dayKey, items: shuffled.slice(0, rounds) }
}

/** @deprecated — use dailyContent. Kept as a thin alias for back-compat. */
export const weeklyContent = dailyContent
