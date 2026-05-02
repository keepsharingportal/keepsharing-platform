import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { reviewSubmission } from '@/lib/ai-review'

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  )
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      first_name, neighborhood, email, phone,
      responses, source, source_listing_id, source_article_slug,
      publish_permission, photo_url,
    } = body

    if (!first_name || !neighborhood || !email) {
      return NextResponse.json({ error: 'first_name, neighborhood, and email are required' }, { status: 400 })
    }
    if (!responses || !Array.isArray(responses) || responses.length === 0) {
      return NextResponse.json({ error: 'At least one response is required' }, { status: 400 })
    }

    const supabase = supabaseAdmin()

    // Insert submission
    const { data: submission, error: insertErr } = await supabase
      .from('reader_submissions')
      .insert({
        submitter_first_name:  first_name,
        submitter_neighborhood: neighborhood,
        submitter_email:       email,
        submitter_phone:       phone ?? null,
        publish_permission:    publish_permission ?? 'yes',
        photo_url:             photo_url ?? null,
        source:                source ?? 'full-survey',
        source_listing_id:     source_listing_id ?? null,
        source_article_slug:   source_article_slug ?? null,
        submission_responses:  responses,
        review_status:         'pending',
      })
      .select('id')
      .single()

    if (insertErr || !submission) {
      console.error('[submissions/capture] DB error:', insertErr)
      return NextResponse.json({ error: 'DB error' }, { status: 500 })
    }

    // Upsert mom_insider_profiles
    const { data: existing } = await supabase
      .from('mom_insider_profiles')
      .select('id, submission_count')
      .eq('email', email)
      .maybeSingle()

    if (existing) {
      await supabase
        .from('mom_insider_profiles')
        .update({
          submission_count:    existing.submission_count + 1,
          last_submission_at:  new Date().toISOString(),
          updated_at:          new Date().toISOString(),
          neighborhood:        neighborhood,
        })
        .eq('id', existing.id)
    } else {
      await supabase.from('mom_insider_profiles').insert({
        first_name:           first_name,
        email:                email,
        neighborhood:         neighborhood,
        phone:                phone ?? null,
        submission_count:     1,
        last_submission_at:   new Date().toISOString(),
        is_active_insider:    false,
      })
    }

    // Fire-and-forget AI review
    void reviewSubmission(submission.id)

    return NextResponse.json({ success: true, submissionId: submission.id })
  } catch (e) {
    console.error('[submissions/capture] error:', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
