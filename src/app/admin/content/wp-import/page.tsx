'use client'

// src/app/admin/content/wp-import/page.tsx
// WordPress XML (WXR) import admin UI.
// Browser-side XML parsing + VC cleanup → chunked API inserts.

import { useState, useRef, useCallback } from 'react'
import {
  Upload, FileText, CheckCircle, AlertCircle, RefreshCw,
  X, ChevronDown, Filter, ExternalLink, Clock,
} from 'lucide-react'
import { parseWpXml, buildImportRow, type WpPost, type ParsedWpXml, type ArticleImportRow } from '@/lib/import/wp-xml-parser'
import { getColumnLabel } from '@/lib/import/wp-category-mapper'
import type { WpImportResult } from '@/app/api/admin/wp-import/route'

// ── Chunk helper ──────────────────────────────────────────────────────────────

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

// ── Format helpers ────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  } catch { return iso }
}

// ── State types ───────────────────────────────────────────────────────────────

type ImportPhase = 'upload' | 'preview' | 'importing' | 'done'

type RowResult = {
  slug:    string
  title:   string
  status:  'ok' | 'skipped' | 'error'
  message?: string
}

// ── Filter bar ────────────────────────────────────────────────────────────────

function CategoryFilter({
  categories,
  selected,
  onChange,
}: {
  categories: string[]
  selected: Set<string>
  onChange: (s: Set<string>) => void
}) {
  function toggle(cat: string) {
    const next = new Set(selected)
    if (next.has(cat)) next.delete(cat)
    else next.add(cat)
    onChange(next)
  }

  function toggleAll() {
    onChange(selected.size === categories.length ? new Set() : new Set(categories))
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-white/50 uppercase tracking-wide">Filter by WP Category</span>
        <button onClick={toggleAll} className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
          {selected.size === categories.length ? 'Deselect all' : 'Select all'}
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => toggle(cat)}
            className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${
              selected.has(cat)
                ? 'bg-blue-600 text-white'
                : 'bg-white/8 text-white/50 hover:bg-white/15'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Preview table row ─────────────────────────────────────────────────────────

function PreviewRow({ post, index }: { post: WpPost; index: number }) {
  const row    = buildImportRow(post)
  const label  = getColumnLabel(row.column_slug)

  return (
    <tr className="border-b border-white/5 hover:bg-white/3">
      <td className="px-4 py-2 text-white/25 text-xs">{index + 1}</td>
      <td className="px-4 py-2 max-w-[280px]">
        <div className="text-xs text-white font-medium truncate">{post.title}</div>
        <div className="text-[10px] text-white/30 truncate">{post.slug}</div>
      </td>
      <td className="px-4 py-2">
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-semibold whitespace-nowrap">
          {label}
        </span>
        {row.guide_slug && (
          <span className="ml-1 text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300">
            {row.guide_slug}
          </span>
        )}
      </td>
      <td className="px-4 py-2 text-white/40 text-xs whitespace-nowrap">{fmtDate(post.pubDate)}</td>
      <td className="px-4 py-2 text-white/40 text-xs truncate max-w-[100px]">{post.author || '—'}</td>
      <td className="px-4 py-2">
        {post.featuredImage ? (
          <span className="text-[10px] text-green-400">✓ image</span>
        ) : (
          <span className="text-[10px] text-white/20">—</span>
        )}
      </td>
    </tr>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function WpImportPage() {
  const fileRef = useRef<HTMLInputElement>(null)

  const [phase,           setPhase]           = useState<ImportPhase>('upload')
  const [dragging,        setDragging]        = useState(false)
  const [parsing,         setParsing]         = useState(false)
  const [parsed,          setParsed]          = useState<ParsedWpXml | null>(null)
  const [selectedCats,    setSelectedCats]    = useState<Set<string>>(new Set())
  const [showAll,         setShowAll]         = useState(false)
  const [error,           setError]           = useState<string | null>(null)
  const [progress,        setProgress]        = useState({ done: 0, total: 0 })
  const [results,         setResults]         = useState<RowResult[]>([])
  const [totals,          setTotals]          = useState({ inserted: 0, skipped: 0, errors: 0 })

  // Filtered posts (based on selected categories)
  const filteredPosts = parsed?.posts.filter(p => {
    if (selectedCats.size === 0) return true
    return p.categories.some(c => selectedCats.has(c))
  }) ?? []

  const displayPosts = showAll ? filteredPosts : filteredPosts.slice(0, 20)

  // ── File processing ───────────────────────────────────────────────────────

  const processFile = useCallback((file: File) => {
    setError(null); setParsed(null); setPhase('upload')
    if (!file.name.endsWith('.xml')) {
      setError('Please upload a WordPress XML export file (.xml)')
      return
    }
    setParsing(true)
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const text   = e.target?.result as string
        const result = parseWpXml(text)
        if (result.posts.length === 0) {
          setError('No published posts found in this XML export. Check that it is a WordPress WXR export with published posts.')
          setParsing(false)
          return
        }
        setParsed(result)
        setSelectedCats(new Set(result.categories))   // select all categories by default
        setPhase('preview')
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'XML parse error — make sure this is a WordPress export file.')
      }
      setParsing(false)
    }
    reader.onerror = () => { setError('Failed to read file.'); setParsing(false) }
    reader.readAsText(file, 'UTF-8')
  }, [])

  function onDrop(e: React.DragEvent) {
    e.preventDefault(); setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }

  // ── Import execution ──────────────────────────────────────────────────────

  async function runImport() {
    if (!parsed || filteredPosts.length === 0) return

    const rows: ArticleImportRow[] = filteredPosts.map(buildImportRow)
    const chunks = chunk(rows, 20)

    setPhase('importing')
    setProgress({ done: 0, total: rows.length })
    setResults([])
    setTotals({ inserted: 0, skipped: 0, errors: 0 })

    let totalInserted = 0
    let totalSkipped  = 0
    let totalErrors   = 0
    const allResults: RowResult[] = []

    for (const ch of chunks) {
      try {
        const res  = await fetch('/api/admin/wp-import', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ rows: ch }),
        })
        if (!res.ok) {
          const err = await res.text()
          // Mark whole chunk as error and continue
          for (const r of ch) {
            allResults.push({ slug: r.slug, title: r.title, status: 'error', message: `Server ${res.status}: ${err}` })
            totalErrors++
          }
        } else {
          const data: WpImportResult = await res.json()
          totalInserted += data.inserted
          totalSkipped  += data.skipped
          totalErrors   += data.errors.length
          allResults.push(...data.rowResults)
        }
      } catch (e: unknown) {
        for (const r of ch) {
          allResults.push({ slug: r.slug, title: r.title, status: 'error', message: e instanceof Error ? e.message : 'Network error' })
          totalErrors++
        }
      }

      setProgress({ done: allResults.length, total: rows.length })
      setResults([...allResults])
      setTotals({ inserted: totalInserted, skipped: totalSkipped, errors: totalErrors })
    }

    setPhase('done')
  }

  function reset() {
    setParsed(null); setSelectedCats(new Set()); setPhase('upload')
    setError(null); setResults([]); setTotals({ inserted: 0, skipped: 0, errors: 0 })
    setShowAll(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-xl font-semibold text-gray-900">WordPress Article Import</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Upload a WordPress XML export · Posts are parsed in the browser · Imported as &ldquo;pending review&rdquo;
        </p>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">

        {/* Upload zone */}
        {phase === 'upload' && (
          <div
            className={`border-2 border-dashed rounded-2xl p-12 text-center transition-colors cursor-pointer ${
              dragging ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50 bg-white'
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
          >
            {parsing ? (
              <RefreshCw size={32} className="mx-auto mb-3 text-blue-400 animate-spin" />
            ) : (
              <Upload size={32} className="mx-auto mb-3 text-gray-300" />
            )}
            <p className="text-sm font-semibold text-gray-600">
              {parsing ? 'Parsing XML…' : 'Drop WordPress XML file here or click to browse'}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Export from WordPress Admin → Tools → Export → All content
            </p>
            <input
              ref={fileRef}
              type="file"
              accept=".xml"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) processFile(f) }}
            />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-sm text-red-700">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        {/* Preview */}
        {phase === 'preview' && parsed && (
          <div className="space-y-5">
            {/* Site info bar */}
            <div className="bg-white rounded-xl border border-gray-200 px-5 py-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{parsed.siteTitle || 'WordPress Export'}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{parsed.siteUrl}</p>
                  {parsed.dateRange && (
                    <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                      <Clock size={11} />
                      {fmtDate(parsed.dateRange.min)} — {fmtDate(parsed.dateRange.max)}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3 text-sm shrink-0">
                  <span className="font-bold text-gray-900">{parsed.posts.length}</span>
                  <span className="text-gray-500">posts found</span>
                  <button onClick={reset} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 ml-2">
                    <X size={13} /> Reset
                  </button>
                </div>
              </div>
            </div>

            {/* Category filter */}
            {parsed.categories.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 px-5 py-4">
                <CategoryFilter
                  categories={parsed.categories}
                  selected={selectedCats}
                  onChange={setSelectedCats}
                />
              </div>
            )}

            {/* Selection summary */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter size={14} className="text-gray-400" />
                <span className="text-sm text-gray-600">
                  <span className="font-bold text-gray-900">{filteredPosts.length}</span> posts will be imported
                </span>
                {selectedCats.size < parsed.categories.length && (
                  <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                    {parsed.posts.length - filteredPosts.length} filtered out
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400">
                Existing slugs are skipped automatically · All imported as &ldquo;pending review&rdquo;
              </p>
            </div>

            {/* Preview table */}
            {filteredPosts.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Preview — {displayPosts.length} of {filteredPosts.length}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400">
                      {filteredPosts.filter(p => buildImportRow(p).hero_image_url).length} with images
                    </span>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50">
                        <th className="text-left px-4 py-2 text-gray-400 font-semibold w-8">#</th>
                        <th className="text-left px-4 py-2 text-gray-400 font-semibold">Title / Slug</th>
                        <th className="text-left px-4 py-2 text-gray-400 font-semibold">Routing</th>
                        <th className="text-left px-4 py-2 text-gray-400 font-semibold">Published</th>
                        <th className="text-left px-4 py-2 text-gray-400 font-semibold">Author</th>
                        <th className="text-left px-4 py-2 text-gray-400 font-semibold">Image</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayPosts.map((post, i) => (
                        <PreviewRow key={post.wpPostId || post.slug} post={post} index={i} />
                      ))}
                    </tbody>
                  </table>
                </div>
                {filteredPosts.length > 20 && (
                  <button
                    onClick={() => setShowAll(!showAll)}
                    className="w-full py-3 text-xs text-gray-400 hover:text-gray-600 flex items-center justify-center gap-1 border-t border-gray-100 transition-colors"
                  >
                    <ChevronDown size={13} className={showAll ? 'rotate-180' : ''} />
                    {showAll ? 'Show less' : `Show all ${filteredPosts.length} posts`}
                  </button>
                )}
              </div>
            )}

            {filteredPosts.length === 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-sm text-gray-400">
                No posts match the selected categories.
              </div>
            )}

            {/* Import button */}
            {filteredPosts.length > 0 && (
              <button
                onClick={runImport}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-colors"
              >
                <Upload size={15} />
                Import {filteredPosts.length} article{filteredPosts.length !== 1 ? 's' : ''} as Pending Review
              </button>
            )}
          </div>
        )}

        {/* Importing progress */}
        {phase === 'importing' && (
          <div className="bg-white rounded-xl border border-gray-200 p-8">
            <div className="flex items-center gap-3 mb-5">
              <RefreshCw size={18} className="text-blue-500 animate-spin" />
              <span className="text-sm font-semibold text-gray-700">
                Importing… {progress.done} / {progress.total}
              </span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2 mb-5">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress.total > 0 ? (progress.done / progress.total) * 100 : 0}%` }}
              />
            </div>
            {results.length > 0 && (
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {results.slice(-10).map((r, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span className={`w-16 shrink-0 text-center px-1.5 py-0.5 rounded-full font-semibold ${
                      r.status === 'ok'      ? 'bg-green-100 text-green-700' :
                      r.status === 'skipped' ? 'bg-gray-100 text-gray-500'  :
                                               'bg-red-100 text-red-700'
                    }`}>{r.status}</span>
                    <span className="text-gray-600 truncate">{r.title}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Done */}
        {phase === 'done' && (
          <div className="space-y-4">
            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Inserted',  value: totals.inserted, color: 'text-green-600', bg: 'bg-green-50 border-green-200' },
                { label: 'Skipped',   value: totals.skipped,  color: 'text-gray-500',  bg: 'bg-gray-50 border-gray-200'  },
                { label: 'Errors',    value: totals.errors,   color: 'text-red-600',   bg: 'bg-red-50 border-red-200'    },
              ].map(({ label, value, color, bg }) => (
                <div key={label} className={`rounded-xl border p-5 text-center ${bg}`}>
                  <div className={`text-3xl font-bold ${color}`}>{value}</div>
                  <div className="text-xs text-gray-500 mt-1">{label}</div>
                </div>
              ))}
            </div>

            {/* Result rows */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Row Results</span>
              </div>
              <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
                {results.map((r, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                      r.status === 'ok'      ? 'bg-green-100 text-green-700' :
                      r.status === 'skipped' ? 'bg-gray-100 text-gray-500'  :
                                               'bg-red-100 text-red-700'
                    }`}>{r.status === 'ok' ? 'imported' : r.status}</span>
                    <span className="text-xs text-gray-700 flex-1 truncate">{r.title}</span>
                    {r.message && <span className="text-[10px] text-gray-400 ml-1 truncate max-w-xs">{r.message}</span>}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={reset}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Import another file
              </button>
              <a
                href="/admin/articles/review"
                className="flex items-center gap-1.5 px-4 py-2 text-sm text-blue-600 border border-blue-300 rounded-xl hover:bg-blue-50 transition-colors"
              >
                <ExternalLink size={14} />
                Review imported articles
              </a>
            </div>

            {totals.inserted > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
                <strong>{totals.inserted} articles</strong> imported as &ldquo;pending review.&rdquo;
                Go to <a href="/admin/articles/review" className="underline">Article Review</a> to approve and publish.
                Approved articles appear immediately on the homepage and guides.
              </div>
            )}
          </div>
        )}

        {/* Column mapping reference */}
        {phase === 'upload' && (
          <details className="mt-6">
            <summary className="cursor-pointer text-xs font-semibold text-gray-400 hover:text-gray-600 transition-colors select-none">
              How category routing works
            </summary>
            <div className="mt-3 text-xs text-gray-500 space-y-1.5 max-w-2xl">
              <p>WordPress categories are automatically mapped to content routing fields:</p>
              <div className="grid grid-cols-2 gap-2 mt-2 font-mono text-[11px]">
                {[
                  ['Teacher of the Month', 'column: teacher-spotlight'],
                  ['Mom to Mom / Moms Know Best', 'column: mom-to-mom'],
                  ['School Bits / School News', 'column: school-bits'],
                  ['Summer Fun / Summer Camp', 'guide: summer-fun / summer-camp'],
                  ['Play Ball / Sports', 'column: play-ball'],
                  ['Grands Are the Greatest', 'column: grands-are-the-greatest'],
                  ['Student Spotlight', 'column: student-spotlight'],
                  ['Newcomer Guide', 'guide: newcomer'],
                ].map(([wp, our]) => (
                  <div key={wp} className="flex gap-2">
                    <span className="text-gray-400">{wp}</span>
                    <span className="text-gray-300">→</span>
                    <span className="text-blue-600">{our}</span>
                  </div>
                ))}
              </div>
              <p className="mt-2">You can update column_slug on any article after import via the Article Review page.</p>
            </div>
          </details>
        )}
      </div>
    </div>
  )
}
