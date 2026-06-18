// /admin/birthday/lead-magnets
//
// Editor surface for downloadable lead magnets that Planning Timeline
// signups receive. Today there's one — the Birthday Bash Planner. New
// magnets can be added with a seed migration; this page picks them up
// automatically because the client iterates over every row.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { ArrowLeft, Mail } from 'lucide-react'
import { LeadMagnetsClient } from './LeadMagnetsClient'

export const metadata: Metadata = { title: 'Birthday Lead Magnets — Admin' }
export const dynamic = 'force-dynamic'

export default async function BirthdayLeadMagnetsAdminPage() {
  await requireAdmin()
  const sb = createAdminClient()
  const { data } = await sb
    .from('birthday_lead_magnets')
    .select('*')
    .eq('brand_slug', 'rrp')
    .order('slug')

  return (
    <div className="flex-1 overflow-y-auto bg-portal-bg">
      <div className="bg-white border-b border-portal-border px-6 py-4">
        <Link href="/admin/birthday" className="text-[11px] font-semibold text-portal-sub hover:text-portal-text inline-flex items-center gap-1 mb-1">
          <ArrowLeft size={11} /> Birthday Bash
        </Link>
        <h1 className="text-[18px] font-bold text-portal-text inline-flex items-center gap-2">
          <Mail size={16} /> Lead Magnets
        </h1>
        <p className="text-[12px] text-portal-sub mt-1">
          The PDF + email mom receives when she signs up via the <strong>Planning Timeline</strong> form on the public portal.
          Upload the file, edit the email, save. The next signup gets it.
        </p>
      </div>
      <div className="p-6 max-w-3xl">
        <LeadMagnetsClient initial={data ?? []} />
      </div>
    </div>
  )
}
