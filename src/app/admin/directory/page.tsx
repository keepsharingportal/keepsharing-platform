// /admin/directory — directory listings management hub.

import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { Plus, Settings, Inbox, Star, Pencil } from 'lucide-react'
import { MARKETS } from '@/lib/markets'

export const metadata: Metadata = { title: 'Directory — Admin' }
export const dynamic = 'force-dynamic'

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

interface ListingRow {
  id: string; brand_slug: string; name: string; slug: string;
  kind: string; status: string; is_featured: boolean;
  city: string | null; category_slugs: string[]; view_count: number;
  updated_at: string;
}

interface PageProps {
  searchParams: Promise<{ brand?: string; status?: string }>
}

export default async function AdminDirectoryPage({ searchParams }: PageProps) {
  const { brand, status } = await searchParams
  const sb = supabaseAdmin()

  let migrated = true
  let listings: ListingRow[] = []
  let pendingSuggestionCount = 0
  try {
    const probe = await sb.from('directory_listings').select('id').limit(1)
    if (probe.error && /relation .* does not exist/i.test(probe.error.message)) {
      migrated = false
    } else if (!probe.error) {
      let q = sb.from('directory_listings')
        .select('id, brand_slug, name, slug, kind, status, is_featured, city, category_slugs, view_count, updated_at')
        .order('is_featured', { ascending: false })
        .order('updated_at', { ascending: false })
        .limit(200)
      if (brand)  q = q.eq('brand_slug', brand)
      if (status) q = q.eq('status', status)
      const { data } = await q
      listings = (data ?? []) as ListingRow[]

      const { count } = await sb
        .from('directory_suggestions')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending')
      pendingSuggestionCount = count ?? 0
    }
  } catch { /* ignore */ }

  return (
    <div className="flex-1 overflow-y-auto bg-portal-bg">
      <div className="bg-white border-b border-portal-border px-6 py-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="portal-page-title">Directory</h1>
            <p className="portal-page-subtitle">Local businesses + experts, per brand. Independent of paying advertisers.</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/directory/suggestions"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-portal-blue hover:text-portal-blue-dk border border-portal-blue/30 bg-portal-blue-lt px-3 py-1.5 rounded-md"
            >
              <Inbox size={12} /> Suggestions
              {pendingSuggestionCount > 0 && (
                <span className="text-[10px] font-bold text-white bg-portal-blue px-1.5 py-0.5 rounded-full">{pendingSuggestionCount}</span>
              )}
            </Link>
            <Link
              href="/admin/directory/categories"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-portal-sub hover:text-portal-text border border-portal-border bg-white px-3 py-1.5 rounded-md"
            >
              <Settings size={12} /> Categories
            </Link>
            <Link
              href="/admin/directory/new"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-portal-blue hover:bg-portal-blue-dk px-3 py-1.5 rounded-md"
            >
              <Plus size={12} /> New listing
            </Link>
          </div>
        </div>
      </div>

      <div className="p-6 max-w-6xl space-y-4">
        {!migrated && (
          <div className="bg-portal-amber-lt border border-portal-amber/30 rounded-lg p-4 text-portal-text text-xs">
            <strong>Migration 163 pending.</strong> Apply <code className="bg-white px-1 py-0.5 rounded border border-portal-border">supabase/migrations/163_local_directory.sql</code> to enable the directory.
          </div>
        )}

        {/* Filters */}
        {migrated && (
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="text-portal-muted">Brand:</span>
            <Link href="/admin/directory" className={`px-2 py-1 rounded ${!brand ? 'bg-portal-blue text-white' : 'bg-white border border-portal-border text-portal-sub'}`}>All</Link>
            {MARKETS.map(m => (
              <Link
                key={m.slug}
                href={`/admin/directory?brand=${m.slug}${status ? `&status=${status}` : ''}`}
                className={`px-2 py-1 rounded ${brand === m.slug ? 'bg-portal-blue text-white' : 'bg-white border border-portal-border text-portal-sub hover:border-portal-blue'}`}
              >
                {m.short}
              </Link>
            ))}
            <span className="text-portal-muted ml-3">Status:</span>
            <Link href={`/admin/directory${brand ? `?brand=${brand}` : ''}`} className={`px-2 py-1 rounded ${!status ? 'bg-portal-blue text-white' : 'bg-white border border-portal-border text-portal-sub'}`}>All</Link>
            {(['published', 'pending', 'archived'] as const).map(s => (
              <Link
                key={s}
                href={`/admin/directory?status=${s}${brand ? `&brand=${brand}` : ''}`}
                className={`px-2 py-1 rounded ${status === s ? 'bg-portal-blue text-white' : 'bg-white border border-portal-border text-portal-sub hover:border-portal-blue'}`}
              >
                {s}
              </Link>
            ))}
          </div>
        )}

        {migrated && (
          <div className="bg-white border border-portal-border rounded-lg overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-portal-bg border-b border-portal-border">
                <tr className="text-[10px] uppercase tracking-wider text-portal-muted text-left">
                  <th className="px-4 py-2">Name</th>
                  <th className="px-4 py-2">Brand</th>
                  <th className="px-4 py-2">Kind</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">City</th>
                  <th className="px-4 py-2 text-right">Views</th>
                  <th className="px-4 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-portal-border">
                {listings.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-portal-muted">No listings match this filter.</td></tr>
                ) : listings.map(l => (
                  <tr key={l.id} className="hover:bg-portal-bg">
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        {l.is_featured && <Star size={11} className="text-portal-amber shrink-0" />}
                        <span className="text-portal-text font-bold">{l.name}</span>
                      </div>
                      <div className="text-[10px] text-portal-muted font-mono mt-0.5">{l.slug}</div>
                    </td>
                    <td className="px-4 py-2 text-portal-sub uppercase tracking-wider text-[10px]">{l.brand_slug}</td>
                    <td className="px-4 py-2 text-portal-sub">{l.kind}</td>
                    <td className="px-4 py-2">
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${
                        l.status === 'published' ? 'text-portal-green' :
                        l.status === 'pending'   ? 'text-portal-amber' :
                                                    'text-portal-muted'
                      }`}>{l.status}</span>
                    </td>
                    <td className="px-4 py-2 text-portal-sub">{l.city ?? '—'}</td>
                    <td className="px-4 py-2 text-right text-portal-sub tabular-nums">{l.view_count.toLocaleString()}</td>
                    <td className="px-4 py-2 text-right">
                      <Link href={`/admin/directory/${l.id}`} className="inline-flex items-center gap-1 text-portal-blue hover:text-portal-blue-dk text-xs font-bold">
                        <Pencil size={11} /> Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
