// Meta Business Suite (Pages + Instagram) client.
//
// Reuses the existing user-level token stored in facebook_integrations
// (currently used for the ads_read marketing flows). To enable Pages
// features, the user must re-authorize the Meta token with the
// additional scopes documented in migration 152.
//
// API base: graph.facebook.com v21.0. Same shape as facebook/client.ts —
// raw fetch wrapper instead of the heavyweight SDK.

const META_GRAPH = 'https://graph.facebook.com/v21.0'

export class MetaSuiteApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'MetaSuiteApiError'
  }
}

async function graphFetch(path: string, token: string, init?: RequestInit & { params?: Record<string, string> }): Promise<unknown> {
  const params = new URLSearchParams({ access_token: token, ...(init?.params ?? {}) })
  const url = `${META_GRAPH}${path}${path.includes('?') ? '&' : '?'}${params}`
  const res = await fetch(url, {
    ...init,
    headers: {
      ...(init?.body ? { 'content-type': 'application/json' } : {}),
      ...init?.headers,
    },
  })
  const text = await res.text()
  let json: unknown = null
  try { json = text ? JSON.parse(text) : null } catch { /* leave null */ }
  if (!res.ok) {
    const obj = json as { error?: { message?: string; code?: number } } | null
    const msg = obj?.error?.message ?? text.slice(0, 300) ?? `HTTP ${res.status}`
    throw new MetaSuiteApiError(res.status, msg)
  }
  return json
}

// ─── Pages + IG account discovery ─────────────────────────────────────────

export interface ManagedPage {
  id:                string
  name:              string
  access_token:      string
  instagram_business_account?: { id: string }
}

export async function listManagedPages(userToken: string): Promise<ManagedPage[]> {
  const json = await graphFetch('/me/accounts', userToken, {
    params: { fields: 'id,name,access_token,instagram_business_account{id,username}' },
  }) as { data?: Array<ManagedPage & { instagram_business_account?: { id: string; username?: string } }> }
  return json.data ?? []
}

// ─── Posting ──────────────────────────────────────────────────────────────

export interface CreatePostInput {
  message:    string
  link?:      string
  mediaUrl?:  string                          // image URL for a single-image post
}

export async function createPagePost(pageId: string, pageToken: string, input: CreatePostInput): Promise<{ id: string }> {
  if (input.mediaUrl) {
    // Photo posts use /<page>/photos with url + caption.
    const params = new URLSearchParams({
      access_token: pageToken,
      url:          input.mediaUrl,
      message:      input.message,
    })
    if (input.link) params.set('link', input.link)
    const res = await fetch(`${META_GRAPH}/${pageId}/photos?${params}`, { method: 'POST' })
    const text = await res.text()
    let json: unknown = null
    try { json = JSON.parse(text) } catch { /* ignore */ }
    if (!res.ok) {
      const obj = json as { error?: { message?: string } } | null
      throw new MetaSuiteApiError(res.status, obj?.error?.message ?? text.slice(0, 300))
    }
    return json as { id: string }
  }
  // Text + optional link → /feed with message + link.
  const params = new URLSearchParams({
    access_token: pageToken,
    message:      input.message,
  })
  if (input.link) params.set('link', input.link)
  const res = await fetch(`${META_GRAPH}/${pageId}/feed?${params}`, { method: 'POST' })
  const text = await res.text()
  let json: unknown = null
  try { json = JSON.parse(text) } catch { /* ignore */ }
  if (!res.ok) {
    const obj = json as { error?: { message?: string } } | null
    throw new MetaSuiteApiError(res.status, obj?.error?.message ?? text.slice(0, 300))
  }
  return json as { id: string }
}

// Instagram Content Publishing: 2-step (create container → publish).
export interface CreateIGPostInput {
  message:   string
  mediaUrl:  string                            // IG REQUIRES a media url
}

export async function createInstagramPost(igBusinessId: string, pageToken: string, input: CreateIGPostInput): Promise<{ id: string }> {
  // Step 1: create container
  const params = new URLSearchParams({
    access_token: pageToken,
    image_url:    input.mediaUrl,
    caption:      input.message,
  })
  const containerRes = await fetch(`${META_GRAPH}/${igBusinessId}/media?${params}`, { method: 'POST' })
  const containerJson = await containerRes.json().catch(() => null) as { id?: string; error?: { message?: string } } | null
  if (!containerRes.ok || !containerJson?.id) {
    throw new MetaSuiteApiError(containerRes.status, containerJson?.error?.message ?? 'IG container creation failed')
  }
  // Step 2: publish
  const publishParams = new URLSearchParams({
    access_token: pageToken,
    creation_id:  containerJson.id,
  })
  const publishRes = await fetch(`${META_GRAPH}/${igBusinessId}/media_publish?${publishParams}`, { method: 'POST' })
  const publishJson = await publishRes.json().catch(() => null) as { id?: string; error?: { message?: string } } | null
  if (!publishRes.ok || !publishJson?.id) {
    throw new MetaSuiteApiError(publishRes.status, publishJson?.error?.message ?? 'IG publish failed')
  }
  return { id: publishJson.id }
}

// ─── Comments inbox ───────────────────────────────────────────────────────

export interface PageCommentItem {
  id:           string
  message:      string
  created_time: string
  from?:        { id: string; name: string }
}

export async function fetchPostComments(postId: string, pageToken: string, limit: number = 25): Promise<PageCommentItem[]> {
  const json = await graphFetch(`/${postId}/comments`, pageToken, {
    params: { fields: 'id,message,created_time,from{id,name}', limit: String(limit), order: 'reverse_chronological' },
  }) as { data?: PageCommentItem[] }
  return json.data ?? []
}

/** Pull recent posts on the Page, oldest 25, with comment counts. Used by
 *  the sync to know what to fetch comments for. */
export async function fetchRecentPagePosts(pageId: string, pageToken: string, limit: number = 25): Promise<Array<{ id: string; message?: string; created_time: string; comments?: { summary?: { total_count: number } } }>> {
  const json = await graphFetch(`/${pageId}/posts`, pageToken, {
    params: { fields: 'id,message,created_time,comments.summary(true).limit(0)', limit: String(limit) },
  }) as { data?: Array<{ id: string; message?: string; created_time: string; comments?: { summary?: { total_count: number } } }> }
  return json.data ?? []
}

export async function replyToComment(commentId: string, pageToken: string, message: string): Promise<{ id: string }> {
  const params = new URLSearchParams({ access_token: pageToken, message })
  const res = await fetch(`${META_GRAPH}/${commentId}/comments?${params}`, { method: 'POST' })
  const text = await res.text()
  let json: unknown = null
  try { json = JSON.parse(text) } catch { /* ignore */ }
  if (!res.ok) {
    const obj = json as { error?: { message?: string } } | null
    throw new MetaSuiteApiError(res.status, obj?.error?.message ?? text.slice(0, 300))
  }
  return json as { id: string }
}

export function metaSuiteErrorMessage(e: unknown): string {
  if (e instanceof MetaSuiteApiError) return `${e.status}: ${e.message}`
  return e instanceof Error ? e.message : String(e)
}
