import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

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
    }

    // Only overwrite editorial_notes when the user explicitly typed something.
    // Preserves imported region data ("School region: montgomery-county") on approval.
    if (notes && notes.trim()) {
      update.editorial_notes = notes.trim()
    }

    if (status === 'approved') {
      update.published    = true
      update.published_at = new Date().toISOString()
    } else if (status === 'rejected' || status === 'needs_edit') {
      update.published    = false
      update.published_at = null
    }

    const { error: updateError } = await supabase
      .from('guide_articles')
      .update(update)
      .eq('id', articleId)

    if (updateError) {
      console.error('[admin/articles/review] Supabase update failed:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Bust page caches immediately so approved articles appear right away.
    revalidatePath('/school-bits')
    revalidatePath('/school-zone')
    revalidatePath('/')
    revalidatePath('/articles')

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[admin/articles/review] error:', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
