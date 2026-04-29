'use client'

import { useState, useRef, useCallback } from 'react'
import { Upload, ChevronDown, CheckCircle2, AlertCircle, X, FileText, ArrowRight } from 'lucide-react'
import type { ImportRow, ImportRowResult } from '@/lib/db/advertisers'
import { formatCurrency, formatSize } from '@/lib/utils'

// ── Zoho field name aliases → our field names ────────────────────────────────
const FIELD_MAP: Record<string, keyof ImportRow | null> = {
  // Business
  'account name':         'businessName',
  'company':              'businessName',
  'business name':        'businessName',
  'advertisers name':     'businessName',

  // Contact
  'contact name':         'contactName',
  'business contact name':'contactName',
  'full name':            'contactName',
  'contact':              'contactName',

  // Issue / publication
  'issue':                'issue',
  'publication':          'pubAbbrev',

  // Deal fields
  'stage':                'stage',
  'amount':               'amount',
  'closing date':         null,         // ignored
  'potential advertisers source': null,

  // Ad details
  'size':                 'size',
  'layout1':              'orientation',
  'orientation':          'orientation',
  'design':               'designStatus',
  'design status':        'designStatus',
  'designer':             'designer',
  'special position':     'specialPosition',
  'directory':            'directory',
  'layout notes':         'layoutNotes',
  'social':               'social',
  'invoice':              'invoiceType',
  'expires':              'expires',
  'description':          'description',
}

// Detect publication abbreviation from issue string e.g. "RRP MAR26" → "RRP"
function pubFromIssue(issue: string): string {
  return issue.split(' ')[0] ?? ''
}

// Parse size string → number: "0.5", "Half page", "1/2", ".5"
function parseSize(raw: string): number {
  const s = raw.toLowerCase().replace(/\s+/g, '')
  if (s.includes('spread') || s === '2')    return 2
  if (s.includes('full') || s === '1')      return 1
  if (s.includes('2/3') || s === '0.66')    return 0.66
  if (s.includes('half') || s.includes('1/2') || s === '0.5') return 0.5
  if (s.includes('third') || s.includes('1/3') || s === '0.33') return 0.33
  if (s.includes('quarter') || s.includes('1/4') || s === '0.25') return 0.25
  if (s.includes('sixth') || s.includes('1/6') || s === '0.16') return 0.16
  if (s.includes('eighth') || s.includes('1/8') || s === '0.12') return 0.12
  const n = parseFloat(s)
  return isNaN(n) ? 0.25 : n
}

// Parse design status
function parseDesign(raw: string): string {
  const s = raw.toLowerCase().trim()
  if (s.includes('new'))     return 'New'
  if (s.includes('drop'))    return 'DropBox'
  return 'Pick-up'
}

// Parse boolean
function parseBool(raw: string): boolean {
  return /^(x|yes|true|1|y)$/i.test(raw.trim())
}

// ── CSV parser ───────────────────────────────────────────────────────────────
function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length === 0) return { headers: [], rows: [] }

  const parseRow = (line: string): string[] => {
    const result: string[] = []
    let cur = '', inQuote = false
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') {
        if (inQuote && line[i+1] === '"') { cur += '"'; i++ }
        else inQuote = !inQuote
      } else if (line[i] === ',' && !inQuote) {
        result.push(cur.trim()); cur = ''
      } else {
        cur += line[i]
      }
    }
    result.push(cur.trim())
    return result
  }

  const headers = parseRow(lines[0])
  const rows    = lines.slice(1).filter(l => l.trim()).map(parseRow)
  return { headers, rows }
}

function csvToImportRows(headers: string[], rows: string[][]): ImportRow[] {
  const headerMap = headers.map(h => FIELD_MAP[h.toLowerCase().trim()] ?? null)

  return rows.map(row => {
    const obj: Record<string, string> = {}
    headers.forEach((h, i) => { obj[h.toLowerCase().trim()] = row[i] ?? '' })

    const issueRaw = obj['issue'] ?? ''
    const pubAbbrev = pubFromIssue(issueRaw) || obj['publication']?.trim() || 'RRP'

    return {
      businessName:    obj['account name'] || obj['business name'] || obj['advertisers name'] || obj['company'] || '',
      contactName:     obj['contact name'] || obj['business contact name'] || obj['full name'] || '',
      contactEmail:    obj['email'] || undefined,
      contactPhone:    obj['phone'] || undefined,
      issue:           issueRaw,
      pubAbbrev,
      stage:           obj['stage'] || 'Closed Won',
      amount:          parseFloat(obj['amount'] || '0') || 0,
      size:            parseSize(obj['size'] || '0.25'),
      orientation:     obj['layout1'] || obj['orientation'] || undefined,
      specialPosition: obj['special position'] || undefined,
      designer:        obj['designer'] || undefined,
      designStatus:    parseDesign(obj['design'] || obj['design status'] || 'pick-up'),
      directory:       parseBool(obj['directory'] || ''),
      layoutNotes:     obj['layout notes'] || undefined,
      social:          obj['social'] || undefined,
      invoiceType:     obj['invoice'] || undefined,
      expires:         obj['expires'] || undefined,
      description:     obj['description'] || undefined,
    }
  })
}

// ── Component ────────────────────────────────────────────────────────────────
type Step = 'upload' | 'preview' | 'importing' | 'done'

interface ImportResult {
  inserted: number
  businessesCreated: number
  skipped: number
  errors: string[]
  rowResults: ImportRowResult[]
}

export function ImportClient() {
  const [step, setStep]               = useState<Step>('upload')
  const [rows, setRows]               = useState<ImportRow[]>([])
  const [headers, setHeaders]         = useState<string[]>([])
  const [fileName, setFileName]       = useState('')
  const [result, setResult]           = useState<ImportResult | null>(null)
  const [dragOver, setDragOver]       = useState(false)
  const [progress, setProgress]       = useState(0)
  const [progressLabel, setProgressLabel] = useState('')
  const fileRef                       = useRef<HTMLInputElement>(null)

  const handleFile = useCallback((file: File) => {
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const { headers, rows: rawRows } = parseCSV(text)
      setHeaders(headers)
      setRows(csvToImportRows(headers, rawRows))
      setStep('preview')
    }
    reader.readAsText(file)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file && file.name.endsWith('.csv')) handleFile(file)
  }, [handleFile])

  const runImport = async (importRows: ImportRow[]) => {
    setStep('importing')
    setProgress(0)
    setProgressLabel('Preparing records…')

    const CHUNK_SIZE = 100
    const total      = importRows.length
    const chunks: ImportRow[][] = []
    for (let i = 0; i < total; i += CHUNK_SIZE) chunks.push(importRows.slice(i, i + CHUNK_SIZE))

    let inserted         = 0
    let businessesCreated = 0
    let skipped          = 0
    const allErrors: string[]          = []
    const allRowResults: ImportRowResult[] = []

    for (let c = 0; c < chunks.length; c++) {
      const chunk    = chunks[c]
      const rowStart = c * CHUNK_SIZE + 1
      const rowEnd   = Math.min(rowStart + chunk.length - 1, total)
      setProgress(Math.round((c / chunks.length) * 92))
      setProgressLabel(`Rows ${rowStart}–${rowEnd} of ${total} (chunk ${c + 1}/${chunks.length})…`)

      try {
        const res = await fetch('/api/import-advertisers', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ rows: chunk }),
        })
        if (!res.ok) {
          allErrors.push(`Chunk ${c + 1}: server error ${res.status}`)
          continue
        }
        const data: ImportResult = await res.json()
        inserted          += data.inserted
        businessesCreated += data.businessesCreated
        skipped           += data.skipped
        allErrors.push(...data.errors)
        // Adjust row numbers to be absolute (1-based across entire import)
        for (const r of data.rowResults) {
          allRowResults.push({ ...r, row: rowStart + r.row - 1 })
        }
      } catch (e) {
        allErrors.push(`Chunk ${c + 1} network error: ${e instanceof Error ? e.message : String(e)}`)
      }
    }

    setProgress(100)
    setProgressLabel('All chunks complete — verifying…')

    const merged: ImportResult = { inserted, businessesCreated, skipped, errors: allErrors, rowResults: allRowResults }
    setResult(prev => {
      if (!prev) return merged
      const map = new Map(prev.rowResults.map(r => [r.row, r]))
      merged.rowResults.forEach(r => map.set(r.row, r))
      return {
        inserted:          prev.inserted + merged.inserted,
        businessesCreated: prev.businessesCreated + merged.businessesCreated,
        skipped:           prev.skipped + merged.skipped,
        errors:            merged.errors,
        rowResults:        Array.from(map.values()).sort((a, b) => a.row - b.row),
      }
    })
    setStep('done')
  }

  const handleImport = () => runImport(rows)

  const handleRetryFailed = () => {
    if (!result) return
    const failedRowNums = new Set(result.rowResults.filter(r => r.status === 'error').map(r => r.row))
    const failedRows = rows.filter((_, i) => failedRowNums.has(i + 1))
    if (failedRows.length === 0) return
    runImport(failedRows)
  }

  const statsRevenue = rows.reduce((s, r) => s + (r.amount || 0), 0)

  // ── Upload step ────────────────────────────────────────────────────────────
  if (step === 'upload') return (
    <div className="flex flex-col items-center justify-center flex-1 p-12">
      <div className="w-full max-w-lg space-y-6">

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-blue-900 mb-2 flex items-center gap-1.5">
            <FileText size={14} /> How to export from Zoho CRM
          </h3>
          <ol className="text-xs text-blue-800 space-y-1 list-decimal list-inside">
            <li>In Zoho CRM, go to <strong>Advertisers</strong> (or your Deals module)</li>
            <li>Click <strong>···</strong> menu → <strong>Export</strong></li>
            <li>Choose <strong>Export Records</strong> → <strong>All fields</strong> → <strong>CSV</strong></li>
            <li>Repeat for your <strong>Business Names</strong> (Companies/Accounts) module</li>
            <li>Upload the Advertisers CSV below — businesses are auto-created</li>
          </ol>
        </div>

        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
            dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100'
          }`}
        >
          <Upload size={32} className="mx-auto mb-3 text-gray-400" />
          <p className="text-sm font-medium text-gray-700">Drop your Zoho CSV here</p>
          <p className="text-xs text-gray-400 mt-1">or click to browse · .csv files only</p>
          <input ref={fileRef} type="file" accept=".csv" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
        </div>

        {/* Field mapping reference */}
        <details className="text-xs text-gray-500">
          <summary className="cursor-pointer font-medium text-gray-600 hover:text-gray-900 flex items-center gap-1">
            <ChevronDown size={13} /> Supported Zoho column names
          </summary>
          <div className="mt-2 bg-white border border-gray-200 rounded-lg p-3 grid grid-cols-2 gap-1">
            {Object.entries(FIELD_MAP).filter(([,v]) => v).map(([k, v]) => (
              <div key={k} className="flex items-center gap-1.5">
                <span className="text-gray-400 font-mono">{k}</span>
                <ArrowRight size={10} className="text-gray-300" />
                <span className="text-gray-700">{v as string}</span>
              </div>
            ))}
          </div>
        </details>
      </div>
    </div>
  )

  // ── Preview step ───────────────────────────────────────────────────────────
  if (step === 'preview') return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="text-sm font-semibold text-gray-900">{fileName}</div>
          <span className="text-sm text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full ring-1 ring-blue-200 font-semibold">
            {rows.length} rows parsed
          </span>
          <span className="text-sm font-semibold" style={{ color: 'var(--color-gold-600)' }}>
            {formatCurrency(statsRevenue)} total
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setStep('upload')}
            className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            Change file
          </button>
          <button onClick={handleImport}
            className="px-4 py-1.5 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
            Import {rows.length} records →
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-white">
        <table className="w-full text-xs border-collapse">
          <thead className="sticky top-0 bg-gray-50 border-b border-gray-200">
            <tr>
              {['#', 'Business Name', 'Contact', 'Issue', 'Size', 'Design', 'Designer', 'Position', 'Amount'].map(h => (
                <th key={h} className="px-3 py-2 text-left font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((r, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                <td className="px-3 py-2 font-medium text-gray-900">{r.businessName}</td>
                <td className="px-3 py-2 text-gray-600">{r.contactName || '—'}</td>
                <td className="px-3 py-2">
                  <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 font-mono">{r.issue || '—'}</span>
                </td>
                <td className="px-3 py-2 text-gray-700">{formatSize(r.size)}</td>
                <td className="px-3 py-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ring-1 ${
                    r.designStatus === 'New'     ? 'bg-blue-50 text-blue-700 ring-blue-200'  :
                    r.designStatus === 'Pick-up' ? 'bg-green-50 text-green-700 ring-green-200' :
                    'bg-amber-50 text-amber-700 ring-amber-200'
                  }`}>{r.designStatus}</span>
                </td>
                <td className="px-3 py-2 text-gray-600">{r.designer || '—'}</td>
                <td className="px-3 py-2 text-gray-500">{r.specialPosition || '—'}</td>
                <td className="px-3 py-2 font-semibold text-gray-900">{formatCurrency(r.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )

  // ── Importing step ─────────────────────────────────────────────────────────
  if (step === 'importing') return (
    <div className="flex-1 flex flex-col items-center justify-center p-12">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-blue-100 border-t-blue-600 animate-spin mx-auto mb-4" style={{ borderWidth: 3, borderStyle: 'solid' }} />
          <h2 className="text-xl font-semibold text-gray-900 mb-1">Importing Records</h2>
          <p className="text-sm text-gray-500">{progressLabel}</p>
        </div>
        <div className="bg-gray-100 rounded-full h-3 overflow-hidden">
          <div className="h-full bg-blue-600 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
        <div className="flex justify-between text-xs text-gray-400">
          <span>{Math.round(progress)}% complete</span>
          <span>{rows.length} records total</span>
        </div>
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-2">
          {[
            { done: progress > 10,  label: 'Parsing CSV data' },
            { done: progress > 30,  label: 'Finding or creating business records' },
            { done: progress > 50,  label: 'Linking contacts to businesses' },
            { done: progress > 70,  label: 'Inserting advertiser records' },
            { done: progress >= 100,label: 'Verifying results' },
          ].map(({ done, label }, i) => (
            <div key={i} className="flex items-center gap-2.5 text-sm">
              <span className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${done ? 'bg-green-500' : 'bg-gray-200'}`}>
                {done && <span className="text-white text-[9px]">✓</span>}
              </span>
              <span className={done ? 'text-gray-700' : 'text-gray-400'}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  // ── Done step ──────────────────────────────────────────────────────────────
  const failedCount  = result?.rowResults.filter(r => r.status === 'error').length ?? 0
  const skippedCount = result?.skipped ?? 0

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-2xl mx-auto">

          {/* Header */}
          <div className="flex items-center gap-3 mb-5">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${failedCount === 0 ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'}`}>
              {failedCount === 0
                ? <CheckCircle2 size={28} className="text-green-500" />
                : <AlertCircle size={28} className="text-amber-500" />}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {failedCount === 0 ? 'Import Complete' : 'Import Finished with Errors'}
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">
                <span className="font-bold text-green-700">{result?.inserted ?? 0}</span> imported successfully
                {(result?.businessesCreated ?? 0) > 0 && <> · <span className="font-bold text-blue-700">{result!.businessesCreated} businesses created</span></>}
                {failedCount > 0 && <> · <span className="font-bold text-red-600">{failedCount} failed</span></>}
                {skippedCount > 0 && <> · <span className="font-bold text-gray-500">{skippedCount} already existed</span></>}
              </p>
            </div>
          </div>

          {/* Summary stats */}
          <div className="grid grid-cols-4 gap-3 mb-6 w-full">
            <div className="bg-green-50 rounded-xl border border-green-200 p-3 text-center">
              <div className="text-2xl font-bold text-green-700">{result?.inserted ?? 0}</div>
              <div className="text-xs text-green-600 font-medium mt-0.5">Imported</div>
            </div>
            <div className="bg-blue-50 rounded-xl border border-blue-200 p-3 text-center">
              <div className="text-2xl font-bold text-blue-700">{result?.businessesCreated ?? 0}</div>
              <div className="text-xs text-blue-600 font-medium mt-0.5">Businesses Created</div>
            </div>
            <div className="bg-gray-50 rounded-xl border border-gray-200 p-3 text-center">
              <div className="text-2xl font-bold text-gray-500">{skippedCount}</div>
              <div className="text-xs text-gray-400 font-medium mt-0.5">Already Existed</div>
            </div>
            <div className="bg-red-50 rounded-xl border border-red-200 p-3 text-center">
              <div className="text-2xl font-bold text-red-600">{failedCount}</div>
              <div className="text-xs text-red-500 font-medium mt-0.5">Failed</div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 mb-6 flex-wrap">
            <a href="/admin/advertisers" className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
              View Advertisers →
            </a>
            {failedCount > 0 && (
              <button onClick={handleRetryFailed}
                className="px-4 py-2 text-sm font-semibold text-white bg-amber-600 rounded-lg hover:bg-amber-700 transition-colors flex items-center gap-1.5">
                <X size={13} /> Retry {failedCount} failed
              </button>
            )}
            <button onClick={() => { setStep('upload'); setRows([]); setResult(null); setProgress(0) }}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              Import another file
            </button>
          </div>

          {/* Row-level results table */}
          {result?.rowResults && result.rowResults.length > 0 && (
            <div className="w-full border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Row-by-row results</span>
                <span className="text-xs text-gray-400">
                  {result.rowResults.filter(r => r.status === 'ok').length} ok
                  {skippedCount > 0 && ` · ${skippedCount} skipped`}
                  {failedCount > 0 && ` · ${failedCount} errors`}
                </span>
              </div>
              <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
                {result.rowResults.map((r) => (
                  <div key={r.row} className={`flex items-start gap-3 px-4 py-2.5 text-xs ${r.status === 'error' ? 'bg-red-50' : r.status === 'skipped' ? 'bg-gray-50' : ''}`}>
                    <span className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                      r.status === 'ok' ? 'bg-green-500' : r.status === 'skipped' ? 'bg-gray-300' : 'bg-red-500'
                    }`}>
                      <span className="text-white text-[9px]">{r.status === 'ok' ? '✓' : r.status === 'skipped' ? '~' : '✗'}</span>
                    </span>
                    <span className="w-6 text-gray-400 shrink-0">{r.row}</span>
                    <span className={`font-medium flex-1 ${r.status === 'ok' ? 'text-gray-700' : r.status === 'skipped' ? 'text-gray-400' : 'text-red-700'}`}>{r.name}</span>
                    {r.status === 'skipped' && <span className="text-gray-400 italic">already exists</span>}
                    {r.message && <span className="text-red-500 text-right max-w-xs">{r.message.replace(/^.*?: /, '')}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {result?.errors && result.errors.length > 0 && failedCount === 0 && (
            <p className="text-xs text-gray-400 mt-4">Make sure you ran the SQL schema in Supabase first — Settings → Run Database Schema.</p>
          )}
        </div>
      </div>
    </div>
  )
}
