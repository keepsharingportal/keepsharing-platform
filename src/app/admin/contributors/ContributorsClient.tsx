'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Plus, Send, Copy, Check, X, Sparkles, FileText, ExternalLink } from 'lucide-react'
import type { ContributorRow, QATemplateRow, InviteRow, ResponseRow } from './page'
import {
  createContributorAction, sendInviteAction, revokeInviteAction,
  publishDraftAction, rejectResponseAction,
} from './actions'
import { MARKETS } from '@/lib/markets'

interface Props {
  contributors:  ContributorRow[]
  templates:     QATemplateRow[]
  invites:       InviteRow[]
  responses:     ResponseRow[]
}

export function ContributorsClient({ contributors, templates, invites, responses }: Props) {
  return (
    <div className="space-y-6">
      <TopActions contributors={contributors} templates={templates} />
      {responses.length > 0 && <ResponsesQueue responses={responses} />}
      {invites.length > 0 && <InvitesTable invites={invites} />}
      {contributors.length > 0 && <ContributorsTable contributors={contributors} />}
    </div>
  )
}

function TopActions({ contributors, templates }: { contributors: ContributorRow[]; templates: QATemplateRow[] }) {
  const [mode, setMode] = useState<'idle' | 'new' | 'invite'>('idle')
  return (
    <section className="bg-white border border-portal-border rounded-lg p-5">
      {mode === 'idle' && (
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => setMode('new')}
            className="text-xs font-bold text-white bg-portal-blue hover:bg-portal-blue-dk px-3 py-1.5 rounded-md inline-flex items-center gap-1.5"
          >
            <Plus size={11} /> Add contributor
          </button>
          {contributors.length > 0 && (
            <button
              onClick={() => setMode('invite')}
              className="text-xs font-bold text-portal-blue hover:text-portal-blue-dk border border-portal-blue/30 bg-portal-blue-lt px-3 py-1.5 rounded-md inline-flex items-center gap-1.5"
            >
              <Send size={11} /> Send invite
            </button>
          )}
        </div>
      )}
      {mode === 'new' && <NewContributorForm onDone={() => setMode('idle')} />}
      {mode === 'invite' && <SendInviteForm contributors={contributors} templates={templates} onDone={() => setMode('idle')} />}
    </section>
  )
}

function NewContributorForm({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [bio, setBio] = useState('')
  const [tagsRaw, setTagsRaw] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [pending, start] = useTransition()
  function submit() {
    setErr(null)
    const tags = tagsRaw.split(',').map(t => t.trim()).filter(Boolean)
    start(async () => {
      const out = await createContributorAction({ name, email, bio, expertiseTags: tags })
      if (!out.ok) setErr(out.error)
      else onDone()
    })
  }
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-bold text-portal-text">Add contributor</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-portal-sub mb-1">Name</label>
          <input value={name} onChange={e => setName(e.target.value)} className="w-full text-xs px-2 py-1.5 border border-portal-border rounded-md bg-white" />
        </div>
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-portal-sub mb-1">Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full text-xs px-2 py-1.5 border border-portal-border rounded-md bg-white" />
        </div>
      </div>
      <div>
        <label className="block text-[11px] font-bold uppercase tracking-wider text-portal-sub mb-1">Bio (optional)</label>
        <textarea rows={2} value={bio} onChange={e => setBio(e.target.value)} className="w-full text-xs px-2 py-1.5 border border-portal-border rounded-md bg-white resize-y" />
      </div>
      <div>
        <label className="block text-[11px] font-bold uppercase tracking-wider text-portal-sub mb-1">Expertise tags (comma-separated)</label>
        <input value={tagsRaw} onChange={e => setTagsRaw(e.target.value)} placeholder="pediatrics, sleep, special-needs" className="w-full text-xs px-2 py-1.5 border border-portal-border rounded-md bg-white" />
      </div>
      {err && <p className="text-[11px] text-red-700">{err}</p>}
      <div className="flex gap-2">
        <button onClick={submit} disabled={pending} className="text-xs font-bold text-white bg-portal-blue hover:bg-portal-blue-dk px-3 py-1.5 rounded-md disabled:opacity-50">
          {pending ? 'Saving…' : 'Save'}
        </button>
        <button onClick={onDone} className="text-xs font-bold text-portal-sub hover:text-portal-text">Cancel</button>
      </div>
    </div>
  )
}

function SendInviteForm({ contributors, templates, onDone }: { contributors: ContributorRow[]; templates: QATemplateRow[]; onDone: () => void }) {
  const [contributorId, setContributorId] = useState(contributors[0]?.id ?? '')
  const [templateSlug, setTemplateSlug] = useState(templates[0]?.slug ?? '')
  const [ask, setAsk] = useState('')
  const [brandSlug, setBrandSlug] = useState('rrp')
  const [targetColumn, setTargetColumn] = useState('')
  const [result, setResult] = useState<{ url: string } | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const [copied, setCopied] = useState(false)

  function submit() {
    setErr(null); setResult(null)
    start(async () => {
      const out = await sendInviteAction({
        contributorId,
        templateSlug:  templateSlug || undefined,
        ask:           ask || undefined,
        brandSlug,
        targetColumn:  targetColumn || undefined,
      })
      if (!out.ok) setErr(out.error)
      else setResult({ url: out.url })
    })
  }

  function copyUrl() {
    if (!result) return
    void navigator.clipboard.writeText(result.url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (result) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-portal-text">Magic link ready</h3>
        <p className="text-[11px] text-portal-sub">Send this to the contributor via email or text. Each link is single-use.</p>
        <div className="flex gap-2">
          <input value={result.url} readOnly className="flex-1 text-xs font-mono px-2 py-1.5 border border-portal-border rounded-md bg-portal-bg" />
          <button onClick={copyUrl} className="text-xs font-bold text-white bg-portal-blue hover:bg-portal-blue-dk px-3 py-1.5 rounded-md inline-flex items-center gap-1">
            {copied ? <Check size={11} /> : <Copy size={11} />} {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
        <button onClick={onDone} className="text-xs font-bold text-portal-sub hover:text-portal-text">Close</button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-bold text-portal-text">Send invite</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-portal-sub mb-1">Contributor</label>
          <select value={contributorId} onChange={e => setContributorId(e.target.value)} className="w-full text-xs px-2 py-1.5 border border-portal-border rounded-md bg-white">
            {contributors.map(c => <option key={c.id} value={c.id}>{c.name} ({c.email})</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-portal-sub mb-1">Q&amp;A template</label>
          <select value={templateSlug} onChange={e => setTemplateSlug(e.target.value)} className="w-full text-xs px-2 py-1.5 border border-portal-border rounded-md bg-white">
            <option value="">— Custom (no questions) —</option>
            {templates.map(t => <option key={t.slug} value={t.slug}>{t.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-portal-sub mb-1">Brand</label>
          <select value={brandSlug} onChange={e => setBrandSlug(e.target.value)} className="w-full text-xs px-2 py-1.5 border border-portal-border rounded-md bg-white">
            {MARKETS.map(m => (
              <option key={m.slug} value={m.slug}>{m.displayName}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-portal-sub mb-1">Target column / section (optional)</label>
          <input value={targetColumn} onChange={e => setTargetColumn(e.target.value)} placeholder="mom-knows-best" className="w-full text-xs px-2 py-1.5 border border-portal-border rounded-md bg-white" />
        </div>
      </div>
      <div>
        <label className="block text-[11px] font-bold uppercase tracking-wider text-portal-sub mb-1">What we&apos;re asking for</label>
        <textarea rows={3} value={ask} onChange={e => setAsk(e.target.value)} placeholder="What's the specific story you'd like them to share? Surface this prominently on the form." className="w-full text-xs px-2 py-1.5 border border-portal-border rounded-md bg-white resize-y" />
      </div>
      {err && <p className="text-[11px] text-red-700">{err}</p>}
      <div className="flex gap-2">
        <button onClick={submit} disabled={pending || !contributorId} className="text-xs font-bold text-white bg-portal-blue hover:bg-portal-blue-dk px-3 py-1.5 rounded-md disabled:opacity-50 inline-flex items-center gap-1.5">
          <Send size={11} /> {pending ? 'Creating…' : 'Create magic link'}
        </button>
        <button onClick={onDone} className="text-xs font-bold text-portal-sub hover:text-portal-text">Cancel</button>
      </div>
    </div>
  )
}

function ResponsesQueue({ responses }: { responses: ResponseRow[] }) {
  const awaiting = responses.filter(r => r.status === 'awaiting_review' || r.status === 'drafted')
  const reviewed = responses.filter(r => r.status === 'published' || r.status === 'rejected')

  return (
    <section className="bg-white border border-portal-border rounded-lg p-5">
      <h3 className="text-sm font-bold text-portal-text mb-3">
        Drafts to review
        {awaiting.length > 0 && <span className="ml-2 text-[10px] font-bold uppercase tracking-wider text-portal-blue bg-portal-blue-lt border border-portal-blue/30 px-1.5 py-0.5 rounded-full">{awaiting.length}</span>}
      </h3>
      {awaiting.length === 0 ? (
        <p className="text-xs text-portal-muted">No drafts awaiting review.</p>
      ) : (
        <ul className="space-y-4">
          {awaiting.map(r => <ResponseCard key={r.id} response={r} />)}
        </ul>
      )}
      {reviewed.length > 0 && (
        <details className="mt-4">
          <summary className="text-[11px] font-bold text-portal-sub cursor-pointer">Reviewed ({reviewed.length})</summary>
          <ul className="mt-2 space-y-2 text-xs">
            {reviewed.map(r => {
              const contributor = Array.isArray(r.contributors) ? r.contributors[0] : r.contributors
              return (
                <li key={r.id} className="border-l-2 border-portal-border pl-3">
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${r.status === 'published' ? 'text-portal-green' : 'text-red-700'}`}>{r.status}</span>
                  <span className="text-portal-text ml-2">{contributor?.name ?? '—'}</span>
                  {r.published_article_id && (
                    <Link href={`/admin/articles/${r.published_article_id}/edit`} className="text-portal-blue hover:underline ml-2 inline-flex items-center gap-1">
                      View article <ExternalLink size={9} />
                    </Link>
                  )}
                </li>
              )
            })}
          </ul>
        </details>
      )}
    </section>
  )
}

function ResponseCard({ response }: { response: ResponseRow }) {
  const contributor = Array.isArray(response.contributors) ? response.contributors[0] : response.contributors
  const invite = Array.isArray(response.contributor_invites) ? response.contributor_invites[0] : response.contributor_invites
  const draft = response.ai_draft
  const draftError = draft?.error
  const ready = !!draft && !draftError

  const [editing, setEditing] = useState(false)
  const [headline, setHeadline] = useState(draft?.headline ?? '')
  const [deck, setDeck] = useState(draft?.deck ?? '')
  const [body, setBody] = useState(draft?.body ?? '')
  const [reason, setReason] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [pending, start] = useTransition()

  function publish() {
    setErr(null)
    start(async () => {
      const out = await publishDraftAction({
        responseId:    response.id,
        headline,
        deck,
        body,
        brandSlug:     invite?.brand_slug ?? 'rrp',
        targetColumn:  invite?.target_column ?? null,
        tags:          draft?.tagSuggestions ?? [],
        pullQuote:     draft?.pullQuote ?? undefined,
      })
      if (!out.ok) setErr(out.error)
    })
  }

  function reject() {
    setErr(null)
    if (!reason.trim()) { setErr('Reason required.'); return }
    start(async () => {
      const out = await rejectResponseAction(response.id, reason)
      if (!out.ok) setErr(out.error)
    })
  }

  return (
    <li className="border border-portal-border rounded-md p-4">
      <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
        <div>
          <span className="text-sm font-bold text-portal-text">{contributor?.name ?? '(unknown)'}</span>
          <span className="text-[11px] text-portal-muted ml-2">{new Date(response.submitted_at).toLocaleString()}</span>
          {invite?.target_column && <span className="text-[10px] font-bold uppercase tracking-wider text-portal-sub bg-portal-bg border border-portal-border px-1.5 py-0.5 rounded-full ml-2">{invite.target_column}</span>}
        </div>
        {ready ? (
          <span className="text-[10px] font-bold uppercase tracking-wider text-portal-green bg-portal-green-lt border border-portal-green/30 px-1.5 py-0.5 rounded-full inline-flex items-center gap-1">
            <Sparkles size={9} /> Draft ready
          </span>
        ) : draftError ? (
          <span className="text-[10px] font-bold uppercase tracking-wider text-red-700 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-full">Draft failed</span>
        ) : (
          <span className="text-[10px] font-bold uppercase tracking-wider text-portal-amber bg-portal-amber-lt border border-portal-amber/30 px-1.5 py-0.5 rounded-full">Drafting…</span>
        )}
      </div>

      {invite?.ask && (
        <div className="bg-portal-bg border border-portal-border rounded p-2 text-xs text-portal-sub mb-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-portal-muted">Editorial ask</span>
          <p className="mt-0.5">{invite.ask}</p>
        </div>
      )}

      {draftError && <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded p-2">AI draft failed: {draftError}</p>}

      {ready && draft && (
        <div className="space-y-3">
          {!editing ? (
            <>
              <h4 className="text-base font-bold text-portal-text leading-tight">{draft.headline}</h4>
              {(draft.alternates ?? []).length > 0 && (
                <div className="text-[11px] text-portal-muted">
                  <span className="font-bold">Alternate headlines:</span> {draft.alternates!.join(' · ')}
                </div>
              )}
              <p className="text-sm text-portal-sub italic">{draft.deck}</p>
              <div className="text-xs text-portal-text whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto bg-portal-bg border border-portal-border rounded p-3">
                {draft.body}
              </div>
              {draft.pullQuote && (
                <blockquote className="border-l-4 border-portal-blue pl-3 italic text-xs text-portal-sub">&ldquo;{draft.pullQuote}&rdquo;</blockquote>
              )}
              {(draft.tagSuggestions ?? []).length > 0 && (
                <div className="text-[11px] text-portal-muted">
                  <span className="font-bold">Tags:</span> {draft.tagSuggestions!.join(', ')}
                </div>
              )}
              {draft.reviewerNotes && (
                <p className="text-[11px] text-portal-amber bg-portal-amber-lt border border-portal-amber/30 rounded p-2">
                  <span className="font-bold">Reviewer notes:</span> {draft.reviewerNotes}
                </p>
              )}
            </>
          ) : (
            <>
              <input value={headline} onChange={e => setHeadline(e.target.value)} className="w-full text-base font-bold px-2 py-1.5 border border-portal-border rounded-md bg-white" />
              <input value={deck} onChange={e => setDeck(e.target.value)} className="w-full text-sm italic px-2 py-1.5 border border-portal-border rounded-md bg-white" />
              <textarea rows={10} value={body} onChange={e => setBody(e.target.value)} className="w-full text-xs px-2 py-1.5 border border-portal-border rounded-md bg-white font-mono resize-y" />
            </>
          )}

          <details className="text-xs">
            <summary className="text-[11px] font-bold text-portal-sub cursor-pointer">Original responses</summary>
            <div className="mt-2 space-y-2 bg-portal-bg border border-portal-border rounded p-3">
              {Object.entries(response.responses).map(([k, v]) => {
                const q = invite?.questions?.find(qq => qq.key === k)
                return (
                  <div key={k}>
                    <p className="text-[10px] uppercase tracking-wider text-portal-muted font-bold">{q?.label ?? k}</p>
                    <p className="text-portal-text mt-0.5 whitespace-pre-wrap">{v}</p>
                  </div>
                )
              })}
            </div>
          </details>

          {err && <p className="text-[11px] text-red-700">{err}</p>}

          <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-portal-border">
            <button onClick={() => setEditing(e => !e)} className="text-xs font-bold text-portal-sub hover:text-portal-text border border-portal-border bg-white px-3 py-1.5 rounded-md">
              {editing ? 'Cancel edit' : 'Edit draft'}
            </button>
            <button onClick={publish} disabled={pending} className="text-xs font-bold text-white bg-portal-green hover:bg-portal-green-dk px-3 py-1.5 rounded-md disabled:opacity-50 inline-flex items-center gap-1.5">
              <FileText size={11} /> {pending ? 'Publishing…' : 'Publish to article queue'}
            </button>
            <div className="flex items-center gap-1 ml-auto">
              <input value={reason} onChange={e => setReason(e.target.value)} placeholder="Reason to reject…" className="text-xs px-2 py-1.5 border border-portal-border rounded-md bg-white w-48" />
              <button onClick={reject} disabled={pending} className="text-xs font-bold text-red-700 hover:text-red-900 inline-flex items-center gap-1">
                <X size={11} /> Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </li>
  )
}

function InvitesTable({ invites }: { invites: InviteRow[] }) {
  return (
    <section className="bg-white border border-portal-border rounded-lg p-5">
      <h3 className="text-sm font-bold text-portal-text mb-3">Recent invites</h3>
      <table className="w-full text-xs">
        <thead>
          <tr className="text-[10px] uppercase tracking-wider text-portal-muted text-left">
            <th className="pb-2">Contributor</th>
            <th className="pb-2">Sent</th>
            <th className="pb-2">Brand</th>
            <th className="pb-2">Status</th>
            <th className="pb-2 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-portal-border">
          {invites.map(i => {
            const contributor = Array.isArray(i.contributors) ? i.contributors[0] : i.contributors
            return (
              <tr key={i.id}>
                <td className="py-1.5 text-portal-text">{contributor?.name ?? '—'}</td>
                <td className="py-1.5 text-portal-sub">{new Date(i.sent_at).toLocaleDateString()}</td>
                <td className="py-1.5 text-portal-sub uppercase tracking-wider text-[10px]">{i.brand_slug}</td>
                <td className="py-1.5">
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${
                    i.status === 'completed' ? 'text-portal-green' :
                    i.status === 'pending'   ? 'text-portal-amber' :
                                                'text-portal-muted'
                  }`}>{i.status}</span>
                </td>
                <td className="py-1.5 text-right">
                  {i.status === 'pending' && <RevokeButton inviteId={i.id} />}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </section>
  )
}

function RevokeButton({ inviteId }: { inviteId: string }) {
  const [pending, start] = useTransition()
  return (
    <button
      onClick={() => start(async () => { await revokeInviteAction(inviteId) })}
      disabled={pending}
      className="text-[11px] text-red-700 hover:text-red-900"
    >
      {pending ? '…' : 'Revoke'}
    </button>
  )
}

function ContributorsTable({ contributors }: { contributors: ContributorRow[] }) {
  return (
    <section className="bg-white border border-portal-border rounded-lg p-5">
      <h3 className="text-sm font-bold text-portal-text mb-3">Roster</h3>
      <table className="w-full text-xs">
        <thead>
          <tr className="text-[10px] uppercase tracking-wider text-portal-muted text-left">
            <th className="pb-2">Name</th>
            <th className="pb-2">Email</th>
            <th className="pb-2">Expertise</th>
            <th className="pb-2 text-right">Completed</th>
            <th className="pb-2">Last contributed</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-portal-border">
          {contributors.map(c => (
            <tr key={c.id}>
              <td className="py-1.5 text-portal-text font-bold">{c.name}</td>
              <td className="py-1.5 text-portal-sub">{c.email}</td>
              <td className="py-1.5 text-portal-sub">{c.expertise_tags.join(', ') || '—'}</td>
              <td className="py-1.5 text-right text-portal-text">{c.invites_completed}</td>
              <td className="py-1.5 text-portal-muted">{c.last_contributed_at ? new Date(c.last_contributed_at).toLocaleDateString() : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
