// Brain Games shared types. The same shape lives on disk in `game_content.payload`
// and in the React components that render each game.

export type GameId =
  | 'family-connect'
  | 'word-search'        // retired in migration 081 — kept for old bookmarks
  | 'trivia'
  | 'scramble'
  | 'memory'
  | 'emoji'
  | 'math'

export type Difficulty = 'easy' | 'challenging' | 'brain-squeezing'

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  'easy':            'Perfect for Kids',
  'challenging':     'Challenging',
  'brain-squeezing': 'Brain Squeezing',
}

// Storage / iteration order — DO NOT REORDER. Admin tables, content rows, and
// score records key off these strings. Affects column ordering only.
export const DIFFICULTIES: Difficulty[] = ['easy', 'challenging', 'brain-squeezing']

// UI display order — adult difficulties first, kids tile last (bonus discovery).
export const DIFFICULTIES_DISPLAY_ORDER: Difficulty[] = ['challenging', 'brain-squeezing', 'easy']

// Default difficulty for fresh visitors — parents first.
export const DEFAULT_DIFFICULTY: Difficulty = 'challenging'

/**
 * Per-game visual signature. Each game gets one saturated color that
 * carries through the entire experience — tile on the hub, header bar
 * during play, accent on correct-answer states, wins screen background.
 * Pattern is borrowed from NYT Games (Wordle = green, Spelling Bee =
 * yellow, Letter Boxed = coral) where the color IS the game's identity.
 *
 * `bg` is the saturated brand color (CSS-formatted, used in inline style
 * for dynamic theming). `fg` is the text color that reads on top of it
 * (almost always white, sometimes slate for very light bg). `tile` is
 * the soft tint used as background of the hub tile so the tile isn't
 * fully saturated — only the accent stripes + emoji burst are.
 */
export interface GameSignature {
  /** Saturated brand color — header, primary CTA, wins-screen background. */
  bg:   string
  /** Text color that reads on `bg`. */
  fg:   string
  /** Soft tint for the hub tile background (about 8-12% of the saturated bg). */
  tile: string
}

export interface GameDefinition {
  id:        GameId
  title:     string
  desc:      string
  emoji:     string
  signature: GameSignature
}

// Color picks based on each game's personality:
//   Family Connect → deep blue (puzzle/intellect, mirrors portal-blue)
//   Parenting Trivia → coral/terra (warm, conversational)
//   Lunchbox Scramble → teal (fresh, schoolyard-adjacent without childish)
//   Toddler Chaos Match → amber/gold (energetic, race-against-time)
//   Emoji Decode → purple (playful, breaks pattern — emoji is casual)
//   Carpool Math → forest green (disciplined, "right answers exist")
export const GAMES: GameDefinition[] = [
  { id: 'family-connect', title: 'Family Connect',
    desc: 'Group 16 words into 4 hidden themes. Four mistakes allowed.',
    emoji: '🧩',
    signature: { bg: '#1A5FA8', fg: '#FFFFFF', tile: '#E8F0FA' } },
  { id: 'trivia', title: 'Parenting Trivia',
    desc: 'Test your local & parenting knowledge.',
    emoji: '✨',
    signature: { bg: '#EF6442', fg: '#FFFFFF', tile: '#FAEAE0' } },
  { id: 'scramble', title: 'Lunchbox Scramble',
    desc: 'Unscramble the school-themed words.',
    emoji: '🔤',
    signature: { bg: '#0F766E', fg: '#FFFFFF', tile: '#DEF1EE' } },
  { id: 'memory', title: 'Toddler Chaos Match',
    desc: 'Find the matching pairs before time runs out.',
    emoji: '⏱️',
    signature: { bg: '#D4A843', fg: '#1E3A5F', tile: '#FAF1DC' } },
  { id: 'emoji', title: 'Emoji Decode',
    desc: 'Guess the parenting phrase from the emojis.',
    emoji: '🎯',
    signature: { bg: '#7C3AED', fg: '#FFFFFF', tile: '#EDE3FB' } },
  { id: 'math', title: 'Carpool Math',
    desc: 'Quick brain-teasers while waiting in line.',
    emoji: '🧮',
    signature: { bg: '#15803D', fg: '#FFFFFF', tile: '#DEF0E2' } },
]

export function gameById(id: string): GameDefinition | null {
  return GAMES.find(g => g.id === id) ?? null
}

// ── Per-game payload shapes ──────────────────────────────────────────────────

export interface ScramblePayload   { scrambled: string; answer: string }
export interface TriviaPayload     { q: string; options: string[]; a: string }
export interface EmojiPayload      { emoji: string; answer: string }
export interface MathPayload       { q: string; a: string }
export interface WordSearchPayload { words: string[]; grid: string[]; cols: number }
export interface MemoryPayload     { icons: string[]; pairs: number }
export interface FamilyConnectGroup { label: string; tone: 'yellow' | 'green' | 'blue' | 'purple'; words: string[] }
export interface FamilyConnectPayload { groups: FamilyConnectGroup[] }

// Convenience union for "what's in this row"
export type GamePayload =
  | ({ game_type: 'scramble'    } & ScramblePayload)
  | ({ game_type: 'trivia'      } & TriviaPayload)
  | ({ game_type: 'emoji'       } & EmojiPayload)
  | ({ game_type: 'math'        } & MathPayload)
  | ({ game_type: 'word-search' } & WordSearchPayload)
  | ({ game_type: 'memory'      } & MemoryPayload)

// ── How many rounds each game runs in a session ──────────────────────────────
// Word-search and memory are single-round (one grid). The others cycle through
// N items per session.

export const ROUNDS_PER_SESSION: Record<GameId, number> = {
  'family-connect': 1,
  'word-search':    1,
  'memory':         1,
  'trivia':         10,
  'scramble':       10,
  'emoji':          10,
  'math':           10,
}

export const POINTS_PER_CORRECT = 100

/** Max possible score per (game, difficulty). Server uses this for anti-cheat. */
export function maxScoreFor(game: GameId, _difficulty: Difficulty, contentCount: number): number {
  // For word-search the cap is words-in-grid * 100. For memory it's pairs * 100.
  // For the rest it's rounds * 100.
  return Math.max(100, contentCount * POINTS_PER_CORRECT)
}
