// ── /submit ───────────────────────────────────────────────────────────────────
// Community participation gateway. Grouped submission cards organized by purpose.
// Warm, friendly, trust-forward — not a corporate form directory.

import type { Metadata } from 'next'
import Link from 'next/link'
import { GATEWAY_GROUPS, SUBMISSION_TYPES, TYPE_COLORS } from '@/lib/submissions'

export const metadata: Metadata = {
  title: 'Submit — River Region Parents',
  description: 'Nominate a teacher, share school news, celebrate a birthday, submit an event, or be featured in River Region Parents. Easy community participation.',
}

const N    = '#1a2744'
const T    = '#c4622d'
const C    = '#fdf8f3'
const W    = '#ffffff'

const serif = 'var(--font-fraunces, serif)'
const sans  = 'var(--font-dm-sans, sans-serif)'

export default function SubmitPage() {
  return (
    <div style={{ backgroundColor: C, color: '#3a2c1e', fontFamily: sans }}>

      {/* ── HERO ────────────────────────────────────────────────────────── */}
      <section style={{ backgroundColor: N, padding: '72px 24px 64px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(ellipse at 72% 30%, rgba(196,98,45,0.14) 0%, transparent 50%)', pointerEvents: 'none' }} />
        <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center', position: 'relative' }}>
          <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)', marginBottom: 16 }}>
            Community Participation
          </p>
          <h1 style={{ fontFamily: serif, fontSize: 'clamp(28px, 5vw, 52px)', fontWeight: 900, color: '#fff', lineHeight: 1.08, letterSpacing: '-0.02em', marginBottom: 18 }}>
            Share Your Story With<br />
            <span style={{ color: '#f0a070', fontStyle: 'italic' }}>River Region Families.</span>
          </h1>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.65)', lineHeight: 1.8, maxWidth: 520, margin: '0 auto' }}>
            Nominate a teacher. Celebrate a birthday. Share school news. Tell us about a local business you love. Our editorial team reads every submission.
          </p>
        </div>
      </section>

      {/* ── SUBMISSION GROUPS ────────────────────────────────────────────── */}
      <section style={{ padding: '72px 24px 80px' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>

          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: T, marginBottom: 12 }}>What Would You Like to Submit?</p>
            <p style={{ fontSize: 16, color: '#888', lineHeight: 1.7 }}>Choose the type of submission that fits what you want to share.</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 48 }}>
            {GATEWAY_GROUPS.map(group => {
              const typesInGroup = SUBMISSION_TYPES.filter(t => t.groupSlug === group.slug)
              if (typesInGroup.length === 0) return null
              return (
                <div key={group.slug}>
                  {/* Group header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, paddingBottom: 14, borderBottom: '1.5px solid rgba(0,0,0,0.07)' }}>
                    <span style={{ fontSize: 24 }}>{group.emoji}</span>
                    <div>
                      <h2 style={{ fontFamily: serif, fontSize: 20, fontWeight: 900, color: N, margin: '0 0 3px' }}>{group.label}</h2>
                      <p style={{ fontSize: 13, color: '#888' }}>{group.description}</p>
                    </div>
                  </div>

                  {/* Type cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                    {typesInGroup.map(sub => {
                      const accentColor = TYPE_COLORS[sub.type] ?? T
                      const href = sub.externalUrl ?? `/submit/${sub.type}`
                      return (
                        <div key={sub.type} style={{ backgroundColor: W, border: '1px solid rgba(0,0,0,0.07)', borderTop: `4px solid ${accentColor}`, borderRadius: 16, padding: '22px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                              <span style={{ fontSize: 22 }}>{sub.emoji}</span>
                              <h3 style={{ fontFamily: serif, fontSize: 16, fontWeight: 800, color: N, margin: 0 }}>{sub.label}</h3>
                            </div>
                            <p style={{ fontSize: 13, color: '#555', lineHeight: 1.7, marginBottom: 10 }}>{sub.description}</p>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                            <div style={{ display: 'flex', gap: 8 }}>
                              <span style={{ fontSize: 11, color: '#aaa', flexShrink: 0 }}>Who:</span>
                              <span style={{ fontSize: 11, color: '#555' }}>{sub.whoShouldUse}</span>
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                              <span style={{ fontSize: 11, color: '#aaa', flexShrink: 0 }}>Next:</span>
                              <span style={{ fontSize: 11, color: '#555', lineHeight: 1.5 }}>{sub.whatHappensNext}</span>
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                              <span style={{ fontSize: 11, color: '#aaa', flexShrink: 0 }}>Time:</span>
                              <span style={{ fontSize: 11, color: '#555' }}>About {sub.estimatedTime}</span>
                            </div>
                          </div>

                          <Link
                            href={href}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, backgroundColor: accentColor, color: '#fff', padding: '10px 20px', borderRadius: 100, fontSize: 13, fontWeight: 700, textDecoration: 'none', alignSelf: 'flex-start', marginTop: 'auto' }}
                          >
                            {sub.externalUrl ? 'Go to nominations →' : 'Begin →'}
                          </Link>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── TRUST FOOTER ─────────────────────────────────────────────────── */}
      <section style={{ backgroundColor: W, padding: '48px 24px', borderTop: '1px solid rgba(0,0,0,0.07)' }}>
        <div style={{ maxWidth: 680, margin: '0 auto', textAlign: 'center' }}>
          <p style={{ fontFamily: serif, fontSize: 18, fontWeight: 700, color: N, fontStyle: 'italic', marginBottom: 14 }}>
            Every submission is read by our editorial team.
          </p>
          <p style={{ fontSize: 14, color: '#888', lineHeight: 1.8, marginBottom: 24 }}>
            We are a small, local editorial team — not a bot. When you submit something, a real person reads it. We may not feature everything, but we appreciate every submission from the River Region community.
          </p>
          <p style={{ fontSize: 13, color: '#bbb' }}>
            Questions? Email <a href="mailto:hello@riverregionparents.com" style={{ color: T, textDecoration: 'none', fontWeight: 600 }}>hello@riverregionparents.com</a>
          </p>
        </div>
      </section>

    </div>
  )
}
