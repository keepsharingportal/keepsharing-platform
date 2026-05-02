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
    const { submissionId, action, attachListingId, attachArticleSlug } = await req.json()

    if (!submissionId || !['approved', 'declined', 'featured'].includes(action)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const supabase = supabaseAdmin()

    await supabase.from('reader_submissions').update({
      review_status:                     action,
      reviewed_at:                       new Date().toISOString(),
      reviewed_by:                       'admin',
      featured_attachment_listing_id:    attachListingId ?? null,
      featured_attachment_article_slug:  attachArticleSlug ?? null,
    }).eq('id', submissionId)

    // If approved and has an email, increment featured_count if applicable
    if (action === 'approved') {
      const { data: sub } = await supabase
        .from('reader_submissions')
        .select('submitter_email')
        .eq('id', submissionId)
        .single()

      if (sub?.submitter_email) {
        await supabase
          .from('mom_insider_profiles')
          .update({ featured_count: supabase.rpc('increment', { x: 1 }) as unknown as number })
          .eq('email', sub.submitter_email)
      }
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[admin/submissions/review] error:', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
