// /admin/lead-magnets — top-level Lead Magnets editor across every
// vertical. Editor uploads the PDF, writes the email, and configures GHL
// sync; the magnet fires when a signup posts to /api/birthday/subscribe
// (or any future per-vertical subscribe endpoint) with a matching source.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { ArrowLeft, Mail } from 'lucide-react'
import { LeadMagnetsClient } from './LeadMagnetsClient'

export const metadata: Metadata = { title: 'Lead Magnets — Admin' }
export const dynamic = 'force-dynamic'

export default async function LeadMagnetsAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ vertical?: string }>
}) {
  await requireAdmin()
  const { vertical } = await searchParams
  const sb = createAdminClient()
  const { data } = await sb
    .from('lead_magnets')
    .select('*')
    .eq('brand_slug', 'rrp')
    .order('vertical')
    .order('slug')

  return (
    <div className="flex-1 overflow-y-auto bg-portal-bg">
      <div className="bg-white border-b border-portal-border px-6 py-4">
        <Link href="/admin" className="text-[11px] font-semibold text-portal-sub hover:text-portal-text inline-flex items-center gap-1 mb-1">
          <ArrowLeft size={11} /> Admin
        </Link>
        <h1 className="text-[18px] font-bold text-portal-text inline-flex items-center gap-2">
          <Mail size={16} /> Lead Magnets
        </h1>
        <p className="text-[12px] text-portal-sub mt-1">
          Editor-managed downloadables across every vertical — Birthday, Special Needs, After School, etc.
          Upload the PDF, write the welcome email, set the GHL tags, save. Signups matching the magnet&apos;s
          <strong> trigger source </strong>get the email and land in GHL automatically.
        </p>
      </div>
      <div className="p-6 max-w-4xl">
        <LeadMagnetsClient initial={data ?? []} initialVertical={vertical ?? null} />
      </div>
    </div>
  )
}
