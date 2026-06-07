// /admin/advertisers/new — single-page form for creating a new advertiser
// (advertiser_accounts row). Loads every existing business once on the
// server so the client form can show 'looks like a duplicate of X'
// hints as the editor types — before they save a 4th Baptist Hospital.

import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/admin/auth'
import { normalize } from '@/lib/advertisers/dedup'
import { NewAdvertiserForm } from './NewAdvertiserForm'

export const metadata: Metadata = { title: 'New Advertiser — Admin' }
export const dynamic  = 'force-dynamic'

export default async function NewAdvertiserPage() {
  await requireAdmin()
  const supabase = createAdminClient()

  // Pull every existing advertiser. Just id + name; we normalize once
  // server-side so the client doesn't have to redo it for every keystroke.
  const { data: rows } = await supabase
    .from('advertiser_accounts')
    .select('id, business_name')
    .order('business_name', { ascending: true })
  const existing = (rows ?? []).map(r => ({
    id:     r.id as string,
    name:   r.business_name as string,
    tokens: normalize(r.business_name as string),
  }))

  return (
    <div className="flex-1 overflow-y-auto bg-[#f4f5f7] min-h-full">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <Link
          href="/admin/advertisers"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 mb-2"
        >
          <ArrowLeft size={12} /> Back to Advertisers
        </Link>
        <h1 className="text-xl font-semibold text-gray-900">New Advertiser</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          Create the business record first. Contacts and ad placements get added on the profile after.
        </p>
      </div>
      <div className="max-w-3xl mx-auto p-4 md:p-6">
        <NewAdvertiserForm existing={existing} />
      </div>
    </div>
  )
}
