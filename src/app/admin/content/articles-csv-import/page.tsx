'use client'

// src/app/admin/content/articles-csv-import/page.tsx
// Imports pre-cleaned article CSV files from the handoff package:
//   - wp_posts_cleaned_import.csv   (50 general posts, Mar-May 2026)
//   - school_bits_cleaned_import.csv (21 school-specific posts)
//
// CSV column format (exact match to handoff):
//   wp_post_id, title, slug, status, published_at, author, categories,
//   column_slug, school_region_slug, guide_slug, excerpt, hero_image_url,
//   image_count, image_urls, body_markdown, source_url
//
// Sends to existing /api/admin/wp-import endpoint in chunks of 20.

import { useState, useRef, useCallback } from 'react'
import { Upload, CheckCircle, AlertCircle, RefreshCw, X, ExternalLink } from 'lucide-react'
import type { ArticleImportRow } from '@/lib/import/wp-xml-parser'
import type { WpImportResult } from '@/app/api/admin/wp-import/route'

// ── CSV parser ────────────────────────────────────────────────────────────────

function parseCSV(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let inQ = false

  for (let i = 0; i < text.length; i++) {
    const ch = text[i], nx = text[i + 1]
    if (inQ) {
      if (ch === '"' && nx === '"') { cell += '"'; i++ }
      else if (ch === '"') inQ = false
      else cell += ch
    } else {
      if (ch === '"') inQ = true
      else if (ch === ',') { row.push(cell); cell = '' }
      else if (ch === '\n' || (ch === '\r' && nx === '\n')) {
        row.push(cell); cell = ''
        if (row.some(c => c.trim())) rows.push(row)
        row = []; if (ch === '\r') i++
      } else cell += ch
    }
  }
  row.push(cell)
  if (row.some(c => c.trim())) rows.push(row)
  return rows
}

// ── Map handoff CSV row → ArticleImportRow ────────────────────────────────────
// Column order from handoff:
// 0  wp_post_id
// 1  title
// 2  slug
// 3  status
// 4  published_at
// 5  author
// 6  categories
// 7  column_slug
// 8  school_region_slug
// 9  guide_slug
// 10 excerpt
// 11 hero_image_url
// 12 image_count
// 13 image_urls
// 14 body_markdown
// 15 source_url

function buildColumnIndex(headers: string[]): Record<string, number> {
  const idx: Record<string, number> = {}
  headers.forEach((h, i) => { idx[h.trim().toLowerCase()] = i })
  return idx
}

function toIso(raw: string): string | null {
  if (!raw?.trim()) return null
  try {
    const d = new Date(raw.trim().replace(' ', 'T'))
    return isNaN(d.getTime()) ? null : d.toISOString()
  } catch { return null }
}

function issueMonth(pubDate: string | null): string | null {
  if (!pubDate) return null
  try {
    const d = new Date(pubDate)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
  } catch { return null }
}

type ParsedRow = ArticleImportRow & { _schoolRegion?: string; _title: string }

function parseHandoffRow(cells: string[], idx: Record<string, number>): ParsedRow | null {
  function col(name: string): string {
    const i = idx[name]
    return i !== undefined ? (cells[i] ?? '').trim() : ''
  }

  const title = col('title')
  if (!title) return null

  const wpPostId        = col('wp_post_id')
  const slug            = col('slug') || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 80)
  const pubDateRaw      = col('published_at')
  const publishedAt     = toIso(pubDateRaw)
  const author          = col('author') || null
  const columnSlug      = col('column_slug') || null
  const guideSlug       = col('guide_slug') || null
  const schoolRegion    = col('school_region_slug') || undefined
  const excerpt         = col('excerpt') || null
  const heroImageUrl    = col('hero_image_url') || col('hero_image') || null
  const bodyMarkdown    = col('body_markdown') || col('body_content') || ''
  const sourceUrl       = col('source_url') || null

  // School region goes into editorial_notes alongside WP post ID
  const notes = [
    wpPostId ? `WP post ID: ${wpPostId}` : null,
    schoolRegion ? `School region: ${schoolRegion}` : null,
    sourceUrl ? `Source: ${sourceUrl}` : null,
  ].filter(Boolean).join(' | ') || null

  return {
    _title:       title,
    _schoolRegion: schoolRegion,
    title,
    slug,
    subtitle:                excerpt,
    excerpt,
    body_content:            bodyMarkdown,
    hero_image_url:          heroImageUrl,
    author_byline:           author,
    author_name:             author,
    column_slug:             columnSlug,
    guide_slug:              guideSlug,
    source_pdf_filename:     sourceUrl,
    source_issue_month:      issueMonth(publishedAt),
    editorial_review_status: 'pending',
    published_at:            publishedAt,
    wp_post_id:              wpPostId || null,
    // Injected into editorial_notes by the API:
    // We attach it to wp_post_id field so the API picks it up correctly
  } as ParsedRow
}

// ── Chunk ─────────────────────────────────────────────────────────────────────

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

// ── Column slug labels for preview grouping ───────────────────────────────────

const COLUMN_LABELS: Record<string, string> = {
  'school-bits':            'School Bits',
  'mom-to-mom':             'Mom to Mom',
  'grands-are-the-greatest':'Grands Are the Greatest',
  'teacher-of-the-month':   'Teacher of the Month',
  'teacher-spotlight':      'Teacher Spotlights',
  'summer-content':         'Summer Content',
  'article':                'General Articles',
  'family-life':            'Family Life',
}

// ── Types ─────────────────────────────────────────────────────────────────────

type RowResult = { slug: string; title: string; status: 'ok' | 'skipped' | 'error'; message?: string }

// ── Component ─────────────────────────────────────────────────────────────────

export default function ArticlesCsvImportPage() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [dragging,   setDragging]   = useState(false)
  const [rows,       setRows]       = useState<ParsedRow[]>([])
  const [fileName,   setFileName]   = useState('')
  const [error,      setError]      = useState<string | null>(null)
  const [importing,  setImporting]  = useState(false)
  const [progress,   setProgress]   = useState({ done: 0, total: 0 })
  const [results,    setResults]    = useState<RowResult[]>([])
  const [totals,     setTotals]     = useState({ inserted: 0, skipped: 0, errors: 0 })
  const [done,       setDone]       = useState(false)
  const [showAll,    setShowAll]    = useState(false)

  const processFile = useCallback((file: File) => {
    setError(null); setRows([]); setDone(false); setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string
        const allRows = parseCSV(text)
        if (allRows.length < 2) { setError('CSV has no data rows.'); return }
        const headers = allRows[0]
        const idx = buildColumnIndex(headers)
        const parsed = allRows.slice(1)
          .map(cells => parseHandoffRow(cells, idx))
          .filter((r): r is ParsedRow => r !== null)
        if (parsed.length === 0) { setError('No valid rows found — check column headers.'); return }
        setRows(parsed)
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Parse error')
      }
    }
    reader.readAsText(file, 'UTF-8')
  }, [])

  function onDrop(e: React.DragEvent) {
    e.preventDefault(); setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file?.name.endsWith('.csv')) processFile(file)
    else setError('Please drop a .csv file')
  }

  async function runImport() {
    if (rows.length === 0) return
    setImporting(true); setDone(false)
    setResults([]); setTotals({ inserted: 0, skipped: 0, errors: 0 })
    setProgress({ done: 0, total: rows.length })

    const chunks = chunk(rows as ArticleImportRow[], 20)
    let ins = 0, skip = 0, errs = 0
    const all: RowResult[] = []

    for (const ch of chunks) {
      try {
        const res = await fetch('/api/admin/wp-import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rows: ch }),
        })
        if (!res.ok) {
          const txt = await res.text()
          for (const r of ch) {
            all.push({ slug: r.slug, title: r.title, status: 'error', message: `Server ${res.status}: ${txt}` })
            errs++
          }
        } else {
          const data: WpImportResult = await res.json()
          ins  += data.inserted
          skip += data.skipped
          errs += data.errors.length
          all.push(...data.rowResults)
        }
      } catch (e: unknown) {
        for (const r of ch) {
          all.push({ slug: r.slug, title: r.title, status: 'error', message: e instanceof Error ? e.message : 'Network error' })
          errs++
        }
      }
      setProgress({ done: all.length, total: rows.length })
      setResults([...all])
      setTotals({ inserted: ins, skipped: skip, errors: errs })
    }
    setImporting(false); setDone(true)
  }

  function reset() {
    setRows([]); setDone(false); setError(null)
    setResults([]); setTotals({ inserted: 0, skipped: 0, errors: 0 })
    setFileName(''); setShowAll(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  // Group by column_slug for preview
  const byColumn: Record<string, ParsedRow[]> = {}
  for (const r of rows) {
    const key = r.column_slug ?? 'article'
    if (!byColumn[key]) byColumn[key] = []
    byColumn[key].push(r)
  }

  const displayRows = showAll ? rows : rows.slice(0, 20)

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-xl font-semibold text-gray-900">Article CSV Import (Handoff Format)</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Upload <strong>school_bits_cleaned_import.csv</strong> or <strong>wp_posts_cleaned_import.csv</strong>
          {' '}from the content activation package · All articles import as &ldquo;pending review&rdquo;
        </p>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-5">

        {/* Upload zone */}
        {rows.length === 0 && (
          <div
            className={`border-2 border-dashed rounded-2xl p-12 text-center transition-colors cursor-pointer ${
              dragging ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50 bg-white'
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
          >
            <Upload size={32} className="mx-auto mb-3 text-gray-300" />
            <p className="text-sm font-semibold text-gray-700">
              Drop <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">school_bits_cleaned_import.csv</code> or <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">wp_posts_cleaned_import.csv</code> here
            </p>
            <p className="text-xs text-gray-400 mt-2">Or click to browse · Start with school_bits for fastest homepage impact</p>
            <input ref={fileRef} type="file" accept=".csv" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) processFile(f) }} />
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-sm text-red-700">
            <AlertCircle size={16} className="shrink-0 mt-0.5" /> {error}
          </div>
        )}

        {/* Preview */}
        {rows.length > 0 && !done && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm text-gray-600">
                  <span className="font-bold text-gray-900">{rows.length}</span> articles from{' '}
                  <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">{fileName}</code>
                </span>
                <div className="flex flex-wrap gap-2 mt-2">
                  {Object.entries(byColumn).map(([col, list]) => (
                    <span key={col} className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-semibold">
                      {COLUMN_LABELS[col] ?? col} ({list.length})
                    </span>
                  ))}
                </div>
              </div>
              <button onClick={reset} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600">
                <X size={13} /> Reset
              </button>
            </div>

            {/* School region breakdown if school content */}
            {rows.some(r => r._schoolRegion) && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800">
                <strong>School content detected.</strong> School region slugs are stored in editorial notes for traceability.
                {' '}After import, approve 8–12 articles from the Review Queue to populate the homepage immediately.
              </div>
            )}

            {/* Preview table */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Preview</span>
                <span className="text-xs text-gray-400">
                  {rows.filter(r => r.hero_image_url).length} of {rows.length} have hero images
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="text-left px-4 py-2 text-gray-400 font-semibold">#</th>
                      <th className="text-left px-4 py-2 text-gray-400 font-semibold">Title</th>
                      <th className="text-left px-4 py-2 text-gray-400 font-semibold">Column</th>
                      <th className="text-left px-4 py-2 text-gray-400 font-semibold">Region</th>
                      <th className="text-left px-4 py-2 text-gray-400 font-semibold">Published</th>
                      <th className="text-left px-4 py-2 text-gray-400 font-semibold">Image</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayRows.map((row, i) => (
                      <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="px-4 py-2 text-gray-300">{i + 1}</td>
                        <td className="px-4 py-2 text-gray-800 font-medium truncate max-w-[240px]">{row.title}</td>
                        <td className="px-4 py-2">
                          <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-semibold">
                            {row.column_slug ?? 'article'}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-gray-400">{row._schoolRegion ?? '—'}</td>
                        <td className="px-4 py-2 text-gray-500 whitespace-nowrap">
                          {row.published_at ? new Date(row.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }) : '—'}
                        </td>
                        <td className="px-4 py-2">
                          {row.hero_image_url
                            ? <span className="text-green-600">✓</span>
                            : <span className="text-gray-200">—</span>
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {rows.length > 20 && (
                <button
                  onClick={() => setShowAll(!showAll)}
                  className="w-full py-3 text-xs text-gray-400 hover:text-gray-600 border-t border-gray-100"
                >
                  {showAll ? 'Show less' : `Show all ${rows.length} rows`}
                </button>
              )}
            </div>

            {/* Import progress (during import) */}
            {importing && (
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <RefreshCw size={14} className="text-blue-500 animate-spin" />
                  <span className="text-sm text-gray-600">{progress.done} / {progress.total} articles processed</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full transition-all"
                    style={{ width: `${progress.total > 0 ? (progress.done / progress.total) * 100 : 0}%` }} />
                </div>
              </div>
            )}

            <button
              onClick={runImport}
              disabled={importing}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-colors"
            >
              {importing ? <RefreshCw size={15} className="animate-spin" /> : <Upload size={15} />}
              {importing ? 'Importing…' : `Import ${rows.length} articles as Pending Review`}
            </button>
          </div>
        )}

        {/* Results */}
        {done && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Inserted', value: totals.inserted, color: 'text-green-600', bg: 'bg-green-50 border-green-200' },
                { label: 'Skipped',  value: totals.skipped,  color: 'text-gray-500',  bg: 'bg-gray-50 border-gray-200'  },
                { label: 'Errors',   value: totals.errors,   color: 'text-red-600',   bg: 'bg-red-50 border-red-200'    },
              ].map(({ label, value, color, bg }) => (
                <div key={label} className={`rounded-xl border p-5 text-center ${bg}`}>
                  <div className={`text-3xl font-bold ${color}`}>{value}</div>
                  <div className="text-xs text-gray-500 mt-1">{label}</div>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
                {results.map((r, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                      r.status === 'ok'      ? 'bg-green-100 text-green-700' :
                      r.status === 'skipped' ? 'bg-gray-100 text-gray-500'  :
                                               'bg-red-100 text-red-700'
                    }`}>{r.status === 'ok' ? 'imported' : r.status}</span>
                    <span className="text-xs text-gray-700 flex-1 truncate">{r.title}</span>
                    {r.message && <span className="text-[10px] text-gray-400 truncate max-w-xs">{r.message}</span>}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={reset} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-xl hover:bg-gray-50">
                Import another file
              </button>
              <a href="/admin/articles/review"
                className="flex items-center gap-1.5 px-4 py-2 text-sm text-blue-600 border border-blue-300 rounded-xl hover:bg-blue-50">
                <ExternalLink size={14} />
                Review Queue ({totals.inserted} pending)
              </a>
            </div>

            {totals.inserted > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
                <strong>Next step:</strong> Go to{' '}
                <a href="/admin/articles/review" className="underline">Article Review</a>
                {' '}and approve 8–12 articles. Approved articles appear on the homepage immediately.
                {' '}<strong>Start with Teacher of the Month and Mom to Mom</strong> for maximum homepage impact.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
