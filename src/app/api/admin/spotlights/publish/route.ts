// POST /api/admin/spotlights/publish
//
// Promotes one or more community_submissions rows into published
// guide_articles. Designed for the bulk review page so an editor can
// approve a row of 50 spotlights in seconds without opening the full
// article editor for each one.
//
// Body shape:
//   { submissionIds: string[], action: 'publish' | 'reject' | 'send-to-review' }

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
    { auth: { persistSession: false } },
  )
}

function slugify(text: string) {
  return text.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80)
}

const REGION_NORMALIZE: Record<string, string> = {
  'montgomery county':     'montgomery-county',
  'autauga / prattville':  'autauga-prattville',
  'autauga/prattville':    'autauga-prattville',
  'elmore county':         'elmore-county',
  'pike road':             'pike-road',
  'private school':        'private-schools',
  'private schools':       'private-schools',
  'other':                 'other',
}

function normalizeRegion(label: string | null): string | null {
  if (!label) return null
  return REGION_NORMALIZE[label.toLowerCase().trim()] ?? null
}

interface SubmissionRow {
  id:                string
  submission_type:   string
  submitter_name:    string | null
  related_person_name: string | null
  related_school_name: string | null
  payload:           Record<string, string> | null
  web_image_url:     string | null
  print_image_url:   string | null
  status:            string
  created_at:        string
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as Record<string, unknown>
  const submissionIds = Array.isArray(body.submissionIds) ? body.submissionIds as string[] : []
  const action        = body.action as 'publish' | 'reject' | 'send-to-review' | undefined

  if (submissionIds.length === 0) return NextResponse.json({ error: 'No submissions selected' }, { status: 400 })
  if (!action)                   return NextResponse.json({ error: 'Missing action' }, { status: 400 })
  if (!['publish', 'reject', 'send-to-review'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  const supabase = admin()

  // Reject / send-to-review just flip the status. No article created.
  if (action === 'reject' || action === 'send-to-review') {
    const newStatus = action === 'reject' ? 'rejected' : 'review'
    const { error } = await supabase
      .from('community_submissions')
      .update({ status: newStatus, reviewed_at: new Date().toISOString() })
      .in('id', submissionIds)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, count: submissionIds.length })
  }

  // Publish path — fetch each submission and promote to a guide_article
  const { data: rows, error: fetchErr } = await supabase
    .from('community_submissions')
    .select('id, submission_type, submitter_name, related_person_name, related_school_name, payload, web_image_url, print_image_url, status, created_at')
    .in('id', submissionIds)

  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 })

  const submissions = (rows ?? []) as SubmissionRow[]
  const results: { id: string; ok: boolean; articleId?: string; error?: string }[] = []

  for (const sub of submissions) {
    if (sub.submission_type !== 'student-spotlight') {
      results.push({ id: sub.id, ok: false, error: 'Not a student-spotlight submission' })
      continue
    }

    const payload   = sub.payload ?? {}
    const student   = sub.related_person_name ?? payload.student_name ?? 'Student'
    const school    = sub.related_school_name ?? payload.school_name  ?? null
    const region    = normalizeRegion(payload.school_region ?? null)
    const grade     = payload.grade ?? ''
    const headline  = payload.headline ?? `${student} — Student Spotlight`
    const whySpecial = payload.why_special ?? ''
    const achievement = payload.achievement ?? ''
    const excerpt    = whySpecial.slice(0, 200)

    // Body — markdown style with the writeup + optional achievement section
    const body = [
      whySpecial.trim(),
      achievement.trim() ? `\n\n## A Notable Moment\n\n${achievement.trim()}` : '',
    ].join('')

    const baseSlug = `${slugify(school ?? 'spotlight')}-${slugify(student)}`
    // Append a 4-char hash so concurrent inserts don't collide on slug
    const slug     = `${baseSlug}-${sub.id.slice(-4)}`

    const { data: created, error: insertErr } = await supabase
      .from('guide_articles')
      .insert({
        title:                   headline,
        slug,
        excerpt,
        body,
        body_format:             'markdown',
        hero_image_url:          sub.web_image_url,
        print_image_url:         sub.print_image_url,
        author_byline:           sub.submitter_name ?? 'Staff',
        author_name:             sub.submitter_name ?? 'Staff',
        column_slug:             'student-spotlights',
        guide_slug:              'school-zone',
        vertical_slug:           'school-zone',
        school_name:             school,
        school_region:           region,
        editorial_review_status: 'approved',
        published:               true,
        published_at:            new Date().toISOString(),
        editorial_notes:         `Grade: ${grade}\nFrom submission ${sub.id}`,
        import_status:           'manual',
      })
      .select('id, slug')
      .single()

    if (insertErr) {
      results.push({ id: sub.id, ok: false, error: insertErr.message })
      continue
    }

    await supabase
      .from('community_submissions')
      .update({
        status:        'approved',
        reviewed_at:   new Date().toISOString(),
        promoted_article_id: created.id,
      })
      .eq('id', sub.id)

    results.push({ id: sub.id, ok: true, articleId: created.id })
  }

  // Revalidate the public surfaces so new spotlights appear immediately
  revalidatePath('/school-zone')
  revalidatePath('/school-bits')
  revalidatePath('/')

  return NextResponse.json({ results, count: results.filter(r => r.ok).length })
}
