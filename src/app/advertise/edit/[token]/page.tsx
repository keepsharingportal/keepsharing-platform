// Public token-authenticated onboarding wizard for business owners.
// Token is the credential — the business owner gets a URL like
// /advertise/edit/{uuid} from a magic-link email and can bookmark it
// to return any time.
//
// Same OnboardingWizard component as the admin path; the only
// difference is the auth boundary. Once the business owner reaches
// this page, the wizard does its own auto-save calls to a sibling
// public API that re-verifies the token on every write.

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { schemaForGuide } from '@/lib/guides/schemas'
import { Sparkles } from 'lucide-react'
import { OnboardingWizard } from '@/app/admin/advertisers/[id]/onboarding/OnboardingWizard'
import { PublicSendLinkBanner } from './PublicSendLinkBanner'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title:  'Edit your listing | River Region Parents',
  robots: { index: false, follow: false },
}

interface Props {
  params:       Promise<{ token: string }>
  searchParams: Promise<{ guide?: string }>
}

const DEFAULT_GUIDE = 'birthday-party'

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

export default async function PublicWizardPage({ params, searchParams }: Props) {
  const { token } = await params
  const { guide: guideParam } = await searchParams
  const guideSlug = guideParam ?? DEFAULT_GUIDE

  // Token-based auth — no Supabase Auth session required. UUID format
  // check first so we can fail fast on malformed URLs.
  if (!/^[0-9a-f-]{30,40}$/i.test(token)) notFound()

  const supabase = sb()
  const { data: advertiser } = await supabase
    .from('advertiser_accounts')
    .select('*')
    .eq('onboarding_token', token)
    .maybeSingle()

  if (!advertiser) notFound()

  // Expiration check
  if (advertiser.onboarding_token_expires_at) {
    const expires = new Date(advertiser.onboarding_token_expires_at as string)
    if (expires.getTime() < Date.now()) {
      return <ExpiredView businessName={advertiser.business_name as string} />
    }
  }

  // Mark the token as "used" the first time someone visits
  if (advertiser.onboarding_status === 'invited') {
    await supabase
      .from('advertiser_accounts')
      .update({ onboarding_status: 'in_progress' })
      .eq('id', advertiser.id)
  }

  // Fetch listing + sections in parallel
  const [{ data: guideListings }, { data: sections }] = await Promise.all([
    supabase.from('guide_listings').select('*').eq('advertiser_account_id', advertiser.id),
    supabase.from('listing_sections').select('*').eq('advertiser_account_id', advertiser.id),
  ])

  const guideListing = (guideListings ?? []).find(l => l.guide_type_slug === guideSlug) ?? null
  const schema       = schemaForGuide(guideSlug)

  if (!schema) {
    return (
      <Shell businessName={advertiser.business_name as string}>
        <div className="bg-white border border-border rounded-lg p-8 text-center">
          <h3 className="text-lg font-bold text-foreground mb-2">No wizard for this guide yet</h3>
          <p className="text-sm text-muted-foreground">
            Reach out to the River Region Parents team and we&apos;ll get you sorted.
          </p>
        </div>
      </Shell>
    )
  }

  return (
    <Shell businessName={advertiser.business_name as string}>
      <PublicSendLinkBanner status={advertiser.onboarding_status as string | null} />
      <OnboardingWizard
        advertiserId={advertiser.id as string}
        guideSlug={guideSlug}
        advertiser={advertiser}
        listing={guideListing}
        sections={sections ?? []}
        schema={schema}
        publicToken={token}
      />
    </Shell>
  )
}

function Shell({ businessName, children }: { businessName: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-portal-bg">
      <header className="bg-white border-b border-portal-border">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="text-[18px] font-bold text-portal-text">
              <span className="text-portal-blue">River Region Parents</span>
              <span className="text-portal-muted"> · Listing Editor</span>
            </div>
            <p className="text-[12px] text-portal-sub mt-0.5">
              Editing <strong>{businessName}</strong>
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-portal-green-lt text-portal-green text-[10px] font-bold uppercase tracking-widest">
            <Sparkles size={11} /> Private edit link
          </span>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-6 py-6 space-y-5">
        {children}
      </main>
      <footer className="max-w-5xl mx-auto px-6 py-6 text-[11px] text-portal-muted">
        Your changes save automatically. Bookmark this page to return any time.
      </footer>
    </div>
  )
}

function ExpiredView({ businessName }: { businessName: string }) {
  return (
    <Shell businessName={businessName}>
      <div className="bg-white border border-portal-border rounded-lg p-8 text-center max-w-md mx-auto">
        <h3 className="text-lg font-bold text-portal-text mb-2">This link has expired</h3>
        <p className="text-sm text-portal-sub leading-relaxed">
          Reach out to the River Region Parents team at{' '}
          <a href="mailto:hello@riverregionparents.com" className="text-portal-blue font-semibold hover:underline">hello@riverregionparents.com</a>{' '}
          and we&apos;ll send you a fresh editing link.
        </p>
      </div>
    </Shell>
  )
}
