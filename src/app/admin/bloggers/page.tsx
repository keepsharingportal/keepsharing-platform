// /admin/bloggers
// List of every Mom Knows Best blogger. Click a card to edit profile, bio,
// images, and Quick Takes. + New creates an empty profile that you can
// fill in.

import Link from 'next/link'
import Image from 'next/image'
import { createAdminClient } from '@/lib/supabase/admin'
import { Users, ExternalLink, ImageIcon, Key, KeyRound } from 'lucide-react'
import { NewBloggerButton } from './NewBloggerButton'
import { SectionHelp } from '@/components/admin/AdminHelp'

export const metadata = { title: 'Mom Knows Best — KeepSharing Admin' }
export const dynamic  = 'force-dynamic'

interface BloggerRow {
  id:                string
  slug:              string
  display_name:      string
  tagline:           string | null
  profile_image_url: string | null
  is_active:         boolean
  display_order:     number | null
  email:             string | null
  user_id:           string | null
  created_at:        string
}

export default async function BloggersAdminPage() {
  const supabase = createAdminClient()

  const [{ data: bloggers }, { data: postCounts }] = await Promise.all([
    supabase.from('bloggers')
      .select('id, slug, display_name, tagline, profile_image_url, is_active, display_order, email, user_id, created_at')
      .order('display_order', { ascending: true })
      .order('display_name', { ascending: true }),
    supabase.from('guide_articles')
      .select('author_blogger_id')
      .eq('column_slug', 'mom-knows-best')
      .eq('published', true),
  ])

  const rows = (bloggers ?? []) as BloggerRow[]
  const postCount: Record<string, number> = {}
  for (const r of postCounts ?? []) {
    if (r.author_blogger_id) postCount[r.author_blogger_id] = (postCount[r.author_blogger_id] ?? 0) + 1
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Users className="h-5 w-5 text-pink-600" />
            Mom Knows Best
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Mom Knows Best contributors. Manage profile, bio, family photo, and Quick Takes for each mom.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/mom-knows-best"
            target="_blank"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-gray-200 bg-white rounded-lg hover:bg-gray-50 text-gray-700"
          >
            View Public Page <ExternalLink size={11} />
          </Link>
          <NewBloggerButton />
        </div>
      </div>

      <SectionHelp variant="info" title="Self-service login">
        Each blogger card shows whether she has portal access. Open a profile,
        add her email, and click <strong>Send Login Link</strong> — she&apos;ll get a
        magic link that signs her into the <Link href="/blogger-portal" className="text-blue-600 hover:underline">Blogger Portal</Link> so she
        can write posts herself.
      </SectionHelp>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 p-12 text-center bg-white">
          <Users className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm font-semibold text-gray-700">No bloggers yet</p>
          <p className="text-xs text-gray-500 mt-1">Click <strong>+ New Blogger</strong> to add the first one.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map(b => {
            const count = postCount[b.id] ?? 0
            return (
              <Link
                key={b.id}
                href={`/admin/bloggers/${b.slug}/edit`}
                className={`rounded-xl border bg-white overflow-hidden hover:shadow-md hover:border-pink-300 transition-all flex gap-4 p-4 ${b.is_active ? 'border-gray-200' : 'border-gray-200 opacity-70'}`}
              >
                <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                  {b.profile_image_url ? (
                    <Image
                      src={b.profile_image_url}
                      alt={b.display_name}
                      fill
                      sizes="80px"
                      style={{ objectFit: 'cover', objectPosition: 'center top' }}
                      unoptimized
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                      <ImageIcon className="h-6 w-6" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-bold text-gray-900 leading-tight">{b.display_name}</p>
                    {!b.is_active && (
                      <span className="text-[10px] font-bold uppercase bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded shrink-0">Inactive</span>
                    )}
                  </div>
                  {b.tagline && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-snug">{b.tagline}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <p className="text-[11px] text-gray-400">{count} post{count === 1 ? '' : 's'} · /{b.slug}</p>
                    {b.user_id ? (
                      <span className="text-[9px] font-bold uppercase tracking-wider bg-green-50 text-green-700 px-1.5 py-0.5 rounded inline-flex items-center gap-1">
                        <KeyRound size={8} /> Has Login
                      </span>
                    ) : b.email ? (
                      <span className="text-[9px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded inline-flex items-center gap-1">
                        <Key size={8} /> Invite Pending
                      </span>
                    ) : null}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
