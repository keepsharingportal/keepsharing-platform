import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  )
}

export async function POST(req: NextRequest) {
  try {
    const { articleId, status, notes } = await req.json()

    if (!articleId || !['approved', 'rejected', 'needs_edit', 'pending'].includes(status)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const supabase = supabaseAdmin()

    const update: Record<string, unknown> = {
      editorial_review_status: status,
      editorial_notes: notes || null,
    }

    if (status === 'approved') {
      update.published_at = new Date().toISOString()
    } else if (status === 'rejected' || status === 'needs_edit') {
      update.published_at = null
    }

    await supabase.from('guide_articles').update(update).eq('id', articleId)
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[admin/articles/review] error:', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
