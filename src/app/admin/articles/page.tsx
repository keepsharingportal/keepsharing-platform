import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { ArticleBulkActionsTable, type SortKey } from './ArticleBulkActionsTable'
import { ArticleFilterBar, type FilterOption } from './ArticleFilterBar'
import { COLUMNS, SCHOOL_ZONE_COLUMN_SLUGS } from '@/lib/content-taxonomy'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Articles — Admin' }
export const dynamic = 'force-dynamic'

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

const PAGE_SIZE = 50

// ── Filter dimensions ────────────────────────────────────────────────────────

const STATUS_OPTIONS: FilterOption[] = [
  { value: 'all',            label: 'All articles'    },
  { value: 'published',      label: 'Published'       },
  { value: 'draft',          label: 'Drafts'          },
  { value: 'pending',        label: 'Needs review'    },
  { value: 'needs_revision', label: 'Needs revision'  },
  { value: 'imported',       label: 'Imported'        },
  { value: 'missing_image',  label: 'Missing image'   },
  { value: 'top_views',      label: 'Top by views'    },
]

const SORT_OPTIONS: FilterOption[] = [
  { value: 'newest', label: 'Newest first'   },
  { value: 'oldest', label: 'Oldest first'   },
  { value: 'views',  label: 'Most viewed'    },
  { value: 'title',  label: 'Title A→Z'      },
]

const VALID_SORTS = new Set(SORT_OPTIONS.map(o => o.value))
const VALID_STATUSES = new Set(STATUS_OPTIONS.map(o => o.value))

// Section options come from the COLUMNS taxonomy. Add a few section-group
// shortcuts (e.g. "All School Zone") at the top.
function buildSectionOptions(): FilterOption[] {
  const groups: FilterOption[] = [
    { value: 'all',           label: 'All sections'   },
    { value: 'g:school-zone', label: '— All School Zone —' },
  ]
  const cols: FilterOption[] = COLUMNS
    .map(c => ({ value: c.slug, label: c.label }))
    .sort((a, b) => a.label.localeCompare(b.label))
  return [...groups, ...cols]
}

// Build last ~12 issue months for the dropdown. Format: YYYY-MM.
function buildMonthOptions(): FilterOption[] {
  const now = new Date()
  const out: FilterOption[] = [{ value: 'all', label: 'All issues' }]
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleString('en-US', { month: 'long', year: 'numeric' })
    out.push({ value, label })
  }
  return out
}

// ── Legacy filter mapping ────────────────────────────────────────────────────
// Old single-key URLs (?filter=published, ?filter=school-zone, ?filter=may-2026)
// continue to work — we translate them to the new dimensional params here.

const LEGACY_FILTER_MAP: Record<string, { status?: string; section?: string; month?: string }> = {
  pending:         { status: 'pending'        },
  published:       { status: 'published'      },
  draft:           { status: 'draft'          },
  needs_revision:  { status: 'needs_revision' },
  imported:        { status: 'imported'       },
  'missing-image': { status: 'missing_image'  },
  'top-views':     { status: 'top_views'      },

  'school-zone':    { section: 'g:school-zone' },
  'school-bits':    { section: 'school-bits'    },
  'teacher-of-month':{ section: 'teacher-of-month' },
  'mom-knows-best': { section: 'mom-knows-best' },
  'mom-to-mom':     { section: 'mom-to-mom'    },
  'summer-fun':     { section: 'summer-fun'    },

  'jun-2026': { month: '2026-06' },
  'may-2026': { month: '2026-05' },
  'apr-2026': { month: '2026-04' },
  'mar-2026': { month: '2026-03' },
}

// ── Fetch ────────────────────────────────────────────────────────────────────

async function fetchArticles(opts: {
  q:       string
  status:  string
  section: string
  month:   string
  sort:    SortKey
  page:    number
}) {
  const supabase = supabaseAdmin()

  let query = supabase
    .from('guide_articles')
    .select('id, title, slug, published, editorial_review_status, import_status, column_slug, guide_slug, hero_image_url, published_at, source_issue_month, view_count, author_name', { count: 'exact' })

  // Search
  if (opts.q) {
    // Match any of: title, slug, author_name, column_slug. Escape commas.
    const safe = opts.q.replace(/[%,]/g, ' ').trim()
    if (safe) {
      query = query.or(`title.ilike.%${safe}%,slug.ilike.%${safe}%,author_name.ilike.%${safe}%,column_slug.ilike.%${safe}%`)
    }
  }

  // Status
  switch (opts.status) {
    case 'pending':        query = query.eq('editorial_review_status', 'pending');        break
    case 'published':      query = query.eq('published', true);                            break
    case 'draft':          query = query.eq('editorial_review_status', 'draft');           break
    case 'needs_revision': query = query.eq('editorial_review_status', 'needs_revision');  break
    case 'imported':       query = query.eq('import_status', 'imported');                  break
    case 'missing_image':  query = query.is('hero_image_url', null);                       break
    case 'top_views':      query = query.eq('published', true).gt('view_count', 0);        break
  }

  // Section
  if (opts.section === 'g:school-zone') {
    query = query.in('column_slug', SCHOOL_ZONE_COLUMN_SLUGS)
  } else if (opts.section !== 'all') {
    query = query.eq('column_slug', opts.section)
  }

  // Issue month — expects YYYY-MM
  if (opts.month !== 'all') {
    const [y, m] = opts.month.split('-').map(Number)
    if (y && m) {
      const start = `${y}-${String(m).padStart(2, '0')}-01`
      const next  = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`
      query = query.gte('published_at', start).lt('published_at', next)
    }
  }

  // Sort. top_views status implies views sort.
  const effectiveSort: SortKey = opts.status === 'top_views' ? 'views' : opts.sort
  switch (effectiveSort) {
    case 'newest': query = query.order('created_at',  { ascending: false });                                    break
    case 'oldest': query = query.order('created_at',  { ascending: true  });                                    break
    case 'views':  query = query.order('view_count',  { ascending: false }).order('published_at', { ascending: false, nullsFirst: false }); break
    case 'title':  query = query.order('title',       { ascending: true  });                                    break
  }

  // Pagination
  const from = (opts.page - 1) * PAGE_SIZE
  const to   = from + PAGE_SIZE - 1
  query = query.range(from, to)

  const { data, count } = await query
  return { rows: data ?? [], total: count ?? 0 }
}

// ── Page ─────────────────────────────────────────────────────────────────────

interface PageProps {
  searchParams: Promise<{
    q?:       string
    status?:  string
    section?: string
    month?:   string
    sort?:    string
    page?:    string
    filter?:  string  // legacy
  }>
}

export default async function ArticlesAdminPage({ searchParams }: PageProps) {
  const raw = await searchParams

  // Translate legacy ?filter=foo into the new dimensional params
  const legacy = raw.filter ? LEGACY_FILTER_MAP[raw.filter] : undefined

  const q       = (raw.q ?? '').trim()
  const status  = VALID_STATUSES.has(raw.status ?? '') ? raw.status! : (legacy?.status ?? 'all')
  const section = raw.section || legacy?.section || 'all'
  const month   = raw.month   || legacy?.month   || 'all'
  const sort    = (VALID_SORTS.has(raw.sort ?? '') ? raw.sort! : 'newest') as SortKey
  const page    = Math.max(1, Number(raw.page) || 1)

  const { rows, total } = await fetchArticles({ q, status, section, month, sort, page })
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const statusOptions  = STATUS_OPTIONS
  const sectionOptions = buildSectionOptions()
  const monthOptions   = buildMonthOptions()

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50">
      {/* Sticky header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Articles</h1>
            <p className="text-xs text-gray-400 mt-0.5">Search and filter editorial content across publications.</p>
          </div>
          <Link
            href="/admin/articles/new"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={14} /> New Article
          </Link>
        </div>

        <ArticleFilterBar
          initialQuery={q}
          statusValue={status}
          sectionValue={section}
          monthValue={month}
          sortValue={sort}
          totalResults={total}
          statusOptions={statusOptions}
          sectionOptions={sectionOptions}
          monthOptions={monthOptions}
          sortOptions={SORT_OPTIONS}
        />
      </div>

      {/* Table */}
      <div className="p-4">
        <ArticleBulkActionsTable
          articles={rows}
          total={total}
          page={page}
          pageSize={PAGE_SIZE}
          totalPages={totalPages}
          activeSort={sort}
          activeFilter={status === 'top_views' ? 'top-views' : 'all'}
        />
      </div>

      {/* Taxonomy quick-links */}
      <div className="px-4 pb-6">
        <div className="flex items-center gap-3 text-xs text-gray-400 flex-wrap">
          <span className="font-semibold text-gray-500">Jump to:</span>
          <Link href="/admin/articles/columns" className="hover:text-blue-600 transition-colors">Columns</Link>
          <Link href="/admin/articles/authors" className="hover:text-blue-600 transition-colors">Authors</Link>
          <Link href="/admin/content/imports"  className="hover:text-blue-600 transition-colors">Imports</Link>
          <Link href="/admin/articles/review"  className="hover:text-blue-600 transition-colors">Review Queue</Link>
        </div>
      </div>
    </div>
  )
}
