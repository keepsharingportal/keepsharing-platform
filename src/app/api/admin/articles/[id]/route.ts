// PATCH /api/admin/articles/[id]   — update fields
// DELETE /api/admin/articles/[id]  — soft delete (move to trash) by default,
//                                    or permanent delete with ?permanent=true
// POST /api/admin/articles/[id]    — body { action: 'restore' } un-trashes
//
// All variants use the service role key (bypasses RLS).

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { columnToVerticalRowSlug } from '@/lib/content-taxonomy'
import { slugifyForUrl } from '@/lib/articles/slug'

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  )
}

interface RouteParams { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    if (!id) return NextResponse.json({ error: 'Missing article id' }, { status: 400 })

    const body = await req.json()

    // Only allow known columns to prevent mass-assignment
    const ALLOWED = [
      'title', 'slug', 'subtitle', 'excerpt', 'body', 'body_format',
      'hero_image_url', 'profile_image_url', 'author_byline', 'author_name',
      'author_bio',
      'author_blogger_id',
      'column_slug', 'guide_slug', 'vertical_slug',
      'editorial_review_status', 'published', 'published_at',
      'editorial_notes', 'source_issue_month',
      'topics',
      // Play Ball Spotlight (migration 098)
      'spotlight_type', 'spotlight_data',
      // Photo gallery (migration 099)
      'gallery_images',
      // Hero original path for re-crop (migration 100)
      'hero_image_orig_path',
      // Profile original path for re-crop (migration 101)
      'profile_image_orig_path',
      // Auto-post to social on publish (migration 157)
      'auto_post_to_social',
      // Multi-brand attribution (migration 161)
      'brand_slug',
      'syndicated_to_brands',
      // Newsletter draft queue (migration 165)
      'queue_newsletter_draft',
      // Print distribution (migration 167)
      'queue_for_print',
      'print_issue_month',
      // SEO overrides (migration 187 + 195) — inline panel + SEO editor
      // + bulk seeder all PATCH through this endpoint.
      'seo_title', 'seo_description', 'seo_focus_keyword',
      'seo_secondary_keywords', 'seo_canonical_override', 'seo_no_index',
      'seo_ai_seeded_at',
    ]

    const update: Record<string, unknown> = {}
    for (const key of ALLOWED) {
      if (key in body) update[key] = body[key]
    }

    // Canonicalize slug on save — same defense as the POST route.
    // Idempotent: a clean slug passes through unchanged. Reject only if
    // the caller tried to set slug to something that becomes empty after
    // slugify (i.e., all unsafe characters).
    if ('slug' in update) {
      const raw = update.slug
      if (typeof raw === 'string') {
        const cleaned = slugifyForUrl(raw)
        if (!cleaned) {
          return NextResponse.json({ error: 'Slug must contain at least one URL-safe character.' }, { status: 400 })
        }
        update.slug = cleaned
      }
    }

    // Auto-derive vertical_slug from column_slug if the column changed but
    // the caller didn't set vertical_slug explicitly. Keeps article ↔ vertical
    // links in sync without forcing every form to know the mapping.
    if ('column_slug' in update && !('vertical_slug' in update)) {
      update.vertical_slug = columnToVerticalRowSlug(update.column_slug as string | null)
    }

    // Defensive: author_name has a NOT NULL constraint. If the client
    // tries to clear it, fall back to whatever they sent for author_byline,
    // then 'Staff'. Prevents 'null value violates not-null constraint' on
    // forms that only collect a single author field.
    if ('author_name' in update && (update.author_name === null || update.author_name === '')) {
      const byline = (update.author_byline as string | null | undefined) ?? null
      update.author_name = (typeof byline === 'string' && byline.trim()) ? byline : 'Staff'
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const supabase = supabaseAdmin()

    // Pre-snapshot for publish-transition detection (auto-post hook below).
    // Read defensively — old rows may not have the auto_post_to_social column
    // yet if migration 157 hasn't run.
    const { data: priorData } = await supabase
      .from('guide_articles')
      .select('published, auto_post_to_social, auto_posted_at, queue_newsletter_draft, newsletter_drafted_at, queue_for_print, print_queued_at')
      .eq('id', id)
      .maybeSingle()
    const prior = priorData as null | {
      published: boolean | null;
      auto_post_to_social: boolean | null;
      auto_posted_at: string | null;
      queue_newsletter_draft: boolean | null;
      newsletter_drafted_at: string | null;
      queue_for_print: boolean | null;
      print_queued_at: string | null;
    }

    const { error } = await supabase.from('guide_articles').update(update).eq('id', id)

    if (error) {
      console.error('[PATCH article] Supabase error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Revalidate public surfaces on every save so image/text/date changes are
    // visible immediately. Previously this only fired on publish/unpublish,
    // which meant a hero or profile-image swap could sit behind the 10-min
    // ISR cache before readers saw it.
    const slug       = body.slug as string | undefined
    const columnSlug = (body.column_slug as string | undefined) ?? (update.column_slug as string | undefined)
    revalidatePath('/')
    revalidatePath('/articles')
    revalidatePath('/school-bits')
    revalidatePath('/school-zone')
    revalidatePath('/family-resource-guide')
    if (slug) {
      revalidatePath(`/articles/${slug}`)
      if (columnSlug) {
        // Column route uses the slug without the column prefix.
        const bareSlug = slug.replace(new RegExp(`^${columnSlug}-`), '')
        revalidatePath(`/columns/${columnSlug}/${bareSlug}`)
        revalidatePath(`/columns/${columnSlug}/${slug}`)
        revalidatePath(`/columns/${columnSlug}`)
      }
    }

    // Auto-post hook: if this PATCH transitioned the article from
    // unpublished → published AND the auto_post_to_social flag is on AND
    // we haven't already posted, fire the background job. Don't block the
    // PATCH response — the editor sees "✓ Published" immediately.
    const wasPublished  = prior?.published === true
    const nowPublished  = 'published' in update ? !!update.published : wasPublished
    const wantAutoPost  = 'auto_post_to_social' in update
      ? !!update.auto_post_to_social
      : (prior?.auto_post_to_social === true)
    if (!wasPublished && nowPublished && wantAutoPost && !prior?.auto_posted_at) {
      void (async () => {
        try {
          const { autoPostArticle } = await import('@/lib/integrations/meta-suite/auto-post')
          await autoPostArticle(id)
        } catch (e) {
          console.error('[auto-post] background job failed', e)
        }
      })()
    }

    // Newsletter draft hook — mirrors the auto-post hook. Fires when the
    // article transitions to published AND queue_newsletter_draft is on
    // AND no draft has been recorded yet. Migration 165.
    const wantNewsletter = 'queue_newsletter_draft' in update
      ? !!update.queue_newsletter_draft
      : (prior?.queue_newsletter_draft === true)
    if (!wasPublished && nowPublished && wantNewsletter && !prior?.newsletter_drafted_at) {
      void (async () => {
        try {
          const { generateAndLogNewsletterDraft } = await import('@/lib/distribution/newsletter-draft')
          await generateAndLogNewsletterDraft(id)
        } catch (e) {
          console.error('[newsletter-draft] background job failed', e)
        }
      })()
    }

    // Print queue hook — mirrors the others. Migration 167.
    const wantPrint = 'queue_for_print' in update
      ? !!update.queue_for_print
      : (prior?.queue_for_print === true)
    if (!wasPublished && nowPublished && wantPrint && !prior?.print_queued_at) {
      void (async () => {
        try {
          const { queueArticleForPrint } = await import('@/lib/distribution/print-queue')
          await queueArticleForPrint(id)
        } catch (e) {
          console.error('[print-queue] background job failed', e)
        }
      })()
    }

    // Social rotation engine — auto-enqueue the article on the unpublished
    // → published transition. Schedule rules + recycle math live in the
    // social_schedules table. Dispatch + caption generation happens via
    // a separate cron pass so the publish API stays fast.
    if (!wasPublished && nowPublished) {
      void (async () => {
        try {
          const { enqueueForSource } = await import('@/lib/social/queue')
          const sb2 = supabaseAdmin()
          const { data: row } = await sb2
            .from('guide_articles')
            .select('brand_slug')
            .eq('id', id)
            .maybeSingle()
          const brand = (row?.brand_slug as string | null) ?? 'rrp'
          await enqueueForSource(sb2, 'article', id, brand)
        } catch (e) {
          console.error('[social-queue] enqueue failed', e)
        }
      })()
    }

    // IndexNow ping — instant indexing on Bing/Yandex. Fires on the
    // unpublished → published transition only. No-op when INDEXNOW_KEY
    // env isn't set so dev/staging never spam the search engines.
    // Also pings on column changes (URL changed) so the new
    // canonical lands in the index.
    if (!wasPublished && nowPublished) {
      void (async () => {
        try {
          const { pingIndexNow } = await import('@/lib/seo/indexnow')
          const { loadBrandContext } = await import('@/lib/brand-context')
          const ctx = await loadBrandContext()
          // Look up the article's URL — column + slug.
          const sb2 = supabaseAdmin()
          const { data: pubRow } = await sb2
            .from('guide_articles')
            .select('column_slug, slug')
            .eq('id', id)
            .maybeSingle()
          if (pubRow?.column_slug && pubRow.slug) {
            const url = `${ctx.publicOrigin}/columns/${pubRow.column_slug}/${pubRow.slug}`
            await pingIndexNow(ctx.publicOrigin, [url])
          }
        } catch (e) {
          console.error('[indexnow] background ping failed', e)
        }
      })()
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[PATCH article] error:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

// ── DELETE — soft delete (trash) or permanent delete ─────────────────────────

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    if (!id) return NextResponse.json({ error: 'Missing article id' }, { status: 400 })

    const url        = new URL(req.url)
    const permanent  = url.searchParams.get('permanent') === 'true'
    const supabase   = supabaseAdmin()

    // Pull the article so we can also revalidate its public routes.
    const { data: existing } = await supabase
      .from('guide_articles')
      .select('slug, column_slug')
      .eq('id', id)
      .maybeSingle()

    if (permanent) {
      const { error } = await supabase.from('guide_articles').delete().eq('id', id)
      if (error) {
        console.error('[DELETE article permanent]', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    } else {
      // Rename the slug on trash so the original is immediately free for a
      // fresh article. Prefix is recognizable + reversible so Restore can
      // put the original slug back. UUID prefix avoids collisions if you
      // trash multiple items with the same slug.
      const currentSlug    = (existing?.slug as string | null) ?? ''
      const trashedSlugTag = `__trashed_${id.slice(0, 8)}__`
      const alreadyTrashed = currentSlug.startsWith(trashedSlugTag)
      const newSlug        = alreadyTrashed ? currentSlug : `${trashedSlugTag}${currentSlug}`

      const { error } = await supabase
        .from('guide_articles')
        .update({
          deleted_at: new Date().toISOString(),
          published:  false,
          slug:       newSlug,
        })
        .eq('id', id)
      if (error) {
        console.error('[DELETE article soft]', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    // Bust the public-page cache so a trashed/deleted article disappears now.
    revalidatePath('/')
    revalidatePath('/articles')
    if (existing?.slug) {
      const slug       = existing.slug as string
      const columnSlug = existing.column_slug as string | null
      revalidatePath(`/articles/${slug}`)
      if (columnSlug) {
        const bareSlug = slug.replace(new RegExp(`^${columnSlug}-`), '')
        revalidatePath(`/columns/${columnSlug}/${bareSlug}`)
        revalidatePath(`/columns/${columnSlug}/${slug}`)
        revalidatePath(`/columns/${columnSlug}`)
      }
    }

    return NextResponse.json({ success: true, permanent })
  } catch (e) {
    console.error('[DELETE article] error:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

// ── POST — restore a trashed article ─────────────────────────────────────────

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    if (!id) return NextResponse.json({ error: 'Missing article id' }, { status: 400 })

    const body   = await req.json().catch(() => ({}))
    const action = body?.action as string | undefined
    if (action !== 'restore') {
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }

    const supabase = supabaseAdmin()

    // Find the trashed article and recover its original slug. The trash
    // routine prefixes the slug with __trashed_<idShort>__ so we know exactly
    // what to strip on restore.
    const { data: existing } = await supabase
      .from('guide_articles')
      .select('slug')
      .eq('id', id)
      .maybeSingle()

    const trashedSlug = (existing?.slug as string | null) ?? ''
    const prefix      = `__trashed_${id.slice(0, 8)}__`
    let restoredSlug  = trashedSlug.startsWith(prefix) ? trashedSlug.slice(prefix.length) : trashedSlug

    // Conflict check — if another live article took this slug while we were
    // trashed, append a numeric suffix so the restore can proceed cleanly.
    const { data: clash } = await supabase
      .from('guide_articles')
      .select('id')
      .eq('slug', restoredSlug)
      .neq('id', id)
      .maybeSingle()
    if (clash) {
      let n = 2
      // Find a free suffix. Cap at 50 attempts so we never loop forever.
      while (n < 50) {
        const candidate = `${restoredSlug}-${n}`
        const { data: stillClash } = await supabase
          .from('guide_articles')
          .select('id')
          .eq('slug', candidate)
          .neq('id', id)
          .maybeSingle()
        if (!stillClash) { restoredSlug = candidate; break }
        n++
      }
    }

    const { error } = await supabase
      .from('guide_articles')
      .update({ deleted_at: null, slug: restoredSlug })
      .eq('id', id)

    if (error) {
      console.error('[POST article restore]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    revalidatePath('/')
    revalidatePath('/articles')
    return NextResponse.json({ success: true, slug: restoredSlug })
  } catch (e) {
    console.error('[POST article] error:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
