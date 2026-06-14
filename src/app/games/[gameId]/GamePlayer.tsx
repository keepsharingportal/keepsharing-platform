'use client'

// ── GamePlayer ────────────────────────────────────────────────────────────────
// Client-side game state + render dispatcher. Switches on game type:
//   - scramble / emoji / math  → shared GuessAndCheck
//   - trivia                   → multiple-choice
//   - word-search              → letter grid
//   - memory                   → flip-and-match
// On finish, shows WinScreen with the entry form that POSTs to GHL.

import { useState, useMemo, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Trophy, CheckCircle2, ChevronRight, FastForward, Clock, Flame, Lightbulb, Sparkles } from 'lucide-react'
import type {
  GameDefinition, Difficulty,
  ScramblePayload, TriviaPayload, EmojiPayload, MathPayload,
  WordSearchPayload, MemoryPayload, FamilyConnectPayload, FamilyConnectGroup,
} from '@/lib/games/types'
import { POINTS_PER_CORRECT } from '@/lib/games/types'

interface PoolItem { id: string; payload: Record<string, unknown> }

// ── Sharable branding ────────────────────────────────────────────────────────
// Wordle-style identity. Every share card opens with this header so a stranger
// scrolling Facebook sees the same recognizable signature week after week.
const SHARE_BRAND_HEADER = '🧠 River Region Brain Games'
const SHARE_CTA          = 'Can you beat me?'

// Per-game emoji prefix — pairs with the game title in the second line.
const GAME_EMOJI: Record<string, string> = {
  memory:           '🃏',
  trivia:           '❓',
  scramble:         '🔤',
  emoji:            '🧩',
  math:             '🧮',
  'family-connect': '🎨',
  'word-search':    '🔍',
}

// ── Race-the-clock helpers ───────────────────────────────────────────────────
// Personal best is tracked in localStorage by a stable variant key so weekly
// content changes don't reset it. We save the best on finish (sync, before the
// player unmounts), then display "Best: X:XX" live during play so players have
// a target to chase.

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60)
  const r = sec % 60
  return `${m}:${r.toString().padStart(2, '0')}`
}

function loadBest(bestKey: string): number | null {
  try {
    const raw = localStorage.getItem(bestKey)
    if (!raw) return null
    const n = parseInt(raw, 10)
    return Number.isFinite(n) ? n : null
  } catch { return null }
}

function saveBestIfBetter(bestKey: string, elapsed: number): boolean {
  if (elapsed <= 0) return false
  try {
    const prev = loadBest(bestKey)
    if (prev === null || elapsed < prev) {
      localStorage.setItem(bestKey, String(elapsed))
      return true
    }
  } catch { /* ignore */ }
  return false
}

function useElapsedSeconds(running: boolean, startedAt: number): number {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    if (!running) return
    const tick = () => setElapsed(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)))
    tick()
    const id = setInterval(tick, 250)
    return () => clearInterval(id)
  }, [running, startedAt])
  return elapsed
}

function TimerBar({
  bestKey, running, startedAt, hint,
}: { bestKey: string; running: boolean; startedAt: number; hint?: string }) {
  const elapsed     = useElapsedSeconds(running, startedAt)
  const [best, setBest] = useState<number | null>(null)
  // Read best on mount + whenever the key changes
  useEffect(() => { setBest(loadBest(bestKey)) }, [bestKey])
  // Visual "chasing best" indicator: pulse if behind, glow if ahead
  const aheadOfBest = best !== null && running && elapsed < best
  return (
    <div className="flex items-center justify-center gap-3 mb-5 flex-wrap">
      <div
        className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-bold tabular-nums transition-colors ${
          aheadOfBest
            ? 'bg-green-600 text-white shadow-sm'
            : 'bg-foreground text-background'
        }`}
      >
        <Clock className="h-3.5 w-3.5" />
        {formatTime(elapsed)}
      </div>
      {best !== null && (
        <span className="text-xs font-semibold text-muted-foreground inline-flex items-center gap-1">
          <Flame className="h-3 w-3 text-amber-500" />
          Best <span className="tabular-nums text-foreground">{formatTime(best)}</span>
        </span>
      )}
      {hint && (
        <span className="text-xs font-semibold text-muted-foreground">{hint}</span>
      )}
    </div>
  )
}

interface Props {
  game:       GameDefinition
  difficulty: Difficulty
  isoYear:    number
  isoWeek:    number
  items:      PoolItem[]
}

export function GamePlayer({ game, difficulty, isoYear, isoWeek, items }: Props) {
  const router                    = useRouter()
  const [score, setScore]         = useState(0)
  const [done,  setDone]          = useState(false)
  const [shareGrid, setShareGrid] = useState<string | undefined>(undefined)
  const [newBest, setNewBest]     = useState(false)
  const [prevBest, setPrevBest]   = useState<number | null>(null)
  const startedAt = useMemo(() => Date.now(), [])

  // Stable per-variant key so weekly content changes don't reset personal best
  const bestKey = useMemo(() => {
    if (game.id === 'memory') {
      const b = items[0]?.payload as unknown as MemoryPayload | undefined
      return `kp-best-memory-${b?.pairs ?? 'x'}`
    }
    if (game.id === 'family-connect') return 'kp-best-family-connect-4x4'
    if (game.id === 'trivia')         return `kp-best-trivia-${items.length}`
    if (game.id === 'scramble' || game.id === 'emoji' || game.id === 'math') {
      return `kp-best-${game.id}-${items.length}`
    }
    return `kp-best-${game.id}`
  }, [game.id, items])

  function finish(opts?: { shareGrid?: string }) {
    const elapsed = Math.floor((Date.now() - startedAt) / 1000)
    setPrevBest(loadBest(bestKey))
    setNewBest(saveBestIfBetter(bestKey, elapsed))
    if (opts?.shareGrid) setShareGrid(opts.shareGrid)
    setDone(true)
  }

  // Quit ≠ finish. When the player taps "I'm stumped", they're opting
  // out — no celebration, no WinScreen, no entry into the weekly
  // drawing. Send them straight back to the Games Hub. Score isn't
  // saved because no game was completed.
  function quit() {
    router.push('/games')
  }

  function handleCorrect() {
    setScore(s => s + POINTS_PER_CORRECT)
  }

  if (done) {
    return (
      <WinScreen
        game={game}
        difficulty={difficulty}
        score={score}
        isoYear={isoYear}
        isoWeek={isoWeek}
        durationSeconds={Math.floor((Date.now() - startedAt) / 1000)}
        shareGrid={shareGrid}
        newBest={newBest}
        prevBest={prevBest}
      />
    )
  }

  // ── Dispatch by game type ─────────────────────────────────────────────────
  // Live race-the-clock bar above every player — gives a target to beat.
  const timerBar = <TimerBar bestKey={bestKey} running={!done} startedAt={startedAt} />
  function wrap(node: React.ReactNode) {
    return <div className="space-y-3">{timerBar}{node}</div>
  }

  if (game.id === 'scramble') {
    const rounds = items.map(i => i.payload as unknown as ScramblePayload)
    return wrap(
      <GuessAndCheck
        title="Lunchbox Scramble"
        intro="Unscramble the parenting words to win!"
        prompts={rounds.map(r => ({ display: r.scrambled, answer: r.answer }))}
        displayClass="text-5xl md:text-7xl font-black tracking-widest"
        labelOfRound="Word"
        onCorrect={handleCorrect}
        onFinish={finish}
        onQuit={quit}
        signatureBg={game.signature.bg}
        signatureFg={game.signature.fg}
      />
    )
  }

  if (game.id === 'emoji') {
    const rounds = items.map(i => i.payload as unknown as EmojiPayload)
    return wrap(
      <GuessAndCheck
        title="Emoji Decode"
        intro="Guess the parenting phrase!"
        prompts={rounds.map(r => ({ display: r.emoji, answer: r.answer }))}
        displayClass="text-5xl md:text-7xl font-black tracking-widest"
        labelOfRound="Puzzle"
        onCorrect={handleCorrect}
        onFinish={finish}
        onQuit={quit}
        signatureBg={game.signature.bg}
        signatureFg={game.signature.fg}
      />
    )
  }

  if (game.id === 'math') {
    const rounds = items.map(i => i.payload as unknown as MathPayload)
    return wrap(
      <GuessAndCheck
        title="Carpool Math"
        intro="Solve the brain-teaser!"
        prompts={rounds.map(r => ({ display: r.q, answer: r.a }))}
        displayClass="text-xl md:text-2xl font-bold text-foreground leading-snug bg-muted/40 border border-border/60 rounded-2xl px-6 py-6"
        labelOfRound="Question"
        caseSensitive
        onCorrect={handleCorrect}
        onFinish={finish}
        onQuit={quit}
        signatureBg={game.signature.bg}
        signatureFg={game.signature.fg}
      />
    )
  }

  if (game.id === 'trivia') {
    return wrap(
      <TriviaPlayer
        rounds={items.map(i => i.payload as unknown as TriviaPayload)}
        onCorrect={handleCorrect}
        onFinish={finish}
        signatureBg={game.signature.bg}
        signatureFg={game.signature.fg}
        signatureTile={game.signature.tile}
      />
    )
  }

  if (game.id === 'family-connect') {
    const board = items[0].payload as unknown as FamilyConnectPayload
    return wrap(
      <FamilyConnectPlayer
        board={board}
        onCorrect={handleCorrect}
        onFinish={finish}
        signatureBg={game.signature.bg}
        signatureFg={game.signature.fg}
      />
    )
  }

  if (game.id === 'word-search') {
    const board = items[0].payload as unknown as WordSearchPayload
    return wrap(
      <WordSearchPlayer
        board={board}
        difficulty={difficulty}
        onCorrect={handleCorrect}
        onFinish={finish}
        signatureBg={game.signature.bg}
        signatureFg={game.signature.fg}
        signatureTile={game.signature.tile}
      />
    )
  }

  if (game.id === 'memory') {
    const board = items[0].payload as unknown as MemoryPayload
    return wrap(
      <MemoryPlayer
        board={board}
        onCorrect={handleCorrect}
        onFinish={finish}
        signatureBg={game.signature.bg}
        signatureFg={game.signature.fg}
        signatureTile={game.signature.tile}
      />
    )
  }

  return <p className="text-sm text-muted-foreground">Unknown game type.</p>
}

// ── Shared: Guess and Check (scramble / emoji / math) ────────────────────────

interface GuessAndCheckProps {
  title:           string
  intro:           string
  prompts:         { display: string; answer: string }[]
  displayClass:    string
  labelOfRound:    string
  caseSensitive?:  boolean
  onCorrect:       () => void
  onFinish:        (opts?: { shareGrid?: string }) => void
  /** Player tapped "I'm stumped". No WinScreen, no entry into the
   *  drawing — just navigate back to the Games Hub. */
  onQuit:          () => void
  /** Game's signature color — themes the prompt display + submit button. */
  signatureBg?:    string
  signatureFg?:    string
}

function GuessAndCheck({
  title, intro, prompts, displayClass, labelOfRound, caseSensitive,
  onCorrect, onFinish, onQuit, signatureBg, signatureFg,
}: GuessAndCheckProps) {
  const [idx, setIdx]           = useState(0)
  const [guess, setGuess]       = useState('')
  const [attempts, setAttempts] = useState(0)
  const [error, setError]       = useState(false)
  const [passed, setPassed]     = useState<number[]>([])
  // Celebration moment — when correct, we briefly show what the player
  // typed in the signature color with a sparkle + a confetti burst
  // before advancing. Adds the "feels good when I'm right" beat the
  // game was missing.
  const [celebrating, setCelebrating] = useState<string | null>(null)
  // Three hints per WHOLE game session (not per round). Each hint
  // reveals one previously-unrevealed letter of the current answer.
  // Hint count persists across rounds; revealed-positions resets per
  // round.
  const [hintsLeft,        setHintsLeft]        = useState(3)
  const [revealedPositions, setRevealedPositions] = useState<Set<number>>(new Set())

  // Ref (not state) so we can read latest values synchronously when building
  // the share grid at the moment of finish.
  const outcomesRef = useRef<Map<number, 'ok' | 'fail' | 'pass'>>(new Map())

  function record(i: number, status: 'ok' | 'fail' | 'pass') {
    // Don't downgrade an 'ok' if pass cycles back oddly — final answer wins.
    if (outcomesRef.current.get(i) === 'ok' && status !== 'ok') return
    outcomesRef.current.set(i, status)
  }

  function buildGrid(): string {
    return Array.from({ length: prompts.length }, (_, i) => {
      const o = outcomesRef.current.get(i)
      return o === 'ok' ? '🟩' : o === 'fail' ? '🟥' : o === 'pass' ? '🟨' : '⬜'
    }).join('')
  }

  const current = prompts[idx]
  const maxAttempts = 3
  const finished = idx >= prompts.length

  function normalize(s: string) { return caseSensitive ? s.trim() : s.trim().toUpperCase() }

  function advance() {
    setAttempts(0); setError(false); setGuess(''); setCelebrating(null)
    setRevealedPositions(new Set())  // hints carry over, reveals don't
    if (idx + 1 < prompts.length) {
      setIdx(idx + 1)
    } else if (passed.length > 0) {
      // Cycle back to passed rounds at the end
      const first = passed[0]
      setPassed(p => p.slice(1))
      setIdx(first)
    } else {
      onFinish({ shareGrid: buildGrid() })
    }
  }

  /** Small confetti burst from the bottom corners — celebratory but
   *  not over the top, matched to the game's signature color so each
   *  game's "right answer" beat feels distinct. Skipped on reduced
   *  motion. */
  function celebrationBurst() {
    if (typeof window === 'undefined') return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    void import('canvas-confetti').then(mod => {
      const confetti = mod.default
      const color = signatureBg ?? '#ef6442'
      const common: import('canvas-confetti').Options = {
        spread: 50, startVelocity: 38, ticks: 140,
        colors: [color, '#FFFFFF', '#FFD580'],
        zIndex: 9999,
      }
      confetti({ ...common, particleCount: 30, origin: { x: 0.25, y: 0.7 }, angle: 70 })
      confetti({ ...common, particleCount: 30, origin: { x: 0.75, y: 0.7 }, angle: 110 })
    }).catch(() => {/* fallback: no confetti, no crash */})
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!current) return
    if (normalize(guess) === normalize(current.answer)) {
      record(idx, 'ok')
      // Show celebration with the answer in signature color, fire
      // confetti, then advance. The player FINALLY sees what they
      // typed reflected back — that was the missing beat.
      setCelebrating(current.answer)
      celebrationBurst()
      onCorrect()
      setTimeout(advance, 1400)
    } else {
      const next = attempts + 1
      setAttempts(next)
      setError(true)
      if (next >= maxAttempts) {
        record(idx, 'fail')
        setGuess(current.answer)
        setTimeout(advance, 2000)
      }
    }
  }

  function pass() {
    record(idx, 'pass')
    setPassed(p => [...p, idx])
    setAttempts(0); setError(false); setGuess('')
    setRevealedPositions(new Set())
    if (idx + 1 < prompts.length) {
      setIdx(idx + 1)
    } else {
      // End of list — start cycling passed words
      onFinish({ shareGrid: buildGrid() })
    }
  }

  /** Reveal one unrevealed letter of the current answer. Pick a
   *  position uniformly at random from positions not already revealed
   *  AND not whitespace. Decrements the global hints counter. */
  function useHint() {
    if (!current || hintsLeft <= 0 || celebrating) return
    const ans = current.answer
    const candidates: number[] = []
    for (let i = 0; i < ans.length; i++) {
      if (revealedPositions.has(i)) continue
      if (/\s/.test(ans[i])) continue
      candidates.push(i)
    }
    if (candidates.length === 0) return
    const pick = candidates[Math.floor(Math.random() * candidates.length)]
    setRevealedPositions(prev => {
      const next = new Set(prev)
      next.add(pick)
      return next
    })
    setHintsLeft(h => h - 1)
  }

  /** Skeleton-with-revealed-letters display for the current answer.
   *  Renders only when at least one position has been revealed via
   *  the Hint button. Revealed letters use the signature color so
   *  they read as "helpful" not "given away". */
  function HintSkeleton() {
    if (!current || revealedPositions.size === 0) return null
    const chars = current.answer.split('')
    return (
      <div className="mb-4 flex items-center justify-center gap-1.5 select-none" aria-label="Hint">
        {chars.map((ch, i) => {
          if (/\s/.test(ch)) return <span key={i} className="w-2" />
          const shown = revealedPositions.has(i)
          return (
            <span
              key={i}
              className="inline-flex items-end justify-center w-7 h-9 md:w-8 md:h-10 text-lg md:text-xl font-black uppercase tracking-tight border-b-2"
              style={{
                color: shown ? (signatureBg ?? 'inherit') : 'transparent',
                borderColor: shown ? (signatureBg ?? 'currentColor') : 'rgba(0,0,0,0.25)',
              }}
            >
              {shown ? ch : '_'}
            </span>
          )
        })}
      </div>
    )
  }

  if (finished || !current) return null

  return (
    <div className="rounded-3xl border border-border/60 bg-card shadow-sm overflow-hidden">
      {/* Signature color stripe at top of the playing surface — anchors
          the game's identity at every moment of play. */}
      {signatureBg && (
        <div className="h-1.5" style={{ backgroundColor: signatureBg }} />
      )}
      <div className="px-6 py-10 md:px-10 md:py-14 text-center">
        <h2
          className="text-2xl md:text-3xl font-bold text-foreground mb-1"
          style={{ fontFamily: 'var(--font-fraunces, serif)' }}
        >
          {title}
        </h2>
        <p className="text-sm text-muted-foreground mb-8">{intro}</p>

        {/* ── Celebration moment ────────────────────────────────────
            When the answer is correct, we briefly replace the prompt
            with a "Yes!" + the correctly-spelled answer in the
            signature color. Without this beat the game silently
            advanced and the player never got to see what they typed
            reflected back. */}
        {celebrating ? (
          <div className="mb-8 flex flex-col items-center justify-center min-h-[120px] md:min-h-[160px]" aria-live="polite">
            <div className="inline-flex items-center gap-2 text-base md:text-lg font-bold mb-2" style={{ color: signatureBg ?? 'inherit' }}>
              <Sparkles className="h-5 w-5" /> Yes!
            </div>
            <div
              className="text-4xl md:text-5xl font-black uppercase tracking-tight celebrate-pop"
              style={{ color: signatureBg ?? 'inherit' }}
            >
              {celebrating}
            </div>
          </div>
        ) : (
          <div
            key={`${idx}-${attempts}-${error ? 'err' : 'ok'}`}
            className={`${displayClass} mb-8 select-none ${error ? 'tile-shake' : ''}`}
            style={signatureBg ? { color: signatureBg } : undefined}
          >
            {current.display}
          </div>
        )}

        {/* Hint skeleton only renders when the player has spent at
            least one hint on this round. Sits above the input so the
            revealed letters guide their typing without crowding the
            form. */}
        {!celebrating && <HintSkeleton />}

        <form onSubmit={submit} className="max-w-sm mx-auto space-y-3">
          <input
            type="text"
            autoFocus
            value={guess}
            onChange={e => setGuess(caseSensitive ? e.target.value : e.target.value.toUpperCase())}
            placeholder="Type your answer…"
            disabled={attempts >= maxAttempts || !!celebrating}
            className={`w-full text-center text-lg font-bold uppercase px-4 py-3 rounded-xl border-2 outline-none transition-colors ${
              error
                ? 'border-rose-400 bg-rose-50'
                : 'border-border bg-background focus:border-primary'
            }`}
          />
          {error && (
            <p className="text-sm font-semibold text-rose-700">
              {attempts >= maxAttempts ? 'Here is the answer! Moving on…' : `Not quite — try again (${attempts} of ${maxAttempts})`}
            </p>
          )}
          {/* Action row — Hint / Pass / Submit. Hint sits to the LEFT
              so the eye sweeps Hint → Pass → Submit in order of
              increasing commitment. */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={useHint}
              disabled={hintsLeft <= 0 || attempts >= maxAttempts || !!celebrating}
              title={hintsLeft > 0 ? `Reveal a letter (${hintsLeft} of 3 left)` : 'No hints left'}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-3 text-xs font-semibold rounded-xl border border-border bg-card hover:bg-muted/40 disabled:opacity-40 whitespace-nowrap"
            >
              <Lightbulb className="h-4 w-4" />
              <span className="hidden sm:inline">Hint</span>
              <span className="tabular-nums">{hintsLeft}</span>
            </button>
            <button
              type="button"
              onClick={pass}
              disabled={attempts >= maxAttempts || !!celebrating}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-3 text-sm font-semibold rounded-xl border border-border bg-card hover:bg-muted/40 disabled:opacity-40"
            >
              <FastForward className="h-4 w-4" /> Pass
            </button>
            <button
              type="submit"
              disabled={attempts >= maxAttempts || !guess.trim() || !!celebrating}
              className="flex-[2] inline-flex items-center justify-center gap-1.5 px-4 py-3 text-sm font-bold rounded-xl hover:opacity-90 disabled:opacity-40 transition-opacity"
              style={signatureBg
                ? { backgroundColor: signatureBg, color: signatureFg ?? 'white' }
                : undefined}
            >
              Submit Guess
            </button>
          </div>
          <button
            type="button"
            onClick={onQuit}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            I&apos;m stumped, take me back
          </button>
        </form>

        <p className="mt-10 text-xs font-bold uppercase tracking-widest text-muted-foreground">
          {labelOfRound} {idx + 1} of {prompts.length}
        </p>
      </div>

      {/* Inline celebration-pop animation. Defined here (not globals.css)
          so the game stays self-contained and other surfaces can't drift
          out of sync. */}
      <style>{`
        @keyframes celebratePop {
          0%   { transform: scale(0.7); opacity: 0; }
          40%  { transform: scale(1.15); opacity: 1; }
          70%  { transform: scale(0.97); }
          100% { transform: scale(1); }
        }
        .celebrate-pop {
          animation: celebratePop 480ms cubic-bezier(0.34, 1.56, 0.64, 1) both;
        }
        @media (prefers-reduced-motion: reduce) {
          .celebrate-pop { animation: none; }
        }
      `}</style>
    </div>
  )
}

// ── Trivia ────────────────────────────────────────────────────────────────────

function TriviaPlayer({
  rounds, onCorrect, onFinish, signatureBg, signatureFg, signatureTile,
}: { rounds: TriviaPayload[]; onCorrect: () => void; onFinish: (opts?: { shareGrid?: string }) => void; signatureBg?: string; signatureFg?: string; signatureTile?: string }) {
  const [idx, setIdx]           = useState(0)
  const [attempts, setAttempts] = useState(0)
  const [picked, setPicked]     = useState<string | null>(null)
  // Three hints per session — each click eliminates one wrong answer
  // (50/50-style mechanic that families recognize from game shows).
  // Per-round eliminations don't persist across rounds, but the hints
  // counter does.
  const [hintsLeft,     setHintsLeft]     = useState(3)
  const [eliminated,    setEliminated]    = useState<Set<string>>(new Set())
  // Celebration moment on correct answer — fires confetti + briefly
  // shows a "Got it!" banner before advancing. The existing 600ms
  // timing already gave a beat; now that beat is visible.
  const [celebrating,   setCelebrating]   = useState(false)
  const outcomesRef = useRef<('ok' | 'fail')[]>([])
  const current = rounds[idx]
  const maxAttempts = 2
  const titleStyle = signatureBg ? { color: signatureBg } : undefined
  const tileBgStyle = signatureTile ? { backgroundColor: signatureTile } : undefined

  function buildGrid(): string {
    return Array.from({ length: rounds.length }, (_, i) => {
      const o = outcomesRef.current[i]
      return o === 'ok' ? '🟩' : o === 'fail' ? '🟥' : '⬜'
    }).join('')
  }

  if (!current) return null

  function celebrationBurst() {
    if (typeof window === 'undefined') return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    void import('canvas-confetti').then(mod => {
      const confetti = mod.default
      const color = signatureBg ?? '#ef6442'
      const common: import('canvas-confetti').Options = {
        spread: 50, startVelocity: 38, ticks: 140,
        colors: [color, '#FFFFFF', '#FFD580'],
        zIndex: 9999,
      }
      confetti({ ...common, particleCount: 30, origin: { x: 0.25, y: 0.7 }, angle: 70 })
      confetti({ ...common, particleCount: 30, origin: { x: 0.75, y: 0.7 }, angle: 110 })
    }).catch(() => {/* no-op */})
  }

  function pick(opt: string) {
    if (attempts >= maxAttempts || picked || celebrating) return
    if (eliminated.has(opt)) return  // can't pick a hinted-away wrong answer
    setPicked(opt)
    if (opt === current.a) {
      outcomesRef.current[idx] = 'ok'
      setCelebrating(true)
      celebrationBurst()
      onCorrect()
      setTimeout(advance, 1100)
    } else {
      const next = attempts + 1
      setAttempts(next)
      if (next >= maxAttempts) {
        outcomesRef.current[idx] = 'fail'
        setTimeout(advance, 1600)
      } else {
        setTimeout(() => { setPicked(null) }, 800)
      }
    }
  }

  function advance() {
    setAttempts(0); setPicked(null); setCelebrating(false)
    setEliminated(new Set())  // hints carry over, eliminations don't
    if (idx + 1 < rounds.length) setIdx(idx + 1)
    else onFinish({ shareGrid: buildGrid() })
  }

  /** Eliminate one wrong answer that hasn't already been eliminated
   *  or picked. Picks uniformly at random so the same hint doesn't
   *  always give away the same option. */
  function useHint() {
    if (hintsLeft <= 0 || celebrating || picked || attempts >= maxAttempts) return
    const wrongs = current.options.filter(o => o !== current.a && !eliminated.has(o))
    if (wrongs.length === 0) return
    const drop = wrongs[Math.floor(Math.random() * wrongs.length)]
    setEliminated(prev => {
      const next = new Set(prev)
      next.add(drop)
      return next
    })
    setHintsLeft(h => h - 1)
  }

  return (
    <div className="rounded-3xl border border-border/60 bg-card shadow-sm">
      <div className="px-6 py-10 md:px-10 md:py-12 max-w-2xl mx-auto">
        <h2
          className="text-2xl md:text-3xl font-bold mb-1 text-center"
          style={{ ...titleStyle, fontFamily: 'var(--font-fraunces, serif)' }}
        >
          Parenting Trivia
        </h2>
        <p className="text-sm text-muted-foreground mb-6 text-center">Test your knowledge!</p>

        {/* Hint row — sits above the question card so the player sees
            their remaining hints at all times. Right-aligned so it
            doesn't compete with the question content. */}
        <div className="flex items-center justify-end mb-3">
          <button
            type="button"
            onClick={useHint}
            disabled={hintsLeft <= 0 || celebrating || picked !== null || attempts >= maxAttempts}
            title={hintsLeft > 0 ? `Eliminate one wrong answer (${hintsLeft} of 3 left)` : 'No hints left'}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full border border-border bg-card hover:bg-muted/40 disabled:opacity-40 whitespace-nowrap"
          >
            <Lightbulb className="h-3.5 w-3.5" />
            Hint <span className="tabular-nums opacity-70">{hintsLeft}</span>
          </button>
        </div>

        <div className="bg-muted/40 border border-border/60 rounded-2xl px-6 py-6 mb-6">
          <h3 className="text-lg md:text-xl font-bold text-foreground leading-snug">{current.q}</h3>
        </div>

        {/* Celebration banner — only renders when a correct answer
            was just picked, in the brief beat before advancing. */}
        {celebrating && (
          <div
            className="mb-4 inline-flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl font-bold celebrate-pop"
            style={{
              color: signatureBg ?? 'inherit',
              backgroundColor: signatureTile ?? 'rgba(0,0,0,0.04)',
            }}
            aria-live="polite"
          >
            <Sparkles className="h-5 w-5" /> Got it! That&apos;s the right answer.
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-3">
          {current.options.map(opt => {
            const isPicked      = picked === opt
            const isCorrectShow = picked && opt === current.a
            const isWrong       = isPicked && !isCorrectShow
            const isEliminated  = eliminated.has(opt)
            return (
              <button
                key={opt}
                onClick={() => pick(opt)}
                disabled={attempts >= maxAttempts || picked !== null || isEliminated}
                style={isCorrectShow && signatureBg ? { borderColor: signatureBg, backgroundColor: signatureTile, color: signatureFg } : undefined}
                className={`px-4 py-4 rounded-xl border-2 text-left text-base font-semibold transition-colors ${
                  isCorrectShow ? 'tile-pop'                                       :
                  isWrong       ? 'border-rose-400 bg-rose-50 text-rose-900 tile-shake' :
                  isEliminated  ? 'border-border bg-muted/20 text-muted-foreground line-through opacity-50 cursor-not-allowed' :
                                  'border-border bg-card hover:border-primary/40 hover:bg-primary/5 disabled:opacity-50'
                }`}
              >
                {opt}
              </button>
            )
          })}
        </div>

        <p className="mt-10 text-xs font-bold uppercase tracking-widest text-muted-foreground text-center">
          Question {idx + 1} of {rounds.length}
        </p>
      </div>

      {/* Shares the celebrate-pop keyframe with GuessAndCheck — keeps
          the beat consistent across games. */}
      <style>{`
        @keyframes celebratePop {
          0%   { transform: scale(0.7); opacity: 0; }
          40%  { transform: scale(1.08); opacity: 1; }
          70%  { transform: scale(0.97); }
          100% { transform: scale(1); }
        }
        .celebrate-pop {
          animation: celebratePop 420ms cubic-bezier(0.34, 1.56, 0.64, 1) both;
        }
        @media (prefers-reduced-motion: reduce) {
          .celebrate-pop { animation: none; }
        }
      `}</style>
    </div>
  )
}

// ── Word Search ───────────────────────────────────────────────────────────────

function WordSearchPlayer({
  board, difficulty, onCorrect, onFinish, signatureBg, signatureFg, signatureTile,
}: { board: WordSearchPayload; difficulty: Difficulty; onCorrect: () => void; onFinish: (opts?: { shareGrid?: string }) => void; signatureBg?: string; signatureFg?: string; signatureTile?: string }) {
  const [selected, setSelected] = useState<number[]>([])
  const [matched, setMatched]   = useState<Set<number>>(new Set())
  const [found, setFound]       = useState<Set<string>>(new Set())
  // Used for matched-tile styling (kept inline so Tailwind doesn't need
  // to generate arbitrary-hex utility classes at build time).
  const matchedTileStyle = signatureTile ? { backgroundColor: signatureTile, color: signatureFg } : undefined
  const titleStyle = signatureBg ? { color: signatureBg } : undefined

  function click(i: number) {
    if (matched.has(i)) return
    setSelected(sel => {
      const next = sel.includes(i) ? sel.filter(x => x !== i) : [...sel, i]
      const fwd = next.map(j => board.grid[j]).join('')
      const rev = fwd.split('').reverse().join('')
      const w   = board.words.find(w => (w === fwd || w === rev) && !found.has(w))
      if (w) {
        const newMatched = new Set(matched)
        next.forEach(j => newMatched.add(j))
        const newFound   = new Set(found); newFound.add(w)
        setMatched(newMatched)
        setFound(newFound)
        onCorrect()
        setTimeout(() => {
          if (newFound.size === board.words.length) onFinish()
        }, 300)
        return []
      }
      return next
    })
  }

  // Responsive tile size — smaller for the brain-squeezing 12-col grid
  const cols = board.cols ?? 10
  const tileBase = difficulty === 'brain-squeezing'
    ? 'w-7 h-7 text-xs sm:w-9 sm:h-9 sm:text-base'
    : 'w-8 h-8 text-sm sm:w-11 sm:h-11 sm:text-lg'

  return (
    <div className="rounded-3xl border border-border/60 bg-card shadow-sm">
      <div className="px-4 py-8 md:px-10 md:py-12">
        <h2
          className="text-2xl md:text-3xl font-bold mb-1 text-center"
          style={{ ...titleStyle, fontFamily: 'var(--font-fraunces, serif)' }}
        >
          Mom Brain Word Search
        </h2>
        <p className="text-sm text-muted-foreground text-center mb-6 max-w-md mx-auto">
          Click letters in a row to spell each word, then click the last letter to lock it in.
        </p>

        <div className="flex flex-col md:flex-row gap-6 items-start justify-center">
          {/* Grid */}
          <div
            className="grid gap-1 sm:gap-1.5 mx-auto"
            style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
          >
            {board.grid.map((letter, i) => {
              const isSel  = selected.includes(i)
              const isHit  = matched.has(i)
              return (
                <button
                  key={i}
                  onClick={() => click(i)}
                  disabled={isHit}
                  style={isHit ? matchedTileStyle : undefined}
                  className={`${tileBase} rounded-md font-bold transition-colors ${
                    isHit
                      ? matchedTileStyle ? 'shadow-inner tile-pop' : 'bg-green-500 text-white shadow-inner tile-pop'
                      : isSel
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'bg-muted text-foreground hover:bg-muted/70'
                  }`}
                >
                  {letter}
                </button>
              )
            })}
          </div>

          {/* Word list */}
          <div className="bg-muted/30 border border-border/60 rounded-2xl px-5 py-4 min-w-[180px] w-full md:w-auto">
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Words to find</p>
            <ul className="space-y-2">
              {board.words.map(w => {
                const got = found.has(w)
                return (
                  <li key={w} className={`text-sm font-bold flex items-center gap-2 ${got ? 'text-green-700 line-through' : 'text-foreground'}`}>
                    {got && <CheckCircle2 className="h-4 w-4" />}
                    {w}
                  </li>
                )
              })}
            </ul>
          </div>
        </div>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => onFinish()}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            End game and submit ({found.size} / {board.words.length} found)
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Memory ────────────────────────────────────────────────────────────────────

function MemoryPlayer({
  board, onCorrect, onFinish, signatureBg, signatureFg, signatureTile,
}: { board: MemoryPayload; onCorrect: () => void; onFinish: (opts?: { shareGrid?: string }) => void; signatureBg?: string; signatureFg?: string; signatureTile?: string }) {
  const deck = useMemo(() => {
    const pool = board.icons.slice(0, board.pairs)
    const cards = [...pool, ...pool]
    // Stable shuffle per session — Math.random is fine here since pairing is symmetric
    return cards.map(c => ({ c, k: Math.random() })).sort((a, b) => a.k - b.k).map(x => x.c)
  }, [board])
  // Theming for Memory: title uses signature color; matched tiles use the
  // signature tile color; face-down tiles use signature bg. Falls back when
  // props are undefined so existing rendering still works during a partial
  // migration.
  const titleStyle = signatureBg ? { color: signatureBg } : undefined
  const matchedStyle = signatureTile ? { backgroundColor: signatureTile, color: signatureFg, borderColor: signatureBg } : undefined
  const faceDownStyle = signatureBg ? { backgroundColor: signatureBg, color: signatureFg } : undefined

  const [flipped, setFlipped] = useState<number[]>([])
  const [matched, setMatched] = useState<Set<number>>(new Set())
  const [moves, setMoves]     = useState(0)
  // Refs mirror state for synchronous read at finish time
  const movesRef       = useRef(0)
  const pairsFoundRef  = useRef(0)

  function buildGrid(): string {
    // 🟩 per pair found, 🟥 per remaining pair → quick "did they finish?" signal
    const found  = pairsFoundRef.current
    const total  = board.pairs
    const row    = '🟩'.repeat(found) + '🟥'.repeat(Math.max(0, total - found))
    return `${row}\n${found}/${total} pairs in ${movesRef.current} flips`
  }

  function click(i: number) {
    if (flipped.length >= 2 || flipped.includes(i) || matched.has(i)) return
    const next = [...flipped, i]
    setFlipped(next)
    if (next.length === 2) {
      movesRef.current += 1
      setMoves(movesRef.current)
      if (deck[next[0]] === deck[next[1]]) {
        const nm = new Set(matched); nm.add(next[0]); nm.add(next[1])
        setMatched(nm)
        setFlipped([])
        pairsFoundRef.current += 1
        onCorrect()
        if (nm.size === deck.length) setTimeout(() => onFinish({ shareGrid: buildGrid() }), 500)
      } else {
        setTimeout(() => setFlipped([]), 900)
      }
    }
  }

  // Responsive grid
  const colsClass = board.pairs >= 10 ? 'grid-cols-4 sm:grid-cols-5'
                  : board.pairs >= 8  ? 'grid-cols-4'
                  : 'grid-cols-3 sm:grid-cols-4'

  return (
    <div className="rounded-3xl border border-border/60 bg-card shadow-sm">
      <div className="px-4 py-8 md:px-10 md:py-12">
        <h2
          className="text-2xl md:text-3xl font-bold mb-1 text-center"
          style={{ ...titleStyle, fontFamily: 'var(--font-fraunces, serif)' }}
        >
          Match Sprint
        </h2>
        <p className="text-sm text-muted-foreground text-center mb-4">Flip and find the matching pairs — race the clock.</p>

        {/* Live moves counter — secondary measurable axis alongside time */}
        <p className="text-center text-xs font-bold uppercase tracking-widest text-muted-foreground mb-6">
          Flips: <span className="text-foreground tabular-nums">{moves}</span>
        </p>

        <div className={`grid ${colsClass} gap-3 max-w-md md:max-w-lg mx-auto`}>
          {deck.map((card, i) => {
            const isMatched = matched.has(i)
            const isFlipped = flipped.includes(i) || isMatched
            return (
              <button
                key={i}
                onClick={() => click(i)}
                style={isMatched ? matchedStyle : isFlipped ? undefined : faceDownStyle}
                className={`aspect-square rounded-2xl text-3xl md:text-4xl flex items-center justify-center transition-all ${
                  isMatched
                    ? 'border-2 shadow-inner tile-pop'
                    : isFlipped
                      ? 'bg-primary/10 border-2 border-primary/40 shadow-inner tile-flip-in'
                      : faceDownStyle ? 'shadow-md hover:scale-105' : 'bg-primary text-primary-foreground shadow-md hover:scale-105'
                }`}
              >
                {isFlipped ? card : '?'}
              </button>
            )
          })}
        </div>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => onFinish({ shareGrid: buildGrid() })}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            End game and submit ({matched.size / 2} / {board.pairs} pairs)
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Family Connect ────────────────────────────────────────────────────────────
// 16 words on a 4x4 grid. Pick 4 that belong to the same hidden group, submit.
// Server-side groups are stored as { label, tone, words }. Player gets 4 mistakes.

const TONE_STYLE: Record<FamilyConnectGroup['tone'], { tile: string; banner: string; emoji: string }> = {
  yellow: { tile: 'bg-yellow-400 text-gray-900',  banner: 'bg-yellow-400 text-gray-900',  emoji: '🟨' },
  green:  { tile: 'bg-green-500 text-white',      banner: 'bg-green-500 text-white',      emoji: '🟩' },
  blue:   { tile: 'bg-blue-500 text-white',       banner: 'bg-blue-500 text-white',       emoji: '🟦' },
  purple: { tile: 'bg-purple-500 text-white',     banner: 'bg-purple-500 text-white',     emoji: '🟪' },
}

function FamilyConnectPlayer({
  board, onCorrect, onFinish, signatureBg, signatureFg,
}: {
  board: FamilyConnectPayload
  onCorrect: () => void
  onFinish: (opts: { shareGrid: string }) => void
  signatureBg?: string
  signatureFg?: string
}) {
  const MAX_MISTAKES = 4

  // Map word → group index so submissions can be checked locally + colored
  const wordToGroup = useMemo(() => {
    const m = new Map<string, number>()
    board.groups.forEach((g, i) => g.words.forEach(w => m.set(w.toUpperCase(), i)))
    return m
  }, [board])

  // Initial shuffled deck — stable across re-renders within a session
  const [pool, setPool] = useState<string[]>(() => {
    const all = board.groups.flatMap(g => g.words.map(w => w.toUpperCase()))
    return [...all].sort(() => Math.random() - 0.5)
  })

  const [selected, setSelected]       = useState<string[]>([])
  const [solvedIdx, setSolvedIdx]     = useState<number[]>([])           // group indices already revealed
  const [mistakes, setMistakes]       = useState(0)
  const [shakeKey, setShakeKey]       = useState(0)
  const [toast, setToast]             = useState<string | null>(null)
  const [guessGrid, setGuessGrid]     = useState<string[]>([])           // emoji rows for the share grid

  function toggle(word: string) {
    setSelected(s => {
      if (s.includes(word))         return s.filter(w => w !== word)
      if (s.length >= 4)            return s
      return [...s, word]
    })
  }

  function shuffle() {
    setPool(p => {
      const remaining = p.filter(w => !isInSolvedGroup(w))
      const solved    = p.filter(w => isInSolvedGroup(w))
      return [...solved, ...remaining.sort(() => Math.random() - 0.5)]
    })
  }

  function deselectAll() { setSelected([]) }

  function isInSolvedGroup(word: string) {
    const g = wordToGroup.get(word)
    return g !== undefined && solvedIdx.includes(g)
  }

  function buildEmojiRow(words: string[]): string {
    // Each cell colored by the actual group the word belongs to
    return words
      .map(w => {
        const gi = wordToGroup.get(w)
        if (gi === undefined) return '⬛'
        return TONE_STYLE[board.groups[gi].tone].emoji
      })
      .join('')
  }

  function submit() {
    if (selected.length !== 4) return
    const row = buildEmojiRow(selected)
    setGuessGrid(g => [...g, row])

    const groupIndices = selected.map(w => wordToGroup.get(w))
    const allSame = groupIndices.every(g => g !== undefined && g === groupIndices[0])

    if (allSame && groupIndices[0] !== undefined) {
      const gi = groupIndices[0]
      // Move solved group to the top of the pool
      setPool(p => {
        const others = p.filter(w => wordToGroup.get(w) !== gi)
        const solved = p.filter(w => wordToGroup.get(w) === gi)
        return [...p.filter(w => isInSolvedGroup(w)), ...solved, ...others.filter(w => !isInSolvedGroup(w))]
      })
      setSolvedIdx(s => [...s, gi])
      setSelected([])
      onCorrect()

      // All solved? Win.
      if (solvedIdx.length + 1 === board.groups.length) {
        setTimeout(() => onFinish({ shareGrid: [...guessGrid, row].join('\n') }), 700)
      } else {
        setToast(`Got the ${board.groups[gi].label} group!`)
        setTimeout(() => setToast(null), 1800)
      }
    } else {
      // Wrong group. Check for "one away" hint.
      const counts = new Map<number, number>()
      for (const g of groupIndices) if (g !== undefined) counts.set(g, (counts.get(g) ?? 0) + 1)
      const oneAway = Array.from(counts.values()).some(c => c === 3)

      const newMistakes = mistakes + 1
      setMistakes(newMistakes)
      setShakeKey(k => k + 1)
      setToast(oneAway ? 'One away…' : 'Not a group')
      setTimeout(() => setToast(null), 1500)

      if (newMistakes >= MAX_MISTAKES) {
        // Auto-reveal remaining groups, end game
        const remaining = board.groups
          .map((_, i) => i)
          .filter(i => !solvedIdx.includes(i))
        setTimeout(() => {
          setSolvedIdx(s => [...s, ...remaining])
          setSelected([])
          setTimeout(() => onFinish({ shareGrid: [...guessGrid, row].join('\n') }), 800)
        }, 600)
      } else {
        setTimeout(() => setSelected([]), 600)
      }
    }
  }

  // Render solved groups as banners above the remaining grid
  const remainingWords = pool.filter(w => !isInSolvedGroup(w))
  const solvedGroups   = solvedIdx.map(i => board.groups[i])

  return (
    <div className="rounded-3xl border border-border/60 bg-card shadow-sm overflow-hidden">
      {signatureBg && <div className="h-1.5" style={{ backgroundColor: signatureBg }} />}
      <div className="px-4 py-8 md:px-10 md:py-12">
        <h2
          className="text-2xl md:text-3xl font-bold text-foreground mb-1 text-center"
          style={{ fontFamily: 'var(--font-fraunces, serif)' }}
        >
          Family Connect
        </h2>
        <p className="text-sm text-muted-foreground text-center mb-6 max-w-md mx-auto">
          Group the 16 words into 4 hidden categories of 4. You get 4 mistakes.
        </p>

        {/* Solved banners */}
        {solvedGroups.length > 0 && (
          <div className="space-y-2 max-w-2xl mx-auto mb-3">
            {solvedGroups.map(g => (
              <div key={g.label} className={`rounded-xl px-4 py-3 text-center font-bold ${TONE_STYLE[g.tone].banner}`}>
                <p className="text-[10px] uppercase tracking-widest opacity-80">{g.label}</p>
                <p className="text-sm md:text-base mt-0.5">{g.words.join(' · ')}</p>
              </div>
            ))}
          </div>
        )}

        {/* Remaining 4×4 grid */}
        <div key={shakeKey} className={`grid grid-cols-4 gap-2 max-w-2xl mx-auto ${shakeKey > 0 ? 'tile-shake' : ''}`}>
          {remainingWords.map(word => {
            const isSel = selected.includes(word)
            return (
              <button
                key={word}
                onClick={() => toggle(word)}
                className={`aspect-square sm:aspect-[5/3] rounded-lg px-1 sm:px-2 text-[10px] sm:text-sm font-bold text-center break-words transition-colors ${
                  isSel ? 'shadow-inner tile-pop' : 'bg-muted text-foreground hover:bg-muted/70'
                }`}
                style={isSel && signatureBg
                  ? { backgroundColor: signatureBg, color: signatureFg ?? 'white' }
                  : undefined}
              >
                {word}
              </button>
            )
          })}
        </div>

        {/* Mistakes + toast */}
        <div className="flex flex-col items-center gap-3 mt-6">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Mistakes</span>
            <div className="flex gap-1.5">
              {[0, 1, 2, 3].map(i => (
                <span
                  key={i}
                  className={`w-2.5 h-2.5 rounded-full ${i < mistakes ? 'bg-rose-500' : 'bg-muted-foreground/30'}`}
                />
              ))}
            </div>
          </div>
          {toast && (
            <p className="text-sm font-bold text-foreground bg-background border border-border/60 px-3 py-1 rounded-full shadow-sm">
              {toast}
            </p>
          )}
        </div>

        {/* Controls */}
        <div className="flex flex-wrap gap-2 justify-center mt-6 max-w-md mx-auto">
          <button
            onClick={shuffle}
            className="px-4 py-2 text-sm font-semibold rounded-full border border-border bg-card hover:bg-muted/40"
          >
            Shuffle
          </button>
          <button
            onClick={deselectAll}
            disabled={selected.length === 0}
            className="px-4 py-2 text-sm font-semibold rounded-full border border-border bg-card hover:bg-muted/40 disabled:opacity-40"
          >
            Deselect all
          </button>
          <button
            onClick={submit}
            disabled={selected.length !== 4 || mistakes >= MAX_MISTAKES}
            className="px-5 py-2 text-sm font-bold rounded-full hover:opacity-90 disabled:opacity-40 transition-opacity"
            style={signatureBg
              ? { backgroundColor: signatureBg, color: signatureFg ?? 'white' }
              : { backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}
          >
            Submit ({selected.length}/4)
          </button>
        </div>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => onFinish({ shareGrid: guessGrid.join('\n') })}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            End game and submit ({solvedIdx.length} / {board.groups.length} groups found)
          </button>
        </div>
      </div>

    </div>
  )
}

// ── Social share buttons ─────────────────────────────────────────────────────

function SocialShare({
  game, shareGrid, isoWeek, durationSeconds, newBest,
}: {
  game:            GameDefinition
  shareGrid?:      string
  isoWeek:         number
  durationSeconds: number
  newBest?:        boolean
}) {
  const url     = typeof window !== 'undefined' ? `${window.location.origin}/games` : '/games'
  const gameEmoji = GAME_EMOJI[game.id] ?? '🎮'

  // Canonical 5-line card — identical structure across every game so it
  // becomes instantly recognizable in a feed (Wordle-style identity).
  const lines: string[] = [
    `${SHARE_BRAND_HEADER} · Week ${isoWeek}`,
    `${gameEmoji} ${game.title} · ⏱ ${formatTime(durationSeconds)}${newBest ? ' · 🏆 New best!' : ''}`,
  ]
  if (shareGrid) lines.push(shareGrid)
  lines.push('') // blank line separates body from CTA
  lines.push(`${SHARE_CTA} → ${url}`)

  const text  = lines.join('\n')
  const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(text)}`
  const xUrl  = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`

  const [copied, setCopied] = useState(false)
  async function copyAll() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch { /* clipboard unavailable */ }
  }

  return (
    <div className="bg-muted/40 border border-border/60 rounded-2xl px-4 py-4">
      <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-3 text-center">
        Brag a little — paste this anywhere
      </p>

      {/* Recognizable share card preview — what Facebook/X/iMessage will display */}
      <pre className="font-mono text-[13px] sm:text-sm leading-snug whitespace-pre-wrap text-left mb-3 select-all bg-background border border-border/60 rounded-xl px-4 py-3 mx-auto max-w-md">
{text}
      </pre>

      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={copyAll}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {copied ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
          {copied ? 'Copied!' : 'Copy share card'}
        </button>
        <a
          href={fbUrl} target="_blank" rel="noreferrer"
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-full bg-[#1877F2] text-white hover:opacity-90"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
          </svg>
          Facebook
        </a>
        <a
          href={xUrl} target="_blank" rel="noreferrer"
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-full bg-black text-white hover:opacity-90"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
          X
        </a>
      </div>
      <p className="text-[10px] text-muted-foreground text-center mt-3 leading-relaxed">
        Tip: Facebook strips text from share buttons — &ldquo;Copy share card&rdquo; then paste into your post for the full grid.
      </p>
    </div>
  )
}

// ── Win Screen + lead-capture form ───────────────────────────────────────────

function WinScreen({
  game, difficulty, score, isoYear, isoWeek, durationSeconds, shareGrid,
  newBest, prevBest,
}: {
  game: GameDefinition; difficulty: Difficulty; score: number;
  isoYear: number; isoWeek: number; durationSeconds: number;
  shareGrid?: string
  newBest?:  boolean
  prevBest?: number | null
}) {
  const [submitted, setSubmitted] = useState(false)
  const [busy, setBusy]           = useState(false)
  const [err, setErr]             = useState<string | null>(null)
  const [form, setForm]           = useState({ first_name: '', last_name: '', email: '', phone: '' })

  // Confetti burst on first mount — paints with the game's signature color
  // so each game's win moment feels like ITS color was the celebration.
  // Skipped on prefers-reduced-motion.
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    let cancelled = false
    void import('canvas-confetti').then(mod => {
      if (cancelled) return
      const confetti = mod.default
      const color = game.signature.bg
      // Two complementary tones — the signature color + a softer
      // off-white. Two bursts from the lower corners so it reads
      // as a celebration not a spray bottle.
      const common: import('canvas-confetti').Options = {
        spread: 60, startVelocity: 45, ticks: 200,
        colors: [color, '#FFFFFF', '#FFD580'],
        zIndex: 9999,
      }
      confetti({ ...common, particleCount: 60, origin: { x: 0.15, y: 0.75 }, angle: 70 })
      confetti({ ...common, particleCount: 60, origin: { x: 0.85, y: 0.75 }, angle: 110 })
      // A small follow-up sprinkle from center for layered motion.
      setTimeout(() => {
        if (cancelled) return
        confetti({ ...common, particleCount: 40, origin: { x: 0.5, y: 0.4 }, spread: 100, startVelocity: 35 })
      }, 250)
    }).catch(() => {/* fallback: no confetti, no crash */})
    return () => { cancelled = true }
  }, [game.signature.bg])

  function set<K extends keyof typeof form>(k: K, v: string) { setForm(f => ({ ...f, [k]: v })) }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setErr(null)
    try {
      const res = await fetch('/api/games/submit-score', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          game_type:        game.id,
          difficulty,
          score,
          duration_seconds: durationSeconds,
          iso_year:         isoYear,
          iso_week:         isoWeek,
          ...form,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { setErr(json?.error ?? `HTTP ${res.status}`); return }
      setSubmitted(true)
    } finally { setBusy(false) }
  }

  const inputCls = 'w-full px-4 py-3 text-sm rounded-xl border border-border bg-background outline-none focus:border-primary transition-colors'

  return (
    <div className="rounded-3xl border-2 border-primary/20 bg-card shadow-lg overflow-hidden">
      {/* Unified celebration card — score on top, drawing form right
          underneath. Tighter padding so the page reads as one moment
          rather than two stacked sections. The secondary 'back to
          games' CTA lets repeat players skip the drawing form without
          feeling pestered, which keeps them in the loop instead of
          dropping off. */}
      <div
        className="px-6 pt-8 pb-5 md:pt-10 md:pb-6 text-center"
        style={{ backgroundColor: game.signature.tile }}
      >
        <div
          className="w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4 shadow-md"
          style={{ backgroundColor: game.signature.bg, color: game.signature.fg }}
        >
          <Trophy className="h-7 w-7 md:h-9 md:w-9" />
        </div>
        <h2
          className="text-3xl md:text-4xl font-black text-foreground mb-1"
          style={{ fontFamily: 'var(--font-fraunces, serif)' }}
        >
          Level Cleared!
        </h2>
        <p className="text-base text-muted-foreground">
          Final Score: <strong className="text-2xl ml-1" style={{ color: game.signature.bg }}>{score}</strong>
        </p>
        <div className="mt-3 flex items-center justify-center gap-2 flex-wrap text-sm">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-foreground text-background font-bold tabular-nums">
            <Clock className="h-3.5 w-3.5" /> {formatTime(durationSeconds)}
          </span>
          {newBest ? (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-500 text-white font-bold">
              <Flame className="h-3.5 w-3.5" />
              New personal best!
              {prevBest != null && <span className="opacity-90 font-semibold ml-1">(beat {formatTime(prevBest)})</span>}
            </span>
          ) : prevBest != null ? (
            <span className="text-muted-foreground font-semibold">
              Your best: <span className="tabular-nums text-foreground">{formatTime(prevBest)}</span>
            </span>
          ) : null}
        </div>
      </div>

      <div className="px-6 pt-5 pb-6 md:px-12 md:pt-6 md:pb-8">
        {!submitted ? (
          <div className="max-w-md mx-auto">
            {/* One-line lead-in instead of a separate header block —
                visually ties the drawing to the score above. */}
            <p className="text-center text-sm font-bold text-foreground mb-1">
              Drop your name in this week&apos;s drawing
            </p>
            <p className="text-center text-xs text-muted-foreground mb-4">
              3 winners every Monday · $10 each · every completion = one entry
            </p>
            <form onSubmit={submit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input required value={form.first_name} onChange={e => set('first_name', e.target.value)} placeholder="First name" className={inputCls} />
                <input required value={form.last_name}  onChange={e => set('last_name', e.target.value)}  placeholder="Last name"  className={inputCls} />
              </div>
              <input type="email" required value={form.email} onChange={e => set('email', e.target.value)} placeholder="Email"  className={inputCls} />
              <input type="tel"            value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="Phone (optional)" className={inputCls} />
              {err && <p className="text-sm font-semibold text-rose-700">{err}</p>}
              <button type="submit" disabled={busy}
                className="w-full px-4 py-3 text-base font-bold rounded-xl hover:opacity-90 disabled:opacity-50 transition-opacity"
                style={{ backgroundColor: game.signature.bg, color: game.signature.fg }}>
                {busy ? 'Submitting…' : 'Submit Score & Enter'}
              </button>
              {/* Secondary CTA — skip the form, head back to play
                  more. Lower hierarchy than Submit but still
                  obviously clickable so repeat players don't feel
                  cornered by the form. Links to #pick-level so the
                  player lands on the difficulty + game grid instead
                  of having to scroll past the hero. */}
              <a
                href={`/games?diff=${difficulty}#pick-level`}
                className="block w-full px-4 py-3 text-sm font-bold text-center text-muted-foreground hover:text-foreground rounded-xl border border-border bg-background hover:bg-muted/40 transition-colors"
              >
                No thanks — take me back to games
              </a>
              <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
                By submitting, you agree to receive the Weekly Scoop newsletter. Unsubscribe any time.
              </p>
            </form>
          </div>
        ) : (
          <div className="text-center max-w-md mx-auto py-4">
            <div className="w-16 h-16 bg-green-100 text-green-700 rounded-full flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-2">You&apos;re entered!</h3>
            <p className="text-base text-muted-foreground mb-6">
              We&apos;ll contact you Monday if you&apos;re one of the 3 weekly $10 winners. Want to rack up more entries?
            </p>

            <SocialShare
              game={game}
              shareGrid={shareGrid}
              isoWeek={isoWeek}
              durationSeconds={durationSeconds}
              newBest={newBest}
            />

            <a href={`/games?diff=${difficulty}#pick-level`}
              className="inline-flex items-center gap-1.5 mt-5 px-5 py-3 text-sm font-bold rounded-full hover:opacity-90 transition-opacity"
              style={{ backgroundColor: game.signature.bg, color: game.signature.fg }}>
              Play another game <ChevronRight className="h-4 w-4" />
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
