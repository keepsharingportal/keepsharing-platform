'use client'

// Inline social caption generator. Renders a 'Draft captions' button
// per high-share item; clicking it opens a panel with 3 channel-tuned
// captions + a hashtag set, each with a copy-to-clipboard button. The
// editor picks the platform they're posting to, copies, posts manually.

import { useState } from 'react'
import { Sparkles, Copy, Check, Loader2, X } from 'lucide-react'

interface Captions {
  instagram: string
  facebook:  string
  twitter:   string
  hashtags:  string[]
}

interface Props {
  publication:  string
  submissionId: string
}

export function AISocialCaption({ publication, submissionId }: Props) {
  const [open,    setOpen]    = useState(false)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [caps,    setCaps]    = useState<Captions | null>(null)
  const [copied,  setCopied]  = useState<string | null>(null)

  async function generate() {
    setOpen(true)
    if (caps) return
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/admin/distribution/ai/social-caption', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ publication, submissionId }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) { setError(j.error ?? 'AI failed.'); return }
      setCaps(j as Captions)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally { setLoading(false) }
  }

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text).catch(() => {})
    setCopied(key)
    setTimeout(() => setCopied(null), 1500)
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={generate}
        className="btn btn-blue btn-xs"
        title="Generate 3 brand-voice captions"
      >
        <Sparkles size={11} /> Draft captions
      </button>
    )
  }

  return (
    <div style={{ width: '100%', marginTop: 8 }}>
      <div
        style={{
          background: 'white',
          border: '1px dashed var(--color-portal-blue)',
          borderRadius: 8,
          padding: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <Sparkles size={12} color="var(--color-portal-blue)" />
          <span className="text-xs fw-700" style={{ color: 'var(--color-portal-blue)' }}>
            {loading ? 'Drafting…' : 'AI captions'}
          </span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="btn btn-ghost btn-xs"
            style={{ marginLeft: 'auto' }}
            title="Close"
          >
            <X size={10} />
          </button>
        </div>

        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: 16, justifyContent: 'center', color: 'var(--color-portal-sub)' }}>
            <Loader2 size={14} className="animate-spin" />
            <span className="text-xs">Asking Claude for brand-voice captions…</span>
          </div>
        )}

        {error && <div className="alert alert-error text-xs">{error}</div>}

        {caps && !loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <CaptionBlock label="Instagram"     value={caps.instagram} copied={copied === 'ig'} onCopy={() => copy(caps.instagram, 'ig')} />
            <CaptionBlock label="Facebook"      value={caps.facebook}  copied={copied === 'fb'} onCopy={() => copy(caps.facebook,  'fb')} />
            <CaptionBlock label="X / Twitter"   value={caps.twitter}   copied={copied === 'tw'} onCopy={() => copy(caps.twitter,   'tw')} />
            {caps.hashtags.length > 0 && (
              <div>
                <div className="text-xs fw-700" style={{ color: 'var(--color-portal-sub)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 4 }}>Hashtags</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                  {caps.hashtags.map(h => (
                    <span key={h} className="badge badge-blue" style={{ textTransform: 'lowercase', letterSpacing: 'normal' }}>#{h.replace(/^#/, '')}</span>
                  ))}
                  <button
                    type="button"
                    onClick={() => copy(caps.hashtags.map(h => '#' + h.replace(/^#/, '')).join(' '), 'tags')}
                    className="btn btn-ghost btn-xs"
                  >
                    {copied === 'tags' ? <><Check size={10} /> Copied</> : <><Copy size={10} /> All</>}
                  </button>
                </div>
              </div>
            )}
            <button
              type="button"
              onClick={() => { setCaps(null); generate() }}
              className="text-xs"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-portal-sub)', padding: 0, textAlign: 'left' }}
            >
              ↻ Regenerate
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function CaptionBlock({ label, value, copied, onCopy }: { label: string; value: string; copied: boolean; onCopy: () => void }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <div className="text-xs fw-700" style={{ color: 'var(--color-portal-sub)', textTransform: 'uppercase', letterSpacing: '.5px' }}>
          {label}
        </div>
        <button type="button" onClick={onCopy} className="btn btn-ghost btn-xs">
          {copied ? <><Check size={10} /> Copied</> : <><Copy size={10} /> Copy</>}
        </button>
      </div>
      <div
        className="text-sm"
        style={{
          background: 'var(--color-portal-bg)',
          padding: '8px 10px',
          borderRadius: 6,
          whiteSpace: 'pre-wrap',
          fontSize: 12.5,
          lineHeight: 1.45,
        }}
      >{value || <span className="text-muted">(empty)</span>}</div>
    </div>
  )
}
