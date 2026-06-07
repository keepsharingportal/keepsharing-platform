// GET /api/admin/print-placements/export?issue_month=YYYY-MM
//
// Returns the Print Layout View for the given issue as a CSV download.
// Editor's offline workflow: the layout team prefers a spreadsheet for
// the actual layout work, even though they review in the browser.

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  await requireAdmin()
  const issue = new URL(req.url).searchParams.get('issue_month')?.trim() ?? ''
  if (!/^[0-9]{4}-[0-9]{2}$/.test(issue)) {
    return NextResponse.json({ error: 'issue_month query param required (YYYY-MM)' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('print_ad_placements')
    .select('id, design, directory, size, layout, price, social_budget, layout_notes, specific_months, expires_month, notes, advertiser:advertiser_account_id (business_name)')
    .eq('issue_month', issue)
    .order('size', { ascending: false })
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  type Row = {
    id: string; design: string; directory: boolean; size: number;
    layout: string | null; price: number | null; social_budget: number | null;
    layout_notes: string | null; specific_months: string[] | null;
    expires_month: string | null; notes: string | null;
    advertiser: { business_name: string } | { business_name: string }[] | null;
  }
  const rows = (data ?? []) as Row[]
  const getBiz = (r: Row): string => {
    if (!r.advertiser) return ''
    if (Array.isArray(r.advertiser)) return r.advertiser[0]?.business_name ?? ''
    return r.advertiser.business_name ?? ''
  }

  const headers = [
    'Business', 'Design', 'Directory', 'Size', 'Layout',
    'Price', 'Social Budget', 'Layout Notes', 'Specific Months',
    'Expires', 'Notes',
  ]
  const csvLines = [headers.join(',')]
  for (const r of rows) {
    csvLines.push([
      csvCell(getBiz(r)),
      csvCell(r.design),
      r.directory ? 'Yes' : 'No',
      String(r.size),
      csvCell(r.layout ?? ''),
      r.price       != null ? String(r.price)         : '',
      r.social_budget != null ? String(r.social_budget) : '',
      csvCell(r.layout_notes ?? ''),
      csvCell((r.specific_months ?? []).join('; ')),
      csvCell(r.expires_month ?? ''),
      csvCell(r.notes ?? ''),
    ].join(','))
  }
  const body = csvLines.join('\n')
  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type':        'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="print-layout-${issue}.csv"`,
    },
  })
}

function csvCell(v: string): string {
  if (v == null) return ''
  const needsQuotes = /[",\n]/.test(v)
  const escaped     = v.replace(/"/g, '""')
  return needsQuotes ? `"${escaped}"` : escaped
}
