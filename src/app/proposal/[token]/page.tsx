import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'
import { TIER_LABELS } from '@/lib/proposal-templates'
import { ProposalActions } from './ProposalActions'

interface Props { params: Promise<{ token: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('proposals').select('business_name').eq('token_slug', token).maybeSingle()
  return { title: data ? `Proposal for ${data.business_name} — River Region Parents` : 'Proposal' }
}

export default async function ProposalPage({ params }: Props) {
  const { token } = await params
  const supabase = await createClient()

  const { data: proposal } = await supabase
    .from('proposals')
    .select('*')
    .eq('token_slug', token)
    .maybeSingle()

  if (!proposal) notFound()

  // Track view (fire-and-forget)
  void fetch(`${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/api/proposals/${token}/view`, { method: 'POST' }).catch(() => {})

  const isExpired = proposal.expires_at && new Date(proposal.expires_at) < new Date()
  const isAccepted = proposal.status === 'accepted'
  const valueProps = Array.isArray(proposal.value_props) ? proposal.value_props as string[] : []

  const NAVY  = '#1a2744'
  const TERRA = '#ef6442'
  const CREAM = '#faf8f5'

  return (
    <div style={{ backgroundColor: CREAM, fontFamily: 'var(--font-dm-sans, sans-serif)', minHeight: '100vh' }}>

      {/* Nav */}
      <nav style={{ backgroundColor: 'white', borderBottom: '1px solid rgba(0,0,0,0.07)', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 16, fontWeight: 700, color: NAVY }}>
          River Region Parents
        </div>
        <p style={{ fontSize: 11, color: '#999', fontStyle: 'italic' }}>
          Confidential · Prepared for {proposal.business_name}
        </p>
      </nav>

      {/* Hero */}
      <section style={{ backgroundColor: NAVY, padding: '64px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: 14 }}>
            Custom Partnership Proposal
          </p>
          <h1 style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 'clamp(28px, 5vw, 46px)', fontWeight: 900, color: 'white', lineHeight: 1.1, letterSpacing: '-0.02em', marginBottom: 14 }}>
            {proposal.business_name}
          </h1>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>
            Prepared by Jason Watson · {new Date(proposal.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            {proposal.expires_at && ` · Expires ${new Date(proposal.expires_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`}
          </p>
        </div>
      </section>

      <div style={{ maxWidth: 780, margin: '0 auto', padding: '56px 24px 80px' }}>

        {/* Accepted banner */}
        {isAccepted && (
          <div style={{ backgroundColor: '#edf5f0', borderRadius: 14, padding: '18px 22px', border: '1px solid rgba(90,138,106,0.3)', marginBottom: 36, display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 20 }}>✓</span>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#2d5a3d' }}>This proposal was accepted on {new Date(proposal.accepted_at!).toLocaleDateString()}. Jason will be in touch within 24 hours.</p>
          </div>
        )}

        {isExpired && !isAccepted && (
          <div style={{ backgroundColor: '#fdf6e3', borderRadius: 14, padding: '18px 22px', border: '1px solid rgba(212,168,67,0.3)', marginBottom: 36 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#8b6a1a' }}>This proposal has expired. Contact Jason at 334-328-5189 to discuss a current offer.</p>
          </div>
        )}

        {/* Intro */}
        {proposal.intro_paragraph && (
          <section style={{ marginBottom: 40 }}>
            <p style={{ fontSize: 16, color: '#3a2c1e', lineHeight: 1.8 }}>{proposal.intro_paragraph}</p>
          </section>
        )}

        {/* Recommended Tier */}
        {proposal.recommended_tier && (
          <section style={{ marginBottom: 40 }}>
            <div style={{ backgroundColor: NAVY, borderRadius: 20, padding: '28px 28px' }}>
              <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: 10 }}>Recommended Partnership</p>
              <h2 style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 28, fontWeight: 700, color: 'white', marginBottom: 8 }}>
                {TIER_LABELS[proposal.recommended_tier] ?? proposal.recommended_tier}
              </h2>
              {proposal.custom_monthly_price && (
                <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.7)' }}>
                  ${Number(proposal.custom_monthly_price).toLocaleString()}/month · {proposal.contract_length_months ?? 12}-month agreement
                </p>
              )}
            </div>
          </section>
        )}

        {/* What We'd Build */}
        {valueProps.length > 0 && (
          <section style={{ marginBottom: 40 }}>
            <h2 style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 26, fontWeight: 700, color: NAVY, marginBottom: 20 }}>What We&apos;d Build for You</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {valueProps.map((prop: string, i: number) => (
                <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start', padding: '16px 18px', borderRadius: 12, backgroundColor: 'white', border: '1px solid rgba(0,0,0,0.07)' }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', backgroundColor: 'rgba(196,98,45,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 13, fontWeight: 700, color: TERRA }}>
                    {i + 1}
                  </div>
                  <p style={{ fontSize: 14, color: '#333', lineHeight: 1.65 }}>{prop}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ROI Math */}
        {proposal.roi_math && (
          <section style={{ marginBottom: 40, padding: '28px 26px', borderRadius: 16, backgroundColor: 'rgba(196,98,45,0.05)', border: '1px solid rgba(196,98,45,0.15)' }}>
            <h2 style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 22, fontWeight: 700, color: NAVY, marginBottom: 14 }}>The ROI Math</h2>
            <p style={{ fontSize: 15, color: '#3a2c1e', lineHeight: 1.75 }}>{proposal.roi_math}</p>
          </section>
        )}

        {/* Onboarding Timeline */}
        {proposal.onboarding_timeline && (
          <section style={{ marginBottom: 48 }}>
            <h2 style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 22, fontWeight: 700, color: NAVY, marginBottom: 16 }}>Onboarding Timeline</h2>
            <p style={{ fontSize: 15, color: '#3a2c1e', lineHeight: 1.75 }}>{proposal.onboarding_timeline}</p>
          </section>
        )}

        {/* CTAs */}
        {!isAccepted && !isExpired && (
          <ProposalActions token={token} businessName={proposal.business_name} />
        )}

        {/* Footer */}
        <div style={{ marginTop: 64, paddingTop: 24, borderTop: '1px solid rgba(0,0,0,0.07)', textAlign: 'center' }}>
          <p style={{ fontSize: 12, color: '#999' }}>
            Questions? Call Jason at 334-328-5189 or reply to the email with this proposal.
          </p>
        </div>
      </div>
    </div>
  )
}
