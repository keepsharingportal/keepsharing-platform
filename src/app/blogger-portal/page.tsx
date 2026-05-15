// /blogger-portal
// Dashboard for a logged-in Mom Knows Best blogger. Shows her own posts
// (drafts + published), her profile preview, and a "Write a new post" CTA.
//
// Auth model: uses the SSR Supabase client which reads the session
// cookie. We look up the bloggers row by user_id. If not found (no
// blogger profile linked), we redirect to login.

import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  PenLine, ExternalLink, Eye, LogOut, PlusCircle, CheckCircle2,
  Clock, FileText, BarChart3,
} from 'lucide-react'
import { BloggerLogoutButton } from './BloggerLogoutButton'

export const metadata = { title: 'Blogger Portal — River Region Parents' }
export const dynamic  = 'force-dynamic'

interface Blogger {
  id:                string
  slug:              string
  display_name:      string
  tagline:           string | null
  profile_image_url: string | null
}

interface Post {
  id:             string
  slug:           string
  title:          string
  excerpt:        string | null
  hero_image_url: string | null
  published:      boolean
  published_at:   string | null
  updated_at:     string | null
  created_at:     string | null
}

function fmtDate(iso: string | null) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default async function BloggerDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/blogger-portal/login')

  // Look up blogger row via service role (the RLS policy lets the user
  // read their own row, but we use admin to avoid any policy gaps).
  const admin = createAdminClient()
  const { data: bloggerRow } = await admin
    .from('bloggers')
    .select('id, slug, display_name, tagline, profile_image_url')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!bloggerRow) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--fg-cream, #faf8f5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ background: 'white', borderRadius: 18, padding: 36, maxWidth: 440, textAlign: 'center' }}>
          <h1 style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 22, fontWeight: 700, marginBottom: 12 }}>
            You&apos;re signed in — but not set up yet
          </h1>
          <p style={{ fontSize: 14, color: '#666', lineHeight: 1.6, marginBottom: 18 }}>
            We don&apos;t have a blogger profile linked to <strong>{user.email}</strong> yet.
            Reach out to Jason and he&apos;ll connect things on the back end.
          </p>
          <BloggerLogoutButton />
        </div>
      </div>
    )
  }

  const blogger = bloggerRow as Blogger

  const { data: postsRows } = await admin
    .from('guide_articles')
    .select('id, slug, title, excerpt, hero_image_url, published, published_at, updated_at, created_at')
    .eq('author_blogger_id', blogger.id)
    .order('updated_at', { ascending: false, nullsFirst: false })
    .limit(50)

  const posts        = (postsRows ?? []) as Post[]
  const drafts       = posts.filter(p => !p.published)
  const published    = posts.filter(p => p.published)
  const totalPosts   = posts.length

  return (
    <div className="min-h-screen" style={{ background: 'var(--fg-cream, #faf8f5)' }}>

      {/* ── Top bar ── */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {blogger.profile_image_url ? (
              <Image
                src={blogger.profile_image_url}
                alt={blogger.display_name}
                width={36}
                height={36}
                className="rounded-full object-cover shrink-0"
                style={{ objectPosition: 'center top' }}
                unoptimized
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-pink-100 flex items-center justify-center text-pink-600 font-black text-sm shrink-0">
                {blogger.display_name.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-900 truncate">{blogger.display_name}</p>
              <p className="text-[11px] text-gray-500 truncate">Mom Knows Best · Blogger Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href={`/mom-knows-best/${blogger.slug}`}
              target="_blank"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-gray-200 bg-white rounded-lg hover:bg-gray-50 text-gray-700"
            >
              View public profile <ExternalLink size={11} />
            </Link>
            <BloggerLogoutButton />
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* ── Welcome ── */}
        <section className="rounded-2xl bg-gradient-to-br from-pink-100 via-pink-50 to-white border border-pink-200 p-6 md:p-8">
          <p className="text-[11px] font-bold uppercase tracking-widest text-pink-600 mb-1">Welcome back</p>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight mb-2" style={{ fontFamily: 'var(--font-fraunces, serif)' }}>
            Hi, {blogger.display_name.split(' ')[0]} 👋
          </h1>
          <p className="text-sm md:text-base text-gray-600 leading-relaxed max-w-xl mb-5">
            This is your private dashboard. Write a new post, finish a draft, or
            check on something you&apos;ve already published. Everything you save here
            shows up on your profile at Mom Knows Best.
          </p>
          <Link
            href="/blogger-portal/posts/new"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-pink-600 hover:bg-pink-700 text-white rounded-full text-sm font-bold transition-colors shadow-sm"
          >
            <PlusCircle size={14} /> Write a new post
          </Link>
        </section>

        {/* ── Stats ── */}
        <section className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex items-center gap-2 mb-1">
              <FileText size={14} className="text-gray-400" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Total posts</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">{totalPosts}</p>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock size={14} className="text-amber-600" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700">Drafts</p>
            </div>
            <p className="text-2xl font-bold text-amber-700">{drafts.length}</p>
          </div>
          <div className="rounded-xl border border-green-200 bg-green-50/40 p-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 size={14} className="text-green-600" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-green-700">Published</p>
            </div>
            <p className="text-2xl font-bold text-green-700">{published.length}</p>
          </div>
        </section>

        {/* ── Drafts in progress ── */}
        {drafts.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-gray-900">In progress</h2>
              <span className="text-xs text-gray-500">{drafts.length} {drafts.length === 1 ? 'draft' : 'drafts'}</span>
            </div>
            <div className="space-y-2">
              {drafts.map(p => (
                <Link
                  key={p.id}
                  href={`/blogger-portal/posts/${p.id}/edit`}
                  className="flex items-center gap-3 p-3.5 rounded-xl bg-white border border-amber-200 hover:border-amber-300 hover:shadow-sm transition-all"
                >
                  <span className="text-[10px] font-bold uppercase bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded shrink-0">Draft</span>
                  <p className="text-sm font-semibold text-gray-900 line-clamp-1 flex-1 min-w-0">{p.title || 'Untitled draft'}</p>
                  <span className="text-[11px] text-gray-500 shrink-0">Updated {fmtDate(p.updated_at)}</span>
                  <PenLine size={14} className="text-gray-400 shrink-0" />
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── Published posts ── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-gray-900">Published</h2>
            {published.length > 0 && (
              <Link
                href={`/mom-knows-best/${blogger.slug}`}
                target="_blank"
                className="text-xs font-semibold text-pink-600 hover:underline inline-flex items-center gap-1"
              >
                See live <ExternalLink size={11} />
              </Link>
            )}
          </div>

          {published.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-gray-200 bg-white p-10 text-center">
              <BarChart3 className="h-8 w-8 text-pink-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-gray-700 mb-1">Nothing published yet</p>
              <p className="text-xs text-gray-500 mb-4 max-w-sm mx-auto leading-relaxed">
                When you publish your first post, it&apos;ll show up here so you can
                jump back in to edit or share the live link.
              </p>
              <Link
                href="/blogger-portal/posts/new"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold rounded-full transition-colors"
              >
                <PlusCircle size={12} /> Start your first post
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {published.map(p => (
                <div key={p.id} className="flex items-center gap-3 p-3.5 rounded-xl bg-white border border-gray-200 hover:border-pink-300 transition-all">
                  <span className="text-[10px] font-bold uppercase bg-green-100 text-green-700 px-1.5 py-0.5 rounded shrink-0">Live</span>
                  <Link
                    href={`/blogger-portal/posts/${p.id}/edit`}
                    className="text-sm font-semibold text-gray-900 hover:text-pink-700 line-clamp-1 flex-1 min-w-0"
                  >
                    {p.title}
                  </Link>
                  <span className="hidden sm:inline text-[11px] text-gray-500 shrink-0">{fmtDate(p.published_at)}</span>
                  <Link
                    href={`/articles/${p.slug}`}
                    target="_blank"
                    title="View live post"
                    className="text-gray-400 hover:text-pink-600 p-1 shrink-0"
                  >
                    <Eye size={14} />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Help ── */}
        <section className="rounded-2xl bg-white border border-gray-200 p-5 md:p-6">
          <h3 className="text-sm font-bold text-gray-900 mb-2">A few quick tips</h3>
          <ul className="text-xs text-gray-600 leading-relaxed space-y-1.5 list-disc pl-4">
            <li><strong>Drafts auto-save</strong> as you type. You can step away and come back later.</li>
            <li><strong>One post a week</strong> is the rhythm we&apos;re aiming for — it doesn&apos;t need to be long. Real, local, and useful beats polished.</li>
            <li><strong>Photos:</strong> upload your own or skip the hero image — we&apos;ll fill in a placeholder.</li>
            <li><strong>Stuck?</strong> Email Jason and he&apos;ll get back to you the same day.</li>
          </ul>
        </section>

        <p className="text-center text-[11px] text-gray-400 inline-flex items-center justify-center gap-1.5 w-full pt-3">
          Signed in as {user.email}. <LogOut size={10} /> Use the button up top to sign out.
        </p>
      </main>
    </div>
  )
}
