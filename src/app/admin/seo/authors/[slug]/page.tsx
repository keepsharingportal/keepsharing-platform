// ── /admin/seo/authors/[slug] — Edit one author profile ──────────────────

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireSettingsAccess } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { authorNameToSlug, slugToAuthorTitleCase } from '@/lib/seo/author-slug'
import { loadAuthorProfile } from '@/lib/seo/authors'
import { AuthorEditorClient } from './AuthorEditorClient'

export const metadata: Metadata = { title: 'Edit Author — SEO — Admin' }
export const dynamic = 'force-dynamic'

interface Props { params: Promise<{ slug: string }> }

export default async function EditAuthorPage({ params }: Props) {
  await requireSettingsAccess()
  const { slug } = await params
  const sb = createAdminClient()

  // Existing profile, if any.
  const existing = await loadAuthorProfile(sb, slug)

  // Derive a fallback display name from articles when no profile exists.
  let derivedName: string | null = null
  if (!existing) {
    const { data: arts } = await sb
      .from('guide_articles')
      .select('author_name')
      .eq('published', true)
      .not('author_name', 'is', null)
      .limit(2000)
    const tally = new Map<string, number>()
    for (const a of (arts ?? []) as Array<{ author_name: string | null }>) {
      const n = (a.author_name ?? '').trim()
      if (n && authorNameToSlug(n) === slug) {
        tally.set(n, (tally.get(n) ?? 0) + 1)
      }
    }
    derivedName = Array.from(tally.entries()).sort((a, b) => b[1] - a[1])[0]?.[0]
                ?? slugToAuthorTitleCase(slug)
  }

  const initial = existing ?? {
    authorSlug:       slug,
    displayName:      derivedName ?? slugToAuthorTitleCase(slug),
    bio:              null,
    headshotUrl:      null,
    jobTitle:         null,
    credentials:      [],
    knowsAbout:       [],
    socialUrls:       [],
    contactEmail:     null,
    primaryBrandSlug: null,
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="bg-white border-b border-portal-border px-6 py-4 shrink-0">
        <Link href="/admin/seo/authors" className="text-[11px] font-semibold text-portal-sub hover:text-portal-text inline-flex items-center gap-1 mb-1">
          ← Authors
        </Link>
        <h1 className="text-[18px] font-bold text-portal-text">{initial.displayName}</h1>
        <p className="text-[12px] text-portal-sub mt-1">
          Public URL: <code>/authors/{slug}</code> · Editable bio, headshot, credentials, social links.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto bg-portal-bg">
        <div className="px-6 py-6">
          <AuthorEditorClient initial={initial} />
        </div>
      </div>
    </div>
  )
}
