// POST /api/admin/community-submissions/[id]/publish-to-article
//
// The BRIDGE. A community_submissions row marked approved_web gets
// promoted to a guide_articles row with the right column_slug, which
// makes it appear in the homepage rotation immediately AND lets Meta
// Suite auto-post fire (if the editor also approved_social).
//
// Strict invariants:
//   - The submission must already be approved_web=true. We refuse to
//     publish unreviewed content even if the caller is admin.
//   - One submission → at most one article. If promoted_to_article_id
//     is already set, we return 409 with the existing article link.
//   - The submission_type must have a row in submission_type_columns.
//     event-submission intentionally doesn't (it bridges to
//     calendar_events) — we return 400 with a clear pointer.

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { slugifyForUrl } from '@/lib/articles/slug'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface RouteCtx { params: Promise<{ id: string }> }

export async function POST(_req: NextRequest, ctx: RouteCtx) {
  const adminCtx = await requireAdmin()
  const { id } = await ctx.params

  const sb = createAdminClient()

  // 1. Load the submission with every field the bridge needs.
  const { data: subRow, error: subErr } = await sb
    .from('community_submissions')
    .select(`
      id, submission_type, working_title, slug_suggestion,
      excerpt, ai_draft_content, feature_image_url, photo_urls,
      related_person_name, related_business_name, related_school_name,
      target_publication, status,
      approved_web, approved_social, approved_newsletter,
      issue_month, issue_year,
      promoted_to_article_id
    `)
    .eq('id', id)
    .maybeSingle()
  if (subErr) return NextResponse.json({ error: subErr.message }, { status: 500 })
  if (!subRow) return NextResponse.json({ error: 'Submission not found' }, { status: 404 })

  type Sub = {
    id: string; submission_type: string; working_title: string | null; slug_suggestion: string | null;
    excerpt: string | null; ai_draft_content: string | null; feature_image_url: string | null;
    photo_urls: Array<{ url: string; caption?: string; alt?: string }> | null;
    related_person_name: string | null; related_business_name: string | null; related_school_name: string | null;
    target_publication: string; status: string;
    approved_web: boolean; approved_social: boolean; approved_newsletter: boolean;
    issue_month: string | null; issue_year: number | null;
    promoted_to_article_id: string | null;
  }
  const sub = subRow as unknown as Sub

  if (sub.promoted_to_article_id) {
    return NextResponse.json({
      error:      'Already published',
      article_id: sub.promoted_to_article_id,
    }, { status: 409 })
  }

  if (!sub.approved_web) {
    return NextResponse.json({
      error: 'Approve for Website first before publishing to the homepage.',
    }, { status: 400 })
  }

  // 2. Resolve the column_slug + guide_slug mapping.
  const { data: mapRow } = await sb
    .from('submission_type_columns')
    .select('column_slug, guide_slug, active, label')
    .eq('submission_type', sub.submission_type)
    .maybeSingle()
  if (!mapRow || !(mapRow as { active: boolean }).active) {
    if (sub.submission_type === 'event-submission') {
      return NextResponse.json({
        error: 'Events publish to the calendar, not the homepage. Open /admin/calendar to schedule it.',
      }, { status: 400 })
    }
    return NextResponse.json({
      error: `No publishing destination configured for submission type "${sub.submission_type}". Add a row to submission_type_columns to enable it.`,
    }, { status: 400 })
  }
  const columnSlug = (mapRow as { column_slug: string }).column_slug
  const guideSlug  = (mapRow as { guide_slug:  string }).guide_slug

  // 3. Compose the article. Title falls back to a sensible default per
  //    submission type when the editor never set working_title.
  const entityName = sub.related_person_name || sub.related_business_name || sub.related_school_name || ''
  const title =
    sub.working_title?.trim()
    || (entityName ? `${labelFor(sub.submission_type)}: ${entityName}` : labelFor(sub.submission_type))

  // Slug uniqueness: try slug_suggestion → slugify(title) → slug+'-2' etc.
  let baseSlug = slugifyForUrl(sub.slug_suggestion || title)
  if (!baseSlug) baseSlug = sub.submission_type.replace(/_/g, '-')
  const finalSlug = await uniqueSlug(sb, baseSlug, guideSlug)

  // 4. Gallery — map photo_urls JSONB into the guide_articles
  //    gallery_images shape. Most rows just have a single feature image.
  const gallery = Array.isArray(sub.photo_urls)
    ? sub.photo_urls.map(p => ({ url: p.url, caption: p.caption ?? '', alt: p.alt ?? '' }))
    : []

  // 5. Insert. Editor's explicit click = explicit publish. Meta Suite
  //    auto-post fires only when approved_social ALSO true — fail-safe
  //    so an editor who only approved_web doesn't accidentally hit
  //    Facebook.
  const articleInsert = {
    guide_slug:           guideSlug,
    slug:                 finalSlug,
    title,
    excerpt:              sub.excerpt ?? '',
    body:                 sub.ai_draft_content ?? '',
    hero_image_url:       sub.feature_image_url ?? null,
    column_slug:          columnSlug,
    author_name:          'Community Submission',
    published:            true,
    published_at:         new Date().toISOString(),
    gallery_images:       gallery,
    editorial_review_status: 'published',
    auto_post_to_social:  !!sub.approved_social,
    queue_newsletter_draft: !!sub.approved_newsletter,
    import_status:        'community-submission',
    // source_issue_month wants a date (YYYY-MM-01). community_submissions
    // stores it as a month NAME ('July'), which fails the date parse.
    // Convert if we can; otherwise omit so the insert doesn't fail.
    source_issue_month:   monthNameToFirstOfMonth(sub.issue_month, sub.issue_year),
  }

  const { data: created, error: insErr } = await sb
    .from('guide_articles')
    .insert(articleInsert)
    .select('id, slug, column_slug')
    .single()
  if (insErr || !created) {
    return NextResponse.json({ error: insErr?.message ?? 'Insert failed' }, { status: 500 })
  }

  // 6. Stamp the submission so we have lineage + can't double-publish.
  const { error: updErr } = await sb
    .from('community_submissions')
    .update({
      promoted_to_article_id: created.id,
      status:                 'published',
    })
    .eq('id', sub.id)
  if (updErr) {
    console.warn('[publish-to-article] stamp-back failed:', updErr.message)
    // The article exists; don't 500 the editor. They'll see it in the
    // homepage. The stamp-back can be retried.
  }

  // 7. Revalidate caches. Homepage + columns + family resource guide all
  //    show guide_articles rows.
  try {
    revalidatePath('/')
    revalidatePath('/articles')
    revalidatePath('/family-resource-guide')
    if (columnSlug) revalidatePath(`/columns/${columnSlug}`)
  } catch { /* revalidate is best-effort */ }

  // 8. If approved_social was true, auto-post fires asynchronously
  //    inside autoPostArticle (already wired to the PATCH path of
  //    /admin/articles/[id]). For freshly inserted+published rows we
  //    need to trigger it here too. Fire-and-forget pattern; never
  //    blocks the editor's response.
  if (sub.approved_social) {
    void triggerAutoPost(created.id, sub.target_publication).catch(e => {
      console.warn('[publish-to-article] auto-post trigger failed:', e instanceof Error ? e.message : e)
    })
  }

  return NextResponse.json({
    ok:        true,
    article_id: created.id,
    slug:       created.slug,
    column_slug: created.column_slug,
    auto_post_queued: !!sub.approved_social,
  })

  void adminCtx // kept for future audit logging
}

// ── helpers ──────────────────────────────────────────────────────────

/** Convert ('July', 2026) → '2026-07-01' for the DATE column. Returns
 *  null when the inputs can't be reduced to a valid month. */
function monthNameToFirstOfMonth(monthName: string | null, year: number | null): string | null {
  if (!monthName) return null
  const months = ['january','february','march','april','may','june','july','august','september','october','november','december']
  const idx = months.indexOf(monthName.trim().toLowerCase())
  if (idx === -1) return null
  const y = year && Number.isFinite(year) ? year : new Date().getFullYear()
  return `${y}-${String(idx + 1).padStart(2, '0')}-01`
}

/** Map submission_type → human label, used for default title generation. */
function labelFor(submissionType: string): string {
  const map: Record<string, string> = {
    'teacher-of-the-month':        'Teacher of the Month',
    'mom-to-mom':                  'Mom to Mom',
    'grands-are-the-greatest':     'Grands Are the Greatest',
    'play-ball':                   'Play Ball',
    'student-spotlight':           'Student Spotlight',
    'school-news':                 'School News',
    'birthday-celebration':        'Birthday Celebration',
    'parent-picks':                'Parent Picks',
    'boom-profile':                'Boom Profile',
    'family-favorites-nomination': 'Family Favorite',
  }
  return map[submissionType] ?? 'Story'
}

/** Find a unique slug within the given guide. Append -2, -3, ... until clear. */
async function uniqueSlug(
  sb:        ReturnType<typeof createAdminClient>,
  baseSlug:  string,
  guideSlug: string,
): Promise<string> {
  for (let n = 0; n < 50; n++) {
    const candidate = n === 0 ? baseSlug : `${baseSlug}-${n + 1}`
    const { data } = await sb
      .from('guide_articles')
      .select('id')
      .eq('guide_slug', guideSlug)
      .eq('slug', candidate)
      .maybeSingle()
    if (!data) return candidate
  }
  // Highly unlikely fallback — append a timestamp tail.
  return `${baseSlug}-${Date.now().toString(36)}`
}

/** Fire-and-forget Meta Suite auto-post for a freshly-published article.
 *  We dynamic-import to avoid pulling the AI/Facebook clients into this
 *  module's bundle when auto-post isn't requested. */
async function triggerAutoPost(articleId: string, brandSlug: string): Promise<void> {
  try {
    const mod = await import('@/lib/integrations/meta-suite/auto-post')
    if (typeof mod.autoPostArticle === 'function') {
      await mod.autoPostArticle(articleId, brandSlug)
    }
  } catch (e) {
    console.warn('[publish-to-article] could not import auto-post:', e instanceof Error ? e.message : e)
  }
}
