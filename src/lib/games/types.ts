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

export interface GameDefinition {
  id:    GameId
  title: string
  desc:  string
  emoji: string
  // Tailwind color tone — maps to our theme tokens
  tone:  'primary' | 'secondary' | 'accent' | 'foreground'
}

export const GAMES: GameDefinition[] = [
  { id: 'family-connect', title: 'Family Connect',     desc: 'Group 16 words into 4 hidden themes. Four mistakes allowed.', emoji: '🧩', tone: 'primary'    },
  { id: 'trivia',         title: 'Parenting Trivia',   desc: 'Test your local & parenting knowledge.',     emoji: '✨', tone: 'secondary'  },
  { id: 'scramble',       title: 'Lunchbox Scramble',  desc: 'Unscramble the school-themed words.',        emoji: '🔤', tone: 'accent'     },
  { id: 'memory',         title: 'Toddler Chaos Match',desc: 'Find the matching pairs before time runs out.', emoji: '⏱️', tone: 'foreground' },
  { id: 'emoji',          title: 'Emoji Decode',       desc: 'Guess the parenting phrase from the emojis.', emoji: '🎯', tone: 'primary'    },
  { id: 'math',           title: 'Carpool Math',       desc: 'Quick brain-teasers while waiting in line.', emoji: '🧮', tone: 'secondary'  },
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
