// /admin/inquiries
// Review queue for listing inquiries submitted via the public listing detail
// pages. Each inquiry is in listing_messages; admin marks them read or replied.

import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { AdminSectionHeader } from '@/components/admin/AdminSectionHeader'
import { Inbox, ExternalLink } from 'lucide-react'
import { InquiriesClient } from './InquiriesClient'

export const metadata = { title: 'Listing Inquiries — KeepSharing Admin' }
export const dynamic  = 'force-dynamic'

export interface InquiryRow {
  id:                    string
  advertiser_account_id: string
  guide_type_slug:       string | null
  parent_name:           string
  parent_email:          string
  parent_phone:          string | null
  message:               string
  source_url:            string | null
  status:                string | null
  read_at:               string | null
  replied_at:            string | null
  created_at:            string
  // Joined via FK
  advertiser_accounts: {
    business_name:  string
    slug:           string | null
    contact_email:  string | null
    office_phone:   string | null
    website_url:    string | null
  } | null
}

export default async function InquiriesPage() {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('listing_messages')
    .select(`
      id, advertiser_account_id, guide_type_slug,
      parent_name, parent_email, parent_phone,
      message, source_url, status, read_at, replied_at, created_at,
      advertiser_accounts ( business_name, slug, contact_email, office_phone, website_url )
    `)
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) console.error('[admin/inquiries] load error:', error)
  const rows  = (data ?? []) as unknown as InquiryRow[]
  const fresh = rows.filter(r => !r.read_at && !r.replied_at).length

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-portal-text flex items-center gap-2">
          <Inbox className="h-5 w-5 text-portal-blue" />
          Listing Inquiries
        </h1>
        <p className="text-sm text-portal-sub mt-0.5">
          Messages from families asking about guide listings.
          {fresh > 0 && <span className="ml-2 font-semibold text-portal-blue">{fresh} new</span>}
        </p>
        <p className="text-xs text-portal-muted mt-1">
          Admin notification email goes to {process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? 'hello@riverregionparents.com'} when GHL is configured.
          Forward to the business&apos;s <code className="px-1 bg-gray-100 rounded">contact_email</code> shown on each card.
        </p>
      </div>

      <section>
        <AdminSectionHeader title="Inquiries" count={rows.length} />
        {rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-portal-border p-8 text-center bg-white">
            <p className="text-sm text-portal-sub">No inquiries yet.</p>
            <p className="text-xs text-portal-muted mt-1">
              When a family submits the &quot;Request Info&quot; form on any listing page, it appears here.
            </p>
            <Link href="/family-resource-guide" className="inline-flex items-center gap-1 mt-3 text-xs font-semibold text-portal-blue hover:underline">
              View public guide <ExternalLink size={11} />
            </Link>
          </div>
        ) : (
          <InquiriesClient rows={rows} />
        )}
      </section>
    </div>
  )
}
