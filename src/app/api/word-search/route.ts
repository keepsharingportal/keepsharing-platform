import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/word-search — returns the active puzzle (public)
export async function GET() {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('word_search_puzzles')
      .select('id, publication, month_key, title, words, grid_data, sponsor_name, prize_amount')
      .eq('is_active', true)
      .maybeSingle()

    if (error) throw error
    return NextResponse.json(data ?? null)
  } catch {
    return NextResponse.json(null)
  }
}

// POST /api/word-search — save a puzzle (admin) or submit an entry (public)
export async function POST(req: NextRequest) {
  const body = await req.json()

  if (body.action === 'save_puzzle') {
    try {
      const supabase = await createClient()
      const { data, error } = await supabase
        .from('word_search_puzzles')
        .upsert({
          publication:  body.publication ?? 'RRB',
          month_key:    body.monthKey,
          title:        body.title,
          words:        body.words,
          grid_data:    body.gridData,
          sponsor_name: body.sponsorName ?? null,
          prize_amount: body.prizeAmount ?? null,
          is_active:    body.isActive ?? false,
          updated_at:   new Date().toISOString(),
        }, { onConflict: 'publication,month_key' })
        .select('id')
        .single()
      if (error) throw error
      return NextResponse.json({ id: data.id })
    } catch (e: unknown) {
      return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
    }
  }

  if (body.action === 'submit_entry') {
    try {
      const supabase = await createClient()
      const { error } = await supabase
        .from('word_search_submissions')
        .insert({
          puzzle_id:   body.puzzleId,
          name:        body.name,
          email:       body.email,
          found_words: body.foundWords ?? [],
          completed:   body.completed ?? false,
        })
      if (error) throw error
      return NextResponse.json({ ok: true })
    } catch (e: unknown) {
      return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
    }
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
