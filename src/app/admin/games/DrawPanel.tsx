'use client'

// Operator surface for the Family Brain Games weekly draw.
//
// Replaces DrawWinnerButton, which drew client-side with Math.random(), posted
// the picks to save-winners, emailed nobody, and recorded a $10 prize after the
// prize had moved to $25. Every button here calls /api/admin/games/draw, which
// calls the same runWeeklyDraw() the Monday cron calls — so a rehearsal
// exercises the real selection, the real templates, and the real Resend
// account. A preview that ran through different code would prove nothing.
//
// Two states the panel exists to make unmissable:
//   Disarmed — the cron records nothing and emails nobody. This is where the
//              draw sits until someone deliberately arms it.
//   Armed    — Monday 8am Central, for real, every week, without a human.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trophy, Sparkles, RefreshCw, Check, AlertTriangle, Eye, Lock, Unlock } from 'lucide-react'
import { GAMES_PRIZE, prizeAmount } from '@/lib/games/prize'

export interface DrawWeek {
  iso:          string    // 2026-W26
  label:        string    // "Week 26 (Jun 22–28)"
  entry_count:  number
  player_count: number
  drawn:        boolean
}

interface DrawnWinner {
  slot: number; first_name: string; last_initial: string | null
  email: string; prize_amount: number
}

interface DrawResult {
  status:        'drawn' | 'already_drawn' | 'no_entries' | 'preview' | 'disabled'
  mode:          'live' | 'preview'
  week_iso:      string
  entry_count:   number
  player_count:  number
  winners:       DrawnWinner[]
  notify_winner: string | null
  notify_owner:  string | null
  notified_to:   string | null
}

interface Props {
  weeks:     DrawWeek[]
  armed:     boolean
  ownerHint: string        // owner address — where LIVE payout instructions go
}

export function DrawPanel({ weeks, armed, ownerHint }: Props) {
  const router = useRouter()
  const [week,    setWeek]    = useState(weeks.find(w => !w.drawn && w.entry_count > 0)?.iso ?? weeks[0]?.iso ?? '')
  const [busy,    setBusy]    = useState<'preview' | 'live' | 'arm' | null>(null)
  const [result,  setResult]  = useState<DrawResult | null>(null)
  const [err,     setErr]     = useState<string | null>(null)
  // Typed in, not inferred. This was a hardcoded owner fallback, then the
  // acting admin's session email, and both times the rehearsal landed in an
  // inbox nobody was watching and looked like a delivery failure. The one
  // question a rehearsal must never leave open is where the mail went.
  const [previewTo, setPreviewTo] = useState(ownerHint)

  const selected = weeks.find(w => w.iso === week)

  async function run(mode: 'preview' | 'live') {
    if (mode === 'live') {
      const ok = window.confirm(
        `Run the REAL draw for ${selected?.label ?? week}?\n\n` +
        `This records a winner, emails them "you won ${prizeAmount()}", and emails you a ` +
        `payout instruction. It cannot be undone — the week locks so it can never be redrawn.`,
      )
      if (!ok) return
    }
    setBusy(mode); setErr(null); setResult(null)
    try {
      const res  = await fetch('/api/admin/games/draw', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ week_iso: week, mode, preview_to: previewTo.trim() }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { setErr(json?.error ?? `HTTP ${res.status}`); return }
      setResult(json as DrawResult)
      if (json.status === 'drawn') router.refresh()
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally { setBusy(null) }
  }

  async function toggleArm() {
    const next = !armed
    const ok = window.confirm(
      next
        ? `Arm the weekly draw?\n\nFrom the next Monday at 8am Central, a winner is drawn ` +
          `automatically every week, emailed, and ${prizeAmount()} becomes payable — with no ` +
          `human in the loop. The /games page will start promising readers a ${GAMES_PRIZE.drawDay} drawing.`
        : `Disarm the weekly draw?\n\nThe Monday cron will stop drawing and stop emailing. ` +
          `Already-recorded winners stay exactly as they are.`,
    )
    if (!ok) return
    setBusy('arm'); setErr(null)
    try {
      const res  = await fetch('/api/admin/games/draw-arm', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: next }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { setErr(json?.error ?? `HTTP ${res.status}`); return }
      router.refresh()
    } finally { setBusy(null) }
  }

  return (
    <div className="space-y-4">
      {/* ── Armed state ──────────────────────────────────────────────────── */}
      <div className={`rounded-lg border p-4 ${
        armed ? 'border-portal-green/40 bg-portal-green-lt' : 'border-portal-amber/40 bg-portal-amber-lt'
      }`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className={`flex items-center gap-1.5 text-sm font-bold ${
              armed ? 'text-portal-green' : 'text-portal-amber'
            }`}>
              {armed ? <Unlock size={14} /> : <Lock size={14} />}
              {armed ? 'Weekly draw is ARMED' : 'Weekly draw is NOT running yet'}
            </p>
            <p className="text-xs text-portal-sub mt-1 leading-relaxed max-w-xl">
              {armed
                ? `Every Monday 8am Central the cron draws a winner, emails them, and emails you a payout instruction. Readers are being promised a ${GAMES_PRIZE.drawDay} drawing on /games.`
                : `The Monday cron is scheduled but records nothing and emails nobody, and /games makes no drawing promise. Rehearse with Preview below, then arm when you're ready to start paying out.`}
            </p>
          </div>
          <button
            type="button" onClick={toggleArm} disabled={busy !== null}
            className={`shrink-0 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg disabled:opacity-40 ${
              armed
                ? 'border border-portal-red/40 text-portal-red hover:bg-portal-red-lt'
                : 'bg-portal-navy text-white hover:bg-portal-navy/90'
            }`}
          >
            {busy === 'arm' ? <RefreshCw size={13} className="animate-spin" /> : armed ? <Lock size={13} /> : <Unlock size={13} />}
            {armed ? 'Disarm' : 'Arm the weekly draw'}
          </button>
        </div>
      </div>

      {/* ── Week picker + actions ────────────────────────────────────────── */}
      {weeks.length === 0 ? (
        <p className="text-sm text-portal-muted">
          No week has any entries with an email address yet, so there is nothing to draw from.
        </p>
      ) : (
        <>
          <div>
            <label htmlFor="draw-week" className="block text-[11px] font-bold uppercase tracking-wider text-portal-sub mb-1">
              Week to draw
            </label>
            <select
              id="draw-week" value={week} onChange={e => { setWeek(e.target.value); setResult(null) }}
              className="w-full sm:w-auto min-w-[22rem] max-w-full border border-portal-border rounded-lg px-3 py-2 text-sm bg-white"
            >
              {weeks.map(w => (
                <option key={w.iso} value={w.iso}>
                  {w.label} — {w.entry_count} entr{w.entry_count === 1 ? 'y' : 'ies'} from {w.player_count} player{w.player_count === 1 ? '' : 's'}
                  {w.drawn ? ' · ALREADY DRAWN' : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="preview-to" className="block text-[11px] font-bold uppercase tracking-wider text-portal-sub mb-1">
              Send preview to
            </label>
            <input
              id="preview-to" type="email" value={previewTo}
              onChange={e => setPreviewTo(e.target.value)}
              placeholder="you@example.com"
              className="w-full sm:w-auto min-w-[22rem] max-w-full border border-portal-border rounded-lg px-3 py-2 text-sm bg-white"
            />
            <p className="text-[11px] text-portal-sub mt-1">
              Preview only. A live draw always emails the real winner and sends the payout
              instruction to <strong>{ownerHint}</strong>, whatever is typed here.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button" onClick={() => run('preview')} disabled={busy !== null || !week || !previewTo.trim()}
              className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 text-sm font-bold border-2 border-portal-navy text-portal-navy rounded-lg hover:bg-portal-bg disabled:opacity-40"
            >
              {busy === 'preview' ? <RefreshCw size={14} className="animate-spin" /> : <Eye size={14} />}
              Preview draw — records nothing
            </button>
            <button
              type="button" onClick={() => run('live')} disabled={busy !== null || !week || !armed || selected?.drawn}
              title={!armed ? 'Arm the weekly draw first' : selected?.drawn ? 'This week already has a winner' : undefined}
              className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 text-sm font-bold bg-portal-navy text-white rounded-lg hover:bg-portal-navy/90 disabled:opacity-40"
            >
              {busy === 'live' ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
              Run live draw — pays {prizeAmount()}
            </button>
          </div>

          <p className="text-[11px] text-portal-sub leading-relaxed">
            Preview runs the real selection against the real entries and sends both emails to the
            address above instead of to the player, so you can read exactly what a winner receives
            before anyone does. Nothing is written, and the week stays available for a real draw.
            &ldquo;Sent&rdquo; below means Resend accepted the message — if it then doesn&apos;t
            arrive, the answer is in the Resend dashboard&apos;s delivery log, not here.
          </p>
        </>
      )}

      {err && (
        <p className="flex items-start gap-1.5 text-xs font-semibold text-portal-red">
          <AlertTriangle size={13} className="shrink-0 mt-0.5" /> {err}
        </p>
      )}

      {result && <ResultCard result={result} />}
    </div>
  )
}

function ResultCard({ result }: { result: DrawResult }) {
  const preview = result.mode === 'preview'

  const HEAD: Record<DrawResult['status'], string> = {
    preview:       'Preview complete — nothing was recorded',
    drawn:         'Winner drawn and recorded',
    already_drawn: 'This week already has a winner',
    no_entries:    'No entries — nothing drawn, nothing owed',
    disabled:      'Draw is disarmed — nothing ran',
  }

  return (
    <div className={`rounded-lg border-2 p-4 space-y-3 ${
      preview ? 'border-portal-amber/40 bg-portal-amber-lt' : 'border-portal-blue/30 bg-portal-blue-lt'
    }`}>
      <p className="text-[10px] font-black uppercase tracking-widest text-portal-sub">
        {HEAD[result.status]} · {result.week_iso}
      </p>

      {result.winners.length > 0 && (
        <div className="space-y-2">
          {result.winners.map(w => (
            <div key={w.slot} className="bg-white border border-portal-border rounded-lg p-3 flex items-start gap-2">
              <Trophy className="h-4 w-4 text-portal-blue shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-sm font-bold text-portal-text truncate">
                  {w.first_name} {w.last_initial ? `${w.last_initial}.` : ''} — ${w.prize_amount}
                </p>
                <p className="text-xs text-portal-sub truncate">{w.email}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <dt className="text-portal-sub">Entries in pool</dt>
        <dd className="font-bold text-portal-text">{result.entry_count}</dd>
        <dt className="text-portal-sub">Distinct players</dt>
        <dd className="font-bold text-portal-text">{result.player_count}</dd>
        <dt className="text-portal-sub">Winner email</dt>
        <dd className="font-bold text-portal-text">{result.notify_winner ?? '—'}</dd>
        <dt className="text-portal-sub">Owner email</dt>
        <dd className="font-bold text-portal-text">{result.notify_owner ?? '—'}</dd>
        <dt className="text-portal-sub">Sent to</dt>
        <dd className="font-bold text-portal-text break-all">{result.notified_to ?? '—'}</dd>
      </dl>

      {(result.notify_winner === 'not_configured' || result.notify_owner === 'not_configured') && (
        <p className="flex items-start gap-1.5 text-xs font-semibold text-portal-red">
          <AlertTriangle size={13} className="shrink-0 mt-0.5" />
          RESEND_API_KEY is not set in this environment — no email was sent. Fix it before arming.
        </p>
      )}
      {(result.notify_winner === 'failed' || result.notify_owner === 'failed') && (
        <p className="flex items-start gap-1.5 text-xs font-semibold text-portal-red">
          <AlertTriangle size={13} className="shrink-0 mt-0.5" />
          Resend rejected the send — usually an unverified sending domain. Check the Vercel logs.
        </p>
      )}
      {preview && result.status === 'preview' && (
        <p className="flex items-start gap-1.5 text-xs font-semibold text-portal-green">
          <Check size={13} className="shrink-0 mt-0.5" />
          Check {result.notified_to} for two emails — the winner&apos;s and yours. This week is still
          undrawn; the live run picks again from the same pool.
        </p>
      )}
    </div>
  )
}
