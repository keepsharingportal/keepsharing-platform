'use client'

// The nominee's interview form. Reads per-type questions from the
// submission_type_columns.interview_template config + per-type image
// requirements. Submits the whole thing in one shot to
// /api/interview/[token]/submit which validates, uploads photos to
// Supabase storage, writes interview_responses + interview_image_urls,
// and advances phase to 'interview-received'.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Upload, X, Check } from 'lucide-react'

interface Question {
  key:      string
  label:    string
  prompt?:  string
  type:     'text' | 'longtext' | 'select'
  required: boolean
  options?: string[]
}

interface ImageReqs {
  min_required:       number
  max:                number
  recommended_count?: number
  types?:             string[]
}

interface Props {
  token:         string
  nomineeFirst:  string
  typeLabel:     string
  articleFormat: string
  questions:     Question[]
  imageReqs:     ImageReqs
}

export function InterviewForm({ token, nomineeFirst, typeLabel, questions, imageReqs }: Props) {
  const router = useRouter()
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [files,   setFiles]   = useState<File[]>([])
  const [busy,    setBusy]    = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [progress,setProgress]= useState<string | null>(null)

  function setAnswer(key: string, val: string) {
    setAnswers(prev => ({ ...prev, [key]: val }))
  }

  function addFiles(list: FileList | null) {
    if (!list) return
    const next = [...files, ...Array.from(list)].slice(0, imageReqs.max)
    setFiles(next)
  }

  function removeFile(idx: number) {
    setFiles(prev => prev.filter((_, i) => i !== idx))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    // Client-side validation: required questions answered
    const missing = questions.filter(q => q.required && !(answers[q.key]?.trim()))
    if (missing.length > 0) {
      setError(`Please answer: ${missing.map(q => q.label).join(', ')}`)
      return
    }
    if (files.length < imageReqs.min_required) {
      setError(`Please upload at least ${imageReqs.min_required} photo${imageReqs.min_required === 1 ? '' : 's'}.`)
      return
    }

    setBusy(true)
    setProgress('Uploading photos…')
    try {
      const form = new FormData()
      form.append('answers', JSON.stringify(answers))
      files.forEach((f, i) => form.append(`photo_${i}`, f))

      const res = await fetch(`/api/interview/${token}/submit`, {
        method: 'POST',
        body:   form,
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) { setError(j.error ?? 'Submit failed.'); return }
      // Server returns ok; reload page to show the thank-you state.
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
      setProgress(null)
    }
  }

  return (
    <form onSubmit={submit}>

      {/* Greeting */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 28, fontWeight: 700, color: '#0F2640', marginBottom: 6 }}>
          Hi {nomineeFirst}, ready to share your story?
        </h1>
        <p style={{ color: '#475569', lineHeight: 1.55 }}>
          A few questions for your <strong>{typeLabel}</strong> feature. Answer in your own voice — our editorial team will polish before publication. Takes about 10 minutes.
        </p>
      </div>

      {/* Questions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 32 }}>
        {questions.length === 0 && (
          <div style={inputCard}>
            <div style={{ color: '#94a3b8', fontStyle: 'italic' }}>
              No interview questions configured for this type. Upload photos below.
            </div>
          </div>
        )}
        {questions.map(q => (
          <div key={q.key} style={inputCard}>
            <label style={{ display: 'block', fontWeight: 700, color: '#0F2640', marginBottom: q.prompt ? 4 : 8, fontSize: 15 }}>
              {q.label}
              {q.required && <span style={{ color: '#dc2626', marginLeft: 4 }}>*</span>}
            </label>
            {q.prompt && (
              <div style={{ color: '#64748b', fontSize: 12, marginBottom: 8, fontStyle: 'italic' }}>
                {q.prompt}
              </div>
            )}
            {q.type === 'longtext' ? (
              <textarea
                value={answers[q.key] ?? ''}
                onChange={e => setAnswer(q.key, e.target.value)}
                rows={4}
                style={textareaStyle}
                placeholder="Your answer…"
              />
            ) : q.type === 'select' && q.options ? (
              <select
                value={answers[q.key] ?? ''}
                onChange={e => setAnswer(q.key, e.target.value)}
                style={inputStyle}
              >
                <option value="">— select —</option>
                {q.options.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : (
              <input
                type="text"
                value={answers[q.key] ?? ''}
                onChange={e => setAnswer(q.key, e.target.value)}
                style={inputStyle}
                placeholder="Your answer…"
              />
            )}
          </div>
        ))}
      </div>

      {/* Photos */}
      <div style={inputCard}>
        <div style={{ fontWeight: 700, color: '#0F2640', marginBottom: 6, fontSize: 15 }}>
          Photos
          {imageReqs.min_required > 0 && <span style={{ color: '#dc2626', marginLeft: 4 }}>*</span>}
        </div>
        <div style={{ color: '#64748b', fontSize: 12, marginBottom: 12, lineHeight: 1.5 }}>
          {imageReqs.min_required > 0
            ? `Required: at least ${imageReqs.min_required}. `
            : 'Optional but encouraged. '}
          You can upload up to {imageReqs.max}.
          {imageReqs.types && imageReqs.types.length > 0 && ` We're hoping for: ${imageReqs.types.join(', ')}.`}
          {' '}High-res JPEG/PNG/HEIC up to 15&nbsp;MB each.
        </div>

        {/* Existing previews */}
        {files.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 10, marginBottom: 10 }}>
            {files.map((f, i) => (
              <div key={i} style={{ position: 'relative', aspectRatio: '1', borderRadius: 8, overflow: 'hidden', background: '#f1f5f9' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={URL.createObjectURL(f)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  style={{
                    position: 'absolute', top: 4, right: 4,
                    width: 22, height: 22, borderRadius: '50%',
                    background: 'rgba(0,0,0,0.6)', color: 'white',
                    border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                  title="Remove"
                ><X size={12} /></button>
              </div>
            ))}
          </div>
        )}

        {/* File input */}
        {files.length < imageReqs.max && (
          <label
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: 14, border: '2px dashed #cbd5e1', borderRadius: 8,
              cursor: 'pointer', color: '#475569', fontSize: 13, fontWeight: 600,
            }}
          >
            <Upload size={14} />
            {files.length === 0 ? 'Add photos' : 'Add another'}
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={e => addFiles(e.target.files)}
              style={{ display: 'none' }}
            />
          </label>
        )}
      </div>

      {error && (
        <div style={{ background: '#FEE2E2', color: '#991B1B', padding: 12, borderRadius: 8, marginTop: 20, fontSize: 14 }}>
          {error}
        </div>
      )}

      {/* Submit */}
      <div style={{ marginTop: 28, textAlign: 'center' }}>
        <button
          type="submit"
          disabled={busy}
          style={{
            background: '#0F2640', color: 'white', border: 'none',
            padding: '14px 36px', borderRadius: 10,
            fontSize: 15, fontWeight: 700, cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 8,
            opacity: busy ? 0.7 : 1,
          }}
        >
          {busy
            ? <><Loader2 size={14} className="animate-spin" /> {progress ?? 'Submitting…'}</>
            : <><Check size={14} /> Submit my interview</>}
        </button>
        <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 10 }}>
          Once submitted, our editorial team takes it from here.
        </div>
      </div>
    </form>
  )
}

const inputCard: React.CSSProperties = {
  background: 'white',
  border: '1px solid #e2e8f0',
  borderRadius: 12,
  padding: 18,
  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  border: '1.5px solid #cbd5e1',
  borderRadius: 8,
  fontSize: 15,
  fontFamily: 'inherit',
  outline: 'none',
}

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  resize: 'vertical',
  minHeight: 90,
  lineHeight: 1.5,
}
