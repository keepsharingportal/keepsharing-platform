'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  TrendingUp, Clock, AlertTriangle, XCircle, Download,
  ExternalLink, RefreshCw, Search, ChevronUp, ChevronDown,
} from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import type { RawBusinessIntel } from '@/app/api/advertisers/intelligence/route'

// ── Types ─────────────────────────────────────────────────────────────────────

type Status = 'active' | 'warm' | 'cold' | 'dead'

type BusinessIntel = RawBusinessIntel & {
  status: Status
  monthsSince: number
  annualPotential: number
}

type SortKey = 'name' | 'status' | 'lastIssue' | 'monthsSince' | 'totalRevenue' | 'totalAds' | 'annualPotential'
type SortDir = 'asc' | 'desc'

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<Status, {
  label: string; icon: React.ElementType; dot: string
  ring: string; text: string; bg: string; headerBg: string
}> = {
  active: { label: 'Active',  icon: TrendingUp,    dot: 'bg-green-500',  ring: 'ring-green-200', text: 'text-green-700',  bg: 'bg-green-50',  headerBg: 'bg-green-600' },
  warm:   { label: 'Warm',    icon: Clock,          dot: 'bg-amber-400',  ring: 'ring-amber-200', text: 'text-amber-700',  bg: 'bg-amber-50',  headerBg: 'bg-amber-500' },
  cold:   { label: 'Cold',    icon: AlertTriangle,  dot: 'bg-orange-400', ring: 'ring-orange-200',text: 'text-orange-700', bg: 'bg-orange-50', headerBg: 'bg-orange-500' },
  dead:   { label: 'Lapsed',  icon: XCircle,        dot: 'bg-red-400',    ring: 'ring-red-200',   text: 'text-red-700',    bg: 'bg-red-50',    headerBg: 'bg-red-600' },
}

const POTENTIAL_RATE: Record<Status, number> = { active: 1.0, warm: 0.70, cold: 0.50, dead: 0.30 }

// ── Mock data ─────────────────────────────────────────────────────────────────

const MOCK: RawBusinessIntel[] = [
  // Active (last ad 0–12 months)
  { id: 'm01', name: 'Bright Smiles Orthodontics',   phone: '(334) 555-0101', email: 'info@brightsmiles.com',       salesRep: 'Jason Watson', website: 'brightsmiles.com',     lastIssue: 'RRP MAR26', totalRevenue: 3990,  totalAds: 14, avgAmount: 285 },
  { id: 'm02', name: 'Montgomery YMCA',               phone: '(334) 555-0102', email: 'mktg@mgymca.org',             salesRep: 'Jason Watson', website: 'mgymca.org',           lastIssue: 'RRP MAR26', totalRevenue: 3850,  totalAds: 22, avgAmount: 175 },
  { id: 'm03', name: 'Little Stars Childcare',        phone: '(334) 555-0103', email: 'info@littlestars.com',        salesRep: 'Jason Watson', website: 'littlestars.com',      lastIssue: 'RRP FEB26', totalRevenue: 3624,  totalAds:  8, avgAmount: 453 },
  { id: 'm04', name: 'Baptist Health',                phone: '(334) 555-0104', email: 'marketing@baptisthealth.com', salesRep: 'Jason Watson', website: 'baptisthealth.com',    lastIssue: 'MBP MAR26', totalRevenue: 8640,  totalAds: 18, avgAmount: 480 },
  { id: 'm05', name: 'Prattville Christian Academy',  phone: '(334) 555-0105', email: 'admissions@pcaonline.org',   salesRep: 'Jason Watson', website: 'pcaonline.org',        lastIssue: 'RRP JAN26', totalRevenue: 2718,  totalAds:  6, avgAmount: 453 },
  { id: 'm06', name: 'Craig Eye Center',              phone: '(334) 555-0106', email: 'jennifer@craigeyecenter.com', salesRep: 'Jason Watson', website: 'craigeyecenter.com',   lastIssue: 'RRP DEC25', totalRevenue: 4530,  totalAds: 10, avgAmount: 453 },
  { id: 'm07', name: 'Comfort Air HVAC',              phone: '(334) 555-0107', email: 'dispatch@comfortair.com',     salesRep: 'Jason Watson', website: 'comfortairhvac.com',   lastIssue: 'RRP MAR26', totalRevenue: 1200,  totalAds:  5, avgAmount: 240 },
  { id: 'm08', name: 'First Bank Alabama',            phone: '(334) 555-0108', email: 'marketing@firstbankal.com',  salesRep: 'Jason Watson', website: 'firstbankal.com',      lastIssue: 'AOP FEB26', totalRevenue: 11520, totalAds: 24, avgAmount: 480 },
  { id: 'm09', name: 'Dr. Webb Pediatrics',           phone: '(334) 555-0109', email: 'front@webbpeds.com',         salesRep: 'Jason Watson', website: 'webbpeds.com',         lastIssue: 'RRP JAN26', totalRevenue: 2359,  totalAds:  7, avgAmount: 337 },
  { id: 'm10', name: 'Meadowbrook Church',            phone: '(334) 555-0110', email: 'info@meadowbrookchurch.org', salesRep: 'Jason Watson', website: 'meadowbrookchurch.org',lastIssue: 'RRP NOV25', totalRevenue: 2100,  totalAds: 12, avgAmount: 175 },
  { id: 'm11', name: 'Alabama Allergy & Asthma',      phone: '(334) 555-0111', email: 'billing@alabamaallergy.com', salesRep: 'Jason Watson', website: 'alabamaallergy.com',   lastIssue: 'RRP OCT25', totalRevenue: 3033,  totalAds:  9, avgAmount: 337 },
  { id: 'm12', name: 'Imagination Station',           phone: '(334) 555-0112', email: 'info@imaginationstation.com',salesRep: 'Jason Watson', website: 'imaginationstation.com',lastIssue: 'RRP AUG25', totalRevenue: 4983, totalAds: 11, avgAmount: 453 },
  // Warm (13–24 months)
  { id: 'm13', name: 'River Region Ballet',           phone: '(334) 555-0113', email: 'admin@rrb.org',              salesRep: 'Jason Watson', website: 'riverregionballet.org', lastIssue: 'RRP MAR25', totalRevenue: 2280,  totalAds:  8, avgAmount: 285 },
  { id: 'm14', name: 'Capitol City Club',             phone: '(334) 555-0114', email: 'events@capitolcityclub.com', salesRep: 'Jason Watson', website: 'capitolcityclub.com',  lastIssue: 'RRP JAN25', totalRevenue: 2880,  totalAds:  6, avgAmount: 480 },
  { id: 'm15', name: 'Camp Cheaha',                   phone: '(334) 555-0115', email: 'director@campcheaha.com',    salesRep: 'Jason Watson', website: 'campcheaha.com',       lastIssue: 'RRP NOV24', totalRevenue: 960,   totalAds:  4, avgAmount: 240 },
  { id: 'm16', name: 'Southern Bone & Joint',         phone: '(334) 555-0116', email: 'mktg@southernbone.com',      salesRep: 'Jason Watson', website: 'southernbone.com',     lastIssue: 'RRP JUL24', totalRevenue: 1685,  totalAds:  5, avgAmount: 337 },
  { id: 'm17', name: 'Regions Bank — Eastchase',      phone: '(334) 555-0117', email: 'community@regions.com',      salesRep: 'Jason Watson', website: 'regions.com',          lastIssue: 'RRP JUN24', totalRevenue: 7200,  totalAds: 15, avgAmount: 480 },
  { id: 'm18', name: 'AAA Travel Montgomery',         phone: '(334) 555-0118', email: 'office@aaamontgomery.com',   salesRep: 'Jason Watson', website: 'aaa.com',              lastIssue: 'RRP APR24', totalRevenue: 525,   totalAds:  3, avgAmount: 175 },
  // Cold (25–48 months)
  { id: 'm19', name: 'Fiesta Experience',             phone: '(334) 555-0119', email: 'events@fiestaexperience.com',salesRep: 'Jason Watson', website: 'fiestaexperience.com', lastIssue: 'RRP MAR24', totalRevenue: 1440,  totalAds:  6, avgAmount: 240 },
  { id: 'm20', name: 'Metro Area Pool & Spa',         phone: '(334) 555-0120', email: 'sales@metropoolspa.com',     salesRep: 'Jason Watson', website: 'metropoolspa.com',     lastIssue: 'RRP JAN24', totalRevenue: 700,   totalAds:  4, avgAmount: 175 },
  { id: 'm21', name: "Vintage Events",                phone: '(334) 555-0121', email: 'book@vintageevents.com',     salesRep: 'Jason Watson', website: 'vintageevents.com',    lastIssue: 'RRP SEP23', totalRevenue: 2359,  totalAds:  7, avgAmount: 337 },
  { id: 'm22', name: "Taylor's Landing",              phone: '(334) 555-0122', email: 'mgr@taylorslanding.com',     salesRep: 'Jason Watson', website: 'taylorslanding.com',   lastIssue: 'RRP DEC22', totalRevenue: 525,   totalAds:  3, avgAmount: 175 },
  { id: 'm23', name: 'Total Health Pharmacy',         phone: '(334) 555-0123', email: 'rx@totalhealthrx.com',       salesRep: 'Jason Watson', website: 'totalhealthrx.com',    lastIssue: 'RRP JUL22', totalRevenue: 875,   totalAds:  5, avgAmount: 175 },
  { id: 'm24', name: 'Montgomery Home Center',        phone: '(334) 555-0124', email: 'ads@mghomecenter.com',       salesRep: 'Jason Watson', website: 'mghomecenter.com',     lastIssue: 'RRP APR22', totalRevenue: 1440,  totalAds:  3, avgAmount: 480 },
  // Dead (49+ months)
  { id: 'm25', name: 'ABC Learning Center',           phone: '(334) 555-0125', email: 'admin@abclearning.com',      salesRep: 'Jason Watson', website: 'abclearning.com',      lastIssue: 'RRP MAR21', totalRevenue: 1011,  totalAds:  3, avgAmount: 337 },
  { id: 'm26', name: 'River Region Dental',           phone: '(334) 555-0126', email: 'office@rrdentalgroup.com',   salesRep: 'Jason Watson', website: 'rrdentalgroup.com',    lastIssue: 'RRP FEB21', totalRevenue: 1685,  totalAds:  5, avgAmount: 337 },
  { id: 'm27', name: 'Blue Marlin Grille',            phone: '(334) 555-0127', email: 'gm@bluemarlinmg.com',       salesRep: 'Jason Watson', website: 'bluemarlinmg.com',     lastIssue: 'RRP SEP20', totalRevenue: 480,   totalAds:  2, avgAmount: 240 },
  { id: 'm28', name: 'Montgomery Auto Mall',          phone: '(334) 555-0128', email: 'sales@mgautomall.com',      salesRep: 'Jason Watson', website: 'mgautomall.com',       lastIssue: 'RRP JAN21', totalRevenue: 1920,  totalAds:  4, avgAmount: 480 },
  { id: 'm29', name: 'Vintage Photo Studio',          phone: '(334) 555-0129', email: 'studio@vintagephotomg.com', salesRep: 'Jason Watson', website: 'vintagephotomg.com',   lastIssue: 'RRP MAR20', totalRevenue: 350,   totalAds:  2, avgAmount: 175 },
  { id: 'm30', name: 'Downtown Coffee Co.',           phone: '(334) 555-0130', email: 'hello@downtowncoffeemg.com',salesRep: 'Jason Watson', website: 'downtowncoffeemg.com', lastIssue: 'RRP DEC19', totalRevenue: 525,   totalAds:  3, avgAmount: 175 },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

const MONTH_MAP: Record<string, number> = {
  JAN:0,FEB:1,MAR:2,APR:3,MAY:4,JUN:5,JUL:6,AUG:7,SEP:8,OCT:9,NOV:10,DEC:11,
}

function parseIssueDate(issue: string | null): Date | null {
  if (!issue) return null
  const parts = issue.trim().split(/\s+/)
  const my = parts[parts.length - 1]
  if (!my || my.length < 5) return null
  const mo = MONTH_MAP[my.slice(0, 3).toUpperCase()]
  const yr = 2000 + parseInt(my.slice(3), 10)
  if (mo === undefined || isNaN(yr)) return null
  return new Date(yr, mo, 1)
}

function classifyBusiness(raw: RawBusinessIntel): BusinessIntel {
  const now   = new Date()
  const last  = parseIssueDate(raw.lastIssue)
  const months = last
    ? Math.max(0, (now.getFullYear() - last.getFullYear()) * 12 + now.getMonth() - last.getMonth())
    : 999

  let status: Status
  if (months <= 12)       status = 'active'
  else if (months <= 24)  status = 'warm'
  else if (months <= 48)  status = 'cold'
  else                    status = 'dead'

  const monthly     = raw.avgAmount
  const annualPotential = Math.round(monthly * 12 * POTENTIAL_RATE[status])

  return { ...raw, status, monthsSince: months === 999 ? 60 : months, annualPotential }
}

function downloadCSV(rows: BusinessIntel[], label: string) {
  const headers = ['Business','Status','Last Issue','Months Since','Total Ads','Lifetime Revenue','Annual Potential','Phone','Email','Sales Rep']
  const data = rows.map(r => [
    r.name, r.status, r.lastIssue ?? 'Never',
    r.monthsSince >= 60 ? '60+' : String(r.monthsSince),
    r.totalAds, `$${r.totalRevenue}`, `$${r.annualPotential}`,
    r.phone ?? '', r.email ?? '', r.salesRep ?? '',
  ])
  const csv = [headers, ...data]
    .map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `${label}-advertisers-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a); a.click()
  document.body.removeChild(a); URL.revokeObjectURL(url)
}

function googleVerify(name: string) {
  window.open(
    `https://www.google.com/search?q=${encodeURIComponent(`"${name}" Montgomery Alabama`)}&tbm=lcl`,
    '_blank', 'noopener,noreferrer'
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export function IntelligenceClient() {
  const [businesses, setBusinesses] = useState<BusinessIntel[]>([])
  const [loading, setLoading]       = useState(true)
  const [activeTab, setActiveTab]   = useState<Status | 'all'>('all')
  const [search, setSearch]         = useState('')
  const [sortKey, setSortKey]       = useState<SortKey>('monthsSince')
  const [sortDir, setSortDir]       = useState<SortDir>('asc')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/advertisers/intelligence')
      const raw: RawBusinessIntel[] = res.ok ? await res.json() : []
      const data = (raw.length > 0 ? raw : MOCK).map(classifyBusiness)
      setBusinesses(data)
    } catch {
      setBusinesses(MOCK.map(classifyBusiness))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Derived stats
  const buckets = useMemo(() => {
    const result = { active: [] as BusinessIntel[], warm: [] as BusinessIntel[], cold: [] as BusinessIntel[], dead: [] as BusinessIntel[] }
    for (const b of businesses) result[b.status].push(b)
    return result
  }, [businesses])

  const bucketRevenue = useMemo(() => ({
    active: buckets.active.reduce((s, b) => s + b.annualPotential, 0),
    warm:   buckets.warm.reduce((s, b) => s + b.annualPotential, 0),
    cold:   buckets.cold.reduce((s, b) => s + b.annualPotential, 0),
    dead:   buckets.dead.reduce((s, b) => s + b.annualPotential, 0),
  }), [buckets])

  // Filtered + sorted table rows
  const tableRows = useMemo(() => {
    let rows = activeTab === 'all' ? businesses : buckets[activeTab]
    if (search.trim()) {
      const q = search.toLowerCase()
      rows = rows.filter(b => b.name.toLowerCase().includes(q) || (b.salesRep ?? '').toLowerCase().includes(q))
    }
    return [...rows].sort((a, b) => {
      let va: string | number = a[sortKey] as string | number
      let vb: string | number = b[sortKey] as string | number
      if (typeof va === 'string') va = va.toLowerCase()
      if (typeof vb === 'string') vb = vb.toLowerCase()
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [businesses, buckets, activeTab, search, sortKey, sortDir])

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const SortIcon = ({ col }: { col: SortKey }) =>
    sortKey === col
      ? sortDir === 'asc' ? <ChevronUp size={12} className="inline ml-0.5" /> : <ChevronDown size={12} className="inline ml-0.5" />
      : null

  const totalAnnualValue = Object.values(bucketRevenue).reduce((s, v) => s + v, 0)

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Advertiser Intelligence</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Classified by last ad date · Total annual revenue potential: <span className="font-semibold text-gray-800">{formatCurrency(totalAnnualValue)}</span>
          </p>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      <div className="p-6 space-y-5">
        {/* Bucket cards */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {(Object.entries(STATUS_CONFIG) as [Status, typeof STATUS_CONFIG[Status]][]).map(([status, cfg]) => {
            const count   = buckets[status].length
            const revenue = bucketRevenue[status]
            const pct     = POTENTIAL_RATE[status]
            return (
              <button
                key={status}
                onClick={() => setActiveTab(t => t === status ? 'all' : status)}
                className={cn(
                  'text-left bg-white rounded-xl border-2 p-4 transition-all hover:shadow-sm',
                  activeTab === status ? 'border-blue-500 ring-2 ring-blue-100' : 'border-gray-200'
                )}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className={cn('px-2 py-0.5 rounded-full text-[11px] font-semibold ring-1', cfg.bg, cfg.text, cfg.ring)}>
                    {cfg.label}
                  </span>
                  <cfg.icon size={15} className={cfg.text} />
                </div>
                <div className="text-2xl font-bold text-gray-900">{count}</div>
                <div className="text-xs text-gray-500 mt-0.5">businesses</div>
                <div className="mt-2 pt-2 border-t border-gray-100">
                  <div className="text-sm font-semibold" style={{ color: 'var(--color-gold-600)' }}>{formatCurrency(revenue)}</div>
                  <div className="text-[10px] text-gray-400">{Math.round(pct * 100)}% annual potential</div>
                </div>
              </button>
            )
          })}
        </div>

        {/* Legend */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-xs text-blue-800 grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div><strong>Active</strong> — last ad 0–12 months</div>
          <div><strong>Warm</strong> — 13–24 months (70% potential)</div>
          <div><strong>Cold</strong> — 25–48 months (50% potential)</div>
          <div><strong>Lapsed</strong> — 48+ months (30% potential)</div>
        </div>

        {/* Tabs + search + export row */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
            {(['all', 'active', 'warm', 'cold', 'dead'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded-lg capitalize transition-all',
                  activeTab === tab ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                )}
              >
                {tab === 'all' ? `All (${businesses.length})` : `${STATUS_CONFIG[tab].label} (${buckets[tab].length})`}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search businesses…"
                className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 w-48"
              />
            </div>
            <button
              onClick={() => downloadCSV(tableRows, activeTab)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-gray-700 rounded-lg hover:bg-gray-800 transition-colors"
            >
              <Download size={12} /> Export CSV
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="px-6 py-10 text-center text-sm text-gray-400">Loading business intelligence…</div>
          ) : tableRows.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-gray-400">No businesses match the current filter.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {([
                      { key: 'name',           label: 'Business',         w: '' },
                      { key: 'status',         label: 'Status',           w: 'w-24' },
                      { key: 'lastIssue',      label: 'Last Issue',       w: 'w-24' },
                      { key: 'monthsSince',    label: 'Months Since',     w: 'w-24' },
                      { key: 'totalAds',       label: 'Total Ads',        w: 'w-20' },
                      { key: 'totalRevenue',   label: 'Lifetime Rev.',    w: 'w-28' },
                      { key: 'annualPotential',label: 'Annual Potential', w: 'w-28' },
                      { key: null,             label: 'Actions',          w: 'w-28' },
                    ] as { key: SortKey | null; label: string; w: string }[]).map(col => (
                      <th
                        key={col.label}
                        className={cn('px-4 py-2.5 text-left font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap', col.w)}
                        onClick={col.key ? () => toggleSort(col.key!) : undefined}
                        style={col.key ? { cursor: 'pointer', userSelect: 'none' } : {}}
                      >
                        {col.label}{col.key && <SortIcon col={col.key} />}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {tableRows.map(b => {
                    const cfg = STATUS_CONFIG[b.status]
                    return (
                      <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-gray-900">{b.name}</div>
                          {b.salesRep && <div className="text-[10px] text-gray-400">{b.salesRep}</div>}
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-semibold ring-1', cfg.bg, cfg.text, cfg.ring)}>
                            {cfg.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-700 font-mono text-[11px]">
                          {b.lastIssue ?? '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn(
                            'font-semibold',
                            b.monthsSince <= 12 ? 'text-green-700' :
                            b.monthsSince <= 24 ? 'text-amber-600' :
                            b.monthsSince <= 48 ? 'text-orange-600' : 'text-red-600'
                          )}>
                            {b.monthsSince >= 60 ? '60+' : b.monthsSince} mo
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-700">{b.totalAds}</td>
                        <td className="px-4 py-3 font-semibold text-gray-900">{formatCurrency(b.totalRevenue)}</td>
                        <td className="px-4 py-3">
                          <div className="font-semibold" style={{ color: 'var(--color-gold-600)' }}>
                            {formatCurrency(b.annualPotential)}
                          </div>
                          <div className="text-[10px] text-gray-400">{Math.round(POTENTIAL_RATE[b.status] * 100)}% of avg</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            {/* Google verify — especially useful for Cold/Dead */}
                            <button
                              onClick={() => googleVerify(b.name)}
                              title="Search Google for this business"
                              className={cn(
                                'flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded-md border transition-colors',
                                b.status === 'cold' || b.status === 'dead'
                                  ? 'border-blue-200 text-blue-700 hover:bg-blue-50'
                                  : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                              )}
                            >
                              <ExternalLink size={10} />
                              Verify
                            </button>
                            {/* Contact info quick copy */}
                            {b.phone && (
                              <a
                                href={`tel:${b.phone}`}
                                className="px-2 py-1 text-[10px] font-medium border border-gray-200 text-gray-500 rounded-md hover:bg-gray-50 transition-colors"
                              >
                                Call
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
          {/* Footer */}
          <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50 flex items-center justify-between text-[10px] text-gray-400">
            <span>Showing {tableRows.length} of {businesses.length} businesses</span>
            <span>Revenue potential = avg monthly × 12 × confidence rate</span>
          </div>
        </div>

      </div>
    </div>
  )
}
