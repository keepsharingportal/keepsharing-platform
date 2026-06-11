'use client'

import { useState, useTransition } from 'react'
import { MessageCircle, CheckCircle2, RefreshCw, Send, Sparkles, ExternalLink, Trash2 } from 'lucide-react'
import type { MetaPageRow, MetaPostRow, MetaCommentRow } from './page'
import {
  discoverPagesAction, postToPageAction,
  syncCommentsAction, replyToCommentAction, dismissCommentAction,
  generateCaptionAction,
} from './actions'

interface Props {
  pages:     MetaPageRow[]
  posts:     MetaPostRow[]
  comments:  MetaCommentRow[]
}

export function MetaSuiteClient({ pages, posts, comments }: Props) {
  return (
    <div className="space-y-6">
      <PagesHeader pages={pages} />
      {pages.length > 0 && <PostComposer pages={pages} />}
      {posts.length > 0 && <PostHistory posts={posts} pages={pages} />}
      {pages.length > 0 && <CommentsInbox comments={comments} pages={pages} />}
    </div>
  )
}

function PagesHeader({ pages }: { pages: MetaPageRow[] }) {
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState<string | null>(null)

  return (
    <div className="bg-white border border-portal-border rounded-lg p-5">
      <div className="flex items-start gap-4">
        <div className="shrink-0 w-10 h-10 rounded-lg bg-portal-blue-lt flex items-center justify-center text-portal-blue">
          <MessageCircle size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-bold text-portal-text">Connected Pages</h3>
            <span className="text-[10px] font-bold uppercase tracking-wider text-portal-sub bg-portal-bg border border-portal-border px-1.5 py-0.5 rounded-full">
              {pages.length} {pages.length === 1 ? 'page' : 'pages'}
            </span>
          </div>
          {pages.length > 0 ? (
            <ul className="mt-2 space-y-1 text-xs">
              {pages.map(p => (
                <li key={p.id} className="flex items-center gap-2">
                  <CheckCircle2 size={11} className="text-portal-green" />
                  <span className="text-portal-text font-bold">{p.fb_page_name}</span>
                  {p.ig_business_id && <span className="text-[10px] text-portal-muted">· IG linked</span>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[11px] text-portal-sub mt-1">No Pages discovered yet. Click below.</p>
          )}
        </div>
        <button
          onClick={() => {
            setMsg(null)
            start(async () => {
              const out = await discoverPagesAction()
              setMsg(out.ok ? `Discovered ${out.count} Page${out.count === 1 ? '' : 's'}.` : `Error: ${out.error}`)
            })
          }}
          disabled={pending}
          className="text-xs font-bold text-portal-blue hover:text-portal-blue-dk border border-portal-blue/30 bg-portal-blue-lt px-3 py-1.5 rounded-md disabled:opacity-50 inline-flex items-center gap-1.5"
        >
          <RefreshCw size={11} className={pending ? 'animate-spin' : ''} />
          {pending ? 'Discovering…' : 'Discover Pages'}
        </button>
      </div>
      {msg && <p className="mt-3 text-[11px] text-portal-sub">{msg}</p>}
    </div>
  )
}

function PostComposer({ pages }: { pages: MetaPageRow[] }) {
  const firstActive = pages.find(p => p.is_active) ?? pages[0]
  const [pageId, setPageId] = useState(firstActive?.id ?? '')
  const [message, setMessage] = useState('')
  const [link, setLink] = useState('')
  const [mediaUrl, setMediaUrl] = useState('')
  const [alsoIG, setAlsoIG] = useState(false)
  const [hint, setHint] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const [aiPending, startAI] = useTransition()

  const page = pages.find(p => p.id === pageId)
  const hasIG = !!page?.ig_business_id

  function submit() {
    setMsg(null)
    start(async () => {
      const out = await postToPageAction({
        pageId,
        message,
        link:             link.trim() || undefined,
        mediaUrl:         mediaUrl.trim() || undefined,
        alsoToInstagram:  alsoIG,
      })
      if (out.ok) {
        setMsg(`Live → fb post ${out.fbPostId}${out.igMediaId ? ` · IG ${out.igMediaId}` : ''}`)
        setMessage(''); setLink(''); setMediaUrl(''); setAlsoIG(false); setHint('')
      } else setMsg(`Error: ${out.error}`)
    })
  }

  function generateCaption() {
    setMsg(null)
    startAI(async () => {
      const out = await generateCaptionAction(hint || 'Write a Facebook/Instagram caption that fits the brand voice.')
      if (out.ok) setMessage(out.caption)
      else setMsg(`AI: ${out.error}`)
    })
  }

  return (
    <section className="bg-white border border-portal-border rounded-lg p-5">
      <h3 className="text-sm font-bold text-portal-text mb-3">Post an update</h3>
      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-portal-sub mb-1">Page</label>
            <select value={pageId} onChange={e => setPageId(e.target.value)} className="w-full text-xs px-2 py-1.5 border border-portal-border rounded-md bg-white">
              {pages.map(p => <option key={p.id} value={p.id}>{p.fb_page_name}{p.ig_business_id ? ' (+ IG)' : ''}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            {hasIG && (
              <label className="flex items-center gap-2 text-xs text-portal-text">
                <input type="checkbox" checked={alsoIG} onChange={e => setAlsoIG(e.target.checked)} />
                Also cross-post to Instagram (image required)
              </label>
            )}
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-portal-sub mb-1">Caption hint <span className="text-portal-muted normal-case font-normal">(for AI)</span></label>
          <div className="flex gap-2">
            <input
              type="text"
              value={hint}
              onChange={e => setHint(e.target.value)}
              placeholder='e.g. "New article: Summer Camp Guide is live — promote it"'
              className="flex-1 text-xs px-2 py-1.5 border border-portal-border rounded-md bg-white"
            />
            <button
              onClick={generateCaption}
              disabled={aiPending}
              className="text-xs font-bold text-portal-blue hover:text-portal-blue-dk border border-portal-blue/30 bg-portal-blue-lt px-3 py-1.5 rounded-md disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              <Sparkles size={11} className={aiPending ? 'animate-pulse' : ''} />
              {aiPending ? 'Drafting…' : 'AI draft'}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-portal-sub mb-1">Caption</label>
          <textarea
            rows={5}
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="What's new — write or paste a caption…"
            className="w-full text-xs px-3 py-2 border border-portal-border rounded-md bg-white text-portal-text focus:outline-none focus:border-portal-blue resize-y"
          />
          <div className="text-[10px] text-portal-muted mt-1">{message.length} characters</div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-portal-sub mb-1">Link (optional)</label>
            <input type="url" value={link} onChange={e => setLink(e.target.value)} placeholder="https://..." className="w-full text-xs px-2 py-1.5 border border-portal-border rounded-md bg-white" />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-portal-sub mb-1">Image URL (optional, required for IG)</label>
            <input type="url" value={mediaUrl} onChange={e => setMediaUrl(e.target.value)} placeholder="https://..." className="w-full text-xs px-2 py-1.5 border border-portal-border rounded-md bg-white" />
          </div>
        </div>

        {msg && <p className={`text-[11px] ${msg.startsWith('Error') || msg.startsWith('AI:') ? 'text-red-700' : 'text-portal-green'}`}>{msg}</p>}

        <button
          onClick={submit}
          disabled={pending || message.length < 5 || !pageId}
          className="text-xs font-bold text-white bg-portal-blue hover:bg-portal-blue-dk px-3 py-1.5 rounded-md disabled:opacity-50 inline-flex items-center gap-1.5"
        >
          <Send size={11} /> {pending ? 'Posting…' : 'Post'}
        </button>
      </div>
    </section>
  )
}

function PostHistory({ posts, pages }: { posts: MetaPostRow[]; pages: MetaPageRow[] }) {
  const pageName = (id: string) => pages.find(p => p.id === id)?.fb_page_name ?? '(unknown)'
  return (
    <section className="bg-white border border-portal-border rounded-lg p-5">
      <h3 className="text-sm font-bold text-portal-text mb-3">Recent posts</h3>
      <ul className="space-y-3 text-xs">
        {posts.map(p => (
          <li key={p.id} className="border-l-2 pl-3" style={{ borderColor: p.status === 'live' ? '#10b981' : p.status === 'error' ? '#ef4444' : '#94a3b8' }}>
            <div className="flex items-center gap-2 flex-wrap text-[11px] text-portal-muted">
              <span>{new Date(p.created_at).toLocaleString()}</span>
              <span className="font-bold uppercase tracking-wider" style={{ color: p.status === 'live' ? '#059669' : p.status === 'error' ? '#dc2626' : '#64748b' }}>
                {p.status}
              </span>
              <span>· {pageName(p.page_id)}</span>
              {p.also_to_instagram && <span className="text-[10px]">+ IG</span>}
            </div>
            <p className="text-portal-text mt-0.5 leading-snug whitespace-pre-wrap line-clamp-3">{p.message}</p>
            {p.fb_post_id && (
              <a href={`https://facebook.com/${p.fb_post_id}`} target="_blank" rel="noreferrer" className="text-[11px] text-portal-blue hover:underline inline-flex items-center gap-1 mt-1">
                View on Facebook <ExternalLink size={9} />
              </a>
            )}
            {p.error && <p className="text-red-700 mt-1 break-all">{p.error}</p>}
          </li>
        ))}
      </ul>
    </section>
  )
}

function CommentsInbox({ comments, pages }: { comments: MetaCommentRow[]; pages: MetaPageRow[] }) {
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState<string | null>(null)
  const pageName = (id: string) => pages.find(p => p.id === id)?.fb_page_name ?? '(unknown)'

  function sync() {
    setMsg(null)
    start(async () => {
      const out = await syncCommentsAction()
      setMsg(out.ok ? `Pulled ${out.commentCount} comments.` : `Error: ${out.error}`)
    })
  }

  return (
    <section className="bg-white border border-portal-border rounded-lg p-5">
      <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
        <div>
          <h3 className="text-sm font-bold text-portal-text">Comments inbox</h3>
          <p className="text-[11px] text-portal-muted">Unhandled comments from connected Pages.</p>
        </div>
        <button
          onClick={sync}
          disabled={pending}
          className="text-xs font-bold text-portal-blue hover:text-portal-blue-dk border border-portal-blue/30 bg-portal-blue-lt px-3 py-1.5 rounded-md disabled:opacity-50 inline-flex items-center gap-1.5"
        >
          <RefreshCw size={11} className={pending ? 'animate-spin' : ''} />
          {pending ? 'Syncing…' : 'Sync comments'}
        </button>
        {msg && <span className="text-[11px] text-portal-sub">{msg}</span>}
      </div>
      {comments.length === 0 ? (
        <p className="text-xs text-portal-muted">Nothing in the inbox. Sync to pull recent comments.</p>
      ) : (
        <ul className="space-y-3">
          {comments.map(c => <CommentRow key={c.id} comment={c} pageName={pageName(c.page_id)} />)}
        </ul>
      )}
    </section>
  )
}

function CommentRow({ comment, pageName }: { comment: MetaCommentRow; pageName: string }) {
  const [replyText, setReplyText] = useState('')
  const [showReply, setShowReply] = useState(false)
  const [pending, start] = useTransition()
  const [pendingDis, startDis] = useTransition()
  const [err, setErr] = useState<string | null>(null)

  return (
    <li className="border border-portal-border rounded-md p-3 text-xs">
      <div className="flex items-center gap-2 flex-wrap text-[11px] text-portal-muted">
        <span className="font-bold text-portal-text">{comment.author_name ?? '(anonymous)'}</span>
        <span>· {new Date(comment.created_at_facebook).toLocaleString()}</span>
        <span>· {pageName}</span>
      </div>
      <p className="text-portal-text mt-1 leading-snug whitespace-pre-wrap">{comment.message}</p>

      {!showReply ? (
        <div className="flex gap-3 mt-2">
          <button onClick={() => setShowReply(true)} className="text-[11px] font-bold text-portal-blue hover:text-portal-blue-dk">Reply</button>
          <button
            onClick={() => startDis(async () => { await dismissCommentAction(comment.id) })}
            disabled={pendingDis}
            className="text-[11px] font-bold text-portal-sub hover:text-portal-text inline-flex items-center gap-1"
          >
            <Trash2 size={9} /> {pendingDis ? 'Dismissing…' : 'Dismiss'}
          </button>
        </div>
      ) : (
        <div className="mt-2 space-y-2">
          <textarea
            rows={2}
            value={replyText}
            onChange={e => setReplyText(e.target.value)}
            placeholder="Your reply…"
            className="w-full text-xs px-2 py-1.5 border border-portal-border rounded-md bg-white resize-y"
          />
          {err && <p className="text-[11px] text-red-700">{err}</p>}
          <div className="flex gap-2">
            <button
              onClick={() => {
                setErr(null)
                start(async () => {
                  const out = await replyToCommentAction({ commentLocalId: comment.id, message: replyText })
                  if (!out.ok) setErr(out.error)
                })
              }}
              disabled={pending || replyText.length < 1}
              className="text-xs font-bold text-white bg-portal-blue hover:bg-portal-blue-dk px-3 py-1.5 rounded-md disabled:opacity-50 inline-flex items-center gap-1"
            >
              <Send size={9} /> {pending ? 'Sending…' : 'Send reply'}
            </button>
            <button onClick={() => setShowReply(false)} className="text-xs font-bold text-portal-sub hover:text-portal-text">Cancel</button>
          </div>
        </div>
      )}
    </li>
  )
}
