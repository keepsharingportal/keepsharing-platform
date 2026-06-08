// /admin/circulation/publications — edit publication metadata
// (print_total, holdback, brand color, website, Issuu URL).

import Link from 'next/link'
import { ArrowLeft, BookOpen } from 'lucide-react'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { PublicationsEditor, type Publication } from './PublicationsEditor'

export const metadata = { title: 'Publications — Distribution' }
export const dynamic  = 'force-dynamic'

export default async function PublicationsPage() {
  await requireAdmin()
  const sb = createAdminClient()
  let pubs: Publication[] = []
  try {
    const { data } = await sb.from('circulation_publications').select('*').order('sort_order').order('short_name')
    pubs = (data ?? []) as Publication[]
  } catch { /* table missing */ }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-6 pb-16">
      <div className="max-w-[900px] mx-auto space-y-6">

        <div>
          <Link href="/admin/circulation" className="inline-flex items-center gap-1 text-xs text-portal-blue hover:underline mb-1">
            <ArrowLeft size={11} /> Distribution Routes
          </Link>
          <div className="flex items-center gap-2">
            <BookOpen size={18} className="text-portal-blue" />
            <h1 className="text-xl font-bold text-portal-text tracking-tight">Publications</h1>
          </div>
          <p className="text-sm text-portal-sub mt-1">Print run + holdback drive the budget bars on the overview. Website + Issuu URL surface on public maps and in driver emails.</p>
        </div>

        <PublicationsEditor initial={pubs} />
      </div>
    </div>
  )
}
