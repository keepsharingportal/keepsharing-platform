// /admin/content/short-links/new — dedicated page for creating a tracked
// link. Replaces the inline AddPanel that used to drop down from the list
// page. Keeping creation on its own route means the editor has the full
// browser height for the form, the back-button works naturally, and the
// list page stays uncluttered when nobody is creating anything.

import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/admin/auth'
import { NewTrackedLinkClient } from './NewTrackedLinkClient'
import type { AdvertiserOption } from '../page'

export const metadata: Metadata = { title: 'New Tracked Link — Admin' }
export const dynamic  = 'force-dynamic'

interface Props {
  searchParams: Promise<{ advertiser_id?: string }>
}

export default async function NewTrackedLinkPage({ searchParams }: Props) {
  await requireAdmin()
  const sp = await searchParams
  const initialAdvertiserId = sp.advertiser_id?.trim() || undefined
  const supabase = createAdminClient()

  const { data: advData } = await supabase
    .from('advertiser_accounts')
    .select('id, business_name')
    .order('business_name', { ascending: true })
    .limit(500)

  return (
    <div className="flex-1 overflow-y-auto bg-[#f4f5f7] min-h-full">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <Link
          href="/admin/content/short-links"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 mb-2"
        >
          <ArrowLeft size={12} /> Back to Tracked Links
        </Link>
        <h1 className="text-xl font-semibold text-gray-900">New Tracked Link</h1>
      </div>
      <div className="max-w-5xl mx-auto p-4 md:p-6">
        <NewTrackedLinkClient
          advertisers={(advData ?? []) as AdvertiserOption[]}
          initialAdvertiserId={initialAdvertiserId}
        />
      </div>
    </div>
  )
}
