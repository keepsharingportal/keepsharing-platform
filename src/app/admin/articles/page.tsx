import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { ArticleBulkActionsTable } from './ArticleBulkActionsTable'
import { SCHOOL_ZONE_COLUMN_SLUGS } from '@/lib/content-taxonomy'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Articles — Admin' }
export const dynamic = 'force-dynamic'

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

const FILTERS = [
  // ── Status ───────────────────────────────────────
  { key: 'all',             label: 'All Articles'    },
  { key: 'pending',         label: 'Needs Review'    },
  { key: 'published',       label: 'Published'       },
  { key: 'draft',           label: 'Drafts'          },
  { key: 'needs_revision',  label: 'Needs Revision'  },
  { key: 'imported',        label: 'Imported'        },
  { key: 'missing-image',   label: 'Missing Image'   },
  // ── Vertical / column ────────────────────────────
  { key: 'school-zone',     label: 'School Zone'     },
  { key: 'school-bits',     label: 'School Bits'     },
  { key: 'teacher-of-month', label: 'Teacher of Month' },
  { key: 'mom-to-mom',      label: 'Mom to Mom'      },
  { key: 'summer-fun',      label: 'Summer Fun'      },
  // ── Issue months ─────────────────────────────────
  { key: 'jun-2026',        label: 'June 2026'       },
  { key: 'may-2026',        label: 'May 2026'        },
  { key: 'apr-2026',        label: 'April 2026'      },
  { key: 'mar-2026',        label: 'March 2026'      },
] as const

type FilterKey = typeof FILTERS[number]['key']

async function fetchArticles(filter: FilterKey) {
  const supabase = supabaseAdmin()

  let query = supabase
    .from('guide_articles')
    .select('id, title, slug, published, editorial_review_status, import_status, column_slug, guide_slug, hero_image_url, published_at, source_issue_month')
    .order('created_at', { ascending: false })
    .limit(150)

  switch (filter) {
    case 'pending':
      query = query.eq('editorial_review_status', 'pending')
      break
    case 'published':
      query = query.eq('published', true)
      break
    case 'draft':
      query = query.eq('editorial_review_status', 'draft')
      break
    case 'needs_revision':
      query = query.eq('editorial_review_status', 'needs_revision')
      break
    case 'imported':
      query = query.eq('import_status', 'imported')
      break
    case 'missing-image':
      query = query.is('hero_image_url', null)
      break
    case 'school-zone':
      query = query.in('column_slug', SCHOOL_ZONE_COLUMN_SLUGS)
      break
    case 'school-bits':
      query = query.eq('column_slug', 'school-bits')
      break
    case 'teacher-of-month':
      query = query.eq('column_slug', 'teacher-of-month')
      break
    case 'mom-to-mom':
      query = query.eq('column_slug', 'mom-to-mom')
      break
    case 'summer-fun':
      query = query.eq('column_slug', 'summer-fun')
      break
    case 'jun-2026':
      query = query.gte('published_at', '2026-06-01').lt('published_at', '2026-07-01')
      break
    case 'may-2026':
      query = query.gte('published_at', '2026-05-01').lt('published_at', '2026-06-01')
      break
    case 'apr-2026':
      query = query.gte('published_at', '2026-04-01').lt('published_at', '2026-05-01')
      break
    case 'mar-2026':
      query = query.gte('published_at', '2026-03-01').lt('published_at', '2026-04-01')
      break
  }

  const { data } = await query
  return data ?? []
}

interface PageProps {
  searchParams: Promise<{ filter?: string }>
}

// Group filter tabs by category for the header
const STATUS_FILTERS  = FILTERS.filter(f => ['all', 'pending', 'published', 'draft', 'needs_revision', 'imported', 'missing-image'].includes(f.key))
const SECTION_FILTERS = FILTERS.filter(f => ['school-zone', 'school-bits', 'teacher-of-month', 'mom-to-mom', 'summer-fun'].includes(f.key))
const MONTH_FILTERS   = FILTERS.filter(f => ['jun-2026', 'may-2026', 'apr-2026', 'mar-2026'].includes(f.key))

export default async function ArticlesAdminPage({ searchParams }: PageProps) {
  const { filter: filterParam } = await searchParams
  const activeFilter = (FILTERS.some(f => f.key === filterParam) ? filterParam : 'all') as FilterKey

  const articles = await fetchArticles(activeFilter)

  function tabHref(key: string) {
    return key === 'all' ? '/admin/articles' : `/admin/articles?filter=${key}`
  }

  function tabClass(key: string) {
    return [
      'shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors',
      activeFilter === key
        ? 'bg-blue-600 text-white'
        : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100',
    ].join(' ')
  }

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50">
      {/* Sticky header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Articles</h1>
            <p className="text-xs text-gray-400 mt-0.5">Manage all editorial content across publications</p>
          </div>
          <Link
            href="/admin/articles/new"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={14} /> New Article
          </Link>
        </div>

        {/* Status filters */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {STATUS_FILTERS.map(f => (
            <Link key={f.key} href={tabHref(f.key)} className={tabClass(f.key)}>
              {f.label}
            </Link>
          ))}

          <div className="w-px h-4 bg-gray-200 mx-1 shrink-0" />

          {SECTION_FILTERS.map(f => (
            <Link key={f.key} href={tabHref(f.key)} className={tabClass(f.key)}>
              {f.label}
            </Link>
          ))}

          <div className="w-px h-4 bg-gray-200 mx-1 shrink-0" />

          {MONTH_FILTERS.map(f => (
            <Link key={f.key} href={tabHref(f.key)} className={tabClass(f.key)}>
              {f.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="p-4">
        <ArticleBulkActionsTable articles={articles} />
      </div>

      {/* Taxonomy quick-links */}
      <div className="px-4 pb-6">
        <div className="flex items-center gap-3 text-xs text-gray-400">
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
