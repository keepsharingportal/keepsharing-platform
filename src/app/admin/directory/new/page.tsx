// /admin/directory/new — create a new directory listing.

import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'
import { ListingEditor } from '../ListingEditor'

export const metadata: Metadata = { title: 'New Listing — Directory' }
export const dynamic = 'force-dynamic'

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export default async function NewListingPage() {
  const sb = supabaseAdmin()
  const { data } = await sb.from('directory_categories').select('brand_slug, slug, name, emoji').eq('is_active', true)
  const categories = (data ?? []) as Array<{ brand_slug: string; slug: string; name: string; emoji: string | null }>
  return (
    <div className="flex-1 overflow-y-auto bg-portal-bg">
      <div className="bg-white border-b border-portal-border px-6 py-4">
        <Link href="/admin/directory" className="inline-flex items-center gap-1 text-[11px] text-portal-blue hover:text-portal-blue-dk mb-1">
          <ArrowLeft size={11} /> Directory
        </Link>
        <h1 className="portal-page-title">New listing</h1>
      </div>
      <div className="p-6 max-w-3xl">
        <ListingEditor categories={categories} />
      </div>
    </div>
  )
}
