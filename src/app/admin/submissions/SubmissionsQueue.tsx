'use client'

import { useState } from 'react'
import { Star, Check, X, ChevronDown, ChevronUp, Filter } from 'lucide-react'

interface Submission {
  id: string
  submitter_first_name?: string | null
  submitter_neighborhood?: string | null
  submitter_email?: string | null
  source?: string | null
  source_listing_id?: string | null
  source_article_slug?: string | null
  submission_responses?: Array<{ question: string; answer: string }> | null
  ai_score?: number | null
  ai_extracted_quote?: string | null
  ai_suggested_topic_tags?: string[] | null
  ai_suggested_article_attachment?: string | null
  review_status: string
  created_at: string
}

function ScoreStars({ score }: { score: number | null | undefined }) {
  if (!score) return <span style={{ fontSize: 11, color: '#aaa' }}>Unscored</span>
  const color = score >= 4 ? '#5a8a6a' : score >= 3 ? '#d4a843' : '#c4622d'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
      {[1, 2, 3, 4, 5].map(s => (
        <Star key={s} size={12} fill={s <= Math.round(score) ? color : 'transparent'} color={color} />
      ))}
      <span style={{ fontSize: 11, color, fontWeight: 700, marginLeft: 2 }}>{score.toFixed(1)}</span>
    </div>
  )
}

function SubmissionCard({ sub, onAction }: { sub: Submission; onAction: (id: string, action: 'approved' | 'declined') => void }) {
  const [expanded, setExpanded] = useState(false)
  const [acting, setActing] = useState(false)

  async function act(action: 'approved' | 'declined') {
    setActing(true)
    try {
      await fetch('/api/admin/submissions/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionId: sub.id, action }),
      })
      onAction(sub.id, action)
    } catch { /* non-critical */ }
    setActing(false)
  }

  const statusColor = sub.review_status === 'approved' ? '#5a8a6a' : sub.review_status === 'declined' ? '#c4622d' : '#888'

  return (
    <div style={{ backgroundColor: 'white', borderRadius: 14, border: '1px solid rgba(0,0,0,0.08)', overflow: 'hidden', marginBottom: 12 }}>
      {/* Card header */}
      <div style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }} onClick={() => setExpanded(e => !e)}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', backgroundColor: '#e8f0fc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-fraunces, serif)', fontSize: 16, fontWeight: 700, color: '#1a2744', flexShrink: 0 }}>
          {sub.submitter_first_name?.[0] ?? '?'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#1a2744' }}>
              {sub.submitter_first_name ?? 'Anonymous'} · {sub.submitter_neighborhood ?? 'Unknown area'}
            </p>
            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, backgroundColor: statusColor + '18', color: statusColor, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {sub.review_status}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <ScoreStars score={sub.ai_score} />
            <span style={{ fontSize: 11, color: '#888' }}>{sub.source ?? 'survey'}</span>
            <span style={{ fontSize: 11, color: '#ccc' }}>{new Date(sub.created_at).toLocaleDateString()}</span>
          </div>
        </div>
        {expanded ? <ChevronUp size={16} color="#888" /> : <ChevronDown size={16} color="#888" />}
      </div>

      {/* AI quote preview */}
      {sub.ai_extracted_quote && (
        <div style={{ padding: '0 18px 14px', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
          <p style={{ fontSize: 13, fontStyle: 'italic', color: '#1a2744', lineHeight: 1.55, borderLeft: '3px solid #c4622d', paddingLeft: 10, marginTop: 12 }}>
            &ldquo;{sub.ai_extracted_quote}&rdquo;
          </p>
        </div>
      )}

      {/* Expanded: full responses + actions */}
      {expanded && (
        <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)', padding: '18px 18px 16px' }}>
          {/* Full responses */}
          {(sub.submission_responses ?? []).map((r, i) => (
            <div key={i} style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#c4622d', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>Response {i + 1}</p>
              <p style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>{r.question}</p>
              <p style={{ fontSize: 14, color: '#333', lineHeight: 1.65 }}>{r.answer}</p>
            </div>
          ))}

          {/* AI metadata */}
          {sub.ai_suggested_topic_tags && sub.ai_suggested_topic_tags.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#888', marginBottom: 6 }}>AI SUGGESTED TAGS</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {sub.ai_suggested_topic_tags.map(tag => (
                  <span key={tag} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, backgroundColor: '#e8f0fc', color: '#1a2744', fontWeight: 600 }}>{tag}</span>
                ))}
              </div>
            </div>
          )}
          {sub.ai_suggested_article_attachment && (
            <p style={{ fontSize: 12, color: '#888', marginBottom: 14 }}>AI suggested article: <strong style={{ color: '#1a2744' }}>{sub.ai_suggested_article_attachment}</strong></p>
          )}

          {/* Action buttons */}
          {sub.review_status === 'pending' && (
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button onClick={() => act('approved')} disabled={acting} style={{ flex: 1, padding: '9px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700, backgroundColor: '#5a8a6a', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                <Check size={13} /> Approve
              </button>
              <button onClick={() => act('declined')} disabled={acting} style={{ padding: '9px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700, backgroundColor: 'white', color: '#c4622d', border: '1px solid #c4622d', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                <X size={13} /> Decline
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function SubmissionsQueue({ initialSubmissions }: { initialSubmissions: Submission[] }) {
  const [submissions, setSubmissions] = useState(initialSubmissions)
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'declined'>('pending')
  const [minScore, setMinScore] = useState<number | null>(null)

  function handleAction(id: string, action: 'approved' | 'declined') {
    setSubmissions(s => s.map(sub => sub.id === id ? {...sub, review_status: action} : sub))
  }

  const filtered = submissions.filter(s => {
    if (filter !== 'all' && s.review_status !== filter) return false
    if (minScore !== null && (s.ai_score ?? 0) < minScore) return false
    return true
  })

  const pending = submissions.filter(s => s.review_status === 'pending').length

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#faf8f5', fontFamily: 'var(--font-dm-sans, sans-serif)' }}>
      <div style={{ backgroundColor: '#1a2744', padding: '16px 24px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: 3 }}>Admin</p>
            <p style={{ fontSize: 16, fontWeight: 700, color: 'white' }}>Mom Insiders Submissions</p>
          </div>
          {pending > 0 && (
            <span style={{ fontSize: 13, fontWeight: 700, padding: '5px 12px', borderRadius: 20, backgroundColor: '#c4622d', color: 'white' }}>
              {pending} pending
            </span>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px 20px' }}>
        {/* Filters */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
          <Filter size={14} color="#888" />
          {(['all', 'pending', 'approved', 'declined'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{ padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', backgroundColor: filter === f ? '#1a2744' : 'white', color: filter === f ? 'white' : '#666', border: filter === f ? 'none' : '1px solid rgba(0,0,0,0.1)' } as React.CSSProperties}>
              {f.charAt(0).toUpperCase() + f.slice(1)} {f === 'pending' ? `(${pending})` : ''}
            </button>
          ))}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginLeft: 8 }}>
            <span style={{ fontSize: 11, color: '#888' }}>Min score:</span>
            {[null, 3, 4].map(s => (
              <button key={String(s)} onClick={() => setMinScore(s)} style={{ padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer', backgroundColor: minScore === s ? '#c4622d' : 'white', color: minScore === s ? 'white' : '#666', border: minScore === s ? 'none' : '1px solid rgba(0,0,0,0.1)' } as React.CSSProperties}>
                {s === null ? 'All' : `${s}+`}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 24px', color: '#888' }}>
            <p style={{ fontSize: 16, fontWeight: 600 }}>No submissions match this filter.</p>
          </div>
        ) : (
          filtered.map(sub => (
            <SubmissionCard key={sub.id} sub={sub} onAction={handleAction} />
          ))
        )}
      </div>
    </div>
  )
}
