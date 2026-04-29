'use client'

import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, CheckCircle2, Clock, AlertCircle, BarChart2, DollarSign, Calendar } from 'lucide-react'
import { PUBLICATIONS, PRINT_ZONES, WEB_ZONES, getNextSixMonths } from '@/lib/ad-zones'
import { cn, formatCurrency } from '@/lib/utils'

// ── Types ─────────────────────────────────────────────────────────────────────

type BookingRecord = {
  id: string
  publication: string
  issues: string[]
  zoneId: string
  zoneName: string
  zoneType: string
  businessName: string
  contactName: string | null
  phone: string | null
  email: string
  packageType: string
  totalAmount: number
  designHelp: boolean
  status: 'pending' | 'paid' | 'cancelled' | 'refunded'
  ghlTriggered: boolean
  vaNotified: boolean
  createdAt: string
}

type InventoryRow = {
  id: string
  publication: string
  issue: string
  zoneId: string
  zoneName: string
  zoneType: string
  priceMonthly: number
  status: 'available' | 'reserved' | 'booked'
  bookedBusiness: string | null
}

// Mock data for when Supabase isn't configured
const MOCK_BOOKINGS: BookingRecord[] = [
  {
    id: 'b1', publication: 'RRP', issues: ['RRP APR26', 'RRP MAY26'], zoneId: 'quarter_tr',
    zoneName: 'Quarter Page (Top Right)', zoneType: 'print',
    businessName: 'Bright Smiles Orthodontics', contactName: 'Dr. Sarah Webb',
    phone: '(334) 555-0142', email: 'info@brightsmiles.com',
    packageType: 'print', totalAmount: 350, designHelp: false,
    status: 'paid', ghlTriggered: true, vaNotified: true,
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: 'b2', publication: 'RRP', issues: ['RRP APR26'], zoneId: 'header_leaderboard',
    zoneName: 'Header Leaderboard', zoneType: 'web',
    businessName: 'Little Stars Childcare', contactName: 'Jennifer Moore',
    phone: '(334) 555-0166', email: 'jmoore@littlestars.com',
    packageType: 'web', totalAmount: 200, designHelp: false,
    status: 'paid', ghlTriggered: true, vaNotified: false,
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
  {
    id: 'b3', publication: 'RRP', issues: ['RRP APR26'], zoneId: 'half_h_top',
    zoneName: 'Half Page Horizontal (Top)', zoneType: 'print',
    businessName: 'Montgomery YMCA', contactName: 'Marcus Hill',
    phone: '(334) 555-0199', email: 'mhill@ymca.net',
    packageType: 'bundle', totalAmount: 399, designHelp: true,
    status: 'pending', ghlTriggered: false, vaNotified: false,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
]

const STATUS_CONFIG = {
  paid:      { label: 'Paid',      cls: 'bg-green-50 text-green-700 ring-green-200',  icon: CheckCircle2 },
  pending:   { label: 'Pending',   cls: 'bg-amber-50 text-amber-700 ring-amber-200',  icon: Clock },
  cancelled: { label: 'Cancelled', cls: 'bg-red-50 text-red-600 ring-red-200',        icon: AlertCircle },
  refunded:  { label: 'Refunded',  cls: 'bg-gray-50 text-gray-500 ring-gray-200',     icon: AlertCircle },
}

// ── Component ─────────────────────────────────────────────────────────────────

export function AdInventoryAdmin() {
  const [bookings, setBookings]     = useState<BookingRecord[]>([])
  const [inventory, setInventory]   = useState<InventoryRow[]>([])
  const [loading, setLoading]       = useState(true)
  const [selectedPub, setSelectedPub] = useState('RRP')
  const [activeTab, setActiveTab]   = useState<'bookings' | 'inventory'>('bookings')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      // Try to fetch from Supabase via ad-booking API
      const invRes = await fetch(`/api/ad-booking?pub=${selectedPub}`)
      if (invRes.ok) {
        // Real inventory map — convert to rows for display
        const invMap = await invRes.json()
        const allZones = [...PRINT_ZONES, ...WEB_ZONES]
        const issues = getNextSixMonths(selectedPub)
        const rows: InventoryRow[] = []
        for (const issue of issues) {
          for (const zone of allZones) {
            const inv = invMap[zone.id]
            rows.push({
              id: `${selectedPub}-${issue}-${zone.id}`,
              publication: selectedPub,
              issue,
              zoneId: zone.id,
              zoneName: zone.displayName,
              zoneType: PRINT_ZONES.some(z => z.id === zone.id) ? 'print' : 'web',
              priceMonthly: zone.price,
              status: (inv?.status ?? 'available') as 'available' | 'reserved' | 'booked',
              bookedBusiness: inv?.bookedBusiness ?? null,
            })
          }
        }
        setInventory(rows)
        setBookings(MOCK_BOOKINGS) // bookings require admin auth
      } else {
        throw new Error('not configured')
      }
    } catch {
      setBookings(MOCK_BOOKINGS)
      // Build mock inventory
      const allZones = [...PRINT_ZONES, ...WEB_ZONES]
      const issues = getNextSixMonths(selectedPub)
      const rows: InventoryRow[] = []
      for (const issue of issues.slice(0, 3)) {
        for (const zone of allZones) {
          const takenIds = ['quarter_tr', 'header_leaderboard', 'half_h_top']
          rows.push({
            id: `${selectedPub}-${issue}-${zone.id}`,
            publication: selectedPub, issue,
            zoneId: zone.id, zoneName: zone.displayName,
            zoneType: PRINT_ZONES.some(z => z.id === zone.id) ? 'print' : 'web',
            priceMonthly: zone.price,
            status: takenIds.includes(zone.id) && issue.includes('APR') ? 'booked' : 'available',
            bookedBusiness: takenIds.includes(zone.id) && issue.includes('APR') ? 'Demo Business' : null,
          })
        }
      }
      setInventory(rows)
    } finally {
      setLoading(false)
    }
  }, [selectedPub])

  useEffect(() => { loadData() }, [loadData])

  // Stats
  const paidBookings = bookings.filter(b => b.status === 'paid')
  const totalRevenue = paidBookings.reduce((s, b) => s + b.totalAmount, 0)
  const pendingCount = bookings.filter(b => b.status === 'pending').length
  const bookedSlots  = inventory.filter(r => r.status !== 'available').length

  // Issues for the current pub
  const issues = getNextSixMonths(selectedPub)

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 shrink-0 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Ad Inventory</h1>
          <p className="text-xs text-gray-500 mt-0.5">All publications · booking history + availability</p>
        </div>
        <div className="flex items-center gap-2">
          <a href="/advertise" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors">
            View Public Page ↗
          </a>
          <button onClick={loadData} className="flex items-center gap-1 px-3 py-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <RefreshCw size={12} /> Refresh
          </button>
        </div>
      </div>

      <div className="p-6 space-y-5">

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Total Bookings', value: bookings.length, icon: Calendar,   color: 'text-blue-600',  bg: 'bg-blue-50' },
            { label: 'Paid',           value: paidBookings.length, icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' },
            { label: 'Pending Payment',value: pendingCount, icon: Clock,         color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'Total Revenue',  value: formatCurrency(totalRevenue), icon: DollarSign, color: 'text-purple-600', bg: 'bg-purple-50' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
              <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center shrink-0', s.bg)}>
                <s.icon size={18} className={s.color} />
              </div>
              <div>
                <div className="text-xl font-bold text-gray-900">{s.value}</div>
                <div className="text-xs text-gray-500">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Tab nav */}
        <div className="flex gap-2 bg-white rounded-xl border border-gray-200 p-1 w-fit">
          {(['bookings', 'inventory'] as const).map(t => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={cn(
                'px-4 py-2 text-sm font-medium rounded-lg transition-colors capitalize',
                activeTab === t ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'
              )}
            >
              {t === 'bookings' ? `Booking History (${bookings.length})` : `Inventory — ${bookedSlots} taken`}
            </button>
          ))}
        </div>

        {/* ── BOOKING HISTORY ──────────────────────────────────────────── */}
        {activeTab === 'bookings' && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {loading ? (
              <div className="px-6 py-8 text-sm text-gray-400 text-center">Loading…</div>
            ) : bookings.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <BarChart2 size={28} className="mx-auto text-gray-300 mb-2" />
                <p className="text-sm text-gray-500">No bookings yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {bookings.map(b => {
                  const cfg = STATUS_CONFIG[b.status]
                  const isExpanded = expandedId === b.id
                  return (
                    <div key={b.id}>
                      <button
                        className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors text-left"
                        onClick={() => setExpandedId(isExpanded ? null : b.id)}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-gray-900">{b.businessName}</span>
                            <span className="text-xs text-gray-400">{b.publication}</span>
                            <span className="text-xs text-gray-500">·</span>
                            <span className="text-xs text-gray-600">{b.zoneName}</span>
                          </div>
                          <div className="text-xs text-gray-400 mt-0.5">
                            {b.issues.join(', ')} · {b.packageType} package
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={cn('px-2 py-0.5 rounded-full text-[11px] font-medium ring-1', cfg.cls)}>
                            {cfg.label}
                          </span>
                          <span className="text-sm font-bold" style={{ color: 'var(--color-gold-600)' }}>
                            {formatCurrency(b.totalAmount)}
                          </span>
                          <span className="text-gray-400 text-xs">{isExpanded ? '▲' : '▼'}</span>
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="px-5 pb-4 bg-gray-50/50 border-t border-gray-100">
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3 text-xs">
                            {[
                              { label: 'Contact',   value: b.contactName ?? '—' },
                              { label: 'Phone',     value: b.phone ?? '—' },
                              { label: 'Email',     value: b.email },
                              { label: 'Zone type', value: b.zoneType },
                              { label: 'Design help', value: b.designHelp ? 'Yes (+$150)' : 'No' },
                              { label: 'Booked',    value: new Date(b.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) },
                            ].map(item => (
                              <div key={item.label}>
                                <div className="text-gray-400 uppercase tracking-wide text-[10px]">{item.label}</div>
                                <div className="text-gray-800 font-medium mt-0.5 truncate">{item.value}</div>
                              </div>
                            ))}
                          </div>
                          <div className="flex items-center gap-2 mt-3">
                            {!b.ghlTriggered && (
                              <span className="px-2 py-1 text-[10px] bg-amber-50 text-amber-700 ring-1 ring-amber-200 rounded">
                                GHL sequence not triggered
                              </span>
                            )}
                            {!b.vaNotified && (
                              <span className="px-2 py-1 text-[10px] bg-blue-50 text-blue-700 ring-1 ring-blue-200 rounded">
                                VA notification pending
                              </span>
                            )}
                            {b.ghlTriggered && b.vaNotified && (
                              <span className="px-2 py-1 text-[10px] bg-green-50 text-green-700 ring-1 ring-green-200 rounded flex items-center gap-0.5">
                                <CheckCircle2 size={9} /> All automations complete
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── INVENTORY VIEW ──────────────────────────────────────────── */}
        {activeTab === 'inventory' && (
          <div className="space-y-4">
            {/* Publication filter */}
            <div className="flex flex-wrap gap-2">
              {PUBLICATIONS.map(p => (
                <button
                  key={p.abbrev}
                  onClick={() => setSelectedPub(p.abbrev)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg border text-xs font-medium transition-all',
                    selectedPub === p.abbrev ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  )}
                >
                  {p.abbrev}
                </button>
              ))}
            </div>

            {/* Inventory table — grouped by issue */}
            {loading ? (
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-sm text-gray-400">Loading inventory…</div>
            ) : (
              <div className="space-y-3">
                {issues.slice(0, 4).map(issue => {
                  const issueRows = inventory.filter(r => r.issue === issue)
                  const printRows = issueRows.filter(r => r.zoneType === 'print')
                  const webRows   = issueRows.filter(r => r.zoneType === 'web')
                  const takenCount = issueRows.filter(r => r.status !== 'available').length

                  return (
                    <div key={issue} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                      <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                        <div className="text-sm font-bold text-gray-900">{issue}</div>
                        <div className="text-xs text-gray-500">
                          {takenCount} taken · {issueRows.length - takenCount} available
                        </div>
                      </div>
                      <div className="p-4 grid grid-cols-2 gap-4">
                        {/* Print */}
                        <div>
                          <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-2">Print</div>
                          <div className="space-y-1">
                            {printRows.map(row => (
                              <div key={row.id} className="flex items-center justify-between text-xs">
                                <span className="text-gray-700 truncate max-w-[140px]">{row.zoneName}</span>
                                <span className={cn(
                                  'px-1.5 py-0.5 rounded text-[10px] font-medium',
                                  row.status === 'available' ? 'bg-green-50 text-green-700' :
                                  row.status === 'booked' ? 'bg-gray-100 text-gray-500' :
                                  'bg-amber-50 text-amber-700'
                                )}>
                                  {row.status === 'available' ? `$${row.priceMonthly}` : row.bookedBusiness ?? 'Reserved'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                        {/* Web */}
                        <div>
                          <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-2">Web</div>
                          <div className="space-y-1">
                            {webRows.map(row => (
                              <div key={row.id} className="flex items-center justify-between text-xs">
                                <span className="text-gray-700 truncate max-w-[140px]">{row.zoneName}</span>
                                <span className={cn(
                                  'px-1.5 py-0.5 rounded text-[10px] font-medium',
                                  row.status === 'available' ? 'bg-green-50 text-green-700' :
                                  row.status === 'booked' ? 'bg-gray-100 text-gray-500' :
                                  'bg-amber-50 text-amber-700'
                                )}>
                                  {row.status === 'available' ? `$${row.priceMonthly}` : row.bookedBusiness ?? 'Reserved'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
