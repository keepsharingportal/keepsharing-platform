import type { Metadata } from 'next'
import Link from 'next/link'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { ArrowLeft, FileText } from 'lucide-react'
import { PrintablesClient } from './PrintablesClient'

export const metadata: Metadata = { title: 'Birthday Printables — Admin' }
export const dynamic = 'force-dynamic'

export default async function PrintablesAdminPage() {
  await requireAdmin()
  const sb = createAdminClient()
  const { data } = await sb.from('birthday_printables').select('*').order('category').order('display_order')
  return (
    <div className="flex-1 overflow-y-auto bg-portal-bg">
      <div className="bg-white border-b border-portal-border px-6 py-4">
        <Link href="/admin/birthday" className="text-[11px] font-semibold text-portal-sub hover:text-portal-text inline-flex items-center gap-1 mb-1">
          <ArrowLeft size={11} /> Birthday Bash
        </Link>
        <h1 className="text-[18px] font-bold text-portal-text inline-flex items-center gap-2">
          <FileText size={16} /> Birthday Printables
        </h1>
        <p className="text-[12px] text-portal-sub mt-1">
          Downloadable invitations, thank-you notes, banners. Mark <code>is_premium</code> to gate behind an email capture.
        </p>
      </div>
      <div className="p-6 max-w-5xl">
        <PrintablesClient initial={data ?? []} />
      </div>
    </div>
  )
}
