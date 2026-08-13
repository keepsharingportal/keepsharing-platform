// Automated weekly winner draw for Family Brain Games.
//
// Replaces the manual path (an admin clicks DrawWinnerButton, which picks with
// client-side Math.random()) with a scheduled server-side draw that runs every
// Monday, records the result, emails the winner, and emails the owner a payout
// instruction.
//
// ── Why this is a scheduled job and NOT an LLM agent ─────────────────────────
// Picking a prize winner must be uniformly random, reproducible in an audit,
// and defensible if a reader ever asks "how was this chosen?". An LLM is the
// wrong tool for all three: it is non-deterministic, its selection is not
// uniform, and there is no record you could show anyone. So selection here is
// crypto.randomInt over the week's entries, and every draw records the entry
// pool size alongside the winner. The parts a model would be good at — writing
// the congratulations copy — are better as a stable template for a recurring
// weekly email anyway.
//
// ── Safety properties ────────────────────────────────────────────────────────
// Idempotent:  a week that already has winners is never redrawn, so a cron
//              retry (or a manual re-trigger) cannot overwrite a result or
//              double-email a winner.
// Fail-loud:   a missing RESEND_API_KEY is reported in the result and logged
//              as an error, never silently skipped. The draw still records —
//              losing the email is recoverable, losing the draw is not.
// No entries:  records nothing and notifies the owner, rather than drawing
//              from an empty pool.
//
// ── Armed / disarmed ─────────────────────────────────────────────────────────
// A prize draw is a promise to readers, so "we haven't started yet" has to be a
// state the system actually holds rather than something the operator remembers.
// site_settings.games_draw_enabled is the switch: while it is 'false' the
// Monday cron records nothing, emails nobody, and returns status 'disabled',
// and the public /games hero drops the "first drawing this Monday" promise.
// Flip it from /admin/games when the process has been rehearsed. It is a
// database setting, not an env var, so arming does not need a redeploy — and
// disarming in a hurry doesn't either.
//
// ── Preview mode ─────────────────────────────────────────────────────────────
// mode: 'preview' runs the real selection against the real pool but writes
// NOTHING and emails no reader — both emails go to the person who asked for the
// rehearsal, subject-prefixed, so the whole flow (auth, env, Resend, template
// rendering, payout copy) can be rehearsed end to end without spending a dollar
// or contacting a player. Preview deliberately ignores the armed flag:
// rehearsing is what you do BEFORE arming, so blocking it there would defeat
// the point.
//
// previewTo is the acting admin's own address. It used to fall through to
// ownerEmail(), which meant the first real rehearsal mailed a hardcoded owner
// address the operator wasn't watching and looked exactly like "no email
// arrived". A rehearsal that lands somewhere you aren't looking is not a
// rehearsal.

import { randomInt } from 'node:crypto'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { isoWeek } from './weekly'
import { GAMES_PRIZE, prizeAmount } from './prize'

const MARKET = 'rrp'

/** DB key in site_settings holding the armed flag. */
export const DRAW_ENABLED_KEY = 'games_draw_enabled'

export type DrawStatus = 'drawn' | 'already_drawn' | 'no_entries' | 'preview' | 'disabled'
export type DrawMode = 'live' | 'preview'
export type NotifyStatus = 'sent' | 'failed' | 'not_configured'

export interface DrawnWinner {
  slot:         number
  score_id:     string
  first_name:   string
  last_initial: string | null
  email:        string
  prize_amount: number
}

export interface DrawResult {
  status:        DrawStatus
  mode:          DrawMode
  week_iso:      string
  /** How many entries were in the pool. Recorded so the draw is auditable. */
  entry_count:   number
  /** Distinct players behind those entries. */
  player_count:  number
  winners:       DrawnWinner[]
  notify_winner: NotifyStatus | null
  notify_owner:  NotifyStatus | null
  /** Where the emails actually went. In preview that's the owner, never a reader. */
  notified_to:   string | null
}

function sb(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
    { auth: { persistSession: false } },
  )
}

/**
 * Is the live weekly draw armed?
 *
 * Fails CLOSED — a missing row, a missing table, or an unreachable database
 * all read as "not armed". Maintenance mode fails open because the cost of
 * guessing wrong is a page that stays up; here the cost is drawing a winner
 * and emailing a reader before anyone meant to, which is not recoverable.
 */
export async function isDrawArmed(client?: SupabaseClient): Promise<boolean> {
  try {
    const supabase = client ?? sb()
    const { data } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', DRAW_ENABLED_KEY)
      .maybeSingle()
    return data?.value === 'true'
  } catch {
    return false
  }
}

function ownerEmail(): string {
  return process.env.GAMES_DRAW_NOTIFY_EMAIL
      ?? process.env.SUBMISSIONS_EDITOR_EMAIL
      ?? 'jason@riverregionparents.com'
}

function fromAddress(): string {
  return process.env.SUBMISSIONS_FROM_EMAIL
      ?? 'River Region Parents <hello@riverregionparents.com>'
}

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? 'https://riverregionparents.com'
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/**
 * The ISO week that just finished. Running on Monday, "last week" is the week
 * containing 3 days ago — far enough back that the boundary is unambiguous
 * regardless of what hour the cron fires, and timezone-anchored because
 * isoWeek() resolves against the market timezone rather than UTC.
 */
export function lastCompletedWeek(now: Date = new Date()): { year: number; week: number; iso: string } {
  const back = new Date(now.getTime() - 3 * 24 * 3600 * 1000)
  const { year, week } = isoWeek(back)
  return { year, week, iso: `${year}-W${String(week).padStart(2, '0')}` }
}

interface ScoreRow {
  id: string; first_name: string | null; last_name: string | null
  email: string | null; game_type: string; score: number
}

/**
 * Draw the winner(s) for a completed week.
 *
 * Every completed game is one entry, so a player who played three times has
 * three chances — that's the mechanic the site promises ("every completion =
 * one entry"), and it's what makes repeat play worth something.
 */
export async function runWeeklyDraw(
  opts: { weekIso?: string; now?: Date; mode?: DrawMode; previewTo?: string } = {},
): Promise<DrawResult> {
  const supabase = sb()
  const mode     = opts.mode ?? 'live'
  // Where a rehearsal's mail lands. The acting admin when we know them (the
  // admin route passes their session email), the owner otherwise — the cron's
  // ?mode=preview has no session to draw an address from.
  const previewTo = opts.previewTo?.trim() || ownerEmail()
  const target   = opts.weekIso
    ? { iso: opts.weekIso, year: Number(opts.weekIso.slice(0, 4)), week: Number(opts.weekIso.slice(6)) }
    : lastCompletedWeek(opts.now)

  const base = { mode, week_iso: target.iso, notified_to: null as string | null }

  // ── Armed gate (live only) ─────────────────────────────────────────────────
  // Checked before anything else touches the entry pool: a disarmed draw must
  // not record, must not email, and must not even hint at who would have won.
  if (mode === 'live' && !(await isDrawArmed(supabase))) {
    return {
      ...base, status: 'disabled',
      entry_count: 0, player_count: 0, winners: [],
      notify_winner: null, notify_owner: null,
    }
  }

  // ── Idempotency gate ───────────────────────────────────────────────────────
  const { data: existing, error: exErr } = await supabase
    .from('game_winners')
    .select('slot, score_id, first_name, last_initial, email, prize_amount')
    .eq('market', MARKET)
    .eq('week_iso', target.iso)
  if (exErr) throw new Error(`game_winners read failed: ${exErr.message}`)

  if (existing && existing.length > 0) {
    return {
      ...base, status: 'already_drawn',
      entry_count: 0, player_count: 0,
      winners: existing as DrawnWinner[],
      notify_winner: null, notify_owner: null,
    }
  }

  // ── Entry pool ─────────────────────────────────────────────────────────────
  const { data: scores, error: scErr } = await supabase
    .from('game_scores')
    .select('id, first_name, last_name, email, game_type, score')
    .eq('iso_year', target.year)
    .eq('iso_week', target.week)
    .not('email', 'is', null)
  if (scErr) throw new Error(`game_scores read failed: ${scErr.message}`)

  const pool = (scores ?? []) as ScoreRow[]
  const playerCount = new Set(pool.map(s => (s.email ?? '').toLowerCase())).size

  if (pool.length === 0) {
    const notify = await emailOwnerNoEntries(target.iso, mode, previewTo)
    return {
      ...base, status: 'no_entries',
      entry_count: 0, player_count: 0, winners: [],
      notify_winner: null, notify_owner: notify,
      notified_to: mode === 'preview' ? previewTo : ownerEmail(),
    }
  }

  // ── Selection ──────────────────────────────────────────────────────────────
  // crypto.randomInt is uniform and unbiased (rejection-sampled internally),
  // unlike Math.floor(Math.random() * n). Distinct score rows per slot so one
  // entry can't win two slots; a player with several entries can still win
  // more than one when winnersPerDraw > 1, which is correct — they earned the
  // extra chances.
  const wanted    = Math.min(GAMES_PRIZE.winnersPerDraw, pool.length)
  const remaining = [...pool]
  const winners: DrawnWinner[] = []
  for (let slot = 1; slot <= wanted; slot++) {
    const idx = randomInt(remaining.length)
    const s   = remaining.splice(idx, 1)[0]!
    winners.push({
      slot,
      score_id:     s.id,
      first_name:   s.first_name ?? 'Winner',
      last_initial: (s.last_name?.[0] ?? '').toUpperCase() || null,
      email:        s.email!,
      prize_amount: GAMES_PRIZE.amountUsd,
    })
  }

  // Preview stops here: a rehearsal that wrote a row would burn the week for
  // the real draw, because the idempotency gate would then refuse to run it.
  if (mode !== 'preview') {
    const { error: insErr } = await supabase
      .from('game_winners')
      .upsert(
        winners.map(w => ({ ...w, market: MARKET, week_iso: target.iso })),
        { onConflict: 'market,week_iso,slot' },
      )
    if (insErr) throw new Error(`game_winners write failed: ${insErr.message}`)
  }

  const notifyWinner = await emailWinners(winners, target.iso, mode, previewTo)
  const notifyOwner  = await emailOwnerResult(winners, target.iso, pool.length, playerCount, mode, previewTo)

  return {
    ...base,
    status: mode === 'preview' ? 'preview' : 'drawn',
    entry_count: pool.length, player_count: playerCount,
    winners, notify_winner: notifyWinner, notify_owner: notifyOwner,
    // In preview every email goes to whoever asked for the rehearsal — never to
    // the player whose name came up. That's the whole point of the mode.
    notified_to: mode === 'preview' ? previewTo : winners.map(w => w.email).join(', '),
  }
}

// ── Notifications ────────────────────────────────────────────────────────────

function resend(): Resend | null {
  const key = process.env.RESEND_API_KEY
  if (!key) {
    console.error(
      '[games-draw] RESEND_API_KEY is not set — the draw was recorded but NO ' +
      'email was sent to the winner or the owner. Set it in the Vercel project env.',
    )
    return null
  }
  return new Resend(key)
}

/** Subject prefix that makes a rehearsal impossible to mistake for the real thing. */
function subjectFor(mode: DrawMode, subject: string): string {
  return mode === 'preview' ? `[PREVIEW — nothing was recorded] ${subject}` : subject
}

/**
 * Banner stapled to the top of every preview email. Says who WOULD have
 * received it, so the operator can check the real recipient without the real
 * recipient ever hearing from us.
 */
function previewBanner(mode: DrawMode, wouldGoTo: string): string {
  if (mode !== 'preview') return ''
  return `
    <div style="border:2px solid #b45309;background:#fffbeb;color:#78350f;padding:12px 14px;border-radius:8px;margin-bottom:16px;font-family:system-ui,sans-serif">
      <strong style="display:block;margin-bottom:4px">PREVIEW — this is a rehearsal.</strong>
      No winner was recorded, no money is owed, and
      <strong>${esc(wouldGoTo)}</strong> was not contacted. The live email below is
      exactly what they would receive.
    </div>`
}

async function emailWinners(
  winners: DrawnWinner[], weekIso: string, mode: DrawMode, previewTo: string,
): Promise<NotifyStatus> {
  const client = resend()
  if (!client) return 'not_configured'
  try {
    for (const w of winners) {
      await client.emails.send({
        from:    fromAddress(),
        to:      mode === 'preview' ? previewTo : w.email,
        subject: subjectFor(mode, `You won ${prizeAmount()} — River Region Parents Family Brain Games`),
        html: `
          ${previewBanner(mode, `${w.first_name} <${w.email}>`)}
          <p>Hi ${esc(w.first_name)},</p>
          <p>You won this week's <strong>${prizeAmount()}</strong> Family Brain Games drawing
             (${esc(weekIso)}). Congratulations!</p>
          <p>Just reply to this email and we'll arrange getting your ${prizeAmount()} to you.</p>
          <p>Thanks for playing — new puzzles go up every morning at
             <a href="${siteUrl()}/games">${siteUrl().replace(/^https?:\/\//, '')}/games</a>.</p>
          <p>— River Region Parents</p>
        `,
      })
    }
    return 'sent'
  } catch (e) {
    console.error('[games-draw] winner email failed:', e)
    return 'failed'
  }
}

async function emailOwnerResult(
  winners: DrawnWinner[], weekIso: string, entries: number, players: number,
  mode: DrawMode, previewTo: string,
): Promise<NotifyStatus> {
  const client = resend()
  if (!client) return 'not_configured'
  const total = winners.reduce((s, w) => s + Number(w.prize_amount), 0)
  const live  = mode !== 'preview'
  try {
    await client.emails.send({
      from:    fromAddress(),
      to:      live ? ownerEmail() : previewTo,
      subject: subjectFor(mode, `Action needed: pay ${winners.length === 1 ? 'this week\'s winner' : 'this week\'s winners'} ($${total}) — ${weekIso}`),
      html: `
        ${previewBanner(mode, winners.map(w => `${w.first_name} <${w.email}>`).join(', '))}
        <p><strong>Family Brain Games — ${esc(weekIso)}</strong></p>
        <p>The weekly draw ${live ? 'ran automatically' : 'was rehearsed in preview mode'}.
           ${entries} entr${entries === 1 ? 'y' : 'ies'}
           from ${players} player${players === 1 ? '' : 's'}.</p>
        <p><strong>${live ? `Pay out $${total} total:` : `Would have paid out $${total} total:`}</strong></p>
        <ul>
          ${winners.map(w => `<li>${esc(w.first_name)} ${esc(w.last_initial ?? '')}. —
             <a href="mailto:${esc(w.email)}">${esc(w.email)}</a> — $${w.prize_amount}</li>`).join('')}
        </ul>
        ${live
          ? `<p>${winners.length === 1 ? 'The winner has' : 'Winners have'} already been emailed and
               told to reply to arrange payment. ${winners.length === 1 ? 'They are' : 'They are'}
               live on <a href="${siteUrl()}/games">the games page</a>.</p>`
          : `<p>Nobody was emailed, nothing was recorded, and this week is still
               available for a real draw. The live run would pick again from the
               same pool — the name above is one possible outcome, not a
               reservation.</p>`}
      `,
    })
    return 'sent'
  } catch (e) {
    console.error('[games-draw] owner email failed:', e)
    return 'failed'
  }
}

async function emailOwnerNoEntries(
  weekIso: string, mode: DrawMode, previewTo: string,
): Promise<NotifyStatus> {
  const client = resend()
  if (!client) return 'not_configured'
  try {
    await client.emails.send({
      from:    fromAddress(),
      to:      mode === 'preview' ? previewTo : ownerEmail(),
      subject: subjectFor(mode, `No Family Brain Games entries this week — ${weekIso}`),
      html: `
        <p><strong>Family Brain Games — ${esc(weekIso)}</strong></p>
        <p>Nobody completed a game last week, so no draw was run and nothing is owed.</p>
        <p>Nothing is broken — this is the expected result for a week with no entries.
           Worth a promo push if it repeats.</p>
      `,
    })
    return 'sent'
  } catch (e) {
    console.error('[games-draw] no-entries email failed:', e)
    return 'failed'
  }
}
