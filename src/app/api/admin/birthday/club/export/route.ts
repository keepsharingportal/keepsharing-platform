import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  await requireAdmin()
  const sb = createAdminClient()
  const { data } = await sb.from('birthday_club_subscribers')
    .select('email, parent_first_name, kid_birthdays, brand_slug, created_at, is_active')
    .order('created_at', { ascending: false })
  const rows = (data ?? []) as Array<Record<string, unknown>>

  const header = ['email', 'parent_first_name', 'kid_birthdays', 'brand_slug', 'created_at', 'is_active']
  const lines  = [header.join(',')]
  for (const r of rows) {
    lines.push(header.map(h => {
      const v = r[h]
      if (h === 'kid_birthdays' && Array.isArray(v)) return csvEscape(JSON.stringify(v))
      return csvEscape(v)
    }).join(','))
  }

  return new Response(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="birthday-club-subscribers-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}

function csvEscape(v: unknown): string {
  if (v == null) return ''
  const s = String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}
