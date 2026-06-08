// /admin/circulation/settings — key/value editor for circulation_settings.

import Link from 'next/link'
import { ArrowLeft, Settings as SettingsIcon } from 'lucide-react'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { regionForMarket, publicationLabelsForRegion } from '@/lib/circulation/regions'
import { SettingsEditor, type SettingRow } from './SettingsEditor'

export const metadata = { title: 'Settings — Distribution' }
export const dynamic  = 'force-dynamic'

// Friendly metadata so the admin sees a label + description instead of
// raw snake_case keys.
const KEY_META: Record<string, { label: string; help: string; type?: 'email' | 'number' | 'text' | 'select'; options?: string[] }> = {
  ops_email:        { label: 'Ops email',         help: 'Distribution manager — gets driver submissions and change requests', type: 'email' },
  owner_email:      { label: 'Owner email',       help: 'Gets monthly summary emails', type: 'email' },
  bookkeeper_email: { label: 'Bookkeeper email',  help: 'Where to send invoice submissions when invoice_handler = bookkeeper', type: 'email' },
  invoice_handler:  { label: 'Invoice handler',   help: 'Who receives driver invoice submissions', type: 'select', options: ['admin', 'bookkeeper'] },
  from_email:       { label: 'From address',      help: 'Sending address for all circulation emails (must be verified in Resend)', type: 'email' },
  from_name:        { label: 'From name',         help: 'Display name on outbound emails', type: 'text' },
  bundle_size:      { label: 'Bundle size',       help: 'Magazines per bundle (for printer handoff)', type: 'number' },
  archive_day:      { label: 'Archive day',       help: 'Day of month when invoices archive (drivers can\'t submit after late_submit_days past this)', type: 'number' },
  late_submit_days: { label: 'Late submit days',  help: 'How many days past month-end drivers can still submit', type: 'number' },
  on_our_way_day:   { label: 'On-our-way day',    help: 'Day of month when on-our-way emails fire', type: 'number' },
  reminder_day:     { label: 'Reminder day',      help: 'Day of month when unsubmitted drivers get reminded', type: 'number' },
}

export default async function SettingsPage() {
  const ctx    = await requireAdmin()
  const market = ctx.viewingAll ? 'rrp' : ctx.activeMarket
  const region = regionForMarket(market)
  const dbKey  = region.slug
  const sb     = createAdminClient()

  let settings: SettingRow[] = []
  try {
    const { data } = await sb.from('circulation_settings').select('*').eq('market', dbKey).order('key')
    settings = (data ?? []) as SettingRow[]
  } catch { /* table missing */ }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-6 pb-16">
      <div className="max-w-[900px] mx-auto space-y-6">

        <div>
          <Link href="/admin/circulation" className="inline-flex items-center gap-1 text-xs text-portal-blue hover:underline mb-1">
            <ArrowLeft size={11} /> Distribution Routes
          </Link>
          <div className="flex items-center gap-2">
            <SettingsIcon size={18} className="text-portal-blue" />
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Settings</h1>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Region: <span className="font-semibold text-gray-700">{region.name}</span>
            <span className="text-gray-400"> · </span>{publicationLabelsForRegion(region)}
          </p>
        </div>

        <SettingsEditor market={dbKey} initial={settings} meta={KEY_META} />
      </div>
    </div>
  )
}
