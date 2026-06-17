// GET /api/admin/birthday/subscribers/export
// Downloads the subscriber list as CSV. Suitable for direct ESP import.

import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  await requireAdmin()
  const sb = createAdminClient()
  const { data } = await sb.from('birthday_planning_subscribers')
    .select('email, child_first_name, party_date, source, brand_slug, created_at, is_active')
    .order('created_at', { ascending: false })

  const rows = (data ?? []) as Array<Record<string, unknown>>

  const csvHeader = ['email', 'child_first_name', 'party_date', 'source', 'brand_slug', 'created_at', 'is_active']
  const csvLines  = [csvHeader.join(',')]
  for (const r of rows) {
    csvLines.push(csvHeader.map(h => csvEscape(r[h])).join(','))
  }
  const csv = csvLines.join('\n')

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="birthday-insider-subscribers-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}

function csvEscape(v: unknown): string {
  if (v == null) return ''
  const s = String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}
