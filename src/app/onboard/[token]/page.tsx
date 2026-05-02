/**
 * The KeepSharing Partner Engine — Secretary-Friendly Onboarding Form
 * "The Marketer-in-a-Box"
 *
 * Accessed via /onboard/{token} — no login required.
 * Token IS the auth. Never expose or log tokens.
 *
 * Built around the Secretary Test: a 55-year-old office manager
 * can fill this out on her phone between calls without confusion.
 */

import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { OnboardingForm } from './OnboardingForm'

interface Props { params: Promise<{ token: string }> }

export default async function OnboardPage({ params }: Props) {
  const { token } = await params

  const supabase = await createClient()
  const { data: account } = await supabase
    .from('advertiser_accounts')
    .select('id, business_name, slug, contact_name, contact_email, contact_phone, business_url, onboarding_status, brand_color_primary, brand_color_accent, category')
    .eq('onboarding_token', token)
    .maybeSingle()

  if (!account) notFound()

  if (account.onboarding_status === 'submitted' || account.onboarding_status === 'live') {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#faf8f5', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: 'var(--font-dm-sans, sans-serif)' }}>
        <div style={{ maxWidth: 480, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
          <h1 style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 24, fontWeight: 700, color: '#1a2744', marginBottom: 10 }}>
            {account.onboarding_status === 'live' ? 'Your page is live!' : 'We received your information!'}
          </h1>
          <p style={{ fontSize: 15, color: '#666', lineHeight: 1.65, marginBottom: 24 }}>
            {account.onboarding_status === 'live'
              ? `Your KeepSharing Partner Engine page for ${account.business_name} is published.`
              : `We're reviewing your information for ${account.business_name} and will have your page live within 48 hours.`}
          </p>
          {account.slug && account.onboarding_status === 'live' && (
            <a href={`/partners/${account.slug}`} style={{ display: 'inline-block', padding: '11px 24px', borderRadius: 10, fontSize: 14, fontWeight: 700, backgroundColor: '#1a2744', color: 'white', textDecoration: 'none' }}>
              View your page →
            </a>
          )}
        </div>
      </div>
    )
  }

  return (
    <OnboardingForm
      token={token}
      accountId={account.id}
      accountSlug={account.slug}
      businessName={account.business_name}
      contactName={account.contact_name ?? ''}
      contactEmail={account.contact_email ?? ''}
      contactPhone={account.contact_phone ?? ''}
      businessUrl={account.business_url ?? ''}
      category={account.category ?? 'family-service'}
      initialStatus={account.onboarding_status ?? 'not-started'}
    />
  )
}
