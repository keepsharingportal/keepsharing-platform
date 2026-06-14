// POST /api/interview/[token]/submit
//
// Public endpoint — anyone with the interview token can submit. Reads
// FormData (text answers as JSON + photo files), validates against the
// per-type config, uploads images via the existing uploadSubmissionPhoto
// helper, writes interview_responses + interview_image_urls back to the
// submission row, and advances phase to 'interview-received'.
//
// Rate limited implicitly by the token being secret + unique. We also
// refuse re-submission once interview_submitted_at is set.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { uploadSubmissionPhoto } from '@/lib/submissions-photo'

export const runtime     = 'nodejs'
export const dynamic     = 'force-dynamic'
export const maxDuration = 60

interface RouteCtx { params: Promise<{ token: string }> }

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
    { auth: { persistSession: false } },
  )
}

export async function POST(req: NextRequest, ctx: RouteCtx) {
  const { token } = await ctx.params
  if (!token || token.length < 16) return NextResponse.json({ error: 'invalid token' }, { status: 400 })

  const db = sb()

  // Look up submission by token
  const { data: subRow } = await db
    .from('community_submissions')
    .select('id, submission_type, target_publication, nominee_name, submitter_name, phase, interview_submitted_at')
    .eq('interview_token', token)
    .maybeSingle()
  if (!subRow) return NextResponse.json({ error: 'token not found' }, { status: 404 })
  type Sub = { id: string; submission_type: string; target_publication: string; nominee_name: string | null; submitter_name: string | null; phase: string; interview_submitted_at: string | null }
  const sub = subRow as unknown as Sub

  if (sub.interview_submitted_at) {
    return NextResponse.json({ error: 'Interview already submitted.' }, { status: 409 })
  }

  // Per-type config for validation
  const { data: cfgRow } = await db
    .from('submission_type_columns')
    .select('interview_template, image_requirements')
    .eq('submission_type', sub.submission_type)
    .maybeSingle()
  type Cfg = {
    interview_template: Array<{ key: string; label: string; required: boolean }>
    image_requirements: { min_required: number; max: number }
  }
  const cfg = (cfgRow as Cfg | null) ?? { interview_template: [], image_requirements: { min_required: 0, max: 4 } }

  // Parse FormData
  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Could not parse form data.' }, { status: 400 })
  }

  let answers: Record<string, string> = {}
  try {
    answers = JSON.parse((form.get('answers') as string) ?? '{}') as Record<string, string>
  } catch {
    return NextResponse.json({ error: 'Invalid answers payload.' }, { status: 400 })
  }

  // Validate required answers
  const missing = cfg.interview_template
    .filter(q => q.required && !(answers[q.key]?.trim()))
    .map(q => q.label)
  if (missing.length > 0) {
    return NextResponse.json({ error: `Missing required answers: ${missing.join(', ')}` }, { status: 400 })
  }

  // Collect photos
  const photos: File[] = []
  for (const [key, value] of form.entries()) {
    if (key.startsWith('photo_') && value instanceof File && value.size > 0) {
      photos.push(value)
    }
  }
  if (photos.length < cfg.image_requirements.min_required) {
    return NextResponse.json({ error: `Need at least ${cfg.image_requirements.min_required} photo(s).` }, { status: 400 })
  }
  if (photos.length > cfg.image_requirements.max) {
    return NextResponse.json({ error: `Too many photos (max ${cfg.image_requirements.max}).` }, { status: 400 })
  }

  // Upload photos via the existing pipeline (writes web + print copies
  // to the article-media bucket under submissions/<type>/)
  const uploaderName = sub.nominee_name?.trim() || sub.submitter_name?.trim() || 'nominee'
  const uploadedUrls: Array<{ url: string; print_url: string; width: number; height: number }> = []
  for (const file of photos) {
    try {
      const up = await uploadSubmissionPhoto({
        file,
        submissionType: sub.submission_type,
        submitterName:  uploaderName,
      })
      uploadedUrls.push({
        url:       up.webImageUrl,
        print_url: up.printImageUrl,
        width:     up.width,
        height:    up.height,
      })
    } catch (e) {
      return NextResponse.json({
        error: `Photo upload failed: ${e instanceof Error ? e.message : 'unknown error'}`,
      }, { status: 500 })
    }
  }

  // Write the interview back to the submission. The bridge + the
  // admin detail page both read interview_responses + interview_image_urls
  // from here.
  const { error: updErr } = await db
    .from('community_submissions')
    .update({
      interview_responses:    answers,
      interview_image_urls:   uploadedUrls,
      interview_submitted_at: new Date().toISOString(),
      phase:                  'interview-received',
    })
    .eq('id', sub.id)
  if (updErr) {
    return NextResponse.json({ error: `Could not save interview: ${updErr.message}` }, { status: 500 })
  }

  return NextResponse.json({ ok: true, image_count: uploadedUrls.length })
}
