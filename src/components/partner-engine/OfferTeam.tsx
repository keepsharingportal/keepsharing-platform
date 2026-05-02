import Image from 'next/image'
import type { PartnerPageData } from './types'
import { hexWithOpacity } from '@/lib/brand-colors'

export function OfferTeam({ data }: { data: PartnerPageData }) {
  const { team, account, brand } = data

  if (!team.length) return null

  return (
    <section style={{ backgroundColor: 'var(--fg-cream, #faf8f5)', padding: '72px 20px' }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: brand.accent, marginBottom: 10 }}>
          The team
        </p>
        <h2 style={{
          fontFamily: 'var(--font-fraunces, serif)',
          fontSize: 'clamp(24px, 4vw, 34px)',
          fontWeight: 700,
          color: '#1a1a1a',
          marginBottom: 40,
        }}>
          The people behind the promise
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
          {team.map(member => (
            <div key={member.id} style={{ backgroundColor: 'white', borderRadius: 20, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 2px 16px rgba(0,0,0,0.06)' }}>
              {/* Photo or gradient-initial placeholder */}
              <div style={{ height: 140, position: 'relative', overflow: 'hidden', background: `linear-gradient(135deg, ${hexWithOpacity(brand.primary, 0.15)} 0%, ${hexWithOpacity(brand.accent, 0.15)} 100%)` }}>
                {member.photo_url ? (
                  <Image src={member.photo_url} alt={member.display_name ?? 'Team member'} fill style={{ objectFit: 'cover', objectPosition: 'center top' }} sizes="360px" />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{
                      width: 72, height: 72, borderRadius: '50%',
                      background: `linear-gradient(135deg, ${brand.primary} 0%, ${brand.accent} 100%)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: 'var(--font-fraunces, serif)', fontSize: 26, fontWeight: 700, color: 'white',
                    }}>
                      {(member.display_name ?? '?')[0].toUpperCase()}
                    </div>
                  </div>
                )}
              </div>
              <div style={{ padding: '20px 22px' }}>
                <h3 style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 18, fontWeight: 700, color: brand.primary, marginBottom: 4 }}>
                  {member.display_name}
                </h3>
                {member.title && <p style={{ fontSize: 12, fontWeight: 600, color: '#888', marginBottom: 2 }}>{member.title}</p>}
                {member.credentials && <p style={{ fontSize: 11, color: '#aaa', marginBottom: 12 }}>{member.credentials}</p>}
                {member.bio && <p style={{ fontSize: 13, color: '#555', lineHeight: 1.65, marginBottom: 14 }}>{member.bio}</p>}
                {member.philosophy_quote && (
                  <blockquote style={{ fontStyle: 'italic', fontSize: 13, color: '#444', borderLeft: `3px solid ${brand.accent}`, paddingLeft: 12, lineHeight: 1.6 }}>
                    &ldquo;{member.philosophy_quote}&rdquo;
                  </blockquote>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
