import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import Image from 'next/image'
import { Search, Upload, Copy, ExternalLink, ImageIcon } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Media Library — Admin' }
export const dynamic = 'force-dynamic'

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

// Media assets are tracked by the upload API at /api/admin/upload.
// This page surfaces them for reuse, search, and audit.

interface MediaAsset {
  id: string
  title: string | null
  alt_text: string | null
  storage_url: string
  thumbnail_url: string | null
  asset_type: string | null
  content_category: string | null
  width: number | null
  height: number | null
  file_size_bytes: number | null
  created_at: string
  used_in_article: boolean | null
  used_on_homepage: boolean | null
}

async function fetchMediaAssets(q: string | null): Promise<MediaAsset[]> {
  const supabase = supabaseAdmin()
  let query = supabase
    .from('media_assets')
    .select('id, title, alt_text, storage_url, thumbnail_url, asset_type, content_category, width, height, file_size_bytes, created_at, used_in_article, used_on_homepage')
    .order('created_at', { ascending: false })
    .limit(120)

  if (q) {
    query = query.or(`title.ilike.%${q}%,alt_text.ilike.%${q}%,content_category.ilike.%${q}%`)
  }

  const { data } = await query
  return (data ?? []) as MediaAsset[]
}

function fmtBytes(b: number | null): string {
  if (!b) return ''
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`
  return `${(b / (1024 * 1024)).toFixed(1)} MB`
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })
}

interface PageProps {
  searchParams: Promise<{ q?: string }>
}

export default async function MediaLibraryPage({ searchParams }: PageProps) {
  const { q } = await searchParams
  const assets = await fetchMediaAssets(q ?? null)

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Media Library</h1>
            <p className="text-xs text-gray-400 mt-0.5">{assets.length} asset{assets.length !== 1 ? 's' : ''}{q ? ` matching "${q}"` : ''}</p>
          </div>
          <Link
            href="/admin/articles/new"
            className="flex items-center gap-2 px-4 py-2 bg-portal-navy text-white text-sm font-semibold rounded-lg hover:opacity-90 transition-colors"
          >
            <Upload size={14} /> Upload via Editor
          </Link>
        </div>

        {/* Search */}
        <form method="GET" action="/admin/media">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              name="q"
              defaultValue={q ?? ''}
              type="search"
              placeholder="Search by title, alt text, or category…"
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg bg-white outline-none focus:border-blue-400"
            />
          </div>
        </form>
      </div>

      <div className="p-5">
        {assets.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
            <ImageIcon size={32} className="text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-sm mb-2">
              {q ? `No media found for "${q}"` : 'No media uploaded yet'}
            </p>
            <p className="text-xs text-gray-400 mb-4">
              Images uploaded via the article editor are automatically tracked here.
            </p>
            <Link
              href="/admin/articles/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-portal-navy text-white text-sm font-semibold rounded-lg hover:opacity-90 transition-colors"
            >
              <Upload size={13} /> Start Writing an Article
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {assets.map(asset => {
              const thumbSrc = asset.thumbnail_url ?? asset.storage_url
              const usageFlags: string[] = []
              if (asset.used_in_article)  usageFlags.push('Article')
              if (asset.used_on_homepage) usageFlags.push('Homepage')

              return (
                <div
                  key={asset.id}
                  className="group bg-white rounded-xl border border-gray-200 overflow-hidden hover:border-portal-border-2 hover:shadow-md transition-all"
                >
                  {/* Thumbnail */}
                  <div className="relative aspect-[4/3] bg-gray-100 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={thumbSrc}
                      alt={asset.alt_text ?? asset.title ?? 'Media asset'}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />

                    {/* Hover overlay with actions */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <a
                        href={asset.storage_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Open full image"
                        className="w-7 h-7 rounded-full bg-white/90 flex items-center justify-center text-gray-700 hover:bg-white transition-colors"
                      >
                        <ExternalLink size={12} />
                      </a>
                      {/* Copy URL button — client interaction needed, handled below */}
                      <button
                        type="button"
                        title="Copy image URL"
                        onClick={() => {}}
                        data-copy-url={asset.storage_url}
                        className="copy-url-btn w-7 h-7 rounded-full bg-white/90 flex items-center justify-center text-gray-700 hover:bg-white transition-colors"
                      >
                        <Copy size={12} />
                      </button>
                    </div>

                    {/* Usage badges */}
                    {usageFlags.length > 0 && (
                      <div className="absolute bottom-1 left-1">
                        <span className="text-[9px] font-bold bg-green-500 text-white px-1.5 py-0.5 rounded-full">
                          {usageFlags.join(' · ')}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Metadata */}
                  <div className="p-2.5">
                    <p className="text-[11px] font-semibold text-gray-800 truncate leading-tight">
                      {asset.title ?? asset.alt_text ?? 'Untitled'}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {asset.content_category && (
                        <span className="text-[9px] font-bold uppercase text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                          {asset.content_category}
                        </span>
                      )}
                      <span className="text-[10px] text-gray-400 ml-auto">{fmtDate(asset.created_at)}</span>
                    </div>
                    {(asset.width || asset.file_size_bytes) && (
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {asset.width && asset.height ? `${asset.width}×${asset.height}` : ''}
                        {asset.width && asset.file_size_bytes ? ' · ' : ''}
                        {fmtBytes(asset.file_size_bytes)}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Upload note */}
        {assets.length > 0 && (
          <div className="mt-6 p-4 bg-white rounded-xl border border-gray-200 text-sm text-gray-500">
            <p>
              <strong className="text-gray-700">How to add images:</strong> Upload images directly inside the article editor
              using the image toolbar button → "Upload File". Images are automatically compressed and tracked here.
            </p>
          </div>
        )}
      </div>

      {/* Client-side copy URL handler */}
      <script dangerouslySetInnerHTML={{ __html: `
        document.addEventListener('click', function(e) {
          var btn = e.target.closest('[data-copy-url]');
          if (!btn) return;
          var url = btn.getAttribute('data-copy-url');
          if (!url) return;
          navigator.clipboard.writeText(url).then(function() {
            btn.style.background = 'rgba(34,197,94,0.9)';
            btn.style.color = 'white';
            setTimeout(function() {
              btn.style.background = '';
              btn.style.color = '';
            }, 1200);
          });
        });
      `}} />
    </div>
  )
}
