import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { ArrowLeft, FileText } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Authors — Admin' }
export const dynamic = 'force-dynamic'

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

interface AuthorStat {
  name: string
  total: number
  published: number
  draft: number
}

async function fetchAuthorStats(): Promise<AuthorStat[]> {
  const supabase = supabaseAdmin()
  const { data } = await supabase
    .from('guide_articles')
    .select('author_name, published, editorial_review_status')
    .not('author_name', 'is', null)

  const map = new Map<string, AuthorStat>()

  for (const row of data ?? []) {
    const name = (row.author_name as string | null)?.trim()
    if (!name) continue
    const existing = map.get(name) ?? { name, total: 0, published: 0, draft: 0 }
    existing.total++
    if (row.published) existing.published++
    if (row.editorial_review_status === 'draft') existing.draft++
    map.set(name, existing)
  }

  return [...map.values()].sort((a, b) => b.total - a.total)
}

export default async function AuthorsAdminPage() {
  const authors = await fetchAuthorStats()

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center gap-3 mb-1">
          <Link href="/admin/articles" className="text-gray-400 hover:text-gray-600 transition-colors">
            <ArrowLeft size={16} />
          </Link>
          <h1 className="text-xl font-semibold text-gray-900">Authors</h1>
        </div>
        <p className="text-xs text-gray-400 ml-7">
          {authors.length} contributor{authors.length !== 1 ? 's' : ''} with articles in the system
        </p>
      </div>

      <div className="p-6 max-w-3xl">
        {authors.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <p className="text-gray-400 text-sm">No authors found. Authors are pulled from the <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">author_name</code> field on articles.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-x-4 items-center px-5 py-2.5 border-b border-gray-100 bg-gray-50">
              <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Author</div>
              <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider text-right">Total</div>
              <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider text-right hidden sm:block">Live</div>
              <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider text-right hidden sm:block">Draft</div>
              <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">View</div>
            </div>

            <div className="divide-y divide-gray-100">
              {authors.map(a => (
                <div
                  key={a.name}
                  className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-x-4 items-center px-5 py-3 hover:bg-gray-50 transition-colors"
                >
                  {/* Author name + initials */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold shrink-0">
                      {a.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                    </div>
                    <span className="text-sm font-semibold text-gray-900 truncate">{a.name}</span>
                  </div>

                  {/* Article counts */}
                  <div className="text-sm font-bold text-gray-800 text-right">{a.total}</div>
                  <div className="text-sm text-emerald-600 font-semibold text-right hidden sm:block">{a.published}</div>
                  <div className="text-sm text-gray-400 text-right hidden sm:block">{a.draft}</div>

                  {/* View articles link */}
                  <div>
                    <Link
                      href={`/admin/articles?author=${encodeURIComponent(a.name)}`}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50 rounded-lg transition-colors whitespace-nowrap"
                      title={`View all articles by ${a.name}`}
                    >
                      <FileText size={12} />
                      Articles
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="mt-4 text-xs text-gray-400 leading-relaxed">
          Authors are derived from the <code className="bg-gray-100 px-1 py-0.5 rounded">author_name</code> field on each article.
          Contributor roles and profiles are planned for Phase 2.
        </p>
      </div>
    </div>
  )
}
