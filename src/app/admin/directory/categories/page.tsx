// /admin/directory/categories — manage directory categories per brand.

import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'
import { CategoriesClient } from './CategoriesClient'

export const metadata: Metadata = { title: 'Directory Categories — Admin' }
export const dynamic = 'force-dynamic'

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export default async function CategoriesPage() {
  const sb = supabaseAdmin()
  const { data } = await sb.from('directory_categories').select('*').order('brand_slug').order('display_order', { ascending: true, nullsFirst: false }).order('name')
  return (
    <div className="flex-1 overflow-y-auto bg-portal-bg">
      <div className="bg-white border-b border-portal-border px-6 py-4">
        <Link href="/admin/directory" className="inline-flex items-center gap-1 text-[11px] text-portal-blue hover:text-portal-blue-dk mb-1">
          <ArrowLeft size={11} /> Directory
        </Link>
        <h1 className="portal-page-title">Categories</h1>
        <p className="portal-page-subtitle">Per-brand category lists. Listings reference categories by slug.</p>
      </div>
      <div className="p-6 max-w-4xl">
        <CategoriesClient categories={(data ?? []) as Array<{ id: string; brand_slug: string; slug: string; name: string; description: string | null; emoji: string | null; display_order: number | null; is_active: boolean }>} />
      </div>
    </div>
  )
}
