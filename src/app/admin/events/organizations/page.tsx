// /admin/events/organizations — Community Connections directory.
// The organizations (churches, libraries, museums, nonprofits, schools, etc.)
// behind the events we surface. They can also auto-attribute submissions and
// optionally link to a trusted_event_source for iCal ingestion.

import type { Metadata } from 'next'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin, marketsToQuery } from '@/lib/admin/auth'
import { OrganizationsAdminClient } from './OrganizationsAdminClient'
import { ChevronLeft } from 'lucide-react'

export const metadata: Metadata = { title: 'Community Connections — Admin' }
export const dynamic  = 'force-dynamic'

export interface CommunityOrganization {
  id:              string
  name:            string
  slug:            string | null
  kind:            string
  description:     string | null
  logo_url:        string | null
  website:         string | null
  contact_name:    string | null
  contact_email:   string | null
  contact_phone:   string | null
  address:         string | null
  city:            string | null
  state:           string | null
  social_facebook: string | null
  social_instagram: string | null
  tags:            string[] | null
  notes:           string | null
  source_id:       string | null
  market:          string
  status:          string
  created_at:      string
}

export interface SourceOption {
  id:   string
  name: string
}

export default async function OrganizationsAdminPage() {
  const ctx = await requireAdmin()
  const supabase = createAdminClient()
  const marketScope = marketsToQuery(ctx)

  const orgsRes = await supabase
    .from('community_organizations')
    .select('id, name, slug, kind, description, logo_url, website, contact_name, contact_email, contact_phone, address, city, state, social_facebook, social_instagram, tags, notes, source_id, market, status, created_at')
    .is('deleted_at', null)
    .in('market', marketScope)
    .order('name', { ascending: true })

  const tableMissing =
    !!orgsRes.error && /relation .* does not exist/i.test(orgsRes.error.message ?? '')

  const sourcesRes = await supabase
    .from('trusted_event_sources')
    .select('id, name')
    .in('market', marketScope)
    .order('name', { ascending: true })

  // Show a friendly setup card if migration 089 hasn't been applied yet.
  if (tableMissing) {
    return (
      <div className="flex-1 overflow-y-auto">
        <div className="bg-white border-b border-portal-border px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin/events" className="text-portal-sub hover:text-portal-text inline-flex items-center gap-1 text-sm">
              <ChevronLeft size={14} /> Events
            </Link>
            <span className="text-gray-300">/</span>
            <h1 className="text-xl font-semibold text-portal-text">Community Connections</h1>
          </div>
        </div>
        <div className="p-8">
          <div className="max-w-2xl bg-portal-amber-lt border border-portal-amber/30 rounded-lg p-6">
            <h2 className="text-base font-bold text-amber-900 mb-2">One-time setup needed</h2>
            <p className="text-sm text-amber-900 mb-3">
              The <code className="px-1 py-0.5 bg-white rounded text-xs">community_organizations</code> table
              hasn&apos;t been created yet. Apply migration 089 to enable this page:
            </p>
            <pre className="text-xs bg-white border border-portal-amber/30 rounded p-3 overflow-x-auto">
{`supabase db push
# or in Supabase SQL editor, run:
# supabase/migrations/089_community_organizations.sql`}
            </pre>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <OrganizationsAdminClient
        initialOrgs={(orgsRes.data ?? []) as CommunityOrganization[]}
        sources={(sourcesRes.data ?? []) as SourceOption[]}
      />
    </div>
  )
}
