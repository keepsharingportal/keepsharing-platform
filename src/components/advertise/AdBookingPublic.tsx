'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  CheckCircle2, ChevronRight, ChevronLeft, X, Globe, Printer,
  Package, Upload, CreditCard, RefreshCw, AlertCircle, Check, Info,
} from 'lucide-react'
import {
  PRINT_ZONES, WEB_ZONES, PUBLICATIONS, PRINT_GROUP_PRICES,
  getNextSixMonths, type PrintZoneDef, type WebZoneDef,
} from '@/lib/ad-zones'
import { cn, formatCurrency } from '@/lib/utils'

// ── Types ─────────────────────────────────────────────────────────────────────

type InventoryMap = Record<string, { status: string; bookedBusiness: string | null }>

type BookingState = {
  zoneId: string
  zoneType: 'print' | 'web'
  zoneName: string
  zonePrice: number
  selectedIssues: string[]
  packageType: 'print' | 'web' | 'bundle'
  businessName: string
  contactName: string
  phone: string
  email: string
  website: string
  designHelp: boolean
}

type Step = 1 | 2 | 3 | 4 | 5

// ── Page view type ─────────────────────────────────────────────────────────────
type PageView = 'premium' | 'interior' | 'web'

// ── Magazine page visual ──────────────────────────────────────────────────────

function MagazinePage({
  zones,
  inventory,
  selectedZoneId,
  onSelect,
}: {
  zones: PrintZoneDef[]
  inventory: InventoryMap
  selectedZoneId: string | null
  onSelect: (zone: PrintZoneDef) => void
}) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  return (
    <div
      className="relative bg-white rounded-lg border-2 border-gray-200 shadow-md overflow-hidden"
      style={{ width: 260, height: 338, flexShrink: 0 }}
    >
      {/* Page grain */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-white opacity-60 pointer-events-none" />

      {zones.map(zone => {
        const inv = inventory[zone.id]
        const isAvailable = !inv || inv.status === 'available'
        const isBooked = inv?.status === 'booked' || inv?.status === 'reserved'
        const isSelected = selectedZoneId === zone.id
        const isHovered = hoveredId === zone.id

        return (
          <button
            key={zone.id}
            disabled={isBooked}
            onClick={() => isAvailable && onSelect(zone)}
            onMouseEnter={() => setHoveredId(zone.id)}
            onMouseLeave={() => setHoveredId(null)}
            className={cn(
              'absolute border text-[9px] font-semibold transition-all overflow-hidden flex flex-col items-center justify-center text-center',
              isBooked
                ? 'bg-gray-200 border-gray-300 text-gray-500 cursor-not-allowed'
                : isSelected
                ? 'bg-blue-500 border-blue-600 text-white ring-2 ring-blue-300 ring-offset-1 cursor-pointer z-20'
                : 'bg-green-400/80 border-green-500 text-green-900 hover:bg-green-400 hover:border-green-600 cursor-pointer z-10'
            )}
            style={{
              left:   `${zone.pos.x}%`,
              top:    `${zone.pos.y}%`,
              width:  `${zone.pos.w}%`,
              height: `${zone.pos.h}%`,
            }}
          >
            {isBooked ? (
              <>
                <div className="leading-tight truncate w-full px-1">{inv?.bookedBusiness ?? 'Taken'}</div>
              </>
            ) : isSelected ? (
              <>
                <Check size={14} className="mb-0.5" />
                <div>{zone.shortName}</div>
              </>
            ) : isHovered ? (
              <>
                <div className="font-bold leading-tight">${zone.price}/mo</div>
                <div className="text-[8px] opacity-80 leading-tight">{zone.shortName}</div>
              </>
            ) : (
              <>
                <div className="text-[8px] opacity-75">AVAILABLE</div>
                <div className="font-bold">{zone.shortName}</div>
              </>
            )}
          </button>
        )
      })}

      {/* Bleed marks */}
      <div className="absolute top-1 left-1 w-2 h-2 border-l border-t border-gray-300 pointer-events-none" />
      <div className="absolute top-1 right-1 w-2 h-2 border-r border-t border-gray-300 pointer-events-none" />
      <div className="absolute bottom-1 left-1 w-2 h-2 border-l border-b border-gray-300 pointer-events-none" />
      <div className="absolute bottom-1 right-1 w-2 h-2 border-r border-b border-gray-300 pointer-events-none" />
    </div>
  )
}

// ── Premium zone card ─────────────────────────────────────────────────────────

function PremiumZoneCard({
  zone,
  inventory,
  isSelected,
  onClick,
}: {
  zone: PrintZoneDef
  inventory: InventoryMap
  isSelected: boolean
  onClick: () => void
}) {
  const inv = inventory[zone.id]
  const isBooked = inv?.status === 'booked' || inv?.status === 'reserved'

  return (
    <button
      disabled={isBooked}
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left',
        isBooked ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-70' :
        isSelected ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' :
        'border-gray-200 bg-white hover:border-green-400 hover:bg-green-50 cursor-pointer'
      )}
    >
      <div className={cn(
        'w-14 h-18 rounded-md flex items-center justify-center text-xs font-bold shrink-0 border',
        isBooked ? 'bg-gray-200 border-gray-300 text-gray-500' :
        isSelected ? 'bg-blue-500 border-blue-600 text-white' :
        'bg-green-100 border-green-300 text-green-800'
      )} style={{ height: 56 }}>
        {isBooked ? 'TAKEN' : zone.shortName}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold text-gray-900">{zone.displayName}</div>
        <div className="text-xs text-gray-500">{zone.dimensions}</div>
        {isBooked && <div className="text-xs text-gray-400 italic mt-0.5">Taken by {inv?.bookedBusiness ?? 'another advertiser'}</div>}
      </div>
      <div className="text-right shrink-0">
        {isBooked ? (
          <span className="text-xs text-gray-400">Unavailable</span>
        ) : (
          <>
            <div className="text-base font-bold text-green-700">${zone.price}</div>
            <div className="text-[10px] text-gray-400">/month</div>
          </>
        )}
      </div>
    </button>
  )
}

// ── Web zone card ─────────────────────────────────────────────────────────────

function WebZoneCard({
  zone,
  inventory,
  isSelected,
  onClick,
}: {
  zone: WebZoneDef
  inventory: InventoryMap
  isSelected: boolean
  onClick: () => void
}) {
  const inv = inventory[zone.id]
  const isBooked = inv?.status === 'booked' || inv?.status === 'reserved'
  const aspectRatio = zone.dimensions.split(' × ')
  const w = parseInt(aspectRatio[0])
  const h = parseInt(aspectRatio[1])
  const previewH = Math.round(40 * (h / w))

  return (
    <button
      disabled={isBooked}
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left',
        isBooked ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-70' :
        isSelected ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' :
        'border-gray-200 bg-white hover:border-green-400 hover:bg-green-50 cursor-pointer'
      )}
    >
      <div
        className={cn(
          'rounded flex items-center justify-center text-[8px] font-bold shrink-0 border',
          isBooked ? 'bg-gray-200 border-gray-300 text-gray-500' :
          isSelected ? 'bg-blue-500 border-blue-600 text-white' :
          'bg-green-100 border-green-300 text-green-800'
        )}
        style={{ width: 40, height: previewH, minHeight: 20, maxHeight: 60 }}
      >
        {isBooked ? '✕' : '✓'}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold text-gray-900">{zone.displayName}</div>
        <div className="text-xs text-gray-500">{zone.dimensions}px · {zone.placement}</div>
        <div className="text-[11px] text-gray-400 mt-0.5">{zone.description}</div>
      </div>
      <div className="text-right shrink-0">
        {isBooked ? (
          <span className="text-xs text-gray-400">Unavailable</span>
        ) : (
          <>
            <div className="text-sm font-bold text-green-700">${zone.price}</div>
            <div className="text-[10px] text-gray-400">/month</div>
          </>
        )}
      </div>
    </button>
  )
}

// ── Booking modal ─────────────────────────────────────────────────────────────

function BookingModal({
  booking,
  pub,
  onClose,
  onUpdate,
}: {
  booking: BookingState
  pub: string
  onClose: () => void
  onUpdate: (updates: Partial<BookingState>) => void
}) {
  const [step, setStep]       = useState<Step>(2)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  const issues = getNextSixMonths(pub)
  const months = booking.selectedIssues.length

  const bundleDiscount = booking.packageType === 'bundle' ? 0.15 : 0
  const baseTotal = booking.zonePrice * months * (1 - bundleDiscount)
  const designFee = booking.designHelp ? 150 : 0
  const total = baseTotal + designFee

  const canNext = () => {
    if (step === 2) return booking.selectedIssues.length > 0
    if (step === 3) return !!booking.packageType
    if (step === 4) return !!booking.businessName && !!booking.email
    return true
  }

  const handleCheckout = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/ad-booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          publication: pub,
          zoneId:      booking.zoneId,
          zoneType:    booking.zoneType,
          issues:      booking.selectedIssues,
          packageType: booking.packageType,
          businessName: booking.businessName,
          contactName:  booking.contactName || undefined,
          phone:        booking.phone || undefined,
          email:        booking.email,
          website:      booking.website || undefined,
          designHelp:   booking.designHelp,
        }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setError(data.error ?? 'Something went wrong')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const inputCls = 'w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-gray-400'
  const labelCls = 'block text-xs font-semibold text-gray-600 mb-1'

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div>
            <div className="text-xs text-gray-500">Booking: <strong>{booking.zoneName}</strong> · {pub}</div>
            <div className="text-sm font-bold text-gray-900 mt-0.5">
              Step {step - 1} of 4 — {['', '', 'Select Months', 'Package', 'Business Info', 'Review & Pay'][step]}
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={20} /></button>
        </div>

        {/* Step indicator */}
        <div className="px-5 py-2 border-b border-gray-100 flex items-center gap-1 shrink-0">
          {[2,3,4,5].map((s, i) => (
            <div key={s} className="flex items-center gap-1">
              <div className={cn(
                'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold',
                step > s ? 'bg-green-500 text-white' :
                step === s ? 'bg-blue-600 text-white' :
                'bg-gray-100 text-gray-400'
              )}>
                {step > s ? '✓' : i + 1}
              </div>
              {i < 3 && <div className={cn('h-px flex-1 w-8', step > s ? 'bg-green-400' : 'bg-gray-200')} />}
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">

          {/* STEP 2 — Select months */}
          {step === 2 && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">Choose which issue month(s) you want your ad to run.</p>
              <div className="space-y-2">
                {issues.map(issue => {
                  const isSelected = booking.selectedIssues.includes(issue)
                  return (
                    <button
                      key={issue}
                      onClick={() => onUpdate({
                        selectedIssues: isSelected
                          ? booking.selectedIssues.filter(i => i !== issue)
                          : [...booking.selectedIssues, issue],
                      })}
                      className={cn(
                        'w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all text-left',
                        isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                      )}
                    >
                      <span className="text-sm font-semibold text-gray-900">{issue}</span>
                      <div className={cn(
                        'w-5 h-5 rounded-full border-2 flex items-center justify-center',
                        isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
                      )}>
                        {isSelected && <Check size={11} className="text-white" />}
                      </div>
                    </button>
                  )
                })}
              </div>
              {months > 1 && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5 text-xs text-blue-700 flex items-center gap-2">
                  <Info size={12} />
                  Book {months} months at ${booking.zonePrice}/mo = <strong>{formatCurrency(booking.zonePrice * months)}</strong> total
                  {booking.packageType === 'bundle' && <> · 15% bundle discount available</>}
                </div>
              )}
            </div>
          )}

          {/* STEP 3 — Package type */}
          {step === 3 && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">Select your advertising package.</p>
              {[
                { value: 'print' as const, icon: Printer, title: 'Print Only', description: `Magazine ad only · ${formatCurrency(booking.zonePrice * months)} total` },
                { value: 'web' as const, icon: Globe, title: 'Web Only', description: `Digital ad zones only · ${formatCurrency(booking.zonePrice * months)} total` },
                {
                  value: 'bundle' as const, icon: Package, title: 'Multi-Touch Bundle',
                  description: `Print + Web + Email Newsletter · 15% off → ${formatCurrency(booking.zonePrice * months * 0.85)} total`,
                  badge: '15% OFF',
                },
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => onUpdate({ packageType: opt.value })}
                  className={cn(
                    'w-full flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all',
                    booking.packageType === opt.value ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                  )}
                >
                  <opt.icon size={18} className={booking.packageType === opt.value ? 'text-blue-600' : 'text-gray-400'} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-gray-900">{opt.title}</span>
                      {'badge' in opt && opt.badge && (
                        <span className="px-1.5 py-0.5 bg-green-500 text-white text-[10px] font-bold rounded">{opt.badge}</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">{opt.description}</div>
                  </div>
                  <div className={cn('w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 shrink-0',
                    booking.packageType === opt.value ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
                  )}>
                    {booking.packageType === opt.value && <Check size={11} className="text-white" />}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* STEP 4 — Business info */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className={labelCls}>Business Name <span className="text-red-500">*</span></label>
                  <input value={booking.businessName} onChange={e => onUpdate({ businessName: e.target.value })}
                    className={inputCls} placeholder="e.g. Bright Smiles Orthodontics" />
                </div>
                <div>
                  <label className={labelCls}>Contact Name</label>
                  <input value={booking.contactName} onChange={e => onUpdate({ contactName: e.target.value })}
                    className={inputCls} placeholder="Your name" />
                </div>
                <div>
                  <label className={labelCls}>Phone</label>
                  <input value={booking.phone} onChange={e => onUpdate({ phone: e.target.value })}
                    className={inputCls} placeholder="(334) 555-0100" />
                </div>
                <div>
                  <label className={labelCls}>Email <span className="text-red-500">*</span></label>
                  <input type="email" value={booking.email} onChange={e => onUpdate({ email: e.target.value })}
                    className={inputCls} placeholder="you@yourbusiness.com" />
                </div>
                <div>
                  <label className={labelCls}>Website</label>
                  <input type="url" value={booking.website} onChange={e => onUpdate({ website: e.target.value })}
                    className={inputCls} placeholder="https://…" />
                </div>
              </div>

              {/* Ad graphic or design help */}
              <div className="border-t border-gray-100 pt-3 space-y-2">
                <div className="text-xs font-semibold text-gray-700">Ad Creative</div>
                <button
                  onClick={() => onUpdate({ designHelp: false })}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all',
                    !booking.designHelp ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                  )}
                >
                  <Upload size={16} className={!booking.designHelp ? 'text-blue-600' : 'text-gray-400'} />
                  <div>
                    <div className="text-sm font-semibold text-gray-900">I&apos;ll provide my ad graphic</div>
                    <div className="text-xs text-gray-500">WebP, JPG, or PNG · max 5MB · high-res preferred</div>
                  </div>
                </button>
                <button
                  onClick={() => onUpdate({ designHelp: true })}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all',
                    booking.designHelp ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                  )}
                >
                  <Printer size={16} className={booking.designHelp ? 'text-blue-600' : 'text-gray-400'} />
                  <div>
                    <div className="text-sm font-semibold text-gray-900">Design help (+$150)</div>
                    <div className="text-xs text-gray-500">KeepSharing team creates your ad graphic</div>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* STEP 5 — Review + pay */}
          {step === 5 && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Zone</span>
                  <span className="font-semibold text-gray-900">{booking.zoneName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Publication</span>
                  <span className="font-semibold text-gray-900">{pub}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Issues</span>
                  <span className="font-semibold text-gray-900 text-right max-w-48">{booking.selectedIssues.join(', ')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Package</span>
                  <span className="font-semibold text-gray-900 capitalize">{booking.packageType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Business</span>
                  <span className="font-semibold text-gray-900">{booking.businessName}</span>
                </div>
                <div className="border-t border-gray-200 pt-2 mt-2 space-y-1">
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>{formatCurrency(booking.zonePrice)} × {months} month{months !== 1 ? 's' : ''}</span>
                    <span>{formatCurrency(booking.zonePrice * months)}</span>
                  </div>
                  {bundleDiscount > 0 && (
                    <div className="flex justify-between text-xs text-green-600">
                      <span>Bundle discount (15%)</span>
                      <span>−{formatCurrency(booking.zonePrice * months * 0.15)}</span>
                    </div>
                  )}
                  {booking.designHelp && (
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Design help</span>
                      <span>$150</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-gray-900 border-t border-gray-200 pt-1 mt-1">
                    <span>Total due today</span>
                    <span style={{ color: 'var(--color-gold-600)' }}>{formatCurrency(total)}</span>
                  </div>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  <AlertCircle size={14} /> {error}
                </div>
              )}

              <div className="text-xs text-gray-400 text-center">
                Secure payment via Stripe · Confirmation sent to {booking.email}
              </div>
            </div>
          )}
        </div>

        {/* Footer nav */}
        <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between shrink-0">
          <button
            onClick={() => step > 2 ? setStep((step - 1) as Step) : onClose()}
            className="flex items-center gap-1 px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <ChevronLeft size={14} /> Back
          </button>
          {step < 5 ? (
            <button
              onClick={() => setStep((step + 1) as Step)}
              disabled={!canNext()}
              className="flex items-center gap-1.5 px-5 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              Continue <ChevronRight size={14} />
            </button>
          ) : (
            <button
              onClick={handleCheckout}
              disabled={loading || !booking.businessName || !booking.email}
              className="flex items-center gap-1.5 px-5 py-2 text-sm font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {loading
                ? <><RefreshCw size={14} className="animate-spin" /> Processing…</>
                : <><CreditCard size={14} /> Pay {formatCurrency(total)}</>}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main public component ─────────────────────────────────────────────────────

export function AdBookingPublic() {
  const [selectedPub, setSelectedPub]   = useState('RRP')
  const [pageView, setPageView]         = useState<PageView>('premium')
  const [inventory, setInventory]       = useState<InventoryMap>({})
  const [loadingInv, setLoadingInv]     = useState(true)
  const [activeBooking, setActiveBooking] = useState<BookingState | null>(null)

  const loadInventory = useCallback(async () => {
    setLoadingInv(true)
    try {
      const res = await fetch(`/api/ad-booking?pub=${selectedPub}`)
      if (res.ok) setInventory(await res.json())
    } catch { /* show all as available */ }
    finally { setLoadingInv(false) }
  }, [selectedPub])

  useEffect(() => { loadInventory() }, [loadInventory])

  const openBooking = (zoneId: string, zoneType: 'print' | 'web', zoneName: string, zonePrice: number) => {
    setActiveBooking({
      zoneId, zoneType, zoneName, zonePrice,
      selectedIssues: [],
      packageType: 'print',
      businessName: '', contactName: '', phone: '', email: '', website: '',
      designHelp: false,
    })
  }

  const premiumZones = PRINT_ZONES.filter(z => z.page === 'premium')
  const interiorZones = PRINT_ZONES.filter(z => z.page === 'interior')

  // Group interior zones by price tier for the page visualization
  const shownInteriorZones = (() => {
    switch (pageView) {
      case 'interior': return interiorZones.filter(z => z.groupLabel.includes('Half') || z.groupLabel.includes('Third') || z.groupLabel.includes('Quarter'))
      default: return interiorZones
    }
  })()

  return (
    <div className="min-h-screen bg-[#f4f5f7]">

      {/* Page header */}
      <div className="bg-white border-b border-gray-200 px-6 py-5">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900">Advertise with River Region Parents</h1>
          <p className="text-sm text-gray-500 mt-1">Select an available spot below and book your space in minutes.</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">

        {/* Publication selector */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Select Publication</div>
          <div className="flex flex-wrap gap-2">
            {PUBLICATIONS.map(p => (
              <button
                key={p.abbrev}
                onClick={() => setSelectedPub(p.abbrev)}
                className={cn(
                  'px-3 py-2 rounded-lg border text-sm font-medium transition-all',
                  selectedPub === p.abbrev
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
                )}
              >
                <div className="font-bold">{p.abbrev}</div>
                <div className="text-[10px] opacity-75">{p.market}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Pricing summary */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Print Ad Rates — {selectedPub}</h2>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-5 divide-x divide-y divide-gray-100">
            {Object.entries(PRINT_GROUP_PRICES).map(([name, price]) => (
              <div key={name} className="px-3 py-2 text-center">
                <div className="text-sm font-bold" style={{ color: 'var(--color-gold-600)' }}>${price}</div>
                <div className="text-[10px] text-gray-500 leading-tight">{name}</div>
                <div className="text-[9px] text-gray-400">/month</div>
              </div>
            ))}
          </div>
        </div>

        {/* Zone type tabs */}
        <div className="flex gap-2">
          {[
            { id: 'premium' as PageView,  label: 'Premium Positions' },
            { id: 'interior' as PageView, label: 'Interior Page' },
            { id: 'web' as PageView,      label: 'Digital Zones' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setPageView(t.id)}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium border transition-all',
                pageView === t.id ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── PREMIUM POSITIONS ─────────────────────────────────────────── */}
        {pageView === 'premium' && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Premium Positions</div>
            {loadingInv ? (
              <div className="text-sm text-gray-400 text-center py-8">Loading availability…</div>
            ) : (
              <div className="space-y-2">
                {premiumZones.map(zone => (
                  <PremiumZoneCard
                    key={zone.id}
                    zone={zone}
                    inventory={inventory}
                    isSelected={activeBooking?.zoneId === zone.id}
                    onClick={() => openBooking(zone.id, 'print', zone.displayName, zone.price)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── INTERIOR PAGE ─────────────────────────────────────────────── */}
        {pageView === 'interior' && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-start gap-6">
              {/* Visual page */}
              <div className="shrink-0">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Interior Page Preview</div>
                <MagazinePage
                  zones={shownInteriorZones}
                  inventory={inventory}
                  selectedZoneId={activeBooking?.zoneId ?? null}
                  onSelect={z => openBooking(z.id, 'print', z.displayName, z.price)}
                />
                <div className="mt-2 flex items-center gap-3 text-[10px]">
                  <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-green-400" /> Available</div>
                  <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-gray-200" /> Taken</div>
                  <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-blue-500" /> Selected</div>
                </div>
              </div>

              {/* Zone list */}
              <div className="flex-1 min-w-0 space-y-2 max-h-96 overflow-y-auto pr-1">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Click a zone to book</div>
                {['Half Page', 'Third Page', 'Quarter Page', 'Sixth Page', 'Eighth Page'].map(group => {
                  const groupZones = interiorZones.filter(z => z.groupLabel === group)
                  const price = groupZones[0]?.price ?? 0
                  return (
                    <div key={group}>
                      <div className="text-[11px] font-semibold text-gray-500 mb-1 flex items-center justify-between">
                        <span>{group}</span>
                        <span style={{ color: 'var(--color-gold-600)' }}>${price}/mo</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1">
                        {groupZones.map(z => {
                          const inv = inventory[z.id]
                          const taken = inv?.status === 'booked' || inv?.status === 'reserved'
                          const isSelected = activeBooking?.zoneId === z.id
                          return (
                            <button
                              key={z.id}
                              disabled={taken}
                              onClick={() => !taken && openBooking(z.id, 'print', z.displayName, z.price)}
                              className={cn(
                                'px-2 py-1.5 rounded-lg text-xs font-medium border transition-all text-left',
                                taken ? 'border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed' :
                                isSelected ? 'border-blue-500 bg-blue-50 text-blue-700' :
                                'border-green-200 bg-green-50 text-green-800 hover:bg-green-100 cursor-pointer'
                              )}
                            >
                              {taken ? '✕ ' : '✓ '}{z.shortName}
                              {taken && inv?.bookedBusiness && (
                                <div className="text-[9px] truncate opacity-60">{inv.bookedBusiness}</div>
                              )}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── DIGITAL ZONES ─────────────────────────────────────────────── */}
        {pageView === 'web' && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Digital Ad Zones</div>
            {loadingInv ? (
              <div className="text-sm text-gray-400 text-center py-8">Loading availability…</div>
            ) : (
              <div className="space-y-2">
                {WEB_ZONES.map(zone => (
                  <WebZoneCard
                    key={zone.id}
                    zone={zone}
                    inventory={inventory}
                    isSelected={activeBooking?.zoneId === zone.id}
                    onClick={() => openBooking(zone.id, 'web', zone.displayName, zone.price)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Why advertise section */}
        <div className="bg-blue-600 rounded-2xl p-6 text-white">
          <h2 className="text-lg font-bold mb-1">Why advertise with River Region Parents?</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
            {[
              { stat: '18,000+', label: 'Monthly readers' },
              { stat: '2,400+', label: 'Email subscribers' },
              { stat: '6', label: 'Regional publications' },
              { stat: '100%', label: 'Local audience' },
            ].map(s => (
              <div key={s.label} className="text-center">
                <div className="text-2xl font-bold text-white">{s.stat}</div>
                <div className="text-blue-200 text-xs">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Booking modal */}
      {activeBooking && (
        <BookingModal
          booking={activeBooking}
          pub={selectedPub}
          onClose={() => setActiveBooking(null)}
          onUpdate={updates => setActiveBooking(prev => prev ? { ...prev, ...updates } : prev)}
        />
      )}
    </div>
  )
}
