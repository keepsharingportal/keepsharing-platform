// /admin/print-placements/[id]/edit — full-page edit for one print
// placement. Built as a Zoho-style sectioned form so the editor isn't
// editing 11 fields in a single squashed table row.

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/admin/auth'
import { EditClient, type EditablePlacement } from './EditClient'

export const metadata: Metadata = { title: 'Edit Print Placement — Admin' }
export const dynamic  = 'force-dynamic'

interface Props { params: Promise<{ id: string }> }

export default async function PrintPlacementEditPage({ params }: Props) {
  await requireAdmin()
  const { id } = await params

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('print_ad_placements')
    .select(`
      id, advertiser_account_id, issue_month, design, directory, size,
      layout, price, social_budget, layout_notes, expires_month, notes,
      is_ongoing, ad_label, specific_months,
      advertiser:advertiser_account_id (id, business_name, slug)
    `)
    .eq('id', id)
    .maybeSingle()

  if (error || !data) return notFound()

  type Adv = { id: string; business_name: string; slug: string | null } | null
  const raw = data as unknown as Omit<EditablePlacement, 'business_name' | 'advertiser_slug'> & {
    advertiser: Adv | Adv[]
  }
  const adv: Adv = Array.isArray(raw.advertiser) ? (raw.advertiser[0] ?? null) : raw.advertiser
  const placement: EditablePlacement = {
    ...raw,
    business_name:    adv?.business_name ?? '(unknown business)',
    advertiser_slug:  adv?.slug ?? null,
  }

  return (
    <div className="flex-1 overflow-y-auto bg-portal-bg min-h-full">
      <EditClient placement={placement} />
    </div>
  )
}
