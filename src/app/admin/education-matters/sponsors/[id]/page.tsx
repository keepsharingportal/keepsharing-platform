import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { requireSettingsAccess } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSponsorship } from '@/lib/education-matters/column-sponsorships'
import { SponsorshipEditorClient, type SponsorshipEditorRow, type AdvertiserOption } from '../SponsorshipEditorClient'

export const metadata: Metadata = { title: 'Edit sponsorship — Education Matters — Admin' }
export const dynamic = 'force-dynamic'

interface PageProps { params: Promise<{ id: string }> }

export default async function EditSponsorshipPage({ params }: PageProps) {
  await requireSettingsAccess()
  const sb = createAdminClient()
  const { id } = await params
  const row = await getSponsorship(sb, id)
  if (!row) notFound()

  const { data: advRows } = await sb
    .from('advertiser_accounts')
    .select('id, business_name')
    .order('business_name', { ascending: true })

  const advertisers: AdvertiserOption[] = (advRows ?? []) as AdvertiserOption[]

  const initial: SponsorshipEditorRow = {
    id:                    row.id,
    column_slug:           row.column_slug,
    advertiser_account_id: row.advertiser_account_id,
    start_month:           row.start_month.slice(0, 7),  // 'YYYY-MM-DD' → 'YYYY-MM' for <input type="month">
    end_month:             row.end_month.slice(0, 7),
    status:                row.status,
    sponsor_name:          row.sponsor_name,
    sponsor_url:           row.sponsor_url ?? '',
    sponsor_tagline:       row.sponsor_tagline ?? '',
    sponsor_description:   row.sponsor_description ?? '',
    sponsor_logo_url:      row.sponsor_logo_url ?? '',
    sponsor_image_url:     row.sponsor_image_url ?? '',
    sponsor_button_text:   row.sponsor_button_text ?? '',
    notes:                 row.notes ?? '',
  }

  return <SponsorshipEditorClient initial={initial} advertisers={advertisers} />
}
