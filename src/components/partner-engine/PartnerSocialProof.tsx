import type { PartnerPageData } from './types'

export function PartnerSocialProof({ data }: { data: PartnerPageData }) {
  const { account, brand } = data

  return (
    <div style={{
      backgroundColor: 'white',
      borderTop: `3px solid ${brand.primary}`,
      padding: '12px 20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
      flexWrap: 'wrap',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 6,
          background: `linear-gradient(135deg, ${brand.primary} 0%, ${brand.accent} 100%)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, color: 'white', fontWeight: 700,
          fontFamily: 'var(--font-fraunces, serif)',
        }}>
          K
        </div>
        <span style={{ fontSize: 12, color: '#555', fontWeight: 600 }}>
          A KeepSharing Partner
        </span>
      </div>
      <span style={{ color: '#ddd', fontSize: 12 }}>·</span>
      <span style={{ fontSize: 12, color: '#777' }}>
        Featured in River Region Parents
      </span>
      <span style={{ color: '#ddd', fontSize: 12 }}>·</span>
      <span style={{ fontSize: 12, color: '#777', fontStyle: 'italic' }}>
        Built by River Region Parents. Powered by KeepSharing.
      </span>
    </div>
  )
}
