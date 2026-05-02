'use client'

const STEPS = [
  {
    num: '01',
    icon: '📰',
    label: 'Reach',
    headline: '15,000+ families',
    detail: 'Magazine, website, email, social — every month',
    color: 'var(--fg-navy)',
    lightColor: '#e8f0fc',
  },
  {
    num: '02',
    icon: '🔍',
    label: 'Discover',
    headline: 'They find you',
    detail: 'Family Guide listing or your dedicated Partner Page',
    color: 'var(--fg-sky)',
    lightColor: 'var(--fg-sky-light)',
  },
  {
    num: '03',
    icon: '✉️',
    label: 'Request',
    headline: 'Form submitted',
    detail: 'Consult booking, giveaway entry, or free resource',
    color: 'var(--fg-sage)',
    lightColor: 'var(--fg-sage-light)',
  },
  {
    num: '04',
    icon: '📱',
    label: 'Speed-to-Lead',
    headline: 'SMS in 60 seconds',
    detail: 'Lead gets a text from River Region Parents immediately',
    color: 'var(--fg-terra)',
    lightColor: 'var(--fg-terra-light)',
  },
  {
    num: '05',
    icon: '🔔',
    label: 'You\'re Notified',
    headline: 'Instant email to you',
    detail: 'Full lead info, what they want, and how to follow up',
    color: 'var(--fg-gold)',
    lightColor: 'var(--fg-gold-light)',
  },
  {
    num: '06',
    icon: '🌱',
    label: 'Nurture',
    headline: '14-day sequence',
    detail: 'Automated follow-ups keep your name top of mind',
    color: 'var(--fg-sage)',
    lightColor: 'var(--fg-sage-light)',
  },
]

function Arrow() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0, paddingBottom: 24 }}>
      <svg width="28" height="16" viewBox="0 0 28 16" fill="none">
        <path d="M0 8 H22" stroke="rgba(26,39,68,0.2)" strokeWidth="1.5" strokeDasharray="3 3" />
        <path d="M18 3 L24 8 L18 13" stroke="rgba(26,39,68,0.3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
    </div>
  )
}

export function CustomerAcquisitionSystemGraphic() {
  return (
    <div style={{ padding: '0 0 8px' }}>
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.13em', textTransform: 'uppercase', color: 'var(--fg-terra)', marginBottom: 10 }}>
          The KeepSharing Customer Acquisition System
        </p>
        <h2 style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 'clamp(24px, 4vw, 38px)', fontWeight: 700, color: 'var(--fg-navy)', lineHeight: 1.15, marginBottom: 10 }}>
          How We Turn RRP Readers Into{' '}
          <span style={{ color: 'var(--fg-terra)', fontStyle: 'italic' }}>Your Customers</span>
        </h2>
        <p style={{ fontSize: 14, color: 'var(--fg-mid)', maxWidth: 520, margin: '0 auto' }}>
          Every partner tier plugs into the same system. The more tiers you unlock, the more touch points you own.
        </p>
      </div>

      {/* Desktop: horizontal scroll */}
      <div className="hidden md:flex" style={{ alignItems: 'flex-start', gap: 0, overflowX: 'auto', paddingBottom: 8 }}>
        {STEPS.map((step, i) => (
          <div key={step.num} style={{ display: 'flex', alignItems: 'flex-start', gap: 0 }}>
            <div style={{
              backgroundColor: 'white',
              borderRadius: 16,
              padding: '22px 18px',
              border: '1px solid rgba(0,0,0,0.07)',
              boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
              width: 150,
              flexShrink: 0,
              position: 'relative',
            }}>
              {/* Step number */}
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', color: step.color, marginBottom: 10, opacity: 0.7 }}>
                STEP {step.num}
              </div>
              {/* Icon circle */}
              <div style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: step.lightColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, marginBottom: 12 }}>
                {step.icon}
              </div>
              {/* Label pill */}
              <div style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 20, backgroundColor: step.lightColor, fontSize: 10, fontWeight: 700, color: step.color, marginBottom: 8 }}>
                {step.label}
              </div>
              {/* Headline */}
              <p style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 14, fontWeight: 700, color: 'var(--fg-navy)', lineHeight: 1.3, marginBottom: 6 }}>
                {step.headline}
              </p>
              {/* Detail */}
              <p style={{ fontSize: 11, color: 'var(--fg-dim)', lineHeight: 1.5 }}>
                {step.detail}
              </p>
            </div>
            {i < STEPS.length - 1 && <Arrow />}
          </div>
        ))}
      </div>

      {/* Mobile: vertical list */}
      <div className="md:hidden" style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {STEPS.map((step, i) => (
          <div key={step.num}>
            <div style={{
              backgroundColor: 'white',
              borderRadius: 14,
              padding: '18px 16px',
              border: '1px solid rgba(0,0,0,0.07)',
              display: 'flex', gap: 14, alignItems: 'flex-start',
            }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: step.lightColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                {step.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: step.color, letterSpacing: '0.1em', marginBottom: 2 }}>
                  STEP {step.num} · {step.label}
                </div>
                <p style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 14, fontWeight: 700, color: 'var(--fg-navy)', marginBottom: 2 }}>{step.headline}</p>
                <p style={{ fontSize: 12, color: 'var(--fg-dim)', lineHeight: 1.5 }}>{step.detail}</p>
              </div>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '4px 0' }}>
                <svg width="16" height="20" viewBox="0 0 16 20" fill="none">
                  <path d="M8 0 V14" stroke="rgba(26,39,68,0.2)" strokeWidth="1.5" strokeDasharray="3 3" />
                  <path d="M3 10 L8 16 L13 10" stroke="rgba(26,39,68,0.3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                </svg>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Bottom callout */}
      <div style={{ marginTop: 32, padding: '16px 20px', borderRadius: 14, backgroundColor: 'var(--fg-navy)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>
          <strong style={{ color: 'white' }}>The whole system is included at Tier 4.</strong> Lower tiers plug into specific steps.
        </p>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontStyle: 'italic', flexShrink: 0 }}>
          Get the media kit to see every tier →
        </div>
      </div>
    </div>
  )
}
