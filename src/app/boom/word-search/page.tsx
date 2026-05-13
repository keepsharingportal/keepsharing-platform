export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { WordSearchGame, generateGrid } from '@/components/boom/WordSearchGame'
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Word Search Challenge — River Region Boom',
  description: 'Find all the words and enter to win the monthly River Region Boom prize.',
}

// Default demo puzzle when no active puzzle exists in DB
const DEMO_WORDS = [
  'MONTGOMERY', 'WISDOM', 'COMMUNITY', 'LEGACY', 'RIVER',
  'FRIENDSHIP', 'HEALTH', 'TRAVEL', 'HUMOR', 'TASTE',
  'BOOM', 'INSPIRE', 'FAMILY', 'CULTURE', 'GROWTH',
]

const NAVY = '#0B1829'

export default async function WordSearchPage() {
  let puzzle: {
    id: string
    title: string
    words: string[]
    gridData: ReturnType<typeof generateGrid>
    sponsorName: string | null
    prizeAmount: string | null
  } | null = null

  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('word_search_puzzles')
      .select('id, title, words, grid_data, sponsor_name, prize_amount')
      .eq('is_active', true)
      .maybeSingle()

    if (data && data.grid_data) {
      puzzle = {
        id:          data.id,
        title:       data.title,
        words:       data.words,
        gridData:    data.grid_data as ReturnType<typeof generateGrid>,
        sponsorName: data.sponsor_name,
        prizeAmount: data.prize_amount,
      }
    }
  } catch { /* fall through to demo */ }

  if (!puzzle) {
    const gridData = generateGrid(DEMO_WORDS)
    puzzle = {
      id:          'demo',
      title:       'River Region Boom — May 2026 Word Search',
      words:       DEMO_WORDS,
      gridData,
      sponsorName: 'Regions Bank',
      prizeAmount: '$50 gift card',
    }
  }

  return (
    <div style={{ backgroundColor: NAVY }}>
      {/* Back to Boom */}
      <div className="max-w-5xl mx-auto px-5 pt-5">
        <Link href="/boom" className="text-xs font-semibold" style={{ color: 'rgba(201,168,75,0.7)' }}>
          ← River Region Boom
        </Link>
      </div>
      <WordSearchGame
        puzzleId={puzzle.id}
        title={puzzle.title}
        words={puzzle.words}
        gridData={puzzle.gridData}
        sponsorName={puzzle.sponsorName}
        prizeAmount={puzzle.prizeAmount}
      />
    </div>
  )
}
