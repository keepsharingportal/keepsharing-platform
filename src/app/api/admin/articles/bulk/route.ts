// POST /api/admin/articles/bulk
// Supported actions: 'approve' | 'archive' | 'draft'
// Optional payload field: columnSlug (for future 'assign_column' action)

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  )
}

type BulkAction = 'approve' | 'archive' | 'draft'

const ACTION_UPDATES: Record<BulkAction, Record<string, unknown>> = {
  approve: {
    published:               true,
    editorial_review_status: 'approved',
    published_at:            '__NOW__',
  },
  archive: {
    published:               false,
    editorial_review_status: 'archived',
  },
  draft: {
    published:               false,
    editorial_review_status: 'draft',
  },
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { articleIds?: unknown; action?: unknown }

    const articleIds = body.articleIds
    const action     = body.action as BulkAction | undefined

    if (!Array.isArray(articleIds) || articleIds.length === 0) {
      return NextResponse.json({ error: 'No article IDs provided' }, { status: 400 })
    }
    if (!action || !ACTION_UPDATES[action]) {
      return NextResponse.json({ error: `Unknown action: ${String(action)}` }, { status: 400 })
    }

    const updates = { ...ACTION_UPDATES[action] }
    if (updates.published_at === '__NOW__') {
      updates.published_at = new Date().toISOString()
    }

    const supabase = supabaseAdmin()
    const { error, count } = await supabase
      .from('guide_articles')
      .update(updates)
      .in('id', articleIds as string[])

    if (error) {
      console.error('[bulk] Supabase error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    revalidatePath('/')
    revalidatePath('/school-zone')
    revalidatePath('/school-bits')
    revalidatePath('/articles')

    return NextResponse.json({ success: true, action, updated: count ?? articleIds.length })
  } catch (e) {
    console.error('[bulk] error:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

// GET /api/admin/articles/bulk?month=YYYY-MM&format=csv
// Returns a manifest of articles in the given issue month. Used by Production
// Export Packages and Distribution Print Export to hand off to print/InDesign.
export async function GET(req: NextRequest) {
  const url    = new URL(req.url)
  const month  = url.searchParams.get('month')
  const format = url.searchParams.get('format') ?? 'csv'

  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: 'month query param required (YYYY-MM)' }, { status: 400 })
  }

  const supabase = supabaseAdmin()
  const { data, error } = await supabase
    .from('guide_articles')
    .select('id, title, slug, author_name, column_slug, target_publication, hero_image_url, published, source_issue_month')
    .gte('source_issue_month', `${month}-01`)
    .lt('source_issue_month',  `${month}-31`)
    .order('column_slug', { ascending: true, nullsFirst: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (format === 'json') return NextResponse.json({ month, count: data?.length ?? 0, articles: data ?? [] })

  // CSV — RFC 4180 quoting
  const rows = data ?? []
  const headers = ['title', 'slug', 'author_name', 'column_slug', 'target_publication', 'hero_image_url', 'published']
  const escape = (v: unknown) => {
    const s = v == null ? '' : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const csv = [
    headers.join(','),
    ...rows.map(r => headers.map(h => escape((r as Record<string, unknown>)[h])).join(',')),
  ].join('\n')

  return new NextResponse(csv, {
    headers: {
      'Content-Type':        'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="manifest-${month}.csv"`,
    },
  })
}
