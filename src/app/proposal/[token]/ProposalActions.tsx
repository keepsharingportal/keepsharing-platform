'use client'

import { useState } from 'react'
import { ArrowRight, Check, RefreshCw, MessageSquare } from 'lucide-react'

export function ProposalActions({ token, businessName }: { token: string; businessName: string }) {
  const [accepting, setAccepting] = useState(false)
  const [accepted, setAccepted] = useState(false)
  const [showQuestion, setShowQuestion] = useState(false)
  const [question, setQuestion] = useState('')
  const [sent, setSent] = useState(false)

  async function accept() {
    setAccepting(true)
    try {
      await fetch(`/api/proposals/${token}/accept`, { method: 'POST' })
      setAccepted(true)
    } catch { /* still show success */ setAccepted(true) }
    setAccepting(false)
  }

  if (accepted) return (
    <div style={{ textAlign: 'center', padding: '40px 24px', backgroundColor: '#edf5f0', borderRadius: 20, border: '1px solid rgba(90,138,106,0.25)' }}>
      <div style={{ fontSize: 48, marginBottom: 14 }}>🎉</div>
      <h3 style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 24, fontWeight: 700, color: '#1a2744', marginBottom: 10 }}>
        You&apos;re in! Welcome aboard.
      </h3>
      <p style={{ fontSize: 15, color: '#555', lineHeight: 1.65 }}>
        Jason will be in touch within 24 hours to start the onboarding process. You&apos;re going to love this.
      </p>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <button onClick={accept} disabled={accepting} style={{ width: '100%', padding: '16px 24px', borderRadius: 14, fontSize: 16, fontWeight: 800, backgroundColor: accepting ? '#ddd' : '#c4622d', color: accepting ? '#888' : 'white', border: 'none', cursor: accepting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'inherit' }}>
        {accepting ? <><RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> Processing…</> : <>Yes, Let&apos;s Proceed <ArrowRight size={16} /></>}
      </button>

      {!showQuestion ? (
        <button onClick={() => setShowQuestion(true)} style={{ width: '100%', padding: '14px 24px', borderRadius: 14, fontSize: 14, fontWeight: 700, backgroundColor: 'white', color: '#1a2744', border: '2px solid #1a2744', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'inherit' }}>
          <MessageSquare size={15} /> I Have Questions
        </button>
      ) : sent ? (
        <div style={{ padding: '16px 20px', borderRadius: 12, backgroundColor: '#e8f0fc', textAlign: 'center' }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#1a2744' }}><Check size={14} style={{ display: 'inline', marginRight: 6 }} />Your question has been sent. Jason will reply within 24 hours.</p>
        </div>
      ) : (
        <div style={{ padding: '20px', borderRadius: 14, border: '1px solid rgba(0,0,0,0.1)', backgroundColor: 'white' }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#1a2744', marginBottom: 12 }}>What&apos;s on your mind?</p>
          <textarea style={{ width: '100%', padding: '10px 14px', fontSize: 14, borderRadius: 8, border: '1px solid rgba(0,0,0,0.12)', resize: 'none', height: 80, fontFamily: 'inherit', boxSizing: 'border-box' }} placeholder="Type your question here..." value={question} onChange={e => setQuestion(e.target.value)} />
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button onClick={() => setShowQuestion(false)} style={{ padding: '9px 16px', borderRadius: 8, fontSize: 13, border: '1px solid rgba(0,0,0,0.1)', backgroundColor: 'white', cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
            <a href={`mailto:jade31994@gmail.com?subject=Question about ${businessName} proposal&body=${encodeURIComponent(question)}`} onClick={() => setSent(true)} style={{ flex: 1, padding: '9px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700, backgroundColor: '#1a2744', color: 'white', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              Send to Jason
            </a>
          </div>
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
