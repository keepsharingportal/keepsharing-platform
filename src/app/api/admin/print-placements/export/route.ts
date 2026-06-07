// GET /api/admin/print-placements/export?issue_month=YYYY-MM
//
// Returns the Print Layout View for the given issue as a single CSV
// download that contains BOTH the editor's preferred sort views:
//
//   === SORTED BY SIZE (largest first) ===
//   Business,Design,...
//   ...rows sorted by size desc...
//
//   === SORTED BY BUSINESS NAME (A→Z) ===
//   Business,Design,...
//   ...same rows, sorted by business name asc...
//
// Opens cleanly in Excel / Google Sheets / Numbers — the editor scrolls
// down to the second section to see the alphabetical version without
// having to download two files. Pages / revenue / social totals print
// at the end of each section.

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

interface Row {
  id:              string
  design:          string
  directory:       boolean
  size:            number
  layout:          string | null
  price:           number | null
  social_budget:   number | null
  layout_notes:    string | null
  expires_month:   string | null
  notes:           string | null
  is_ongoing:      boolean | null
  advertiser:      { business_name: string } | { business_name: string }[] | null
}

function getBiz(r: Row): string {
  if (!r.advertiser) return ''
  if (Array.isArray(r.advertiser)) return r.advertiser[0]?.business_name ?? ''
  return r.advertiser.business_name ?? ''
}

const HEADERS = [
  'Business', 'Status', 'Design', 'Directory', 'Size', 'Layout',
  'Price', 'Social Budget', 'Layout Notes', 'Expires', 'Notes',
]

function statusFor(r: Row, issue: string): string {
  if (r.expires_month && r.expires_month < issue) return 'EXPIRED'
  return r.is_ongoing === false ? 'CHECK' : 'Ongoing'
}

function rowToCells(r: Row, issue: string): string[] {
  return [
    csvCell(getBiz(r)),
    csvCell(statusFor(r, issue)),
    csvCell(r.design),
    r.directory ? 'Yes' : 'No',
    String(r.size),
    csvCell(r.layout ?? ''),
    r.price         != null ? String(r.price)         : '',
    r.social_budget != null ? String(r.social_budget) : '',
    csvCell(r.layout_notes ?? ''),
    csvCell(r.expires_month ?? ''),
    csvCell(r.notes ?? ''),
  ]
}

function totalsRow(rows: Row[]): string[] {
  const pages   = rows.reduce((s, r) => s + (r.size ?? 0), 0)
  const price   = rows.reduce((s, r) => s + (r.price ?? 0), 0)
  const social  = rows.reduce((s, r) => s + (r.social_budget ?? 0), 0)
  return [
    csvCell(`TOTAL — ${rows.length} placement${rows.length === 1 ? '' : 's'}`),
    '', '', '',
    pages.toFixed(2),
    '',
    String(price),
    String(social),
    '', '', '',
  ]
}

export async function GET(req: NextRequest) {
  await requireAdmin()
  const issue = new URL(req.url).searchParams.get('issue_month')?.trim() ?? ''
  if (!/^[0-9]{4}-[0-9]{2}$/.test(issue)) {
    return NextResponse.json({ error: 'issue_month query param required (YYYY-MM)' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('print_ad_placements')
    .select('id, design, directory, size, layout, price, social_budget, layout_notes, expires_month, notes, is_ongoing, advertiser:advertiser_account_id (business_name)')
    .eq('issue_month', issue)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  const rows = (data ?? []) as Row[]

  // Two sort orderings, both consumed by the editor in different
  // contexts (size for layout placement; business name for reference /
  // billing reconciliation).
  const bySize = [...rows].sort((a, b) => (b.size ?? 0) - (a.size ?? 0))
  const byName = [...rows].sort((a, b) => getBiz(a).localeCompare(getBiz(b)))

  // Build the two-section CSV. The empty rows between sections give
  // Excel/Sheets a visual separator so the editor can spot the boundary
  // without reading the section header.
  const lines: string[] = []
  function section(title: string, sorted: Row[]) {
    lines.push(csvCell(`=== ${title} ===`))
    lines.push(HEADERS.join(','))
    for (const r of sorted) lines.push(rowToCells(r, issue).join(','))
    lines.push(totalsRow(sorted).join(','))
    lines.push('')
  }
  section('SORTED BY SIZE (largest first)', bySize)
  section('SORTED BY BUSINESS NAME (A-Z)',  byName)

  return new NextResponse(lines.join('\n'), {
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
