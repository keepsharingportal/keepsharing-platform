'use client'

import { useState, useEffect, useRef } from 'react'
import { X, ChevronLeft, ChevronRight, Upload, Check, RefreshCw, AlertCircle, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Brand ─────────────────────────────────────────────────────────────────────
const TERRA    = '#7d4535'
const TERRA_DK = '#5f3227'
const CREAM    = '#faf7f2'
const CREAM_2  = '#f5ede4'
const AVAIL    = '#22c55e'
const TAKEN    = '#9ca3af'
const PENDING  = '#eab308'

// ── Rate card (exact per spec) ────────────────────────────────────────────────
const RATE_CARD: Record<string, Record<number, number>> = {
  full:    { 1: 937,  3: 863,  6: 797,  12: 747,  18: 697  },
  half:    { 1: 637,  3: 573,  6: 537,  12: 497,  18: 447  },
  quarter: { 1: 453,  3: 407,  6: 377,  12: 337,  18: 297  },
  sixth:   { 1: 327,  3: 297,  6: 263,  12: 223,  18: 197  },
  // Web zones — bracketed at roughly 60% of print equivalent
  web:     { 1: 275,  3: 245,  6: 220,  12: 195,  18: 175  },
}

function getBracket(n: number): number {
  if (n <= 1)  return 1
  if (n <= 3)  return 3
  if (n <= 6)  return 6
  if (n <= 12) return 12
  return 18
}

function getMonthlyRate(adSize: string, n: number): number {
  const table = RATE_CARD[adSize] ?? RATE_CARD.sixth
  return table[getBracket(n)] ?? 0
}

function fmt$(n: number) { return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }) }

// ── Month helpers ─────────────────────────────────────────────────────────────
const MO_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function getNext18Months(): string[] {
  const result: string[] = []
  const now = new Date()
  let y = now.getFullYear()
  let m = now.getMonth() + 2  // start from next month (1-indexed)
  if (m > 12) { m -= 12; y++ }
  for (let i = 0; i < 18; i++) {
    result.push(`${y}-${String(m).padStart(2, '0')}`)
    if (++m > 12) { m = 1; y++ }
  }
  return result
}

function fmtMonth(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  return `${MO_NAMES[m - 1]} ${y}`
}

function isConsecutive(months: string[]): boolean {
  if (months.length <= 1) return true
  const sorted = [...months].sort()
  for (let i = 1; i < sorted.length; i++) {
    const [y1, m1] = sorted[i - 1].split('-').map(Number)
    const [y2, m2] = sorted[i].split('-').map(Number)
    if ((y2 - y1) * 12 + (m2 - m1) !== 1) return false
  }
  return true
}

// ── SVG zone definitions ──────────────────────────────────────────────────────
const W = 255
const H = 330
const G = 2  // gap px

type ZoneRect = { id: string; x: number; y: number; w: number; h: number; label: string; sub?: string }

const ZONE_SETS: Record<string, Record<string, ZoneRect[]>> = {
  full: {
    default: [{ id: 'full', x: 0, y: 0, w: W, h: H, label: 'Full Page', sub: '8.375 × 10.875"' }],
  },
  half: {
    h: [
      { id: 'h-top', x: 0, y: 0,       w: W, h: H/2 - G/2, label: 'Top Half', sub: 'Horizontal' },
      { id: 'h-bot', x: 0, y: H/2+G/2, w: W, h: H/2 - G/2, label: 'Bottom Half', sub: 'Horizontal' },
    ],
    v: [
      { id: 'v-left',  x: 0,       y: 0, w: W/2 - G/2, h: H, label: 'Left Half',  sub: 'Vertical' },
      { id: 'v-right', x: W/2+G/2, y: 0, w: W/2 - G/2, h: H, label: 'Right Half', sub: 'Vertical' },
    ],
  },
  quarter: {
    default: [
      { id: 'tl', x: 0,       y: 0,       w: W/2-G/2, h: H/2-G/2, label: 'Top Left' },
      { id: 'tr', x: W/2+G/2, y: 0,       w: W/2-G/2, h: H/2-G/2, label: 'Top Right' },
      { id: 'bl', x: 0,       y: H/2+G/2, w: W/2-G/2, h: H/2-G/2, label: 'Bottom Left' },
      { id: 'br', x: W/2+G/2, y: H/2+G/2, w: W/2-G/2, h: H/2-G/2, label: 'Bottom Right' },
    ],
  },
  sixth: {
    default: [
      { id: 'six-1', x: 0,       y: 0,         w: W/2-G/2, h: H/3-G, label: 'Zone 1' },
      { id: 'six-2', x: W/2+G/2, y: 0,         w: W/2-G/2, h: H/3-G, label: 'Zone 2' },
      { id: 'six-3', x: 0,       y: H/3+G/2,   w: W/2-G/2, h: H/3-G, label: 'Zone 3' },
      { id: 'six-4', x: W/2+G/2, y: H/3+G/2,   w: W/2-G/2, h: H/3-G, label: 'Zone 4' },
      { id: 'six-5', x: 0,       y: (H/3)*2+G, w: W/2-G/2, h: H/3-G, label: 'Zone 5' },
      { id: 'six-6', x: W/2+G/2, y: (H/3)*2+G, w: W/2-G/2, h: H/3-G, label: 'Zone 6' },
    ],
  },
}

// ── Web zone definitions ──────────────────────────────────────────────────────
type WebZoneInfo = { id: string; label: string; dims: string; placement: string; price: number }
const WEB_ZONE_LIST: WebZoneInfo[] = [
  { id: 'header_leaderboard', label: 'Header Leaderboard',     dims: '728 × 90',  placement: 'Top of every page — above the fold',            price: 200 },
  { id: 'article_inline_top', label: 'Article Inline Top',     dims: '600 × 300', placement: 'Top of article content — first thing readers see', price: 150 },
  { id: 'article_inline_mid', label: 'Article Inline Mid',     dims: '600 × 300', placement: 'Middle of article — high dwell-time position',     price: 150 },
  { id: 'article_inline_bot', label: 'Article Inline Bottom',  dims: '600 × 150', placement: 'End of article — captures readers at close',       price: 100 },
  { id: 'guide_sidebar',      label: 'Guide Sidebar',          dims: '300 × 250', placement: 'Local Guides sidebar — high purchase intent',      price: 125 },
  { id: 'email_banner',       label: 'Email Newsletter Banner', dims: '600 × 200', placement: 'Top of weekly email to 2,400+ subscribers',       price: 175 },
]

// ── Types ─────────────────────────────────────────────────────────────────────

type SizeTab = 'full' | 'half' | 'quarter' | 'sixth'

type ActiveBooking = {
  ad_size: string
  ad_position: string
  months: string[]
  business_name: string
  status: 'pending' | 'confirmed'
}

type SelectedZone = {
  adSize: string
  adPosition: string
  displayName: string
}

type FormData = {
  businessName: string
  firstName: string
  lastName: string
  email: string
  phone: string
  website: string
}

const EMPTY_FORM: FormData = { businessName: '', firstName: '', lastName: '', email: '', phone: '', website: '' }

type Step = 1 | 2 | 3 | 4 | 5

// ── Magazine SVG ──────────────────────────────────────────────────────────────

function ZoneStatus({ bookings, adSize, adPosition }: { bookings: ActiveBooking[]; adSize: string; adPosition: string }) {
  const relevant = bookings.filter(b => b.ad_size === adSize && b.ad_position === adPosition)
  if (relevant.some(b => b.status === 'confirmed')) return 'taken' as const
  if (relevant.some(b => b.status === 'pending'))   return 'pending' as const
  return 'available' as const
}

function MagazineSVG({
  zones, bookings, adSize, onSelect, selectedId,
}: {
  zones: ZoneRect[]
  bookings: ActiveBooking[]
  adSize: string
  onSelect: (zone: ZoneRect) => void
  selectedId: string | null
}) {
  const [hovered, setHovered] = useState<string | null>(null)

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full max-w-xs rounded-lg shadow-md border border-[#ddd4c8]"
        style={{ backgroundColor: '#f9f6f1' }}
      >
        {/* Page border / bleed marks */}
        <rect x={0} y={0} width={W} height={H} fill="#f9f6f1" />
        <line x1={4} y1={0} x2={4} y2={8}   stroke="#ccc" strokeWidth={0.5} />
        <line x1={0} y1={4} x2={8} y2={4}   stroke="#ccc" strokeWidth={0.5} />
        <line x1={W-4} y1={0} x2={W-4} y2={8}   stroke="#ccc" strokeWidth={0.5} />
        <line x1={W-8} y1={4} x2={W} y2={4} stroke="#ccc" strokeWidth={0.5} />

        {zones.map(zone => {
          const status   = ZoneStatus({ bookings, adSize, adPosition: zone.id })
          const isSel    = selectedId === zone.id
          const isHov    = hovered === zone.id
          const taken    = status === 'taken' || status === 'pending'
          const fill     = taken
            ? (status === 'pending' ? PENDING + '60' : TAKEN + '50')
            : isSel ? TERRA + 'cc'
            : isHov ? AVAIL + 'cc'
            : AVAIL + '55'
          const stroke   = taken
            ? (status === 'pending' ? PENDING : TAKEN)
            : isSel ? TERRA_DK
            : AVAIL
          const business = bookings.find(b => b.ad_size === adSize && b.ad_position === zone.id)?.business_name

          return (
            <g key={zone.id}>
              <rect
                x={zone.x + 1} y={zone.y + 1} width={zone.w - 2} height={zone.h - 2}
                fill={fill} stroke={stroke} strokeWidth={taken ? 1 : 1.5} rx={2}
                style={{ cursor: taken ? 'not-allowed' : 'pointer', transition: 'fill 150ms' }}
                onClick={() => !taken && onSelect(zone)}
                onMouseEnter={() => setHovered(zone.id)}
                onMouseLeave={() => setHovered(null)}
              />
              {/* Label text */}
              {zone.h > 35 && (
                <text
                  x={zone.x + zone.w / 2} y={zone.y + zone.h / 2 - (isHov && !taken ? 6 : 0)}
                  textAnchor="middle" dominantBaseline="middle"
                  fill={isSel ? '#fff' : taken ? '#666' : '#166534'}
                  fontSize={Math.min(11, zone.w / 8)}
                  fontWeight="600"
                  style={{ pointerEvents: 'none' }}
                >
                  {taken ? (business ? business.substring(0, 16) : (status === 'pending' ? 'Pending' : 'Booked')) : zone.label}
                </text>
              )}
              {isHov && !taken && (
                <text
                  x={zone.x + zone.w / 2} y={zone.y + zone.h / 2 + 10}
                  textAnchor="middle" dominantBaseline="middle"
                  fill="#166534" fontSize={9} fontWeight="700"
                  style={{ pointerEvents: 'none' }}
                >
                  Reserve →
                </text>
              )}
            </g>
          )
        })}
      </svg>

      {/* Legend */}
      <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-500">
        {[['Available', AVAIL], ['Booked', TAKEN], ['Pending', PENDING]].map(([label, color]) => (
          <div key={label} className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color + '80', border: `1px solid ${color}` }} />
            {label}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Booking panel ─────────────────────────────────────────────────────────────

function BookingPanel({
  open, zone, bookings, onClose,
}: {
  open: boolean
  zone: SelectedZone | null
  bookings: ActiveBooking[]
  onClose: () => void
}) {
  const MONTHS = getNext18Months()
  const [step, setStep]             = useState<Step>(1)
  const [months, setMonths]         = useState<string[]>([])
  const [monthError, setMonthError] = useState<string | null>(null)
  const [designHelp, setDesignHelp] = useState(false)
  const [graphic, setGraphic]       = useState<File | null>(null)
  const [graphicUrl, setGraphicUrl] = useState<string | null>(null)
  const [uploading, setUploading]   = useState(false)
  const [form, setForm]             = useState<FormData>(EMPTY_FORM)
  const [loading, setLoading]       = useState(false)
  const [apiError, setApiError]     = useState<string | null>(null)
  const fileRef                     = useRef<HTMLInputElement>(null)

  // Reset when panel opens with a new zone
  useEffect(() => {
    if (open) { setStep(1); setMonths([]); setMonthError(null); setDesignHelp(false); setGraphic(null); setGraphicUrl(null); setForm(EMPTY_FORM); setApiError(null) }
  }, [open, zone?.adPosition])

  if (!zone) return null

  const n             = months.length
  const bracket       = getBracket(n)
  const monthlyRate   = getMonthlyRate(zone.adSize, n)
  const subtotal      = monthlyRate * n
  const total         = subtotal + (designHelp ? 150 : 0)

  // Check if selected months conflict with existing bookings
  const conflicting = bookings.filter(b =>
    b.ad_size === zone.adSize && b.ad_position === zone.adPosition &&
    ['pending','confirmed'].includes(b.status) &&
    b.months.some(m => months.includes(m))
  )

  const toggleMonth = (m: string) => {
    const next = months.includes(m) ? months.filter(x => x !== m) : [...months, m]
    setMonths(next)
    if (next.length > 1 && !isConsecutive(next)) {
      setMonthError('Months must be consecutive — no gaps.')
    } else {
      setMonthError(null)
    }
  }

  const canNext = (): boolean => {
    if (step === 1) return months.length > 0 && !monthError && conflicting.length === 0
    if (step === 3) return !!form.businessName && !!form.firstName && !!form.email
    return true
  }

  const uploadGraphic = async (file: File) => {
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/bookings/upload', { method: 'POST', body: fd })
      if (res.ok) {
        const { url } = await res.json()
        setGraphicUrl(url)
      }
    } catch { /* upload optional */ }
    setUploading(false)
  }

  const handleCheckout = async () => {
    setLoading(true); setApiError(null)
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          publicationSlug: 'rrp',
          adSize:           zone.adSize,
          adPosition:       zone.adPosition,
          months,
          businessName:     form.businessName,
          contactFirstName: form.firstName,
          contactLastName:  form.lastName || undefined,
          email:            form.email,
          phone:            form.phone || undefined,
          website:          form.website || undefined,
          designHelp,
          graphicUrl:       graphicUrl ?? undefined,
        }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setApiError(data.error ?? 'Something went wrong. Please try again.')
      }
    } catch {
      setApiError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const inputCls = 'w-full px-3 py-2 text-sm text-gray-900 bg-white border border-[#ddd4c8] rounded-lg outline-none focus:border-[#7d4535] focus:ring-2 focus:ring-[#7d453520] transition-all placeholder:text-gray-400'
  const labelCls = 'block text-xs font-semibold text-gray-600 mb-1'

  const STEP_LABELS = ['', 'Select Months', 'Pricing', 'Your Info', 'Ad Creative', 'Review & Reserve']

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn('fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-300', open ? 'opacity-100' : 'opacity-0 pointer-events-none')}
        onClick={onClose}
      />

      {/* Panel */}
      <div className={cn(
        'fixed right-0 top-0 bottom-0 z-50 w-full sm:w-[440px] bg-white shadow-2xl flex flex-col transition-transform duration-300',
        open ? 'translate-x-0' : 'translate-x-full'
      )}>
        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center justify-between mb-1">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Reserve a Spot</div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors"><X size={18} /></button>
          </div>
          <div className="text-base font-bold text-gray-900">{zone.displayName}</div>
          <div className="text-xs text-gray-500 mt-0.5">River Region Parents</div>
        </div>

        {/* Step indicator */}
        <div className="px-5 py-3 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-1">
            {[1,2,3,4,5].map((s, i) => (
              <div key={s} className="flex items-center gap-1">
                <div className={cn('w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors',
                  step > s ? 'text-white' : step === s ? 'text-white' : 'bg-gray-100 text-gray-400'
                )} style={step > s ? { backgroundColor: AVAIL } : step === s ? { backgroundColor: TERRA } : {}}>
                  {step > s ? '✓' : i + 1}
                </div>
                {i < 4 && <div className="h-px w-6 sm:w-8" style={{ backgroundColor: step > s ? AVAIL : '#e5e7eb' }} />}
              </div>
            ))}
          </div>
          <div className="text-xs text-gray-500 mt-1.5 font-medium">{STEP_LABELS[step]}</div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-5">

          {/* STEP 1 — Month selector */}
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">Choose which months you want your ad to run. Months must be consecutive.</p>

              <div className="grid grid-cols-3 gap-2">
                {MONTHS.map(m => {
                  const conflict = bookings.some(b =>
                    b.ad_size === zone.adSize && b.ad_position === zone.adPosition &&
                    ['pending','confirmed'].includes(b.status) && b.months.includes(m)
                  )
                  const isSel = months.includes(m)
                  const isJune = m.endsWith('-06') && m.startsWith('2026')
                  return (
                    <button
                      key={m}
                      disabled={conflict}
                      onClick={() => toggleMonth(m)}
                      className={cn(
                        'px-3 py-2 rounded-xl border text-xs font-semibold transition-all text-center relative',
                        conflict
                          ? 'border-gray-200 bg-gray-50 text-gray-300 cursor-not-allowed'
                          : isSel
                          ? 'border-[#7d4535] text-white'
                          : 'border-gray-200 text-gray-700 hover:border-[#7d4535]/40 hover:bg-[#fdf9f5]'
                      )}
                      style={isSel ? { backgroundColor: TERRA } : undefined}
                    >
                      {fmtMonth(m)}
                      {isJune && !conflict && (
                        <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-400" title="Newcomer Issue 2026" />
                      )}
                    </button>
                  )
                })}
              </div>

              {monthError && (
                <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <AlertCircle size={13} className="shrink-0" /> {monthError}
                </div>
              )}
              {conflicting.length > 0 && (
                <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  One or more selected months are already booked. Please deselect them.
                </div>
              )}
              {months.length > 0 && !monthError && (
                <div className="flex items-center gap-2 text-xs bg-[#f5ede4] border border-[#ddd4c8] rounded-lg px-3 py-2">
                  <Info size={12} style={{ color: TERRA }} className="shrink-0" />
                  <span><strong>{months.length} month{months.length !== 1 ? 's' : ''}</strong> selected · {bracket}-month rate applies</span>
                </div>
              )}
            </div>
          )}

          {/* STEP 2 — Pricing */}
          {step === 2 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">Here is your rate breakdown based on your selected term.</p>
              <div className="bg-[#fdf9f5] border border-[#ddd4c8] rounded-xl p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Ad size</span>
                  <span className="font-semibold capitalize text-gray-900">{zone.adSize} Page</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Position</span>
                  <span className="font-semibold text-gray-900">{zone.displayName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Term</span>
                  <span className="font-semibold text-gray-900">{n} month{n !== 1 ? 's' : ''} ({bracket}-mo rate)</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Months</span>
                  <span className="font-semibold text-gray-900 text-right max-w-[200px] text-xs">
                    {months.map(fmtMonth).join(', ')}
                  </span>
                </div>
                <div className="border-t border-[#ddd4c8] pt-3">
                  <div className="flex justify-between text-sm text-gray-500 mb-1">
                    <span>{fmt$(monthlyRate)}/mo × {n}</span>
                    <span>{fmt$(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-base font-bold" style={{ color: TERRA }}>
                    <span>Monthly rate</span>
                    <span>{fmt$(monthlyRate)}/mo</span>
                  </div>
                </div>
              </div>
              <div className="text-xs text-gray-500 bg-[#f5ede4] rounded-lg px-3 py-2">
                Design help (+$150) is available in the next step.
              </div>
            </div>
          )}

          {/* STEP 3 — Business info */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className={labelCls}>Business / Organization Name <span className="text-red-500">*</span></label>
                  <input value={form.businessName} onChange={e => setForm(f => ({ ...f, businessName: e.target.value }))}
                    className={inputCls} placeholder="e.g. Bright Smiles Orthodontics" />
                </div>
                <div>
                  <label className={labelCls}>First Name <span className="text-red-500">*</span></label>
                  <input value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
                    className={inputCls} placeholder="First" />
                </div>
                <div>
                  <label className={labelCls}>Last Name</label>
                  <input value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
                    className={inputCls} placeholder="Last" />
                </div>
                <div>
                  <label className={labelCls}>Email <span className="text-red-500">*</span></label>
                  <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    className={inputCls} placeholder="you@yourbusiness.com" />
                </div>
                <div>
                  <label className={labelCls}>Phone</label>
                  <input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    className={inputCls} placeholder="(334) 555-0100" />
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>Website</label>
                  <input type="url" value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))}
                    className={inputCls} placeholder="https://…" />
                </div>
              </div>
            </div>
          )}

          {/* STEP 4 — Ad graphic / design help */}
          {step === 4 && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">Provide your ad graphic or let us design it for you.</p>

              {/* Option A: upload */}
              <button
                onClick={() => setDesignHelp(false)}
                className={cn('w-full flex items-start gap-3 px-4 py-3.5 rounded-xl border-2 text-left transition-all',
                  !designHelp ? 'border-[#7d4535] bg-[#fdf3ef]' : 'border-gray-200 hover:border-gray-300'
                )}
              >
                <Upload size={16} className={!designHelp ? 'text-[#7d4535] mt-0.5' : 'text-gray-400 mt-0.5'} />
                <div>
                  <div className="text-sm font-semibold text-gray-900">I will provide my ad graphic</div>
                  <div className="text-xs text-gray-500">PDF, PNG, JPG · max 25 MB · high-res preferred</div>
                </div>
              </button>

              {/* File input when A is selected */}
              {!designHelp && (
                <div className="ml-4 space-y-2">
                  <input
                    ref={fileRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp"
                    className="hidden"
                    onChange={async e => {
                      const f = e.target.files?.[0]
                      if (f) { setGraphic(f); await uploadGraphic(f) }
                    }}
                  />
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="text-xs font-semibold text-[#7d4535] border border-[#ddd4c8] rounded-lg px-3 py-1.5 hover:bg-[#fdf9f5] transition-colors flex items-center gap-1.5"
                  >
                    {uploading ? <RefreshCw size={12} className="animate-spin" /> : <Upload size={12} />}
                    {graphic ? graphic.name : 'Choose file…'}
                  </button>
                  {graphicUrl && <div className="text-xs text-green-700 flex items-center gap-1"><Check size={11} /> Uploaded</div>}
                  <p className="text-xs text-gray-400">You can also send your graphic after booking — we will reach out.</p>
                </div>
              )}

              {/* Option B: design help */}
              <button
                onClick={() => setDesignHelp(true)}
                className={cn('w-full flex items-start gap-3 px-4 py-3.5 rounded-xl border-2 text-left transition-all',
                  designHelp ? 'border-[#7d4535] bg-[#fdf3ef]' : 'border-gray-200 hover:border-gray-300'
                )}
              >
                <div className={cn('w-4 h-4 rounded-full border-2 mt-0.5 shrink-0 flex items-center justify-center', designHelp ? 'border-[#7d4535] bg-[#7d4535]' : 'border-gray-300')}>
                  {designHelp && <Check size={9} className="text-white" />}
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-900">I need design help <span className="text-[#7d4535]">+$150</span></div>
                  <div className="text-xs text-gray-500">KeepSharing team creates your ad — proof shared before publishing</div>
                </div>
              </button>
            </div>
          )}

          {/* STEP 5 — Summary */}
          {step === 5 && (
            <div className="space-y-4">
              <div className="bg-[#fdf9f5] border border-[#ddd4c8] rounded-xl p-4 space-y-2 text-sm">
                {[
                  ['Zone', zone.displayName],
                  ['Publication', 'River Region Parents'],
                  ['Business', form.businessName],
                  ['Contact', `${form.firstName} ${form.lastName}`.trim()],
                  ['Email', form.email],
                  ['Months', months.map(fmtMonth).join(', ')],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <span className="text-gray-500">{k}</span>
                    <span className="font-semibold text-gray-900 text-right max-w-[220px] text-xs">{v}</span>
                  </div>
                ))}
                <div className="border-t border-[#ddd4c8] pt-2 space-y-1 mt-2">
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>{fmt$(monthlyRate)}/mo × {n} month{n !== 1 ? 's' : ''}</span>
                    <span>{fmt$(subtotal)}</span>
                  </div>
                  {designHelp && (
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Design help</span>
                      <span>$150</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-bold pt-1 border-t border-[#ddd4c8]">
                    <span>Total due today</span>
                    <span style={{ color: TERRA }}>{fmt$(total)}</span>
                  </div>
                </div>
              </div>

              {apiError && (
                <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <AlertCircle size={13} className="shrink-0" /> {apiError}
                </div>
              )}

              <p className="text-xs text-gray-400 text-center">Secure payment via Stripe. Confirmation sent to {form.email}.</p>
            </div>
          )}
        </div>

        {/* Footer navigation */}
        <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between shrink-0">
          <button
            onClick={() => step > 1 ? setStep((step - 1) as Step) : onClose()}
            className="flex items-center gap-1 px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <ChevronLeft size={14} /> Back
          </button>

          {step < 5 ? (
            <button
              onClick={() => setStep((step + 1) as Step)}
              disabled={!canNext()}
              className="flex items-center gap-1.5 px-5 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-50 transition-colors hover:opacity-90"
              style={{ backgroundColor: TERRA }}
            >
              Continue <ChevronRight size={14} />
            </button>
          ) : (
            <button
              onClick={handleCheckout}
              disabled={loading}
              className="flex items-center gap-1.5 px-5 py-2.5 text-sm font-bold text-white rounded-lg disabled:opacity-50 transition-all hover:opacity-90"
              style={{ backgroundColor: TERRA }}
            >
              {loading ? <><RefreshCw size={14} className="animate-spin" /> Processing…</> : <>Reserve This Spot →</>}
            </button>
          )}
        </div>
      </div>
    </>
  )
}

// ── Main SpotPicker export ─────────────────────────────────────────────────────

export function SpotPicker() {
  const [sizeTab, setSizeTab]       = useState<SizeTab>('quarter')
  const [halfOri, setHalfOri]       = useState<'h' | 'v'>('h')
  const [bookings, setBookings]     = useState<ActiveBooking[]>([])
  const [selectedZone, setSelectedZone] = useState<SelectedZone | null>(null)
  const [panelOpen, setPanelOpen]   = useState(false)

  // Load current bookings for availability overlay
  useEffect(() => {
    fetch('/api/bookings?pub=RRP')
      .then(r => r.ok ? r.json() : { bookings: [] })
      .then(data => setBookings(Array.isArray(data.bookings) ? data.bookings : []))
      .catch(() => {})
  }, [])

  const openZone = (zone: ZoneRect, adSize: string) => {
    const display = adSize === 'full' ? 'Full Page'
      : adSize === 'half' ? (halfOri === 'h' ? 'Half Page — ' : 'Half Page — ') + zone.label
      : adSize === 'quarter' ? 'Quarter Page — ' + zone.label
      : 'Sixth Page — ' + zone.label
    setSelectedZone({ adSize, adPosition: zone.id, displayName: display })
    setPanelOpen(true)
  }

  const currentZones = (() => {
    if (sizeTab === 'full')    return ZONE_SETS.full.default
    if (sizeTab === 'half')    return ZONE_SETS.half[halfOri]
    if (sizeTab === 'quarter') return ZONE_SETS.quarter.default
    return ZONE_SETS.sixth.default
  })()

  const SIZE_TABS: { id: SizeTab; label: string; dims: string }[] = [
    { id: 'full',    label: 'Full Page',    dims: '8.375 × 10.875"' },
    { id: 'half',    label: 'Half Page',    dims: '8.375 × 5.25"' },
    { id: 'quarter', label: 'Quarter Page', dims: '4.0625 × 5.25"' },
    { id: 'sixth',   label: 'Sixth Page',   dims: '4.0625 × 3.5"' },
  ]

  const N = (adSize: string, adPosition: string) => 1 // placeholder for rate display
  const rateForTab = (size: string) => RATE_CARD[size]?.[1] ?? 0

  return (
    <div id="spot-picker" style={{ backgroundColor: CREAM }}>
      <div className="max-w-5xl mx-auto px-5 py-14">

        {/* Section header */}
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-black text-gray-900 mb-3">
            Reserve Your Spot in River Region Parents
          </h2>
          <p className="text-sm text-gray-500 max-w-xl mx-auto">
            Click an available position below to see pricing and secure your space.
            Green zones are open — gray zones are already booked.
          </p>
        </div>

        {/* Print section */}
        <div className="bg-white rounded-2xl border border-[#ede6de] overflow-hidden mb-8">
          <div className="px-5 py-4 border-b border-[#ede6de] flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="text-sm font-bold text-gray-900">Print Magazine Positions</div>
              <div className="text-xs text-gray-500 mt-0.5">8.5 × 11 inches · Monthly print run · 18,000+ readers</div>
            </div>
            {/* Size tabs */}
            <div className="flex gap-1 flex-wrap">
              {SIZE_TABS.map(t => (
                <button
                  key={t.id}
                  onClick={() => setSizeTab(t.id)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all',
                    sizeTab === t.id
                      ? 'text-white border-[#7d4535]'
                      : 'bg-[#fdf9f5] text-gray-600 border-[#ddd4c8] hover:border-[#7d4535]/40'
                  )}
                  style={sizeTab === t.id ? { backgroundColor: TERRA } : undefined}
                >
                  {t.label}
                  <span className={cn('ml-1.5 font-bold', sizeTab === t.id ? 'text-white/70' : 'text-gray-400')} style={{ color: sizeTab === t.id ? undefined : TERRA }}>
                    from {fmt$(rateForTab(t.id))}/mo
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="p-5">
            <div className="flex flex-col sm:flex-row gap-8 items-start">
              {/* SVG + optional half sub-tabs */}
              <div className="space-y-3">
                {sizeTab === 'half' && (
                  <div className="flex gap-2">
                    {[{ id: 'h' as const, label: 'Horizontal (top/bottom)' }, { id: 'v' as const, label: 'Vertical (left/right)' }].map(o => (
                      <button
                        key={o.id}
                        onClick={() => setHalfOri(o.id)}
                        className={cn('px-3 py-1 rounded-lg text-xs font-semibold border transition-all',
                          halfOri === o.id ? 'text-white border-[#7d4535]' : 'bg-[#fdf9f5] text-gray-600 border-[#ddd4c8] hover:border-[#7d4535]/40'
                        )}
                        style={halfOri === o.id ? { backgroundColor: TERRA } : undefined}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                )}
                <MagazineSVG
                  zones={currentZones ?? []}
                  bookings={bookings}
                  adSize={sizeTab}
                  selectedId={selectedZone?.adPosition ?? null}
                  onSelect={zone => openZone(zone, sizeTab)}
                />
              </div>

              {/* Right: zone list / info */}
              <div className="flex-1 min-w-0 space-y-2">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Available Positions
                </div>
                {(currentZones ?? []).map(zone => {
                  const status = ZoneStatus({ bookings, adSize: sizeTab, adPosition: zone.id })
                  const taken  = status !== 'available'
                  const biz    = bookings.find(b => b.ad_size === sizeTab && b.ad_position === zone.id)?.business_name
                  return (
                    <button
                      key={zone.id}
                      disabled={taken}
                      onClick={() => !taken && openZone(zone, sizeTab)}
                      className={cn(
                        'w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all',
                        taken
                          ? 'border-gray-100 bg-gray-50 cursor-not-allowed opacity-60'
                          : selectedZone?.adPosition === zone.id
                          ? 'border-[#7d4535] bg-[#fdf3ef]'
                          : 'border-[#ede6de] bg-[#fdf9f5] hover:border-[#7d4535]/40 hover:bg-white cursor-pointer'
                      )}
                    >
                      <div
                        className="w-3 h-3 rounded-sm shrink-0"
                        style={{ backgroundColor: status === 'pending' ? PENDING : taken ? TAKEN + '80' : AVAIL, border: `1px solid ${status === 'pending' ? PENDING : taken ? TAKEN : AVAIL}` }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-gray-900">{zone.label}</div>
                        {taken && <div className="text-xs text-gray-400">{biz ?? 'Booked'}</div>}
                      </div>
                      {!taken && (
                        <div className="text-sm font-bold shrink-0" style={{ color: TERRA }}>
                          from {fmt$(rateForTab(sizeTab))}/mo
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Web zones section */}
        <div className="bg-white rounded-2xl border border-[#ede6de] overflow-hidden">
          <div className="px-5 py-4 border-b border-[#ede6de]">
            <div className="text-sm font-bold text-gray-900">Digital Ad Zones</div>
            <div className="text-xs text-gray-500 mt-0.5">Website · Email newsletter · High-intent placement</div>
          </div>
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {WEB_ZONE_LIST.map(wz => {
              const status = ZoneStatus({ bookings, adSize: 'web', adPosition: wz.id })
              const taken  = status !== 'available'
              const biz    = bookings.find(b => b.ad_size === 'web' && b.ad_position === wz.id)?.business_name
              return (
                <button
                  key={wz.id}
                  disabled={taken}
                  onClick={() => !taken && (() => {
                    setSelectedZone({ adSize: 'web', adPosition: wz.id, displayName: wz.label })
                    setPanelOpen(true)
                  })()}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all',
                    taken
                      ? 'border-gray-100 bg-gray-50 cursor-not-allowed opacity-60'
                      : 'border-[#ede6de] bg-[#fdf9f5] hover:border-[#7d4535]/40 hover:bg-white cursor-pointer'
                  )}
                >
                  <div
                    className="w-3 h-3 rounded-sm shrink-0"
                    style={{ backgroundColor: status === 'pending' ? PENDING : taken ? TAKEN + '80' : AVAIL, border: `1px solid ${status === 'pending' ? PENDING : taken ? TAKEN : AVAIL}` }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-gray-900">{wz.label}</div>
                    <div className="text-xs text-gray-400">{wz.dims}px · {wz.placement}</div>
                    {taken && biz && <div className="text-xs text-gray-400 mt-0.5">{biz}</div>}
                  </div>
                  {!taken && <div className="text-sm font-bold shrink-0" style={{ color: TERRA }}>{fmt$(wz.price)}/mo</div>}
                </button>
              )
            })}
          </div>
        </div>

      </div>

      {/* Booking panel */}
      <BookingPanel
        open={panelOpen}
        zone={selectedZone}
        bookings={bookings}
        onClose={() => setPanelOpen(false)}
      />
    </div>
  )
}
