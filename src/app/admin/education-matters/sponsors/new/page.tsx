import type { Metadata } from 'next'
import { requireSettingsAccess } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { SponsorshipEditorClient, type SponsorshipEditorRow, type AdvertiserOption } from '../SponsorshipEditorClient'
import { EDUCATION_DISTRICTS, isEducationMattersColumn } from '@/lib/education-matters/districts'

export const metadata: Metadata = { title: 'New sponsorship — Education Matters — Admin' }
export const dynamic = 'force-dynamic'

interface PageProps { searchParams: Promise<{ column?: string }> }

export default async function NewSponsorshipPage({ searchParams }: PageProps) {
  await requireSettingsAccess()
  const sb = createAdminClient()
  const { column } = await searchParams

  const { data: advRows } = await sb
    .from('advertiser_accounts')
    .select('id, business_name')
    .order('business_name', { ascending: true })

  const advertisers: AdvertiserOption[] = (advRows ?? []) as AdvertiserOption[]

  const preselectColumn = column && isEducationMattersColumn(column)
    ? column
    : EDUCATION_DISTRICTS[0]?.slug ?? ''

  const initial: SponsorshipEditorRow = {
    id:                    null,
    column_slug:           preselectColumn,
    advertiser_account_id: null,
    start_month:           firstOfCurrentMonth(),
    end_month:             lastMonthOfNextYear(),
    status:                'active',
    sponsor_name:          '',
    sponsor_url:           '',
    sponsor_tagline:       '',
    sponsor_description:   '',
    sponsor_logo_url:      '',
    sponsor_image_url:     '',
    sponsor_button_text:   '',
    notes:                 '',
  }

  return <SponsorshipEditorClient initial={initial} advertisers={advertisers} />
}

function firstOfCurrentMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
function lastMonthOfNextYear(): string {
  // Default a 12-month contract: current month + 11.
  const d = new Date()
  d.setMonth(d.getMonth() + 11)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
