// ── /games/[gameId] ───────────────────────────────────────────────────────────
// Server component: validates the game id + difficulty, fetches this week's
// content from the pool, and renders the client GamePlayer with the data.

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Navigation } from '@/components/Navigation'
import { PublicFooter } from '@/components/PublicFooter'
import { ArrowLeft } from 'lucide-react'
import { gameById, DIFFICULTIES, DEFAULT_DIFFICULTY, type Difficulty, type GameId } from '@/lib/games/types'
import { dailyContent } from '@/lib/games/weekly'
import { GamePlayer } from './GamePlayer'
import { buildPageMetadata } from '@/lib/seo/metadata'

interface PageProps {
  params:       Promise<{ gameId: string }>
  searchParams: Promise<{ diff?: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { gameId } = await params
  const game = gameById(gameId)
  if (!game) return { title: 'Brain Games — River Region Parents' }
  return buildPageMetadata({
    title:       `${game.title} — Brain Games`,
    description: `${game.desc} Play free, beat your best time, win one of three $10 prizes every week.`,
    path:        `/games/${gameId}`,
    type:        'website',
    keywords:    [game.title, 'family games', 'brain games', 'River Region'],
  })
}

function isValidDifficulty(s: string | undefined): s is Difficulty {
  return DIFFICULTIES.includes(s as Difficulty)
}

export default async function PlayGamePage({ params, searchParams }: PageProps) {
  const { gameId } = await params
  const sp         = await searchParams

  const game = gameById(gameId)
  if (!game) notFound()

  const difficulty: Difficulty = isValidDifficulty(sp.diff) ? sp.diff : DEFAULT_DIFFICULTY
  const { week, items } = await dailyContent(game.id as GameId, difficulty)

  return (
    <div className="min-h-screen bg-background public-page flex flex-col">
      <Navigation />

      <main className="flex-1 container py-6 md:py-10 max-w-4xl">
        <Link
          href={`/games?diff=${difficulty}`}
          className="inline-flex items-center text-sm font-semibold text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to Games Hub
        </Link>

        {items.length === 0 ? (
          <div className="rounded-3xl border border-amber-300 bg-amber-50 px-5 py-8 text-center">
            <p className="text-sm font-bold text-amber-900 mb-1">No content yet for this game and difficulty</p>
            <p className="text-sm text-amber-800">
              The pool is empty. Add entries in <code className="bg-amber-100 px-1 rounded">/admin/games</code> to get this puzzle running.
            </p>
          </div>
        ) : (
          <GamePlayer
            game={game}
            difficulty={difficulty}
            isoYear={week.year}
            isoWeek={week.week}
            items={items.map(i => ({ id: i.id, payload: i.payload }))}
          />
        )}
      </main>

      <PublicFooter />
    </div>
  )
}
