'use client'

import { useState } from 'react'
import { Check, RefreshCw, MessageSquare } from 'lucide-react'

interface Props {
  contextQuestion: string
  contextPlaceholder: string
  source: 'inline-widget'
  sourceListing?: string
  sourceArticle?: string
}

export function InlineSubmissionWidget({ contextQuestion, contextPlaceholder, source, sourceListing, sourceArticle }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [form, setForm] = useState({ answer: '', first_name: '', neighborhood: '', email: '' })
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  const inp = { width: '100%', padding: '10px 14px', fontSize: 13, borderRadius: 8, border: '1px solid rgba(0,0,0,0.1)', outline: 'none', backgroundColor: 'white', fontFamily: 'inherit', boxSizing: 'border-box' as const }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.answer.trim() || !form.first_name || !form.email) return
    setSubmitting(true)
    try {
      await fetch('/api/submissions/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name:          form.first_name,
          neighborhood:        form.neighborhood,
          email:               form.email,
          source:              source,
          source_listing_id:   sourceListing ?? undefined,
          source_article_slug: sourceArticle ?? undefined,
          publish_permission:  'yes',
          responses:           [{ question_id: 'inline', question: contextQuestion, answer: form.answer }],
        }),
      })
      setDone(true)
    } catch { /* show success regardless */ setDone(true) }
    setSubmitting(false)
  }

  if (done) return (
    <div style={{ padding: '20px 0', display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 36, height: 36, borderRadius: '50%', backgroundColor: '#edf5f0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Check size={18} color="#5a8a6a" strokeWidth={2.5} />
      </div>
      <div>
        <p style={{ fontSize: 14, fontWeight: 700, color: '#1a2744', marginBottom: 2 }}>Thanks, {form.first_name}!</p>
        <p style={{ fontSize: 12, color: '#666' }}>Your pick has been noted. We may feature it in the magazine.</p>
      </div>
    </div>
  )

  if (!expanded) return (
    <div style={{ marginTop: 32, padding: '18px 20px', borderRadius: 14, border: '1px dashed rgba(196,98,45,0.25)', backgroundColor: 'rgba(196,98,45,0.04)', cursor: 'pointer' }} onClick={() => setExpanded(true)}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <MessageSquare size={18} color="#c4622d" />
        <p style={{ fontSize: 14, fontWeight: 600, color: '#c4622d', flex: 1 }}>
          {contextQuestion}
        </p>
        <span style={{ fontSize: 12, color: '#c4622d', fontWeight: 700, flexShrink: 0 }}>Share →</span>
      </div>
    </div>
  )

  return (
    <div style={{ marginTop: 32, padding: '22px 20px', borderRadius: 14, border: '1px solid rgba(196,98,45,0.2)', backgroundColor: 'rgba(196,98,45,0.04)' }}>
      <p style={{ fontSize: 14, fontWeight: 700, color: '#1a2744', marginBottom: 14, lineHeight: 1.45 }}>{contextQuestion}</p>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <textarea
          style={{...inp, resize: 'none', height: 80}}
          required
          placeholder={contextPlaceholder}
          maxLength={280}
          value={form.answer}
          onChange={e => setForm(f => ({...f, answer: e.target.value}))}
        />
        <div className="grid grid-cols-2 gap-2">
          <input style={inp} required placeholder="First name *" value={form.first_name} onChange={e => setForm(f => ({...f, first_name: e.target.value}))} />
          <input style={inp} placeholder="Neighborhood" value={form.neighborhood} onChange={e => setForm(f => ({...f, neighborhood: e.target.value}))} />
        </div>
        <input type="email" style={inp} required placeholder="Email * (for feature notifications only)" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} />
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" onClick={() => setExpanded(false)} style={{ padding: '9px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, border: '1px solid rgba(0,0,0,0.12)', backgroundColor: 'white', color: '#666', cursor: 'pointer' }}>
            Cancel
          </button>
          <button type="submit" disabled={submitting} style={{ flex: 1, padding: '9px 16px', borderRadius: 8, fontSize: 13, fontWeight: 800, backgroundColor: '#c4622d', color: 'white', border: 'none', cursor: submitting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            {submitting ? <><RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} /> Sharing…</> : 'Share my pick →'}
          </button>
        </div>
        <p style={{ fontSize: 10, color: '#aaa', textAlign: 'center' }}>May be published in River Region Parents magazine.</p>
      </form>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
