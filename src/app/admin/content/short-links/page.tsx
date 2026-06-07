// /admin/content/short-links — manage QR / print shortcodes.
//
// Staff creates a shortcode like "playball" → the QR in the magazine
// encodes riverregionparents.com/go/playball. When scanned, it redirects
// to the real destination with UTMs auto-appended.
//
// This page shows all shortcodes with click counts, lets you create new
// ones, and copy the full URL for pasting into QR generators.

import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/admin/auth'
import { ShortLinksClient } from './ShortLinksClient'

export const metadata: Metadata = { title: 'QR Codes — Admin' }
export const dynamic  = 'force-dynamic'

export interface ShortLinkRow {
  id:                    string
  shortcode:             string
  destination:           string
  content_type:          string
  content_data:          Record<string, unknown> | null
  utm_source:            string
  utm_medium:            string
  utm_campaign:          string | null
  utm_content:           string | null
  label:                 string | null
  click_count:           number
  is_active:             boolean
  created_at:            string
  advertiser_account_id: string | null
  /** Set by /api/admin/ads/tracked-link when the editor generates a
   *  tracked CTA on an ad. NULL = this row was minted as a QR code. */
  ad_placement_id:       string | null
  qr_primary_color:      string | null
  qr_bg_color:           string | null
  /** Migration 127. The WHAT — 'qr' (printable), 'ad' (on-site CTA),
   *  or 'campaign' (external distribution). Always present after the
   *  migration runs (column has a NOT NULL default of 'qr'); typed
   *  as `string` to stay tolerant of pre-migration DBs. */
  purpose:               string
  /** Migration 127. The WHERE — 'print' | 'on_site' | 'facebook' |
   *  'instagram' | 'tiktok' | 'email' | 'landing_page' | 'other'.
   *  Nullable: a row that's not pinned to a specific channel just
   *  isn't filtered on that axis. */
  channel:               string | null
  /** Migration 127. Stamped by /go/[shortcode] on every click. NULL
   *  for rows that haven't been hit since the migration. Drives the
   *  "Most recently clicked" sort. */
  last_clicked_at:       string | null
}

export interface AdvertiserOption {
  id:            string
  business_name: string
}

export default async function ShortLinksPage() {
  await requireAdmin()

  const supabase = createAdminClient()
  // Three-tier fallback to stay tolerant of mid-migration DBs.
  //   max: migration 127 (purpose + channel + last_clicked_at)
  //   mid: migration 123 (ad_placement_id)
  //   min: pre-123
  // Each fallback only fires when the previous one errors with a
  // "column does not exist" — any other failure surfaces.
  const cols127 = 'id, shortcode, destination, content_type, content_data, utm_source, utm_medium, utm_campaign, utm_content, label, click_count, is_active, created_at, advertiser_account_id, ad_placement_id, qr_primary_color, qr_bg_color, purpose, channel, last_clicked_at'
  const cols123 = 'id, shortcode, destination, content_type, content_data, utm_source, utm_medium, utm_campaign, utm_content, label, click_count, is_active, created_at, advertiser_account_id, ad_placement_id, qr_primary_color, qr_bg_color'
  const colsMin = 'id, shortcode, destination, content_type, content_data, utm_source, utm_medium, utm_campaign, utm_content, label, click_count, is_active, created_at, advertiser_account_id, qr_primary_color, qr_bg_color'
  let dataRes = await supabase.from('short_links').select(cols127)
    .order('created_at', { ascending: false }).limit(200)
  if (dataRes.error && /column .* does not exist/i.test(dataRes.error.message)) {
    dataRes = await supabase.from('short_links').select(cols123)
      .order('created_at', { ascending: false }).limit(200) as typeof dataRes
  }
  if (dataRes.error && /column .* does not exist/i.test(dataRes.error.message)) {
    dataRes = await supabase.from('short_links').select(colsMin)
      .order('created_at', { ascending: false }).limit(200) as typeof dataRes
  }
  // Normalize: rows from older selects miss the migration-127 fields.
  // Default purpose by ad_placement_id presence so client filters still
  // partition correctly; channel + last_clicked_at default to null.
  const raw = (dataRes.data ?? []) as Array<Partial<ShortLinkRow> & { ad_placement_id: string | null }>
  const data = raw.map(r => ({
    ...r,
    purpose:         r.purpose         ?? (r.ad_placement_id ? 'ad' : 'qr'),
    channel:         r.channel         ?? null,
    last_clicked_at: r.last_clicked_at ?? null,
  })) as ShortLinkRow[]

  // Load advertiser list for the dropdown
  const { data: advData } = await supabase
    .from('advertiser_accounts')
    .select('id, business_name')
    .order('business_name', { ascending: true })
    .limit(500)

  return (
    <div className="flex-1 overflow-y-auto">
      <ShortLinksClient
        initialRows={data}
        advertisers={(advData ?? []) as AdvertiserOption[]}
      />
    </div>
  )
}
