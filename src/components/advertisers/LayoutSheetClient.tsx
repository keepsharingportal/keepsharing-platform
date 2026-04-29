'use client'

import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { Printer, Copy, Plus, ChevronDown, CheckSquare2, Check, AlertTriangle, X, Loader2 } from 'lucide-react'
import type { AdvertiserRecord } from '@/types'
import { PUBLICATIONS } from '@/lib/mock-data'
import { formatCurrency, formatSize, nextIssue } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { EditAdvertiserModal } from './EditAdvertiserModal'
import type { IssueOption } from '@/app/api/advertisers/issues/route'

const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']
const MONTH_LABELS: Record<string, string> = {
  JAN:'January',FEB:'February',MAR:'March',APR:'April',MAY:'May',JUN:'June',
  JUL:'July',AUG:'August',SEP:'September',OCT:'October',NOV:'November',DEC:'December',
}
const DESIGN_BADGE: Record<string, string> = {
  New:       'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200',
  'Pick-up': 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-200',
  DropBox:   'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200',
}
const STAGE_DOT: Record<string, string> = {
  'Closed Won':'bg-green-500', Verbal:'bg-amber-500', Prospect:'bg-blue-500',
  Renewed:'bg-purple-500', Dropped:'bg-red-500',
}
type SortMode = 'alpha' | 'size'

interface Props {
  initialAdvertisers: AdvertiserRecord[]
  defaultPub?:   string
  defaultMonth?: string
  defaultYear?:  string
}

export function LayoutSheetClient({ initialAdvertisers, defaultPub='RRP', defaultMonth='MAR', defaultYear='26' }: Props) {
  const [advertisers, setAdvertisers] = useState(initialAdvertisers)
  const [sortMode, setSortMode]       = useState<SortMode>('alpha')
  const [pub, setPub]                 = useState(defaultPub)
  const [month, setMonth]             = useState(defaultMonth)
  const [year, setYear]               = useState(defaultYear)
  const [editingId, setEditingId]     = useState<string | null>(null)
  const [cloneOpen, setCloneOpen]     = useState(false)
  const [cloning, setCloning]         = useState(false)
  const [pubOpen, setPubOpen]         = useState(false)
  const [monthOpen, setMonthOpen]     = useState(false)
  const [printOpen, setPrintOpen]     = useState(false)
  const [printLabel, setPrintLabel]   = useState('')
  const [loading, setLoading]         = useState(false)
  const [availableIssues, setAvailableIssues] = useState<IssueOption[]>([])
  const [issuesLoaded, setIssuesLoaded] = useState(false)
  const printRef = useRef<HTMLDivElement>(null)

  const issue     = `${pub} ${month}${year}`
  const pubName   = PUBLICATIONS.find((p) => p.abbrev === pub)?.name ?? pub
  const nextMonth = nextIssue(issue)
  const nextMonthLabel = (() => {
    const parts = nextMonth.split(' ')
    return parts.length === 2
      ? `${MONTH_LABELS[parts[1].slice(0,3)] ?? parts[1].slice(0,3)} 20${parts[1].slice(3)}`
      : nextMonth
  })()

  // ── Load available issues from Supabase on mount ────────────────────────────
  useEffect(() => {
    fetch('/api/advertisers/issues')
      .then((r) => r.json())
      .then((data: IssueOption[]) => {
        setAvailableIssues(data)
        setIssuesLoaded(true)
        // Navigate to the most recent issue for this pub
        const pubIssues = data.filter((i) => i.pubAbbrev === defaultPub)
        if (pubIssues.length > 0) {
          const latest = pubIssues[0]
          setMonth(latest.monthCode)
          setYear(latest.yearCode)
        }
      })
      .catch(() => setIssuesLoaded(true))
  }, [defaultPub, initialAdvertisers.length])

  // ── Fetch advertisers for the current issue via API ─────────────────────────
  const loadIssueData = useCallback(async (issueStr: string) => {
    setLoading(true)
    try {
      const res  = await fetch(`/api/advertisers/by-issue?issue=${encodeURIComponent(issueStr)}`)
      const data = await res.json() as AdvertiserRecord[]
      setAdvertisers(data)
    } catch {
      // Fallback: filter from initialAdvertisers
      setAdvertisers(initialAdvertisers.filter((a) => a.issue === issueStr))
    }
    setLoading(false)
  }, [initialAdvertisers])

  // Always load from API on mount and whenever issue changes
  useEffect(() => {
    loadIssueData(issue)
  }, [issue]) // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => advertisers, [advertisers])

  const sorted = useMemo(() => {
    const copy = [...filtered]
    return sortMode === 'alpha'
      ? copy.sort((a, b) => a.businessName.localeCompare(b.businessName))
      : copy.sort((a, b) => a.size !== b.size ? a.size - b.size : a.businessName.localeCompare(b.businessName))
  }, [filtered, sortMode])

  const stats = useMemo(() => ({
    count:        filtered.length,
    pages:        filtered.reduce((s, a) => s + a.size, 0),
    revenue:      filtered.reduce((s, a) => s + a.amount, 0),
    newCount:     filtered.filter((a) => a.designStatus === 'New').length,
    pickupCount:  filtered.filter((a) => a.designStatus === 'Pick-up').length,
    dropboxCount: filtered.filter((a) => a.designStatus === 'DropBox').length,
    dirCount:     filtered.filter((a) => a.directory).length,
  }), [filtered])

  const editingAdvertiser = editingId ? advertisers.find((a) => a.id === editingId) ?? null : null

  // ── Issue availability for the current pub ────────────────────────────────
  const pubIssues = useMemo(
    () => availableIssues.filter((i) => i.pubAbbrev === pub),
    [availableIssues, pub]
  )
  const currentIssueData = pubIssues.find((i) => i.monthCode === month && i.yearCode === year)

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleSave = (updated: AdvertiserRecord) => {
    setAdvertisers((prev) => prev.map((a) => (a.id === updated.id ? updated : a)))
    setEditingId(null)
  }
  const handleDelete = (id: string) => {
    setAdvertisers((prev) => prev.filter((a) => a.id !== id))
    setEditingId(null)
  }

  const handleClone = async () => {
    setCloning(true)
    const now = Date.now()
    const cloned: AdvertiserRecord[] = filtered.map((a, i) => ({
      ...a, id: `clone-${now}-${i}`, issue: nextMonth,
      designStatus: 'Pick-up' as const, amount: 0, description: '',
    }))
    setAdvertisers([])
    const parts = nextMonth.split(' ')
    if (parts.length === 2) {
      setPub(parts[0]); setMonth(parts[1].slice(0,3)); setYear(parts[1].slice(3))
    }
    try {
      await fetch('/api/clone-issue', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records: cloned }),
      })
      // Reload the new issue
      await loadIssueData(nextMonth)
    } catch {
      setAdvertisers(cloned)
    }
    setCloning(false)
    setCloneOpen(false)
  }

  const handlePrint = (mode: SortMode, label: string) => {
    setSortMode(mode); setPrintLabel(label); setPrintOpen(false)
    requestAnimationFrame(() => requestAnimationFrame(() => window.print()))
  }

  const closePubMonth = () => { setPubOpen(false); setMonthOpen(false); setPrintOpen(false) }

  const btnSm = 'flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors'

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
    <div className="flex flex-col flex-1 overflow-hidden" ref={printRef}>

      {/* ── Page Header ─────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0 no-print" onClick={closePubMonth}>
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-gray-900">Layout Sheet</h1>
          <span className="text-sm font-semibold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full ring-1 ring-blue-200">
            {loading ? <Loader2 size={12} className="animate-spin inline" /> : stats.count} ads
          </span>
          {issuesLoaded && currentIssueData && (
            <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full ring-1 ring-green-200 font-medium">
              Supabase · {currentIssueData.count} records
            </span>
          )}
          {issuesLoaded && !currentIssueData && availableIssues.length > 0 && (
            <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full ring-1 ring-amber-200 font-medium">
              No data for this issue
            </span>
          )}
        </div>
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          {/* Print dropdown */}
          <div className="relative">
            <button onClick={() => setPrintOpen(!printOpen)} className={btnSm}>
              <Printer size={13} /> Print
              <ChevronDown size={12} className={cn('text-gray-400 transition-transform', printOpen && 'rotate-180')} />
            </button>
            {printOpen && (
              <div className="absolute right-0 top-full mt-1 z-30 w-52 bg-white rounded-xl border border-gray-200 shadow-xl overflow-hidden">
                <div className="px-3 py-2 bg-gray-50 border-b border-gray-100">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Choose print view</p>
                </div>
                <button onClick={() => handlePrint('alpha', 'View 1 — A to Z')}
                  className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-blue-50 transition-colors">
                  <div className="w-6 h-6 rounded bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-blue-700 text-xs font-bold">V1</span>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-900">Alphabetical (A–Z)</div>
                    <div className="text-xs text-gray-400 mt-0.5">Publisher view · sorted by name</div>
                  </div>
                </button>
                <button onClick={() => handlePrint('size', 'View 2 — By Size')}
                  className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-blue-50 transition-colors border-t border-gray-100">
                  <div className="w-6 h-6 rounded bg-purple-100 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-purple-700 text-xs font-bold">V2</span>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-900">By Size (small → large)</div>
                    <div className="text-xs text-gray-400 mt-0.5">Designer view · alpha within size</div>
                  </div>
                </button>
              </div>
            )}
          </div>
          <button onClick={() => setCloneOpen(true)} className={btnSm}>
            <Copy size={13} /> Clone → {nextMonth.split(' ')[1]}
          </button>
          <button className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
            <Plus size={13} /> Add Advertiser
          </button>
        </div>
      </div>

      {/* ── Toolbar ─────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-3 shrink-0 no-print" onClick={closePubMonth}>
        <div onClick={(e) => e.stopPropagation()} className="flex items-center gap-3">
          {/* Publication selector */}
          <div className="relative">
            <button onClick={() => { setPubOpen(!pubOpen); setMonthOpen(false) }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              <span className="font-semibold">{pub}</span>
              <span className="text-gray-400 text-xs">— {pubName}</span>
              <ChevronDown size={13} className={cn('text-gray-400 transition-transform', pubOpen && 'rotate-180')} />
            </button>
            {pubOpen && (
              <div className="absolute top-full left-0 mt-1 z-20 w-64 bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden">
                {PUBLICATIONS.map((p) => {
                  const pIssues = availableIssues.filter((i) => i.pubAbbrev === p.abbrev)
                  return (
                    <button key={p.abbrev} onClick={() => { setPub(p.abbrev); setPubOpen(false) }}
                      className={cn('w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left hover:bg-gray-50', pub === p.abbrev && 'bg-blue-50')}>
                      <span className="font-semibold text-gray-700 w-9">{p.abbrev}</span>
                      <span className={pub === p.abbrev ? 'text-blue-700 font-medium flex-1' : 'text-gray-500 flex-1'}>{p.name}</span>
                      {pIssues.length > 0 && (
                        <span className="text-[10px] text-green-600 font-medium shrink-0">{pIssues.reduce((s,i)=>s+i.count,0).toLocaleString()} ads</span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Month selector — shows issues with real data highlighted */}
          <div className="relative">
            <button onClick={() => { setMonthOpen(!monthOpen); setPubOpen(false) }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              {MONTH_LABELS[month]} 20{year}
              {currentIssueData && <span className="text-[10px] text-green-600 font-semibold">({currentIssueData.count})</span>}
              <ChevronDown size={13} className={cn('text-gray-400 transition-transform', monthOpen && 'rotate-180')} />
            </button>
            {monthOpen && (
              <div className="absolute top-full left-0 mt-1 z-20 bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden w-72">
                {/* Months with real data */}
                {pubIssues.length > 0 && (
                  <div>
                    <div className="px-3 py-1.5 text-xs font-bold text-green-700 bg-green-50 border-b border-green-100 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      Issues with real data ({pub})
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      {pubIssues.map((iss) => (
                        <button key={iss.issue}
                          onClick={() => { setMonth(iss.monthCode); setYear(iss.yearCode); setMonthOpen(false) }}
                          className={cn('w-full flex items-center justify-between px-3 py-2.5 text-sm hover:bg-gray-50 transition-colors',
                            month === iss.monthCode && year === iss.yearCode ? 'bg-blue-50 font-semibold text-blue-700' : 'text-gray-700')}>
                          <span>{MONTH_LABELS[iss.monthCode] ?? iss.monthCode} 20{iss.yearCode}</span>
                          <span className="text-xs text-green-600 font-medium">{iss.count} ads</span>
                        </button>
                      ))}
                    </div>
                    <div className="border-t border-gray-200" />
                  </div>
                )}
                {/* Manual month/year picker for future issues */}
                <div className="px-3 py-1.5 text-xs font-bold text-gray-400 bg-gray-50">Other months</div>
                {['25','26','27'].map((yr) => (
                  <div key={yr}>
                    <div className="px-3 py-1 text-xs font-bold text-gray-400">20{yr}</div>
                    <div className="grid grid-cols-4">
                      {MONTHS.map((m) => {
                        const hasData = pubIssues.some((i) => i.monthCode === m && i.yearCode === yr)
                        return (
                          <button key={m} onClick={() => { setMonth(m); setYear(yr); setMonthOpen(false) }}
                            className={cn('px-2 py-2 text-xs text-center transition-colors hover:bg-gray-50 relative',
                              month === m && year === yr ? 'font-bold text-blue-600 bg-blue-50' : 'text-gray-600')}>
                            {m}
                            {hasData && <span className="absolute top-0.5 right-0.5 w-1 h-1 rounded-full bg-green-500" />}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="w-px h-5 bg-gray-200" />

          {/* Sort toggle */}
          <div className="flex rounded-lg overflow-hidden border border-gray-300 text-sm">
            {(['alpha', 'size'] as const).map((mode) => (
              <button key={mode} onClick={() => setSortMode(mode)}
                className={cn('px-3 py-1.5 font-medium transition-colors',
                  sortMode === mode ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50')}>
                {mode === 'alpha' ? 'A – Z' : 'By Size'}
              </button>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="ml-auto flex items-center gap-4 text-sm">
          {loading ? (
            <span className="flex items-center gap-1.5 text-gray-400">
              <Loader2 size={14} className="animate-spin" /> Loading issue data…
            </span>
          ) : (
            <>
              <span className="font-semibold text-gray-900">{stats.pages.toFixed(2)} pages</span>
              <span className="font-bold" style={{ color: 'var(--color-gold-600)' }}>{formatCurrency(stats.revenue)}</span>
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span>New <span className="font-semibold text-blue-600">{stats.newCount}</span></span>
                <span>Pick-up <span className="font-semibold text-green-600">{stats.pickupCount}</span></span>
                <span>DropBox <span className="font-semibold text-amber-600">{stats.dropboxCount}</span></span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Print-only header ────────────────────────────── */}
      <div className="hidden print:block px-0 py-3 border-b-2 border-gray-400 mb-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{pubName} — Layout Sheet</h1>
            <p className="text-sm text-gray-700 mt-0.5">
              {MONTH_LABELS[month]} 20{year} · {stats.count} advertisers · {stats.pages.toFixed(2)} pages · {formatCurrency(stats.revenue)}
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm font-bold text-gray-700">{printLabel || (sortMode === 'alpha' ? 'View 1 — A to Z' : 'View 2 — By Size')}</div>
            <div className="text-xs text-gray-500 mt-0.5">
              Printed {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Table ───────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto bg-white">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <Loader2 size={32} className="animate-spin text-blue-500" />
            <p className="text-sm text-gray-500">Loading {issue} from Supabase…</p>
          </div>
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <CheckSquare2 size={32} className="mb-3 opacity-30" />
            <p className="text-sm font-medium text-gray-500">No advertisers for {issue}</p>
            {pubIssues.length > 0 && (
              <p className="text-xs mt-2 text-blue-500 cursor-pointer hover:underline"
                onClick={() => { const latest = pubIssues[0]; setMonth(latest.monthCode); setYear(latest.yearCode) }}>
                Jump to {MONTH_LABELS[pubIssues[0].monthCode]} 20{pubIssues[0].yearCode} ({pubIssues[0].count} ads) →
              </p>
            )}
          </div>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead className="sticky top-0 z-10 bg-gray-50 border-b border-gray-200 print:static">
              <tr>
                {[
                  { label: '#',         cls: 'w-10' },
                  { label: '',          cls: 'w-6' },
                  { label: 'Dir',       cls: 'w-10 text-center' },
                  { label: 'Advertiser',cls: '' },
                  { label: 'Size',      cls: 'w-24' },
                  { label: 'Ornt',      cls: 'w-12' },
                  { label: 'Position',  cls: 'w-36' },
                  { label: 'Design',    cls: 'w-24' },
                  { label: 'Designer',  cls: 'w-24' },
                  { label: 'Notes',     cls: 'w-48' },
                  { label: 'Exp.',      cls: 'w-16' },
                  { label: 'Amount',    cls: 'w-24 text-right' },
                ].map(({ label, cls }) => (
                  <th key={label} className={`px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider text-left whitespace-nowrap ${cls}`}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sorted.map((ad, i) => (
                <tr key={ad.id} onClick={() => setEditingId(ad.id)}
                  className="hover:bg-gray-50 cursor-pointer transition-colors group print:cursor-default">
                  <td className="px-3 py-2.5 text-xs text-gray-400">{i + 1}</td>
                  <td className="px-2 py-2.5">
                    <span className={`inline-block w-2 h-2 rounded-full ${STAGE_DOT[ad.stage] ?? 'bg-gray-400'}`} title={ad.stage} />
                  </td>
                  <td className="px-2 py-2.5 text-center">
                    {ad.directory && <span className="text-xs font-bold text-amber-600">✓</span>}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors print:text-gray-900">
                        {ad.businessName}
                      </span>
                      {ad.social && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 font-semibold ring-1 ring-purple-200 print:hidden">
                          {ad.social}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-gray-700 whitespace-nowrap">{formatSize(ad.size)}</td>
                  <td className="px-3 py-2.5 text-xs text-gray-500">
                    {ad.orientation ? ad.orientation[0] : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-3 py-2.5">
                    {ad.specialPosition ? (
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 ring-1 ring-amber-200 font-medium whitespace-nowrap print:bg-transparent print:ring-0 print:px-0">
                        {ad.specialPosition.replace('Inside Front Cover','IFC').replace('Inside Back Cover','IBC').replace('Back Cover','Back Cvr').replace('First Right Hand Read','FRHR')}
                      </span>
                    ) : <span className="text-gray-300 text-xs">—</span>}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`inline-flex text-xs px-2.5 py-0.5 rounded-full font-medium ${DESIGN_BADGE[ad.designStatus] ?? DESIGN_BADGE['Pick-up']} print:bg-transparent print:ring-0 print:px-0`}>
                      {ad.designStatus}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-gray-500 whitespace-nowrap">{ad.designer}</td>
                  <td className="px-3 py-2.5 text-xs text-gray-400 max-w-0">
                    <div className="truncate max-w-[180px] print:max-w-none" title={ad.layoutNotes}>
                      {ad.layoutNotes || <span className="text-gray-200">—</span>}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-gray-500 whitespace-nowrap">{ad.expires}</td>
                  <td className="px-3 py-2.5 text-sm font-semibold text-gray-900 text-right whitespace-nowrap">
                    {ad.amount > 0 ? formatCurrency(ad.amount) : <span className="text-gray-300 font-normal text-xs">TBC</span>}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 border-t-2 border-gray-300">
                <td colSpan={3} />
                <td className="px-3 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Total — {stats.count} advertisers</td>
                <td className="px-3 py-3 text-xs font-semibold text-gray-700">{stats.pages.toFixed(2)} pp</td>
                <td colSpan={6} />
                <td className="px-3 py-3 text-sm font-bold text-right" style={{ color: 'var(--color-gold-600)' }}>
                  {formatCurrency(stats.revenue)}
                </td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>

    {/* ── Clone Confirmation Modal ─────────────────────────────────── */}
    {cloneOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !cloning && setCloneOpen(false)} />
        <div className="relative z-10 w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h2 className="text-base font-semibold text-gray-900">Clone to {nextMonthLabel}</h2>
            {!cloning && (
              <button onClick={() => setCloneOpen(false)} className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                <X size={16} />
              </button>
            )}
          </div>
          <div className="px-6 py-5">
            <p className="text-sm text-gray-700 mb-4">
              <span className="font-semibold">{stats.count} advertisers</span> from <span className="font-semibold">{issue}</span> will be duplicated.
            </p>
            <div className="bg-gray-50 rounded-xl p-4 space-y-2.5 mb-4">
              {[
                { icon: Check,         color: 'text-green-600', bg: 'bg-green-50',  text: `Issue updated to ${nextMonth}` },
                { icon: Check,         color: 'text-green-600', bg: 'bg-green-50',  text: 'All Design Status → Pick-up (default)' },
                { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50',  text: 'Amount cleared to $0 — re-confirm each rate' },
                { icon: Check,         color: 'text-green-600', bg: 'bg-green-50',  text: 'Layout notes kept as reference' },
              ].map(({ icon: Icon, color, bg, text }, i) => (
                <div key={i} className="flex items-start gap-2.5 text-sm">
                  <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 mt-0.5 ${bg}`}>
                    <Icon size={11} className={color} />
                  </div>
                  <span className="text-gray-700">{text}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-200 bg-gray-50">
            <button onClick={() => setCloneOpen(false)} disabled={cloning} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50">Cancel</button>
            <button onClick={handleClone} disabled={cloning}
              className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors">
              {cloning
                ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Cloning…</>
                : <><Copy size={14} />Clone {stats.count} → {nextMonth.split(' ')[1]}</>
              }
            </button>
          </div>
        </div>
      </div>
    )}

    {/* ── Edit Modal ───────────────────────────────────────────────── */}
    {editingAdvertiser && (
      <EditAdvertiserModal
        advertiser={editingAdvertiser}
        onSave={handleSave}
        onDelete={handleDelete}
        onClose={() => setEditingId(null)}
      />
    )}
    </>
  )
}
