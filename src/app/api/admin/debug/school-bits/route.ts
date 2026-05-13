// Debug endpoint — shows DB state of school-bits articles and can bulk-approve.
// GET  /api/admin/debug/school-bits              → state report
// POST /api/admin/debug/school-bits              → approve ALL pending school-bits articles
// Uses service role key — admin only.

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  )
}

export async function GET() {
  try {
    const supabase = supabaseAdmin()

    const { data: all, error } = await supabase
      .from('guide_articles')
      .select('id, title, slug, published, editorial_review_status, import_status, published_at, editorial_notes, column_slug')
      .eq('column_slug', 'school-bits')
      .order('created_at', { ascending: false })
      .limit(30)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const rows = all ?? []
    return NextResponse.json({
      summary: {
        total:      rows.length,
        published:  rows.filter(a => a.published === true).length,
        pending:    rows.filter(a => a.editorial_review_status === 'pending').length,
        approved:   rows.filter(a => a.editorial_review_status === 'approved').length,
        needsEdit:  rows.filter(a => a.editorial_review_status === 'needs_edit').length,
        rejected:   rows.filter(a => a.editorial_review_status === 'rejected').length,
      },
      env: {
        supabaseUrl:      !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        serviceRoleKey:   !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        usingServiceRole: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      },
      articles: rows.map(a => ({
        id:                      a.id,
        title:                   a.title,
        slug:                    a.slug,
        published:               a.published,
        editorial_review_status: a.editorial_review_status,
        import_status:           a.import_status,
        published_at:            a.published_at,
        has_region_note:         !!(a.editorial_notes?.includes('School region')),
      })),
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

// POST — bulk-approve all pending school-bits articles (debug/dev use)
export async function POST() {
  try {
    const supabase = supabaseAdmin()

    // Get all pending school-bits articles
    const { data: pending, error: fetchErr } = await supabase
      .from('guide_articles')
      .select('id, title')
      .eq('column_slug', 'school-bits')
      .eq('editorial_review_status', 'pending')

    if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 })
    if (!pending?.length) return NextResponse.json({ message: 'No pending articles found', approved: 0 })

    const now = new Date().toISOString()

    const { error: updateErr } = await supabase
      .from('guide_articles')
      .update({
        published:               true,
        editorial_review_status: 'approved',
        published_at:            now,
      })
      .eq('column_slug', 'school-bits')
      .eq('editorial_review_status', 'pending')

    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

    // Bust caches
    revalidatePath('/school-bits')
    revalidatePath('/school-zone')
    revalidatePath('/')
    revalidatePath('/articles')

    return NextResponse.json({
      message: `Approved ${pending.length} school-bits articles`,
      approved: pending.length,
      titles: pending.map(a => a.title),
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
