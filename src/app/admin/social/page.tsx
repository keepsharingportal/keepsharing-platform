// /admin/social — real Meta Suite audit log.
//
// Was previously a mock page (imported MOCK_SOCIAL_POSTS, all client
// state). Replaced with a server-rendered read of facebook_page_posts
// joined to facebook_pages so editors see EVERY actual post that went
// out via Meta Suite auto-post, with status, error trail, and engagement
// numbers.
//
// Scheduling/queueing of FUTURE posts is intentionally not built here —
// the Content Deployment page handles editor-controlled social via the
// 'Draft captions' button + the social-export workflow. This page is
// strictly the audit / what-went-out / what-broke view.

import Link from 'next/link'
import { ExternalLink, MessageCircle, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'

export const metadata = { title: 'Social posts — Admin' }
export const dynamic  = 'force-dynamic'

interface PostRow {
  id:             string
  page_id:        string
  fb_post_id:     string | null
  message:        string
  link:           string | null
  media_url:      string | null
  also_to_instagram: boolean
  ig_media_id:    string | null
  status:         string
  error:          string | null
  created_at:     string
  published_at:   string | null
  like_count:     number | null
  comment_count:  number | null
  share_count:    number | null
  facebook_pages?: { page_name: string | null; market: string | null } | { page_name: string | null; market: string | null }[] | null
}

const STATUS_BADGE: Record<string, string> = {
  pending: 'badge-amber',
  live:    'badge-green',
  error:   'badge-red',
}

export default async function SocialPostsPage() {
  await requireAdmin()
  const sb = createAdminClient()

  // Read the actual audit log. If the table doesn't exist yet (pre
  // migration 152) we degrade to an empty list rather than 500ing.
  let posts: PostRow[] = []
  let tableMissing = false
  try {
    const { data, error } = await sb
      .from('facebook_page_posts')
      .select(`
        id, page_id, fb_post_id, message, link, media_url,
        also_to_instagram, ig_media_id, status, error,
        created_at, published_at, like_count, comment_count, share_count,
        facebook_pages(page_name, market)
      `)
      .order('created_at', { ascending: false })
      .limit(60)
    if (error && /relation .* does not exist/i.test(error.message)) {
      tableMissing = true
    } else if (!error) {
      posts = (data ?? []) as unknown as PostRow[]
    }
  } catch { tableMissing = true }

  // Aggregate stats — counts at a glance so an editor checking in knows
  // whether anything broke overnight.
  const stats = posts.reduce((acc, p) => {
    if (p.status === 'live')    acc.live += 1
    if (p.status === 'pending') acc.pending += 1
    if (p.status === 'error')   acc.error += 1
    return acc
  }, { live: 0, pending: 0, error: 0 })

  return (
    <div className="portal-app flex flex-col flex-1 min-h-0 bg-portal-bg">
      <div className="page-header">
        <div>
          <h1 className="ph-title">Social posts</h1>
          <div className="text-muted text-sm">
            Audit log of every post Meta Suite has dispatched on your behalf. Read-only.
            To draft NEW captions, use the &lsquo;Draft captions&rsquo; button on{' '}
            <Link href="/admin/distribution?view=social" style={{ color: 'var(--color-portal-blue)' }}>Content Deployment → Social</Link>.
          </div>
        </div>
        <div className="ph-actions">
          <Link href="/admin/integrations/facebook" className="btn btn-ghost btn-sm">Meta Suite settings →</Link>
        </div>
      </div>

      <div className="content-body overflow-y-auto">
        {tableMissing && (
          <div className="alert alert-warning mb-4">
            <strong>Meta Suite not migrated yet.</strong> The <code>facebook_page_posts</code> table
            from migration 152 isn&apos;t in the database. Apply it in Supabase Studio to start seeing posts here.
          </div>
        )}

        <div className="stats-row" style={{ marginBottom: 18 }}>
          <div className="stat-card">
            <div className="stat-num">{posts.length}</div>
            <div className="stat-label">Recent posts</div>
          </div>
          <div className="stat-card">
            <div className="stat-num" style={{ color: 'var(--color-portal-green)' }}>{stats.live}</div>
            <div className="stat-label">Live</div>
          </div>
          <div className="stat-card">
            <div className="stat-num has-amber">{stats.pending}</div>
            <div className="stat-label">Pending</div>
          </div>
          <div className="stat-card">
            <div className={`stat-num ${stats.error > 0 ? 'has-red' : ''}`}>{stats.error}</div>
            <div className="stat-label">Errors</div>
          </div>
        </div>

        {posts.length === 0 && !tableMissing && (
          <div className="card" style={{ textAlign: 'center', padding: 40 }}>
            <MessageCircle size={28} color="var(--color-portal-muted)" style={{ marginBottom: 8 }} />
            <p className="fw-700">No posts yet.</p>
            <p className="text-muted text-xs" style={{ marginTop: 4 }}>
              Posts appear here automatically when a guide article is published
              with <code>auto_post_to_social=true</code>. The publish-to-article
              bridge sets that flag when an editor approves Social on the
              submission.
            </p>
          </div>
        )}

        {posts.length > 0 && (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Posted</th>
                  <th>Page</th>
                  <th>Message</th>
                  <th style={{ textAlign: 'center' }}>Status</th>
                  <th style={{ textAlign: 'right' }}>Engagement</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {posts.map(p => {
                  const page = Array.isArray(p.facebook_pages) ? p.facebook_pages[0] : p.facebook_pages
                  const sentAt = p.published_at ?? p.created_at
                  const eng = (p.like_count ?? 0) + (p.comment_count ?? 0) + (p.share_count ?? 0)
                  return (
                    <tr key={p.id}>
                      <td className="text-sub text-xs" style={{ whiteSpace: 'nowrap' }}>
                        {new Date(sentAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                      </td>
                      <td>
                        <div className="fw-700 text-sm">{page?.page_name ?? '—'}</div>
                        <div className="text-muted text-xs">{(page?.market ?? '').toUpperCase()}</div>
                      </td>
                      <td>
                        <div className="text-sm" style={{ maxWidth: 480, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {p.message}
                        </div>
                        {p.also_to_instagram && <span className="badge badge-blue" style={{ fontSize: 9, marginTop: 2 }}>+ IG</span>}
                        {p.error && (
                          <div className="text-xs" style={{ color: 'var(--color-portal-red)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <AlertTriangle size={10} /> {p.error}
                          </div>
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`badge ${STATUS_BADGE[p.status] ?? 'badge-gray'}`}>
                          {p.status === 'live' && <CheckCircle2 size={9} style={{ display: 'inline', verticalAlign: -1 }} />}
                          {' '}{p.status}
                        </span>
                      </td>
                      <td className="mono text-xs" style={{ textAlign: 'right' }}>
                        {eng === 0 ? '—' : `${eng.toLocaleString()} 👍`}
                      </td>
                      <td>
                        {p.fb_post_id && (
                          <a
                            href={`https://www.facebook.com/${p.fb_post_id.replace('_', '/posts/')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-ghost btn-xs"
                            title="Open post on Facebook"
                          >
                            <ExternalLink size={10} />
                          </a>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {posts.length === 60 && (
          <p className="text-muted text-xs" style={{ marginTop: 10, textAlign: 'center' }}>
            Showing 60 most recent. Full history is in <code>facebook_page_posts</code>.
          </p>
        )}
      </div>
    </div>
  )
}
