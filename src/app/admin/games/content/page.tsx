// ── /admin/games/content ──────────────────────────────────────────────────────
// Inline editor for the brain-games content pool. One section per game type.
// Add / edit / retire (weight=0) / restore. Word-search lives in Supabase
// dashboard for now — its payload (grid + words) is too complex for an
// inline form.

import type { Metadata } from 'next'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import { ArrowLeft, Plus, BookOpen, AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { GAMES, DIFFICULTIES, DIFFICULTY_LABELS } from '@/lib/games/types'

export const metadata: Metadata = { title: 'Brain Games Content — Admin' }
export const dynamic = 'force-dynamic'

interface ContentRow {
  id:         string
  game_type:  string
  difficulty: string
  payload:    Record<string, unknown>
  weight:     number
  notes:      string | null
  created_at: string
}

// ── Server actions ────────────────────────────────────────────────────────────

async function createScramble(formData: FormData) { 'use server'
  return saveContent('scramble', formData, fd => ({
    scrambled: ((fd.get('scrambled') as string) || '').toUpperCase().trim(),
    answer:    ((fd.get('answer')    as string) || '').toUpperCase().trim(),
  }), p => Boolean(p.scrambled && p.answer))
}
async function createEmoji(formData: FormData) { 'use server'
  return saveContent('emoji', formData, fd => ({
    emoji:  ((fd.get('emoji')  as string) || '').trim(),
    answer: ((fd.get('answer') as string) || '').toUpperCase().trim(),
  }), p => Boolean(p.emoji && p.answer))
}
async function createMath(formData: FormData) { 'use server'
  return saveContent('math', formData, fd => ({
    q: ((fd.get('q') as string) || '').trim(),
    a: ((fd.get('a') as string) || '').trim(),
  }), p => Boolean(p.q && p.a))
}
async function createTrivia(formData: FormData) { 'use server'
  return saveContent('trivia', formData, fd => {
    const opts = [1, 2, 3, 4].map(i => ((fd.get(`option_${i}`) as string) || '').trim()).filter(Boolean)
    return {
      q:       ((fd.get('q') as string) || '').trim(),
      options: opts,
      a:       ((fd.get('a') as string) || '').trim(),
    }
  }, p => Boolean(p.q && p.options.length >= 2 && p.a && p.options.includes(p.a)))
}
async function createMemory(formData: FormData) { 'use server'
  return saveContent('memory', formData, fd => {
    const icons = ((fd.get('icons') as string) || '').split(/\s+/).filter(Boolean)
    return {
      icons,
      pairs: Math.max(2, Math.min(20, parseInt((fd.get('pairs') as string) || `${icons.length}`, 10) || icons.length)),
    }
  }, p => p.icons.length >= 4)
}

async function createFamilyConnect(formData: FormData) { 'use server'
  return saveContent('family-connect', formData, fd => {
    const tones: Array<'yellow' | 'green' | 'blue' | 'purple'> = ['yellow', 'green', 'blue', 'purple']
    const groups = tones.map(tone => {
      const label = ((fd.get(`label_${tone}`) as string) || '').trim()
      const words = [1, 2, 3, 4]
        .map(i => ((fd.get(`words_${tone}_${i}`) as string) || '').trim().toUpperCase())
        .filter(Boolean)
      return { label, tone, words }
    })
    return { groups }
  }, p => p.groups.every(g => g.label.length > 0 && g.words.length === 4))
}

async function saveContent<TPayload extends Record<string, unknown>>(
  game_type: string,
  formData:  FormData,
  buildPayload: (fd: FormData) => TPayload,
  validate:  (p: TPayload) => boolean,
) {
  'use server'
  const supabase   = await createClient()
  const difficulty = ((formData.get('difficulty') as string) || 'easy').trim()
  const id         = ((formData.get('id')         as string) || '').trim()
  const payload    = buildPayload(formData)
  if (!validate(payload)) return
  if (id) {
    await supabase.from('game_content').update({ payload, difficulty }).eq('id', id)
  } else {
    await supabase.from('game_content').insert({ game_type, difficulty, payload, weight: 1 })
  }
  revalidatePath('/admin/games/content')
  revalidatePath('/admin/games')
  revalidatePath('/games')
}

async function toggleActive(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const id      = (formData.get('id') as string) || ''
  const current = parseInt((formData.get('current_weight') as string) || '1', 10)
  if (!id) return
  await supabase.from('game_content').update({ weight: current > 0 ? 0 : 1 }).eq('id', id)
  revalidatePath('/admin/games/content')
}

async function deleteContent(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const id = (formData.get('id') as string) || ''
  if (!id) return
  await supabase.from('game_content').delete().eq('id', id)
  revalidatePath('/admin/games/content')
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function GamesContentPage({
  searchParams,
}: {
  searchParams: Promise<{ game?: string; diff?: string }>
}) {
  const sp = await searchParams
  const game = sp.game ?? 'scramble'
  const diff = sp.diff ?? 'easy'

  const supabase = await createClient()
  const probe    = await supabase.from('game_content').select('id').limit(1)
  const tableMissing = !!probe.error

  const { data: rowsData } = tableMissing
    ? { data: null }
    : await supabase
        .from('game_content')
        .select('id, game_type, difficulty, payload, weight, notes, created_at')
        .eq('game_type', game)
        .eq('difficulty', diff)
        .order('created_at', { ascending: false })

  const rows = (rowsData ?? []) as ContentRow[]
  const active = rows.filter(r => r.weight > 0).length

  const inputCls = 'w-full text-sm border border-portal-border rounded-lg px-3 py-2 outline-none focus:border-portal-blue/60 bg-white'

  return (
    <main className="p-6 max-w-[1200px] mx-auto space-y-6 pb-16">

      <div>
        <Link href="/admin/games" className="inline-flex items-center gap-1 text-xs font-semibold text-portal-muted hover:text-portal-text mb-2">
          <ArrowLeft size={12} /> Back to Games dashboard
        </Link>
        <div className="flex items-center gap-2 mb-1">
          <BookOpen size={20} className="text-portal-blue" />
          <h1 className="text-xl font-bold text-portal-text tracking-tight">Content Pool Editor</h1>
        </div>
        <p className="text-sm text-portal-sub">
          Add entries to the rotating weekly pool. Each entry can be retired (weight 0) or deleted permanently.
          The site picks deterministically each week, so growing the pool grows the variety.
        </p>
      </div>

      {tableMissing && (
        <div className="rounded-xl border border-amber-300 bg-portal-amber-lt px-5 py-4">
          <p className="text-sm font-bold text-amber-900 mb-1 flex items-center gap-1.5">
            <AlertTriangle size={14} /> Brain Games tables not found
          </p>
          <p className="text-sm text-portal-amber">
            Apply <code className="bg-portal-amber-lt px-1 rounded">supabase/migrations/080_brain_games.sql</code> first.
          </p>
        </div>
      )}

      {!tableMissing && (
        <>
          {/* GAME + DIFFICULTY SELECTORS (via form GET) */}
          <form className="bg-white border border-portal-border rounded-lg px-5 py-4 flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-[11px] font-bold text-portal-sub uppercase tracking-wider mb-1">Game</label>
              <select name="game" defaultValue={game}
                className="text-sm border border-portal-border rounded-lg px-3 py-2 bg-white">
                {GAMES.map(g => (
                  <option key={g.id} value={g.id}>{g.emoji} {g.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-portal-sub uppercase tracking-wider mb-1">Difficulty</label>
              <select name="diff" defaultValue={diff}
                className="text-sm border border-portal-border rounded-lg px-3 py-2 bg-white">
                {DIFFICULTIES.map(d => (
                  <option key={d} value={d}>{DIFFICULTY_LABELS[d]}</option>
                ))}
              </select>
            </div>
            <button type="submit" className="px-4 py-2 text-xs font-bold bg-gray-900 text-white rounded-lg hover:bg-gray-700">Apply</button>
            <span className="ml-auto text-xs text-portal-muted">{active} active · {rows.length} total in this view</span>
          </form>

          {/* ADD FORM (per game type) */}
          {game === 'word-search' ? (
            <div className="rounded-lg border border-amber-200 bg-portal-amber-lt px-5 py-4">
              <p className="text-sm font-bold text-amber-900 mb-1">Word search is edited in Supabase directly</p>
              <p className="text-sm text-portal-amber leading-relaxed">
                Word search payloads include a flat letter grid + word list + column count. The grid is too complex
                for an inline form right now — edit existing rows or add new ones via the Supabase dashboard
                (<code className="bg-portal-amber-lt px-1 rounded">game_content</code> table, <code className="bg-portal-amber-lt px-1 rounded">payload</code> JSON column).
              </p>
            </div>
          ) : (
            <section className="bg-white border border-portal-border rounded-lg overflow-hidden">
              <div className="px-5 py-3 border-b border-portal-border bg-portal-bg flex items-center gap-2">
                <Plus size={14} className="text-portal-muted" />
                <h2 className="text-sm font-bold text-portal-text">Add a new {game} entry — {DIFFICULTY_LABELS[diff as keyof typeof DIFFICULTY_LABELS] ?? diff}</h2>
              </div>

              {game === 'scramble' && (
                <form action={createScramble} className="p-5 grid md:grid-cols-12 gap-3 items-end">
                  <input type="hidden" name="difficulty" value={diff} />
                  <div className="md:col-span-5">
                    <label className="block text-[11px] font-semibold text-portal-sub mb-1">Scrambled letters *</label>
                    <input name="scrambled" required placeholder="FEECOF" className={inputCls} />
                  </div>
                  <div className="md:col-span-5">
                    <label className="block text-[11px] font-semibold text-portal-sub mb-1">Answer *</label>
                    <input name="answer" required placeholder="COFFEE" className={inputCls} />
                  </div>
                  <div className="md:col-span-2">
                    <button type="submit" className="w-full px-4 py-2 bg-gray-900 text-white text-sm font-bold rounded-lg hover:bg-gray-700">Add</button>
                  </div>
                </form>
              )}

              {game === 'emoji' && (
                <form action={createEmoji} className="p-5 grid md:grid-cols-12 gap-3 items-end">
                  <input type="hidden" name="difficulty" value={diff} />
                  <div className="md:col-span-5">
                    <label className="block text-[11px] font-semibold text-portal-sub mb-1">Emoji clue *</label>
                    <input name="emoji" required placeholder="👶🍼💤" className={inputCls} />
                  </div>
                  <div className="md:col-span-5">
                    <label className="block text-[11px] font-semibold text-portal-sub mb-1">Answer *</label>
                    <input name="answer" required placeholder="NAPTIME" className={inputCls} />
                  </div>
                  <div className="md:col-span-2">
                    <button type="submit" className="w-full px-4 py-2 bg-gray-900 text-white text-sm font-bold rounded-lg hover:bg-gray-700">Add</button>
                  </div>
                </form>
              )}

              {game === 'math' && (
                <form action={createMath} className="p-5 grid md:grid-cols-12 gap-3 items-end">
                  <input type="hidden" name="difficulty" value={diff} />
                  <div className="md:col-span-8">
                    <label className="block text-[11px] font-semibold text-portal-sub mb-1">Question *</label>
                    <input name="q" required placeholder="If you have 3 kids and each needs 2 snacks…" className={inputCls} />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-semibold text-portal-sub mb-1">Answer *</label>
                    <input name="a" required placeholder="6" className={inputCls} />
                  </div>
                  <div className="md:col-span-2">
                    <button type="submit" className="w-full px-4 py-2 bg-gray-900 text-white text-sm font-bold rounded-lg hover:bg-gray-700">Add</button>
                  </div>
                </form>
              )}

              {game === 'trivia' && (
                <form action={createTrivia} className="p-5 space-y-3">
                  <input type="hidden" name="difficulty" value={diff} />
                  <div>
                    <label className="block text-[11px] font-semibold text-portal-sub mb-1">Question *</label>
                    <input name="q" required placeholder="At what age do most babies take their first steps?" className={inputCls} />
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i}>
                        <label className="block text-[11px] font-semibold text-portal-sub mb-1">Option {i}{i <= 2 && ' *'}</label>
                        <input name={`option_${i}`} required={i <= 2} placeholder={i === 1 ? '6-8 months' : i === 2 ? '9-15 months' : 'optional'} className={inputCls} />
                      </div>
                    ))}
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-portal-sub mb-1">Correct answer * (must match one of the options exactly)</label>
                    <input name="a" required placeholder="9-15 months" className={inputCls} />
                  </div>
                  <button type="submit" className="px-4 py-2 bg-gray-900 text-white text-sm font-bold rounded-lg hover:bg-gray-700">Add trivia question</button>
                </form>
              )}

              {game === 'memory' && (
                <form action={createMemory} className="p-5 grid md:grid-cols-12 gap-3 items-end">
                  <input type="hidden" name="difficulty" value={diff} />
                  <div className="md:col-span-8">
                    <label className="block text-[11px] font-semibold text-portal-sub mb-1">Icons (space-separated emojis) *</label>
                    <input name="icons" required placeholder="🍼 🧸 🧷 🚗 📚 🎨" className={`${inputCls} text-base`} />
                    <p className="text-[10px] text-portal-muted mt-1">Each icon becomes one pair. Minimum 4 icons. The site mirrors them, so 6 icons → 12-card grid.</p>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-semibold text-portal-sub mb-1">Pairs to show</label>
                    <input name="pairs" type="number" min="4" max="12" placeholder="auto" className={inputCls} />
                  </div>
                  <div className="md:col-span-2">
                    <button type="submit" className="w-full px-4 py-2 bg-gray-900 text-white text-sm font-bold rounded-lg hover:bg-gray-700">Add board</button>
                  </div>
                </form>
              )}

              {game === 'family-connect' && (
                <form action={createFamilyConnect} className="p-5 space-y-4">
                  <input type="hidden" name="difficulty" value={diff} />
                  <p className="text-xs text-portal-sub leading-relaxed">
                    Each puzzle has 4 groups of 4 words. Conventions:{' '}
                    <strong className="text-portal-text">yellow</strong> = easiest, then{' '}
                    <strong className="text-portal-text">green</strong>,{' '}
                    <strong className="text-portal-text">blue</strong>, and{' '}
                    <strong className="text-portal-text">purple</strong> = trickiest (red-herring or wordplay).
                  </p>
                  {(['yellow', 'green', 'blue', 'purple'] as const).map(tone => {
                    const swatch =
                      tone === 'yellow' ? 'bg-yellow-400 text-portal-text' :
                      tone === 'green'  ? 'bg-green-500 text-white'     :
                      tone === 'blue'   ? 'bg-portal-blue-lt0 text-white'      :
                                          'bg-purple-500 text-white'
                    return (
                      <div key={tone} className="rounded-xl border border-portal-border overflow-hidden">
                        <div className={`px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider ${swatch}`}>{tone}</div>
                        <div className="p-3 grid md:grid-cols-12 gap-2">
                          <div className="md:col-span-4">
                            <label className="block text-[10px] font-semibold text-portal-sub mb-1">Group label *</label>
                            <input name={`label_${tone}`} required placeholder="e.g. Diaper bag essentials" className={inputCls} />
                          </div>
                          {[1, 2, 3, 4].map(i => (
                            <div key={i} className="md:col-span-2">
                              <label className="block text-[10px] font-semibold text-portal-sub mb-1">Word {i} *</label>
                              <input name={`words_${tone}_${i}`} required placeholder={i === 1 ? 'WIPES' : ''} className={inputCls} />
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                  <button type="submit" className="px-5 py-2 bg-gray-900 text-white text-sm font-bold rounded-lg hover:bg-gray-700">
                    Add Family Connect puzzle
                  </button>
                </form>
              )}
            </section>
          )}

          {/* LIST */}
          <section className="bg-white border border-portal-border rounded-lg overflow-hidden">
            <div className="px-5 py-3 border-b border-portal-border bg-portal-bg">
              <h2 className="text-sm font-bold text-portal-text">{game} · {DIFFICULTY_LABELS[diff as keyof typeof DIFFICULTY_LABELS] ?? diff} pool</h2>
            </div>
            {rows.length === 0 ? (
              <p className="p-8 text-center text-sm text-portal-muted">No entries yet — add one above.</p>
            ) : (
              <ul className="divide-y divide-portal-border">
                {rows.map(r => (
                  <li key={r.id} className={`p-4 flex items-start gap-3 ${r.weight === 0 ? 'opacity-50' : ''}`}>
                    <div className="flex-1 min-w-0">
                      <pre className="text-xs font-mono whitespace-pre-wrap break-words text-portal-text mb-1">{JSON.stringify(r.payload, null, 0)}</pre>
                      <p className="text-[10px] text-portal-muted">Added {new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <form action={toggleActive}>
                        <input type="hidden" name="id" value={r.id} />
                        <input type="hidden" name="current_weight" value={String(r.weight)} />
                        <button type="submit" className={`text-xs font-semibold px-3 py-1.5 rounded-lg border ${
                          r.weight > 0
                            ? 'bg-white text-portal-text border-portal-border hover:bg-portal-bg'
                            : 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                        }`}>
                          {r.weight > 0 ? 'Retire' : 'Restore'}
                        </button>
                      </form>
                      <form action={deleteContent}>
                        <input type="hidden" name="id" value={r.id} />
                        <button type="submit" className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-portal-red/30 bg-white text-portal-red hover:bg-portal-red-lt">
                          Delete
                        </button>
                      </form>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </main>
  )
}
