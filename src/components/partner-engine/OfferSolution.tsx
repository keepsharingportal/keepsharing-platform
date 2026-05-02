import type { PartnerPageData } from './types'

export function OfferSolution({ data }: { data: PartnerPageData }) {
  const { account, offer, services, brand } = data

  const solutionItems = services.length > 0
    ? services.slice(0, 6).map(s => ({ icon: s.icon ?? '✓', title: s.service_name ?? '', body: s.description ?? '' }))
    : (offer?.proof_points ?? []).slice(0, 4).map(pp => ({ icon: '✓', title: pp.claim, body: '' }))

  return (
    <section style={{ backgroundColor: 'var(--fg-cream, #faf8f5)', padding: '72px 20px' }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        <div style={{ maxWidth: 640, marginBottom: 48 }}>
          <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: brand.accent, marginBottom: 10 }}>
            How we do it differently
          </p>
          <h2 style={{
            fontFamily: 'var(--font-fraunces, serif)',
            fontSize: 'clamp(24px, 4vw, 36px)',
            fontWeight: 700,
            color: '#1a1a1a',
            lineHeight: 1.2,
            marginBottom: 14,
          }}>
            {account.subcategory === 'pediatric-dentistry'
              ? 'Introducing the Happy Visit — and everything we build from there'
              : `What makes ${account.business_name.split(' ').slice(0, 2).join(' ')} different`}
          </h2>
          {account.subcategory === 'pediatric-dentistry' && (
            <p style={{ fontSize: 16, color: '#555', lineHeight: 1.7 }}>
              We don&apos;t do quick exams for first visits. We do Happy Visits. Your child meets the doctors, rides the Chew-Chew Train, takes home a goodie bag, and never sits in a chair if they&apos;re not ready. No cleaning. No exam. Just a friendly hello so your child knows what to expect when their real first cleaning happens.
            </p>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
          {solutionItems.map((item, i) => (
            <div key={i} style={{
              backgroundColor: 'white',
              borderRadius: 16,
              padding: '24px 22px',
              border: '1px solid rgba(0,0,0,0.06)',
              boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
            }}>
              <div style={{ fontSize: 28, marginBottom: 14 }}>{item.icon}</div>
              <h3 style={{
                fontFamily: 'var(--font-fraunces, serif)',
                fontSize: 17,
                fontWeight: 700,
                color: brand.primary,
                marginBottom: item.body ? 8 : 0,
                lineHeight: 1.25,
              }}>
                {item.title}
              </h3>
              {item.body && <p style={{ fontSize: 13, color: '#666', lineHeight: 1.6 }}>{item.body}</p>}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
