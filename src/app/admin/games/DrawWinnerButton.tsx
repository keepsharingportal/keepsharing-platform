'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trophy, Sparkles, RefreshCw, Save, Check } from 'lucide-react'

interface Score {
  id:         string
  first_name: string
  last_name:  string
  email:      string
  phone:      string | null
  game_type:  string
  score:      number
}

interface ExistingWinner {
  slot:         number
  first_name:   string
  last_initial: string
}

interface Props {
  scores:           Score[]
  weekLabel:        string          // e.g., "Week 21 (May 18–24)"
  weekIso:          string          // YYYY-Www, e.g., 2026-W21
  existingWinners?: ExistingWinner[] | null
}

const PRIZE_AMOUNT = 10

export function DrawWinnerButton({ scores, weekLabel, weekIso, existingWinners }: Props) {
  const router = useRouter()
  const [drawing, setDrawing] = useState(false)
  const [picks,   setPicks]   = useState<Score[] | null>(null)
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)
  const [err,     setErr]     = useState<string | null>(null)

  const eligibleCount = scores.length
  const wantCount     = Math.min(3, eligibleCount)

  // Pick `n` unique winners from the entries — each play is one entry, so
  // a name with 5 plays has a 5x weighting naturally (no dedup of entries
  // before draw). We DO dedup by score row id at pick time.
  function pickUniqueWinners(n: number): Score[] {
    const pool = [...scores]
    const out: Score[] = []
    while (out.length < n && pool.length > 0) {
      const i = Math.floor(Math.random() * pool.length)
      out.push(pool[i])
      pool.splice(i, 1)
    }
    return out
  }

  function draw() {
    if (eligibleCount === 0 || wantCount === 0) return
    setDrawing(true)
    setPicks(null)
    setSaved(false)
    setErr(null)
    // Slot-machine animation: cycle through random picks, then settle on final
    let ticks = 0
    const interval = setInterval(() => {
      setPicks(pickUniqueWinners(wantCount))
      ticks++
      if (ticks > 18) {
        clearInterval(interval)
        setPicks(pickUniqueWinners(wantCount))
        setDrawing(false)
      }
    }, 80)
  }

  async function save() {
    if (!picks) return
    setSaving(true)
    setErr(null)
    try {
      const body = {
        week_iso: weekIso,
        picks:    picks.map((p, idx) => ({ slot: idx + 1, score_id: p.id })),
      }
      const res = await fetch('/api/admin/games/save-winners', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { setErr(json?.error ?? `HTTP ${res.status}`); return }
      setSaved(true)
      router.refresh()
    } finally { setSaving(false) }
  }

  const hasExisting = existingWinners && existingWinners.length > 0

  return (
    <div className="space-y-3">
      {hasExisting && !picks && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-800">
          <div className="flex items-center gap-2 mb-1">
            <Check size={13} />
            <strong>{existingWinners!.length} winner{existingWinners!.length === 1 ? '' : 's'} already recorded for {weekLabel}.</strong>
          </div>
          <p className="ml-5">
            {existingWinners!
              .sort((a, b) => a.slot - b.slot)
              .map(w => `#${w.slot} ${w.first_name} ${w.last_initial}.`)
              .join('  ·  ')}
            {' '}— drawing again will overwrite all 3 slots.
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={draw}
        disabled={drawing || eligibleCount === 0}
        className="inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-bold bg-portal-navy text-portal-blue-foreground rounded-lg hover:bg-portal-navy/90 disabled:opacity-40"
      >
        {drawing ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
        {hasExisting
          ? `Re-draw ${weekLabel} winners`
          : `Draw 3 × $${PRIZE_AMOUNT} winners for ${weekLabel}`}
        {' '}({eligibleCount} entr{eligibleCount === 1 ? 'y' : 'ies'})
      </button>

      {eligibleCount > 0 && eligibleCount < 3 && (
        <p className="text-xs text-portal-amber font-semibold">
          Only {eligibleCount} entr{eligibleCount === 1 ? 'y' : 'ies'} this week — drawing {wantCount} winner{wantCount === 1 ? '' : 's'} instead of 3.
        </p>
      )}

      {picks && picks.length > 0 && (
        <div className="rounded-lg border-2 border-portal-blue/30 bg-portal-blue-lt p-4 space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-portal-blue text-center">
            {drawing ? 'Drawing…' : `${picks.length} Winner${picks.length === 1 ? '' : 's'}!`}
          </p>

          <div className="grid sm:grid-cols-3 gap-3">
            {picks.map((w, i) => (
              <div key={`${w.id}-${i}`} className="bg-card border border-portal-blue/20 rounded-xl p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Slot #{i + 1} · ${PRIZE_AMOUNT}
                </p>
                <div className="flex items-start gap-2">
                  <Trophy className="h-4 w-4 text-portal-blue shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-foreground truncate">
                      {w.first_name} {w.last_name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {w.email}{w.phone ? ` · ${w.phone}` : ''}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {w.game_type} · score {w.score}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {!drawing && !saved && (
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-bold bg-gray-900 text-white rounded-lg hover:bg-gray-700 disabled:opacity-40"
            >
              {saving ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}
              Save all {picks.length} winner{picks.length === 1 ? '' : 's'}
            </button>
          )}
          {saved && (
            <p className="text-xs text-green-700 font-semibold flex items-center gap-1 justify-center">
              <Check size={12} /> Saved. Will display on the public /games page.
            </p>
          )}
          {err && <p className="text-xs text-portal-red font-semibold">{err}</p>}
        </div>
      )}
    </div>
  )
}
