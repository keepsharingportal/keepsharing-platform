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
}

export interface AdvertiserOption {
  id:            string
  business_name: string
}

export default async function ShortLinksPage() {
  await requireAdmin()

  const supabase = createAdminClient()
  // Try the full select including ad_placement_id (migration 123). If
  // that column doesn't exist yet, degrade — the client tolerates the
  // field being undefined and just treats every row as a QR code.
  const fullCols = 'id, shortcode, destination, content_type, content_data, utm_source, utm_medium, utm_campaign, utm_content, label, click_count, is_active, created_at, advertiser_account_id, ad_placement_id, qr_primary_color, qr_bg_color'
  const minCols  = 'id, shortcode, destination, content_type, content_data, utm_source, utm_medium, utm_campaign, utm_content, label, click_count, is_active, created_at, advertiser_account_id, qr_primary_color, qr_bg_color'
  let dataRes = await supabase.from('short_links').select(fullCols)
    .order('created_at', { ascending: false }).limit(200)
  if (dataRes.error && /column .* does not exist/i.test(dataRes.error.message)) {
    dataRes = await supabase.from('short_links').select(minCols)
      .order('created_at', { ascending: false }).limit(200) as typeof dataRes
  }
  const data = dataRes.data

  // Load advertiser list for the dropdown
  const { data: advData } = await supabase
    .from('advertiser_accounts')
    .select('id, business_name')
    .order('business_name', { ascending: true })
    .limit(500)

  return (
    <div className="flex-1 overflow-y-auto">
      <ShortLinksClient
        initialRows={(data ?? []) as ShortLinkRow[]}
        advertisers={(advData ?? []) as AdvertiserOption[]}
      />
    </div>
  )
}
