// /admin/bloggers/[slug]/edit
// Profile editor for a Mom Knows Best blogger. Identity, images (profile +
// family), bio, Quick Takes Q&A, active toggle.

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import { BloggerEditClient } from './BloggerEditClient'

export const metadata = { title: 'Edit Blogger — KeepSharing Admin' }
export const dynamic  = 'force-dynamic'

interface Props { params: Promise<{ slug: string }> }

export default async function BloggerEditPage({ params }: Props) {
  const { slug } = await params
  const supabase = createAdminClient()

  const { data: blogger } = await supabase
    .from('bloggers')
    .select('id, slug, display_name, tagline, email, user_id, profile_image_url, family_image_url, bio, quick_takes, is_active, display_order')
    .eq('slug', slug)
    .maybeSingle()

  if (!blogger) notFound()

  // Posts authored by this blogger — read-only list with link to edit each
  const { data: posts } = await supabase
    .from('guide_articles')
    .select('id, slug, title, published, published_at')
    .eq('column_slug', 'mom-knows-best')
    .eq('author_blogger_id', blogger.id)
    .order('published_at', { ascending: false, nullsFirst: false })
    .limit(20)

  const publicPath = `/mom-knows-best/${blogger.slug}`

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-5xl">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <Link href="/admin/bloggers" className="inline-flex items-center gap-1 text-xs text-portal-blue hover:underline mb-1">
            <ArrowLeft size={11} /> All Bloggers
          </Link>
          <h1 className="text-xl font-semibold text-portal-text">Edit {blogger.display_name}</h1>
          <p className="text-sm text-portal-sub mt-0.5">Identity, photos, bio, and Quick Takes shown on the public profile.</p>
        </div>
        <Link
          href={publicPath}
          target="_blank"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-portal-border bg-white rounded-lg hover:bg-portal-bg text-portal-text"
        >
          View Public Page <ExternalLink size={11} />
        </Link>
      </div>

      <BloggerEditClient
        slug={slug}
        publicPath={publicPath}
        initial={{
          display_name:      blogger.display_name      ?? '',
          tagline:           blogger.tagline           ?? '',
          email:             blogger.email             ?? '',
          profile_image_url: blogger.profile_image_url ?? '',
          family_image_url:  blogger.family_image_url  ?? '',
          bio:               blogger.bio               ?? '',
          quick_takes:       Array.isArray(blogger.quick_takes)
            ? (blogger.quick_takes as Array<{ question: string; answer: string }>)
            : [],
          is_active:         blogger.is_active ?? true,
          has_login:         !!blogger.user_id,
        }}
      />

      {/* ── Posts ─────────────────────────────────────────────────────────── */}
      <section className="rounded-xl border border-portal-border bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-portal-border flex items-center justify-between">
          <h2 className="text-sm font-bold text-portal-text">Posts by {blogger.display_name.split(' ')[0]} ({posts?.length ?? 0})</h2>
          <Link
            href={`/admin/articles/new?column_slug=mom-knows-best&author_blogger_id=${blogger.id}`}
            className="text-xs font-semibold text-portal-blue hover:underline"
          >
            + New post
          </Link>
        </div>
        {(!posts || posts.length === 0) ? (
          <div className="px-4 py-8 text-center text-sm text-portal-sub">
            No posts yet.{' '}
            <Link href={`/admin/articles/new?column_slug=mom-knows-best&author_blogger_id=${blogger.id}`} className="text-portal-blue hover:underline font-semibold">
              Write the first one →
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-portal-border">
            {posts.map(p => (
              <div key={p.id} className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-portal-bg">
                <Link href={`/admin/articles/${p.id}/edit`} className="text-sm font-semibold text-portal-text hover:text-portal-blue line-clamp-1 flex-1 min-w-0">
                  {p.title}
                </Link>
                <div className="flex items-center gap-2 shrink-0">
                  {!p.published && <span className="text-[10px] font-bold uppercase bg-portal-amber-lt text-portal-amber px-1.5 py-0.5 rounded">Draft</span>}
                  {p.published_at && <span className="text-[11px] text-portal-sub">{new Date(p.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
