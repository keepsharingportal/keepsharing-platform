import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

interface SponsorBannerProps {
  sectionLabel: string
  sponsorName?: string | null
  pitch?: string
}

const DEFAULT_PITCHES: Record<string, string> = {
  Schools:
    'Be the first name families see when they choose where to send their kids. ' +
    'One school earns exclusive section sponsor status each year.',
  'Pediatric Care':
    'When a newcomer family chooses their child\'s first doctor, your practice is what they see first. ' +
    'One practice earns section sponsor status each year.',
}

export function SponsorBanner({ sectionLabel, sponsorName, pitch }: SponsorBannerProps) {
  if (sponsorName) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 18px',
        borderRadius: 10,
        marginBottom: 20,
        backgroundColor: 'var(--fg-gold-light, #fdf6e3)',
        border: '1px solid rgba(212,168,67,0.3)',
      }}>
        <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--fg-gold, #d4a843)', flexShrink: 0 }}>
          Section Sponsor
        </span>
        <span style={{ width: 1, height: 14, backgroundColor: 'rgba(212,168,67,0.3)', flexShrink: 0 }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>{sponsorName}</span>
      </div>
    )
  }

  const message = pitch ?? DEFAULT_PITCHES[sectionLabel] ??
    `This section is available for sponsorship. Be the trusted name families see when they look for ${sectionLabel.toLowerCase()} resources.`

  return (
    <div style={{
      borderRadius: 14,
      padding: '16px 20px',
      marginBottom: 24,
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      background: 'var(--fg-terra-light, #fdf0eb)',
      border: '1px solid rgba(196,98,45,0.15)',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontFamily: 'var(--font-fraunces, serif)',
            fontSize: 14,
            fontWeight: 700,
            color: 'var(--fg-terra, #c4622d)',
            marginBottom: 4,
          }}>
            {sectionLabel} — sponsorship available
          </p>
          <p style={{ fontSize: 13, color: '#555', lineHeight: 1.55 }}>{message}</p>
        </div>
        <Link
          href="/advertise#section-sponsors"
          style={{
            flexShrink: 0,
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '8px 16px',
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 700,
            color: 'white',
            backgroundColor: 'var(--fg-terra, #c4622d)',
            textDecoration: 'none',
            whiteSpace: 'nowrap',
          }}>
          Learn more <ArrowRight size={12} />
        </Link>
      </div>
    </div>
  )
}
