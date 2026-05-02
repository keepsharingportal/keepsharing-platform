'use client'

import Image from 'next/image'
import { getColorScheme } from '@/lib/color-schemes'

interface TeamMember {
  display_name?: string | null
  title?: string | null
  credentials?: string | null
  bio?: string | null
  philosophy_quote?: string | null
  photo_url?: string | null
  years_with_practice?: number | null
}

interface PartnerTeamProps {
  team_members: TeamMember[]
  section_headline?: string
  section_subheadline?: string
  color_scheme: string
}

function MemberInitial({ name, scheme }: { name: string; scheme: ReturnType<typeof getColorScheme> }) {
  const initial = name.replace('Dr. ', '').replace('Dr ', '')[0] ?? '?'
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: scheme.primaryLight, fontFamily: 'var(--font-fraunces, serif)', fontSize: '2.5rem', fontWeight: 700, color: scheme.primary }}>
      {initial}
    </div>
  )
}

export function PartnerTeam({ team_members, section_headline, section_subheadline, color_scheme }: PartnerTeamProps) {
  const scheme = getColorScheme(color_scheme)

  if (!team_members || team_members.length === 0) return null

  const featured = team_members.slice(0, 2)
  const rest = team_members.slice(2)

  return (
    <section style={{ backgroundColor: scheme.background, padding: '80px 24px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        {/* Section header */}
        <div style={{ textAlign: 'center', marginBottom: 52 }}>
          <div style={{ width: 40, height: 3, backgroundColor: scheme.secondary, borderRadius: 2, margin: '0 auto 16px' }} />
          <h2 style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 700, color: scheme.foreground, lineHeight: 1.2, marginBottom: 10 }}>
            {section_headline ?? 'Meet the Team'}
          </h2>
          {section_subheadline && (
            <p style={{ fontSize: 15, color: scheme.mutedForeground, maxWidth: 480, margin: '0 auto' }}>{section_subheadline}</p>
          )}
        </div>

        {/* 1-2 featured members: editorial layout */}
        {featured.length === 1 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start" style={{ marginBottom: rest.length ? 48 : 0 }}>
            {/* Photo */}
            <div style={{ borderRadius: 20, overflow: 'hidden', aspectRatio: '3/4', position: 'relative', maxWidth: 420, boxShadow: `8px 8px 0 ${scheme.primaryLight}` }}>
              {featured[0].photo_url
                ? <Image src={featured[0].photo_url} alt={featured[0].display_name ?? 'Team member'} fill style={{ objectFit: 'cover', objectPosition: 'top center' }} sizes="420px" />
                : <MemberInitial name={featured[0].display_name ?? ''} scheme={scheme} />
              }
            </div>
            {/* Copy */}
            <MemberCopy member={featured[0]} scheme={scheme} large />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 48, marginBottom: rest.length ? 48 : 0 }}>
            {featured.map((m, i) => (
              <div key={i} className={`grid grid-cols-1 md:grid-cols-2 gap-10 items-start ${i % 2 === 1 ? 'md:flex-row-reverse' : ''}`}>
                <div style={{ borderRadius: 16, overflow: 'hidden', aspectRatio: '4/3', position: 'relative', boxShadow: '0 8px 32px rgba(0,0,0,0.10)' }}>
                  {m.photo_url
                    ? <Image src={m.photo_url} alt={m.display_name ?? 'Team member'} fill style={{ objectFit: 'cover', objectPosition: 'top center' }} sizes="480px" />
                    : <MemberInitial name={m.display_name ?? ''} scheme={scheme} />
                  }
                </div>
                <MemberCopy member={m} scheme={scheme} large={false} />
              </div>
            ))}
          </div>
        )}

        {/* 3+ members: compact grid cards */}
        {rest.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rest.map((m, i) => (
              <div key={i} style={{ backgroundColor: 'white', borderRadius: 16, padding: '24px 20px', border: `1px solid ${scheme.border}`, boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', overflow: 'hidden', position: 'relative', marginBottom: 14, border: `2px solid ${scheme.primaryLight}` }}>
                  {m.photo_url
                    ? <Image src={m.photo_url} alt={m.display_name ?? ''} fill style={{ objectFit: 'cover' }} sizes="64px" />
                    : <MemberInitial name={m.display_name ?? ''} scheme={scheme} />
                  }
                </div>
                <p style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 16, fontWeight: 700, color: scheme.foreground, marginBottom: 2 }}>{m.display_name}</p>
                {m.title && <p style={{ fontSize: 12, color: scheme.primary, fontWeight: 600, marginBottom: 6 }}>{m.title}{m.credentials ? ` · ${m.credentials}` : ''}</p>}
                {m.bio && <p style={{ fontSize: 13, color: scheme.mutedForeground, lineHeight: 1.6, marginBottom: 12 }}>{m.bio.slice(0, 160)}{m.bio.length > 160 ? '…' : ''}</p>}
                {m.philosophy_quote && (
                  <p style={{ fontSize: 12, color: scheme.foreground, fontStyle: 'italic', lineHeight: 1.55, borderLeft: `3px solid ${scheme.primary}`, paddingLeft: 10 }}>
                    &ldquo;{m.philosophy_quote}&rdquo;
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

function MemberCopy({ member, scheme, large }: { member: TeamMember; scheme: ReturnType<typeof getColorScheme>; large: boolean }) {
  return (
    <div>
      <p style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: large ? 28 : 22, fontWeight: 700, color: scheme.foreground, marginBottom: 4 }}>
        {member.display_name}
      </p>
      {member.title && (
        <p style={{ fontSize: 13, fontWeight: 700, color: scheme.primary, marginBottom: member.credentials ? 2 : 12, letterSpacing: '0.02em', textTransform: 'uppercase' }}>
          {member.title}
        </p>
      )}
      {member.credentials && (
        <p style={{ fontSize: 12, color: scheme.mutedForeground, fontWeight: 500, marginBottom: 12 }}>{member.credentials}</p>
      )}
      {member.years_with_practice && (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 20, backgroundColor: scheme.primaryLight, fontSize: 11, fontWeight: 700, color: scheme.primary, marginBottom: 16 }}>
          {member.years_with_practice} years of experience
        </div>
      )}
      {member.bio && (
        <p style={{ fontSize: 15, color: scheme.mutedForeground, lineHeight: 1.75, marginBottom: 20 }}>{member.bio}</p>
      )}
      {member.philosophy_quote && (
        <blockquote style={{ borderLeft: `3px solid ${scheme.primary}`, paddingLeft: 18, margin: 0 }}>
          <p style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 16, fontStyle: 'italic', color: scheme.foreground, lineHeight: 1.55 }}>
            &ldquo;{member.philosophy_quote}&rdquo;
          </p>
        </blockquote>
      )}
    </div>
  )
}
