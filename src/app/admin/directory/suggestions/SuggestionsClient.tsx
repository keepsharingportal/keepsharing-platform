'use client'

import { useState, useTransition } from 'react'
import { Sparkles, Check, X, ExternalLink } from 'lucide-react'
import { generateSuggestionDraftAction, acceptSuggestionAction, rejectSuggestionAction } from '../actions'

export interface SuggestionRow {
  id:                    string
  brand_slug:            string
  submitter_name:        string | null
  submitter_email:       string
  notes:                 string
  submitted_data:        Record<string, unknown>
  ai_draft:              null | { name?: string; summary?: string; description?: string; categorySlugs?: string[]; city?: string; state?: string }
  ai_draft_generated_at: string | null
  status:                string
  rejected_reason:       string | null
  resulting_listing_id:  string | null
  submitted_at:          string
}

interface Category { brand_slug: string; slug: string; name: string; emoji: string | null }

export function SuggestionsClient({ suggestions, categories }: { suggestions: SuggestionRow[]; categories: Category[] }) {
  const pending  = suggestions.filter(s => s.status === 'pending')
  const reviewed = suggestions.filter(s => s.status !== 'pending')
  return (
    <div className="space-y-6">
      {pending.length === 0 ? (
        <div className="bg-white border border-portal-border rounded-lg p-8 text-center text-xs text-portal-muted">
          No pending suggestions. The directory submission form at <span className="font-mono">/directory/suggest</span> feeds this queue.
        </div>
      ) : (
        <section>
          <h2 className="text-xs font-bold uppercase tracking-wider text-portal-sub mb-3">Pending review ({pending.length})</h2>
          <ul className="space-y-4">
            {pending.map(s => <SuggestionCard key={s.id} suggestion={s} categories={categories} />)}
          </ul>
        </section>
      )}
      {reviewed.length > 0 && (
        <details>
          <summary className="text-[11px] font-bold text-portal-sub cursor-pointer">Reviewed ({reviewed.length})</summary>
          <ul className="mt-2 space-y-2 text-xs">
            {reviewed.map(s => (
              <li key={s.id} className="border border-portal-border rounded p-3 flex items-center gap-2">
                <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${
                  s.status === 'accepted'  ? 'text-portal-green bg-portal-green-lt border border-portal-green/30' :
                  s.status === 'duplicate' ? 'text-portal-blue bg-portal-blue-lt border border-portal-blue/30' :
                                              'text-portal-muted bg-portal-bg border border-portal-border'
                }`}>{s.status}</span>
                <span className="text-portal-text">{s.submitter_email}</span>
                <span className="text-portal-muted">{(s.submitted_data?.business_name as string) ?? '(no name given)'}</span>
                {s.resulting_listing_id && (
                  <a href={`/admin/directory/${s.resulting_listing_id}`} className="ml-auto text-portal-blue hover:underline inline-flex items-center gap-1">
                    Listing <ExternalLink size={9} />
                  </a>
                )}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}

function SuggestionCard({ suggestion, categories }: { suggestion: SuggestionRow; categories: Category[] }) {
  const submitted = suggestion.submitted_data
  const draft = suggestion.ai_draft
  // Local editable state for the eventual listing — starts from AI draft + submitted hints.
  const [name,        setName]        = useState(draft?.name        ?? (submitted.business_name as string) ?? '')
  const [summary,     setSummary]     = useState(draft?.summary     ?? '')
  const [description, setDescription] = useState(draft?.description ?? suggestion.notes)
  const [city,        setCity]        = useState(draft?.city        ?? (submitted.city as string)    ?? '')
  const [stateAbbrev, setStateAbbrev] = useState(draft?.state       ?? '')
  const [website,     setWebsite]     = useState((submitted.website as string) ?? '')
  const [phone,       setPhone]       = useState((submitted.phone   as string) ?? '')
  const [categorySlugs, setCategorySlugs] = useState<string[]>(draft?.categorySlugs ?? [])
  const [rejectReason,  setRejectReason]  = useState('')
  const [showReject,    setShowReject]    = useState(false)
  const [pending,       start]            = useTransition()
  const [aiPending,     startAI]          = useTransition()
  const [msg,           setMsg]           = useState<string | null>(null)

  const brandCategories = categories.filter(c => c.brand_slug === suggestion.brand_slug)

  function aiDraft() {
    startAI(async () => {
      const out = await generateSuggestionDraftAction({ suggestionId: suggestion.id })
      if (!out.ok) { setMsg(`AI: ${out.error}`); return }
      if (out.draft.name)        setName(out.draft.name)
      if (out.draft.summary)     setSummary(out.draft.summary)
      if (out.draft.description) setDescription(out.draft.description)
      if (out.draft.city)        setCity(out.draft.city)
      if (out.draft.state)       setStateAbbrev(out.draft.state)
      if (out.draft.categorySlugs) setCategorySlugs(out.draft.categorySlugs)
      setMsg('AI draft applied.')
    })
  }

  function accept() {
    start(async () => {
      const out = await acceptSuggestionAction({
        suggestionId: suggestion.id,
        listing: {
          brandSlug:   suggestion.brand_slug,
          kind:        'business',
          name,
          summary,
          description,
          categorySlugs,
          address:     '',
          city,
          state:       stateAbbrev,
          zip:         '',
          phone,
          website,
          email:       '',
          hours:       '',
          heroImageUrl: '',
          isFeatured:  false,
          advertiserAccountId: null,
          status:      'published',
        },
      })
      setMsg(out.ok ? 'Accepted — listing published.' : `Error: ${out.error}`)
    })
  }

  function reject() {
    start(async () => {
      const out = await rejectSuggestionAction(suggestion.id, rejectReason)
      setMsg(out.ok ? 'Rejected.' : `Error: ${out.error}`)
    })
  }

  return (
    <li className="bg-white border border-portal-border rounded-lg p-5 space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-sm font-bold text-portal-text">{suggestion.submitter_name ?? suggestion.submitter_email}</p>
          <p className="text-[11px] text-portal-muted">
            {new Date(suggestion.submitted_at).toLocaleString()} ·{' '}
            <span className="uppercase tracking-wider">{suggestion.brand_slug}</span>
          </p>
        </div>
        <button
          onClick={aiDraft}
          disabled={aiPending}
          className="text-xs font-bold text-portal-blue hover:text-portal-blue-dk border border-portal-blue/30 bg-portal-blue-lt px-2.5 py-1 rounded-md inline-flex items-center gap-1.5"
        >
          <Sparkles size={11} className={aiPending ? 'animate-pulse' : ''} /> {aiPending ? 'Drafting…' : draft ? 'Regenerate AI draft' : 'AI draft'}
        </button>
      </div>

      <div className="bg-portal-bg border border-portal-border rounded p-3 text-xs">
        <p className="text-[10px] font-bold uppercase tracking-wider text-portal-muted">Submitter notes</p>
        <p className="text-portal-text mt-1 whitespace-pre-wrap leading-snug">{suggestion.notes}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div className="sm:col-span-2">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-portal-sub mb-1">Name</label>
          <input value={name} onChange={e => setName(e.target.value)} className="w-full px-2 py-1.5 border border-portal-border rounded bg-white" />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-portal-sub mb-1">Summary</label>
          <input value={summary} onChange={e => setSummary(e.target.value)} className="w-full px-2 py-1.5 border border-portal-border rounded bg-white" />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-portal-sub mb-1">Description</label>
          <textarea rows={6} value={description} onChange={e => setDescription(e.target.value)} className="w-full px-2 py-1.5 border border-portal-border rounded bg-white resize-y font-mono" />
        </div>
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-portal-sub mb-1">City</label>
          <input value={city} onChange={e => setCity(e.target.value)} className="w-full px-2 py-1.5 border border-portal-border rounded bg-white" />
        </div>
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-portal-sub mb-1">State</label>
          <input value={stateAbbrev} onChange={e => setStateAbbrev(e.target.value)} className="w-full px-2 py-1.5 border border-portal-border rounded bg-white" />
        </div>
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-portal-sub mb-1">Website</label>
          <input value={website} onChange={e => setWebsite(e.target.value)} className="w-full px-2 py-1.5 border border-portal-border rounded bg-white" />
        </div>
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-portal-sub mb-1">Phone</label>
          <input value={phone} onChange={e => setPhone(e.target.value)} className="w-full px-2 py-1.5 border border-portal-border rounded bg-white" />
        </div>
      </div>

      <div>
        <label className="block text-[11px] font-bold uppercase tracking-wider text-portal-sub mb-1">Categories</label>
        <div className="flex flex-wrap gap-1.5">
          {brandCategories.length === 0 ? (
            <p className="text-[11px] text-portal-muted">No categories defined for {suggestion.brand_slug}.</p>
          ) : brandCategories.map(c => {
            const on = categorySlugs.includes(c.slug)
            return (
              <button
                key={c.slug}
                type="button"
                onClick={() => setCategorySlugs(p => on ? p.filter(s => s !== c.slug) : [...p, c.slug])}
                className={`text-[11px] font-bold px-2 py-1 rounded-full border ${on ? 'bg-portal-blue text-white border-portal-blue' : 'bg-white text-portal-text border-portal-border hover:border-portal-blue'}`}
              >
                {c.emoji} {c.name}
              </button>
            )
          })}
        </div>
      </div>

      {msg && <p className="text-[11px] text-portal-sub">{msg}</p>}

      <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-portal-border">
        <button
          onClick={accept}
          disabled={pending || !name.trim()}
          className="text-xs font-bold text-white bg-portal-green hover:bg-portal-green-dk px-3 py-1.5 rounded-md disabled:opacity-50 inline-flex items-center gap-1.5"
        >
          <Check size={11} /> {pending ? 'Saving…' : 'Accept → publish listing'}
        </button>
        {!showReject ? (
          <button onClick={() => setShowReject(true)} className="text-xs font-bold text-red-700 hover:text-red-900 inline-flex items-center gap-1">
            <X size={11} /> Reject
          </button>
        ) : (
          <div className="flex items-center gap-2 flex-1">
            <input
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="Reason (logged for context)"
              className="flex-1 text-xs px-2 py-1.5 border border-portal-border rounded bg-white"
            />
            <button onClick={reject} disabled={pending || !rejectReason.trim()} className="text-xs font-bold text-white bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded-md disabled:opacity-50">
              Reject
            </button>
            <button onClick={() => setShowReject(false)} className="text-xs text-portal-sub hover:text-portal-text">Cancel</button>
          </div>
        )}
      </div>
    </li>
  )
}
