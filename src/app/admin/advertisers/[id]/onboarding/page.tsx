// /admin/advertisers/[id]/onboarding — page-by-page wizard for getting
// a featured-listing advertiser's content into the canonical
// ListingDetailPage. Same component will power the public
// /advertise/onboarding flow once magic-link auth lands; for now it's
// admin-gated so the team can manually onboard sponsors today.
//
// Server component: loads the advertiser, picks the guide context
// (default: birthday-party until the editor changes it), loads the
// existing guide_listings row + listing_sections. Client wizard takes
// it from there.

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/admin/auth'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import { schemaForGuide } from '@/lib/guides/schemas'
import { OnboardingWizard } from './OnboardingWizard'

export const metadata: Metadata = { title: 'Onboarding — Business — Admin' }
export const dynamic  = 'force-dynamic'

interface Props {
  params:       Promise<{ id: string }>
  searchParams: Promise<{ guide?: string }>
}

const DEFAULT_GUIDE = 'birthday-party'

export default async function OnboardingTab({ params, searchParams }: Props) {
  await requireAdmin()
  const { id } = await params
  const { guide: guideParam } = await searchParams
  const guideSlug = guideParam ?? DEFAULT_GUIDE

  const supabase = createAdminClient()

  const [
    { data: advertiser },
    { data: guideListings },
    { data: sections },
    { data: guideTypes },
  ] = await Promise.all([
    supabase.from('advertiser_accounts').select('*').eq('id', id).maybeSingle(),
    supabase.from('guide_listings').select('*').eq('advertiser_account_id', id),
    supabase.from('listing_sections').select('*').eq('advertiser_account_id', id),
    supabase.from('guide_types').select('slug, display_name').order('display_order'),
  ])

  if (!advertiser) notFound()

  const guideListing = (guideListings ?? []).find(l => l.guide_type_slug === guideSlug) ?? null
  const schema       = schemaForGuide(guideSlug)

  return (
    <div className="flex-1 overflow-y-auto bg-portal-bg">
      <div className="bg-white border-b border-portal-border px-6 py-4">
        <Link href={`/admin/advertisers/${id}`}
          className="text-[11px] font-semibold text-portal-sub hover:text-portal-text inline-flex items-center gap-1 mb-1">
          <ArrowLeft size={11} /> Business
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-[18px] font-bold text-portal-text">
              Onboarding Wizard
            </h1>
            <p className="text-[12px] text-portal-sub mt-1">
              Fill out <strong>{advertiser.business_name}</strong>&apos;s featured listing one section at a time.
              Auto-saves on blur — leave any time and return to pick up where you left off.
            </p>
          </div>
          {advertiser.slug && (
            <a href={`/admin/go/${guideSlug === 'birthday-party' ? 'birthday-party-guide' : guideSlug + '-guide'}/listings/${advertiser.slug}`}
              target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[12px] font-bold text-portal-blue hover:underline">
              <ExternalLink size={12} /> View live listing
            </a>
          )}
        </div>

        {/* Guide picker — defaults to birthday-party; switch to onboard
            the same business into another guide. Only birthday has a
            schema today; non-birthday picks render a friendly notice. */}
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-bold uppercase tracking-widest text-portal-muted">Guide:</span>
          {(guideTypes ?? []).map(g => (
            <Link
              key={g.slug}
              href={`/admin/advertisers/${id}/onboarding?guide=${g.slug}`}
              className={`text-[11px] font-semibold px-2.5 py-1 rounded border transition-colors ${
                g.slug === guideSlug
                  ? 'bg-portal-navy text-white border-portal-navy'
                  : 'bg-white text-portal-sub border-portal-border-2 hover:bg-portal-bg'
              }`}
            >
              {g.display_name}
            </Link>
          ))}
        </div>
      </div>

      <div className="p-6 max-w-5xl">
        {schema ? (
          <OnboardingWizard
            advertiserId={id}
            guideSlug={guideSlug}
            advertiser={advertiser}
            listing={guideListing}
            sections={sections ?? []}
            schema={schema}
          />
        ) : (
          <div className="bg-white border border-portal-border rounded-lg p-8 text-center">
            <h3 className="text-[14px] font-bold text-portal-text mb-2">
              No wizard schema for this guide yet
            </h3>
            <p className="text-[12px] text-portal-sub max-w-md mx-auto">
              The schema-driven wizard is built out for Birthday Party Guide today.
              Other guides will get their own schemas as we extend the system —
              once a schema is defined in <code>src/lib/guides/schemas.ts</code>,
              this wizard will work for that guide automatically.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
