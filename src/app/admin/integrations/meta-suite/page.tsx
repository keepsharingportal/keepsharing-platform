// ── /admin/integrations/meta-suite ──────────────────────────────────────────
// Meta Business Suite: Page posting (Facebook + Instagram cross-post), AI
// caption assist, comments inbox. Extends the existing Facebook Marketing
// integration — reuses the same user-level token after the user adds the
// Page scopes during re-auth.

import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, MessageCircle, AlertCircle } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'
import { MetaSuiteClient } from './MetaSuiteClient'

export const metadata: Metadata = { title: 'Meta Business Suite — Admin' }
export const dynamic = 'force-dynamic'

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export interface MetaPageRow {
  id:                 string
  fb_page_id:         string
  fb_page_name:       string
  ig_business_id:     string | null
  ig_username:        string | null
  is_active:          boolean
  last_sync_at:       string | null
  connected_at:       string
}

export interface MetaPostRow {
  id:                 string
  page_id:            string
  fb_post_id:         string | null
  message:            string
  link:               string | null
  media_url:          string | null
  also_to_instagram:  boolean
  ig_media_id:        string | null
  status:             string
  error:              string | null
  created_at:         string
  published_at:       string | null
  like_count:         number
  comment_count:      number
}

export interface MetaCommentRow {
  id:                  string
  page_id:             string
  fb_comment_id:       string
  fb_post_id:          string | null
  author_name:         string | null
  message:             string
  created_at_facebook: string
  is_handled:          boolean
}

export default async function MetaSuitePage() {
  const sb = supabaseAdmin()

  let migrated = true
  let facebookConnected = false
  let pages: MetaPageRow[] = []
  let posts: MetaPostRow[] = []
  let comments: MetaCommentRow[] = []

  try {
    const fbProbe = await sb.from('facebook_integrations').select('is_active').eq('market', 'rrp').maybeSingle()
    facebookConnected = !!(fbProbe.data as { is_active: boolean } | null)?.is_active
  } catch { /* ignore */ }

  try {
    const probe = await sb.from('facebook_pages').select('id').limit(1)
    if (probe.error && /relation .* does not exist/i.test(probe.error.message)) {
      migrated = false
    } else if (!probe.error) {
      const { data: pData } = await sb.from('facebook_pages').select('*').order('connected_at', { ascending: false })
      pages = (pData ?? []) as MetaPageRow[]

      const { data: postsData } = await sb
        .from('facebook_page_posts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20)
      posts = (postsData ?? []) as MetaPostRow[]

      const { data: cData } = await sb
        .from('facebook_page_comments')
        .select('*')
        .eq('is_handled', false)
        .order('created_at_facebook', { ascending: false })
        .limit(50)
      comments = (cData ?? []) as MetaCommentRow[]
    }
  } catch { /* fall through */ }

  return (
    <div className="flex-1 overflow-y-auto bg-portal-bg">
      <div className="bg-white border-b border-portal-border px-6 py-4">
        <Link href="/admin/integrations" className="inline-flex items-center gap-1 text-[11px] text-portal-blue hover:text-portal-blue-dk mb-1">
          <ArrowLeft size={11} /> Integrations
        </Link>
        <h1 className="portal-page-title">Meta Business Suite</h1>
        <p className="portal-page-subtitle">
          Post to Facebook + Instagram from admin, with AI caption assist. See + reply to comments without leaving here. Extends the existing Facebook Marketing integration.
        </p>
      </div>

      <div className="p-6 max-w-5xl space-y-6">
        {!migrated && (
          <div className="bg-portal-amber-lt border border-portal-amber/30 rounded-lg p-4 text-portal-text text-xs">
            <strong>Migration 152 pending.</strong> Apply <code className="bg-white px-1 py-0.5 rounded border border-portal-border">supabase/migrations/152_meta_business_suite.sql</code> first.
          </div>
        )}

        {migrated && !facebookConnected && (
          <div className="bg-portal-amber-lt border border-portal-amber/30 rounded-lg p-4 text-portal-text text-xs leading-relaxed">
            <strong>Connect Facebook Marketing first.</strong> The Meta Business Suite integration reuses the same Meta user token. Go to <Link href="/admin/integrations/facebook" className="text-portal-blue hover:underline">/admin/integrations/facebook</Link>, connect the token with these added scopes:
            <ul className="list-disc pl-5 mt-1 text-[11px]">
              <li><code className="bg-white px-1 rounded">pages_show_list</code></li>
              <li><code className="bg-white px-1 rounded">pages_read_engagement</code></li>
              <li><code className="bg-white px-1 rounded">pages_manage_posts</code></li>
              <li><code className="bg-white px-1 rounded">pages_manage_engagement</code></li>
              <li><code className="bg-white px-1 rounded">instagram_basic</code></li>
              <li><code className="bg-white px-1 rounded">instagram_content_publish</code></li>
            </ul>
            <p className="mt-2">…then come back here and click "Discover Pages."</p>
          </div>
        )}

        {migrated && facebookConnected && (
          <MetaSuiteClient pages={pages} posts={posts} comments={comments} />
        )}

        {migrated && pages.length === 0 && facebookConnected && (
          <div className="bg-white border border-portal-border rounded-lg p-5 text-xs text-portal-sub leading-relaxed">
            <div className="flex items-center gap-2 mb-2">
              <MessageCircle size={14} className="text-portal-blue" />
              <h3 className="text-sm font-bold text-portal-text">After discovery</h3>
            </div>
            <p>Once Pages are discovered, you&apos;ll see a post composer with AI caption assist, a Facebook + Instagram cross-post toggle (for Pages with linked IG business accounts), and the comments inbox below. Run "Sync comments" to populate the inbox with anything from the last 10 posts that hasn&apos;t been replied to yet.</p>
          </div>
        )}
      </div>
    </div>
  )
}
