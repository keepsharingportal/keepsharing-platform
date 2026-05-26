// ── AI content generator for Brain Games ──────────────────────────────────────
// Per (game_type, difficulty) we send Claude a small system prompt and a
// JSON schema. The output goes straight to game_content_proposals as 'pending'
// — operator still has to approve in /admin/games/queue before it ships.
//
// Difficulty is interpreted as a LIFE STAGE, not just a complexity dial:
//   easy            → kids 5-12 (the kid mode for whole-family play)
//   challenging     → parents of elementary/tween kids (the magazine's core)
//   brain-squeezing → parents of teens + adults with grown kids (older readers)
//
// This is how the "Brain Games" brand stretches without diluting — same six
// games, three audiences, the connective tissue is always family/home life.

import Anthropic from '@anthropic-ai/sdk'
import type {
  GameId, Difficulty,
  ScramblePayload, EmojiPayload, MathPayload,
  TriviaPayload, MemoryPayload, FamilyConnectPayload,
} from './types'

// ── Public API ────────────────────────────────────────────────────────────────

export interface GeneratedItem {
  payload: Record<string, unknown>
}

export interface GenerationResult {
  items:        GeneratedItem[]
  model_notes:  string | null
  model:        string
  errors:       string[]
}

export async function generateContent(opts: {
  game:       GameId
  difficulty: Difficulty
  count:      number
  theme?:     string                // optional extra hint, e.g., "back-to-school"
}): Promise<GenerationResult> {
  const { game, difficulty, count, theme } = opts
  const gameMax   = MAX_COUNT_BY_GAME[game] ?? 15
  const safeCount = Math.max(1, Math.min(gameMax, count))

  const cfg = GAME_CONFIG[game]
  if (!cfg) {
    return { items: [], model_notes: null, model: MODEL, errors: [`Unsupported game: ${game}`] }
  }

  const system = [
    SYSTEM_BASE,
    LIFE_STAGE[difficulty],
    cfg.systemAddendum,
  ].filter(Boolean).join('\n\n')

  const userPrompt = [
    `Generate ${safeCount} ${cfg.label} for the "${difficulty}" tier.`,
    theme ? `Theme hint (optional, blend in naturally): ${theme}` : null,
    cfg.userGuidance,
  ].filter(Boolean).join('\n\n')

  const schema = {
    type:                 'object',
    additionalProperties: false,
    required:             ['items', 'model_notes'],
    properties: {
      model_notes: {
        type:        'string',
        description: 'One short sentence: what theme you leaned on, anything you flagged for review.',
      },
      items: {
        type:        'array',
        description: `Exactly ${safeCount} items — no more, no fewer.`,
        items:       cfg.itemSchema,
      },
    },
  }

  const client = new Anthropic()
  // Family Connect needs more headroom — 7 puzzles × 16 words × 4 themed groups
  // plus adaptive thinking blows past 12K. Above 16K we stream to avoid HTTP
  // read timeouts (per Anthropic SDK guidance for Sonnet 4.6).
  const maxTokens = MAX_TOKENS_BY_GAME[game] ?? 12000

  const request = {
    model:      MODEL,
    max_tokens: maxTokens,
    thinking:   { type: 'adaptive' as const },
    output_config: {
      format: { type: 'json_schema' as const, schema: schema as unknown as Record<string, unknown> },
    },
    system,
    messages: [{ role: 'user' as const, content: userPrompt }],
  }

  try {
    const response = maxTokens > 16000
      ? await (async () => {
          const stream = client.messages.stream(request)
          return stream.finalMessage()
        })()
      : await client.messages.create(request)

    const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === 'text')
    if (!textBlock) {
      const blockTypes = response.content.map(b => b.type).join(', ') || '(no blocks)'
      const reason = response.stop_reason ?? 'unknown'
      return {
        items: [], model_notes: null, model: MODEL,
        errors: [`Claude returned no text block (stop_reason: ${reason}, blocks: [${blockTypes}]). Try a smaller batch count or rerun.`],
      }
    }
    const parsed = JSON.parse(textBlock.text) as {
      model_notes: string
      items:       Record<string, unknown>[]
    }

    // Run the per-game normalizer (uppercases scramble answers, validates emoji
    // strings have actual emoji chars, etc.) — also rejects malformed items.
    const items: GeneratedItem[] = []
    const errors: string[] = []
    for (const raw of parsed.items ?? []) {
      try {
        const normalized = cfg.normalize(raw)
        items.push({ payload: normalized })
      } catch (e) {
        errors.push(`Dropped item: ${e instanceof Error ? e.message : String(e)}`)
      }
    }
    return { items, model_notes: parsed.model_notes ?? null, model: MODEL, errors }
  } catch (e) {
    return { items: [], model_notes: null, model: MODEL, errors: [`Claude call failed: ${e instanceof Error ? e.message : String(e)}`] }
  }
}

// ── Shared prompt fragments ───────────────────────────────────────────────────

// Sonnet 4.6 — ~5× cheaper than Opus 4.7 ($3/$15 vs $15/$75 per 1M tokens) and
// well-suited to pattern-driven creative writing (scrambles, emoji decodes,
// trivia). Adaptive thinking is kept on so the harder games (Family Connect
// wordplay, brain-squeezing math) still get reasoning when they need it.
const MODEL = 'claude-sonnet-4-6'

// Per-game max_tokens — most games are short, but Family Connect's payload
// (16 words × 4 themed groups per item) plus adaptive thinking burns thousands
// of tokens per puzzle. Calls above 16K stream to avoid HTTP read timeouts.
const MAX_TOKENS_BY_GAME: Partial<Record<GameId, number>> = {
  'family-connect': 32000,
}

// Per-game batch-size cap. Family Connect is a heavy creative generation
// (each item = brainstorm 4 themes + 4 words per theme + ensure 16 unique +
// purple-tier wordplay misdirect). Trying 15 in one shot blows the token
// budget on thinking before any output emerges. 5 is the sweet spot.
const MAX_COUNT_BY_GAME: Partial<Record<GameId, number>> = {
  'family-connect': 5,
}

const SYSTEM_BASE = `You are generating brain-game content for "Family Brain Games" — a daily
puzzle program on a community parenting magazine. The tone is warm, witty,
modern-parenting. Avoid: cliches about "frazzled moms," anything pre-2010, dad jokes
that feel like a 1995 office calendar, anything politically charged, anything that
shames parents. Lean into the small-but-universal truths of family life.`

const LIFE_STAGE: Record<Difficulty, string> = {
  'easy': `LIFE STAGE: Kids ages 5-12 (this is the "Perfect for Kids" tier — kids
will play alongside parents). Vocabulary and references must be accessible to
elementary-age readers. Topics: pets, recess, lunchbox, snacks, simple feelings,
weather, animals, school subjects, holidays, sports kids play. Keep it
encouraging — no failure shame, no adult cynicism.`,

  'challenging': `LIFE STAGE: Parents of elementary-to-tween kids (the magazine's core
audience). Topics: school chaos, soccer schedules, sibling dynamics, the
minivan, snack negotiation, screen-time wars, birthday parties, homework,
extracurriculars, holiday logistics, mom-friend group texts, dad jokes that
land. Witty, in-the-trenches, knowing.`,

  'brain-squeezing': `LIFE STAGE: Parents of teens + parents of grown kids
(empty-nest, midlife, grandparent-adjacent). Topics: teen driving, college
applications, the cost of prom, in-law dynamics, marriage humor, returning
to the workforce, "kids are back from college" chaos, midlife reinvention,
adult sibling drama, aging parents, the empty fridge before they come home.
Sophisticated tone — these readers want to feel SEEN, not condescended to.`,
}

// ── Per-game configs ──────────────────────────────────────────────────────────

interface GameConfig {
  label:           string
  systemAddendum?: string
  userGuidance?:   string
  itemSchema:      Record<string, unknown>
  normalize:       (raw: Record<string, unknown>) => Record<string, unknown>
}

function asStr(v: unknown, field: string): string {
  if (typeof v !== 'string' || !v.trim()) throw new Error(`Missing/invalid string for ${field}`)
  return v.trim()
}

const GAME_CONFIG: Record<GameId, GameConfig> = {
  scramble: {
    label: 'word scramble puzzles',
    systemAddendum: `For SCRAMBLE: pick a single word relevant to the life stage. Letters in
"scrambled" must be the same multiset as "answer". Word length:
easy 4-7 letters · challenging 5-9 · brain-squeezing 6-12. Avoid two-word
phrases. Answers must be common, recognizable words — no proper nouns.`,
    userGuidance: 'Each item needs a `scrambled` (uppercase, shuffled) and `answer` (uppercase, the real word).',
    itemSchema: {
      type:                 'object',
      additionalProperties: false,
      required:             ['scrambled', 'answer'],
      properties: {
        scrambled: { type: 'string', description: 'Same letters as answer, jumbled. ALL CAPS, no spaces.' },
        answer:    { type: 'string', description: 'The real word. ALL CAPS, no spaces.' },
      },
    },
    normalize(raw) {
      const a = asStr(raw.answer, 'answer').toUpperCase().replace(/\s+/g, '')
      const s = asStr(raw.scrambled, 'scrambled').toUpperCase().replace(/\s+/g, '')
      if (a.length < 3) throw new Error(`Answer "${a}" too short`)
      // Multiset check so we never ship an unsolvable scramble
      if (a.split('').sort().join('') !== s.split('').sort().join('')) {
        throw new Error(`Scrambled letters do not match answer letters for "${a}"`)
      }
      return { scrambled: s, answer: a } satisfies ScramblePayload
    },
  },

  emoji: {
    label: 'emoji-decode puzzles',
    systemAddendum: `For EMOJI: a sequence of 2-5 emoji that, read together, suggest a
common parenting/family phrase or scene. Answer is the plain-text phrase
in Title Case. Lean into life-stage specific moments.`,
    userGuidance: 'Each item: `emoji` (the emoji sequence) and `answer` (the phrase in Title Case).',
    itemSchema: {
      type:                 'object',
      additionalProperties: false,
      required:             ['emoji', 'answer'],
      properties: {
        emoji:  { type: 'string', description: '2-5 emoji characters representing the phrase.' },
        answer: { type: 'string', description: 'The phrase in Title Case.' },
      },
    },
    normalize(raw) {
      const e = asStr(raw.emoji,  'emoji')
      const a = asStr(raw.answer, 'answer')
      // Heuristic: emoji string should contain non-ASCII characters
      if (!/[^ -]/.test(e)) throw new Error(`"${e}" doesn't look like emoji`)
      return { emoji: e, answer: a } satisfies EmojiPayload
    },
  },

  math: {
    label: 'math/logic brain-teasers',
    systemAddendum: `For MATH: a short word problem or logic puzzle. The answer is a single
word or short number, written as the user would type it (case-insensitive
matching is NOT used — keep answers simple and unambiguous: a single number,
a single lowercase word). Easy: arithmetic. Challenging: rate/time/percentages.
Brain-squeezing: lateral-thinking / multi-step logic.`,
    userGuidance: 'Each item: `q` (the question text) and `a` (the answer, kept short and unambiguous).',
    itemSchema: {
      type:                 'object',
      additionalProperties: false,
      required:             ['q', 'a'],
      properties: {
        q: { type: 'string', description: 'The question text.' },
        a: { type: 'string', description: 'The answer — a single short value (number or word).' },
      },
    },
    normalize(raw) {
      const q = asStr(raw.q, 'q')
      const a = asStr(raw.a, 'a')
      if (a.length > 30) throw new Error(`Math answer too long: "${a}"`)
      return { q, a } satisfies MathPayload
    },
  },

  trivia: {
    label: 'multiple-choice trivia questions',
    systemAddendum: `For TRIVIA: 4 options, one correct. Distractors must be plausible enough
that a non-expert might pick one. Mix parenting trivia, local/regional flavor,
family pop-culture, holidays, kids-show references. Avoid anything political.`,
    userGuidance: 'Each item: `q` (question), `options` (array of 4), `a` (the correct option — must be one of options exactly).',
    itemSchema: {
      type:                 'object',
      additionalProperties: false,
      required:             ['q', 'options', 'a'],
      properties: {
        q:       { type: 'string', description: 'The question.' },
        options: {
          type:        'array',
          items:       { type: 'string' },
          description: 'Exactly 4 options — no more, no fewer.',
        },
        a:       { type: 'string', description: 'The correct option — must match one of the options exactly.' },
      },
    },
    normalize(raw) {
      const q   = asStr(raw.q, 'q')
      const opt = raw.options
      if (!Array.isArray(opt) || opt.length !== 4) throw new Error('Trivia needs exactly 4 options')
      const options = opt.map((o, i) => asStr(o, `option[${i}]`))
      const a = asStr(raw.a, 'a')
      if (!options.includes(a)) throw new Error(`Correct answer "${a}" not in options`)
      return { q, options, a } satisfies TriviaPayload
    },
  },

  memory: {
    label: 'memory-match game boards',
    systemAddendum: `For MEMORY: each item is one full game board. Provide a list of unique
emoji "icons" — pairs count is the icons.length, the player flips to find
matching pairs. Counts: easy 6 pairs · challenging 8 pairs · brain-squeezing 10
pairs. Icons must be life-stage appropriate AND visually distinct from each
other (don't pick 10 similar-looking yellow faces).`,
    userGuidance: 'Each item: `icons` (an array of unique emoji) and `pairs` (icons.length).',
    itemSchema: {
      type:                 'object',
      additionalProperties: false,
      required:             ['icons', 'pairs'],
      properties: {
        icons: {
          type:        'array',
          items:       { type: 'string' },
          description: 'Unique emoji characters, one per pair. Count depends on tier: easy 6, challenging 8, brain-squeezing 10.',
        },
        pairs: { type: 'integer', description: 'Number of pairs — MUST equal icons.length. Easy 6, challenging 8, brain-squeezing 10.' },
      },
    },
    normalize(raw) {
      const icons = raw.icons
      if (!Array.isArray(icons) || icons.length < 6) throw new Error('Need >=6 icons')
      const cleaned = icons.map((c, i) => asStr(c, `icons[${i}]`))
      const unique  = new Set(cleaned)
      if (unique.size !== cleaned.length) throw new Error('Duplicate icons in memory board')
      const pairs = typeof raw.pairs === 'number' ? raw.pairs : cleaned.length
      if (pairs !== cleaned.length) throw new Error('pairs must equal icons.length')
      return { icons: cleaned, pairs } satisfies MemoryPayload
    },
  },

  'family-connect': {
    label: 'Family Connect 4×4 puzzles',
    systemAddendum: `For FAMILY CONNECT: each item is ONE complete puzzle with exactly 4 groups
of 4 words. Tones map to difficulty within the puzzle itself:
  yellow = easiest connection (obvious)
  green  = next
  blue   = harder
  purple = trickiest, often a pun or wordplay misdirect
The 16 words must be genuinely ambiguous as a set — words should plausibly
fit multiple groups so the player has to commit. Avoid proper nouns.`,
    userGuidance: 'Each item: `groups` array of exactly 4 entries. Each group: `label` (the theme), `tone` (yellow/green/blue/purple), `words` (exactly 4 uppercase words). All 16 words across the 4 groups must be unique.',
    itemSchema: {
      type:                 'object',
      additionalProperties: false,
      required:             ['groups'],
      properties: {
        groups: {
          type:        'array',
          description: 'Exactly 4 groups — one per tone (yellow, green, blue, purple). No more, no fewer.',
          items: {
            type:                 'object',
            additionalProperties: false,
            required:             ['label', 'tone', 'words'],
            properties: {
              label: { type: 'string', description: 'The hidden theme — what connects these 4 words.' },
              tone:  { type: 'string', enum: ['yellow', 'green', 'blue', 'purple'] },
              words: {
                type:        'array',
                items:       { type: 'string' },
                description: 'Exactly 4 words in this group — no more, no fewer.',
              },
            },
          },
        },
      },
    },
    normalize(raw) {
      const groups = raw.groups
      if (!Array.isArray(groups) || groups.length !== 4) throw new Error('Need exactly 4 groups')
      const seenTones = new Set<string>()
      const seenWords = new Set<string>()
      const normalized = groups.map((g, gi) => {
        const grp = g as Record<string, unknown>
        const label = asStr(grp.label, `groups[${gi}].label`)
        const tone  = asStr(grp.tone,  `groups[${gi}].tone`)
        if (!['yellow', 'green', 'blue', 'purple'].includes(tone)) throw new Error(`Bad tone "${tone}"`)
        if (seenTones.has(tone)) throw new Error(`Duplicate tone "${tone}"`)
        seenTones.add(tone)
        const ws = grp.words
        if (!Array.isArray(ws) || ws.length !== 4) throw new Error(`groups[${gi}].words must be exactly 4`)
        const words = ws.map((w, wi) => asStr(w, `groups[${gi}].words[${wi}]`).toUpperCase())
        for (const w of words) {
          if (seenWords.has(w)) throw new Error(`Duplicate word "${w}"`)
          seenWords.add(w)
        }
        return { label, tone: tone as 'yellow' | 'green' | 'blue' | 'purple', words }
      })
      return { groups: normalized } satisfies FamilyConnectPayload
    },
  },

  // Deprecated — still in GameId union for old bookmarks, but generation is disabled.
  'word-search': {
    label: 'word-search grids (DEPRECATED — do not generate)',
    itemSchema: { type: 'object', additionalProperties: false, required: [], properties: {} },
    normalize() { throw new Error('Word-search is retired — generation disabled') },
  },
}
